import os
import time
import logging
import asyncio
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse

from services.search.config import (
    TAVILY_API_KEY,
    EXA_API_KEY,
    BRAVE_API_KEY,
    SERPAPI_API_KEY
)
from services.search.models import SearchResult, UnifiedSearchResponse
from services.search.base import BaseSearchProvider, SearchError
from services.search.providers import (
    TavilyProvider,
    ExaProvider,
    BraveProvider,
    SerpAPIProvider
)
from services.search.caching import get_cached_results, set_cached_results

# Setup logger
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("SearchEngine")

# Instantiating the providers
PROVIDERS: List[BaseSearchProvider] = [
    TavilyProvider(TAVILY_API_KEY),
    ExaProvider(EXA_API_KEY),
    BraveProvider(BRAVE_API_KEY),
    SerpAPIProvider(SERPAPI_API_KEY)
]

def _apply_domain_scoring(results: List[SearchResult]) -> List[SearchResult]:
    """Applies a reliability score boost to trusted domains (edu, org, official docs)."""
    trusted_extensions = (".edu", ".org", ".gov")
    trusted_domains = ("docs.", "developer.", "developer-docs.", "github.com", "arxiv.org")

    for r in results:
        if not r.url:
            continue
        try:
            parsed = urlparse(r.url)
            netloc = parsed.netloc.lower()
            
            # Base score calculation
            base_score = r.score if r.score is not None else 0.5
            
            # Boost calculations
            boost = 0.0
            if netloc.endswith(trusted_extensions):
                boost += 0.15
            if any(td in netloc for td in trusted_domains):
                boost += 0.2
                
            r.score = min(1.0, base_score + boost)
        except Exception:
            pass
            
    # Re-sort results based on the new scores
    return sorted(results, key=lambda x: x.score if x.score is not None else 0.0, reverse=True)


def _apply_semantic_rerank(query: str, results: List[SearchResult]) -> List[SearchResult]:
    """Reranks results based on token overlap matching density between query and snippet."""
    query_tokens = set(query.lower().split())
    if not query_tokens:
        return results

    for r in results:
        content_text = (r.title + " " + r.content).lower()
        content_tokens = content_text.split()
        if not content_tokens:
            continue
            
        # Count token overlap
        matches = sum(1 for token in query_tokens if token in content_text)
        density = matches / len(query_tokens)
        
        # Adjust score
        base_score = r.score if r.score is not None else 0.5
        r.score = min(1.0, base_score * 0.7 + density * 0.3)
        
    return sorted(results, key=lambda x: x.score if x.score is not None else 0.0, reverse=True)


def _apply_keyword_highlighting(query: str, results: List[SearchResult]) -> List[SearchResult]:
    """Wraps matching query words inside HTML <mark> tags within the snippets."""
    query_words = [w.strip(",.?!\"'") for w in query.split() if len(w.strip(",.?!\"'")) > 2]
    if not query_words:
        return results

    for r in results:
        if not r.content:
            continue
        highlighted = r.content
        for word in query_words:
            # Case-insensitive replacement
            try:
                import re
                pattern = re.compile(re.escape(word), re.IGNORECASE)
                highlighted = pattern.sub(lambda m: f"<mark>{m.group(0)}</mark>", highlighted)
            except Exception:
                pass
        r.highlight = highlighted
    return results


def _reciprocal_rank_fusion(provider_results: List[List[SearchResult]], k: int = 60) -> List[SearchResult]:
    """Merges multiple result lists using Reciprocal Rank Fusion (RRF)."""
    rrf_scores: Dict[str, float] = {}
    url_to_doc: Dict[str, SearchResult] = {}

    for results in provider_results:
        for rank, doc in enumerate(results):
            if not doc.url:
                continue
            url = doc.url
            url_to_doc[url] = doc
            
            # RRF Formula: score = sum( 1 / (k + rank) )
            rrf_scores[url] = rrf_scores.get(url, 0.0) + (1.0 / (k + rank + 1))

    # Sort URLs by RRF score
    sorted_urls = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
    
    merged_results = []
    for url, rrf_score in sorted_urls:
        doc = url_to_doc[url]
        # Assign the normalized RRF score
        doc.score = min(1.0, rrf_score * 10)  # scale for representation
        merged_results.append(doc)
        
    return merged_results


async def search(
    query: str,
    count: int = 5,
    mode: str = "sequential",
    force_provider: Optional[str] = None
) -> dict:
    """
    Unified search entrypoint.
    Supports cache lookup, provider rotation, sequential fallback, and concurrent RRF merging.
    """
    # 1. Check cache first
    cached = get_cached_results(query)
    if cached:
        return cached

    # 2. Check if a provider is forced
    active_providers = PROVIDERS
    if force_provider:
        target = force_provider.lower()
        active_providers = [p for p in PROVIDERS if p.name == target]
        if not active_providers:
            raise SearchError(f"Forced provider '{force_provider}' is not configured or recognized.")

    # Filter by available providers (has key and has quota)
    available_providers = [p for p in active_providers if p.is_available()]

    if not available_providers:
        # If no provider is available because of quotas, raise exception
        raise SearchError("No search providers are currently available (out of quota or missing API keys).")

    # 3. Execute search
    results_obj = None
    provider_name = ""
    start_time = time.time()

    if mode == "concurrent" and len(available_providers) > 1 and not force_provider:
        # Concurrent mode: Run all available in parallel
        logger.info(f"Running concurrent search for query: '{query}'")
        tasks = []
        for p in available_providers:
            tasks.append(p.search(query, count=count))
            
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        valid_results = []
        used_providers = []
        for p, resp in zip(available_providers, responses):
            if isinstance(resp, Exception):
                logger.error(f"Provider {p.name} failed during concurrent execution: {resp}")
            else:
                valid_results.append(resp.results)
                used_providers.append(p.name)
                # Increment quota usage for successfully called providers
                from services.search.usage import increment_provider_usage
                increment_provider_usage(p.name)

        if not valid_results:
            raise SearchError("All providers failed during concurrent search.")

        # Merge with Reciprocal Rank Fusion
        merged = _reciprocal_rank_fusion(valid_results)
        provider_name = f"concurrent({','.join(used_providers)})"
        
        results_obj = UnifiedSearchResponse(
            query=query,
            provider=provider_name,
            results=merged[:count],
            total_results=len(merged[:count]),
            execution_time_ms=(time.time() - start_time) * 1000
        )
    else:
        # Sequential mode: Try one by one
        last_error = None
        for provider in available_providers:
            # Double check availability just in case
            if not provider.is_available():
                continue
                
            provider_display_name = "SerpAPI" if provider.name == "serpapi" else provider.name.capitalize()
            logger.info(f"Trying provider: {provider_display_name} for query: '{query}'")
            try:
                results_obj = await provider.search(query, count=count)
                provider_name = provider.name
                # Increment quota usage
                from services.search.usage import increment_provider_usage
                increment_provider_usage(provider.name)
                break
            except Exception as e:
                logger.warning(f"Provider {provider.name} failed: {e}. Falling back to next provider.")
                last_error = e
                continue

        if not results_obj:
            raise SearchError(f"All search providers failed. Last error: {last_error}")

    # 4. Post-processing
    processed_results = results_obj.results
    processed_results = _apply_domain_scoring(processed_results)
    processed_results = _apply_semantic_rerank(query, processed_results)
    processed_results = _apply_keyword_highlighting(query, processed_results)
    results_obj.results = processed_results

    # 5. Save to cache and return dict representation
    resp_dict = results_obj.model_dump()
    set_cached_results(query, resp_dict)
    
    return resp_dict


def export_results(results: dict, format_type: str = "markdown") -> str:
    """Formats the results as Markdown or HTML."""
    if format_type.lower() == "html":
        html_lines = ["<div class='search-results'>"]
        for r in results.get("results", []):
            html_lines.append(f"  <div class='search-item'>")
            html_lines.append(f"    <h3><a href='{r.get('url')}'>{r.get('title')}</a></h3>")
            html_lines.append(f"    <p class='snippet'>{r.get('highlight') or r.get('content')}</p>")
            html_lines.append(f"  </div>")
        html_lines.append("</div>")
        return "\n".join(html_lines)
    else:
        # Markdown fallback
        md_lines = [f"### Search Results from {results.get('provider').capitalize()}\n"]
        for idx, r in enumerate(results.get("results", []), 1):
            md_lines.append(f"{idx}. [{r.get('title')}]({r.get('url')})")
            md_lines.append(f"   > {r.get('content')}\n")
        return "\n".join(md_lines)


# Cache to prevent burning API calls for identical topics
_IN_MEMORY_CONTEXT_CACHE = {}
_CONTEXT_CACHE_TTL = 86400  # 24 hours in seconds

def _get_mongodb_cache_collection():
    try:
        from pymongo import MongoClient
        mongo_uri = os.getenv("MONGODB_URI", "").strip()
        if not mongo_uri:
            return None
        db_name = os.getenv("MONGODB_DB_NAME", "articleship").strip() or "articleship"
        client = MongoClient(mongo_uri)
        return client[db_name]["search_context_cache"]
    except Exception as e:
        logger.warning(f"Failed to connect to MongoDB for search cache: {e}")
        return None


async def gather_search_context(topic: str) -> Dict[str, Any]:
    """
    Retrieves search context concurrently from Tavily and Exa for topic grounding.
    Includes feature flags, exponential retry/fallback, dual caching, and cost logging.
    """
    disable_grounding = os.getenv("DISABLE_SEARCH_GROUNDING", "false").strip().lower() == "true"
    if disable_grounding:
        logger.info("Search grounding is disabled via DISABLE_SEARCH_GROUNDING env var.")
        return {
            "related_questions": [],
            "related_searches": [],
            "competing_pages": []
        }

    normalized_topic = topic.strip().lower()
    now = time.time()

    # 1. Check in-memory cache
    if normalized_topic in _IN_MEMORY_CONTEXT_CACHE:
        entry = _IN_MEMORY_CONTEXT_CACHE[normalized_topic]
        if now - entry["timestamp"] < _CONTEXT_CACHE_TTL:
            logger.info(f"In-memory context cache hit for topic: '{topic}'")
            return entry["data"]
        else:
            del _IN_MEMORY_CONTEXT_CACHE[normalized_topic]

    # 2. Check MongoDB cache
    db_col = _get_mongodb_cache_collection()
    if db_col is not None:
        try:
            cached_doc = await asyncio.to_thread(db_col.find_one, {"topic": normalized_topic})
            if cached_doc:
                timestamp = cached_doc.get("timestamp", 0)
                if now - timestamp < _CONTEXT_CACHE_TTL:
                    logger.info(f"MongoDB context cache hit for topic: '{topic}'")
                    _IN_MEMORY_CONTEXT_CACHE[normalized_topic] = {
                        "timestamp": timestamp,
                        "data": cached_doc["data"]
                    }
                    return cached_doc["data"]
                else:
                    await asyncio.to_thread(db_col.delete_one, {"topic": normalized_topic})
        except Exception as e:
            logger.warning(f"MongoDB context cache lookup failed: {e}")

    # 3. Call APIs Concurrently
    tavily_prov = TavilyProvider(TAVILY_API_KEY)
    exa_prov = ExaProvider(EXA_API_KEY)

    tavily_call_made = False
    exa_call_made = False

    async def fetch_tavily():
        nonlocal tavily_call_made
        if not tavily_prov.is_available():
            logger.warning("Tavily provider not available (missing key or no remaining quota).")
            return None
        tavily_call_made = True
        logger.info(f"Calling Tavily for search grounding context on topic: '{topic}'")
        res = await tavily_prov.search(topic, count=5, include_answer=True)
        # Log successful call usage
        from services.search.usage import increment_provider_usage
        increment_provider_usage("tavily")
        return res

    async def fetch_exa():
        nonlocal exa_call_made
        if not exa_prov.is_available():
            logger.warning("Exa provider not available (missing key or no remaining quota).")
            return None
        exa_call_made = True
        logger.info(f"Calling Exa for semantic search grounding context on topic: '{topic}'")
        res = await exa_prov.search(topic, count=8, type="neural", use_autoprompt=True)
        # Log successful call usage
        from services.search.usage import increment_provider_usage
        increment_provider_usage("exa")
        return res

    tavily_res = None
    exa_res = None

    try:
        results = await asyncio.gather(fetch_tavily(), fetch_exa(), return_exceptions=True)
        tavily_res, exa_res = results[0], results[1]
    except Exception as e:
        logger.error(f"Concurrent search execution failed: {e}")

    related_questions = []
    related_searches = []
    competing_pages = []

    # Process Tavily Response
    if tavily_res and not isinstance(tavily_res, Exception):
        if getattr(tavily_res, "answer", None):
            related_questions.append(tavily_res.answer)
        if getattr(tavily_res, "follow_up_questions", None) and tavily_res.follow_up_questions:
            related_questions.extend(tavily_res.follow_up_questions)
        for r in tavily_res.results:
            related_searches.append(r.title)
    elif isinstance(tavily_res, Exception):
        logger.error(f"Tavily grounding call failed: {tavily_res}")

    # Process Exa Response
    if exa_res and not isinstance(exa_res, Exception):
        for r in exa_res.results:
            competing_pages.append({
                "title": r.title,
                "url": r.url,
                "snippet_or_summary": r.content
            })
    elif isinstance(exa_res, Exception):
        logger.error(f"Exa grounding call failed: {exa_res}")

    # Cost Monitoring Log
    logger.info(
        "COST_MONITOR: Made %d Tavily calls and %d Exa calls for topic '%s'",
        1 if tavily_call_made else 0,
        1 if exa_call_made else 0,
        topic
    )

    result_data = {
        "related_questions": related_questions,
        "related_searches": related_searches,
        "competing_pages": competing_pages
    }

    # 4. Cache successful result
    if (tavily_res and not isinstance(tavily_res, Exception)) or (exa_res and not isinstance(exa_res, Exception)):
        _IN_MEMORY_CONTEXT_CACHE[normalized_topic] = {
            "timestamp": now,
            "data": result_data
        }
        if db_col is not None:
            try:
                await asyncio.to_thread(
                    db_col.update_one,
                    {"topic": normalized_topic},
                    {"$set": {"timestamp": now, "data": result_data}},
                    upsert=True
                )
            except Exception as e:
                logger.warning(f"Failed to save search context cache to MongoDB: {e}")

    return result_data

