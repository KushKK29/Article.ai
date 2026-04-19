import os
import re
import asyncio
import httpx
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY", "")
GOOGLE_SEARCH_API_KEY = os.getenv("GOOGLE_SEARCH_API_KEY", "")
GOOGLE_SEARCH_CX = os.getenv("GOOGLE_SEARCH_CX", "")
POLLEN_API_KEY = os.getenv("POLLEN_API_KEY", "") or os.getenv("pollen_api_key", "")  # Your Pollen/AI image generation key

STOPWORDS = {
    "a", "an", "the", "and", "but", "if", "or", "because", "as", "what", "which",
    "this", "that", "these", "those", "then", "just", "so", "than", "such",
    "both", "through", "about", "for", "is", "of", "while", "during", "to",
    "how", "why", "who", "where", "when", "are", "in", "on", "at", "by", "with",
    "from", "into", "onto", "upon", "out", "over", "after", "before", "between",
    "among", "under", "below", "behind", "can", "could", "will", "would", "should",
    "do", "does", "did", "may", "might", "must", "very", "really", "using",
    "without", "vs", "your", "step", "guide", "building", "understanding",
}

# Used to detect tool-specific H3 blocks → route to Google instead of Unsplash
KNOWN_TOOLS = {
    "otter", "zotero", "notion", "chatgpt", "claude", "grammarly", "hemingway",
    "elicit", "consensus", "perplexity", "reclaim", "motion", "fireflies",
    "software", "app", "dashboard", "tool", "copilot", "obsidian", "gpt",
}

_EMPTY_IMAGE: Dict[str, Any] = {"url": None, "alt": "", "source": None, "credit": None}

# Cap concurrent AI image generation requests to avoid rate limits
_AI_SEMAPHORE = asyncio.Semaphore(3)


def heading_to_query(heading: str, max_words: int = 5) -> str:
    """Strip markdown, punctuation, and stopwords → clean image search query."""
    clean = re.sub(r"[^\w\s]", "", heading.replace("#", "")).lower()
    words = [w for w in clean.split() if w not in STOPWORDS and len(w) > 1]
    return " ".join(words[:max_words])


def _has_tool_mention(block: Dict[str, Any]) -> bool:
    """
    Check both heading AND content for tool names.
    Fixes the bug where "What are the best free ai tools...Zotero, Perplexity..."
    was not detected because the tools were in the content, not the heading.
    """
    heading_text = block.get("heading_text") or re.sub(r"^#+\s*", "", block.get("heading", ""))
    content = block.get("content", "")
    combined = (heading_text + " " + content).lower()
    return any(tool in combined for tool in KNOWN_TOOLS)


def should_embed_image(block: Dict[str, Any]) -> tuple[bool, str | None]:
    """
    Decides if an image should be fetched and from which source.
    Returns (should_embed, 'unsplash' | 'google' | None)

    Rules:
      H1  → always, Unsplash (hero image)
      H2  → always, Unsplash (section image)
      H3  → Google if heading OR content references a known tool; else skip
      H4+ → never
    """
    level = block.get("level", 0)

    if level == 1:
        return True, "unsplash"
    elif level == 2:
        return True, "unsplash"
    elif level == 3:
        if _has_tool_mention(block):
            return True, "google"
        return True, "unsplash"
    return False, None


async def fetch_unsplash_image(client: httpx.AsyncClient, query: str) -> Dict[str, Any]:
    """
    Fetch a landscape photo from Unsplash.
    If the specific query returns no results, retries with a broader 2-word fallback
    so H1/H2 blocks never silently end up without an image.
    """
    if not UNSPLASH_ACCESS_KEY:
        logger.warning("UNSPLASH_ACCESS_KEY not set.")
        return {**_EMPTY_IMAGE, "alt": query}

    # Try the full query first, then a shorter fallback if nothing comes back
    queries_to_try = [query, " ".join(query.split()[:2])]

    for attempt_query in queries_to_try:
        try:
            r = await client.get(
                "https://api.unsplash.com/search/photos",
                params={
                    "query": attempt_query,
                    "per_page": 1,
                    "orientation": "landscape",
                    "content_filter": "high",
                },
                headers={"Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"},
            )
            r.raise_for_status()
            results = r.json().get("results", [])
            if results:
                img = results[0]
                return {
                    "url": img["urls"]["regular"],
                    "alt": img.get("alt_description") or attempt_query,
                    "source": "unsplash",
                    "credit": img["user"]["name"],
                    "credit_url": img["user"]["links"]["html"],
                }
            logger.info("Unsplash: no results for '%s', trying broader query.", attempt_query)
        except httpx.HTTPStatusError as e:
            logger.error("Unsplash API error %s for '%s'", e.response.status_code, attempt_query)
            break  # Don't retry on auth/rate-limit errors
        except Exception as e:
            logger.error("Unsplash fetch failed for '%s': %s", attempt_query, e)
            break

    return {**_EMPTY_IMAGE, "alt": query}


async def fetch_google_image(client: httpx.AsyncClient, query: str) -> Dict[str, Any]:
    """Fetch a product/tool screenshot from Google Custom Search."""
    if not GOOGLE_SEARCH_API_KEY or not GOOGLE_SEARCH_CX:
        logger.warning("Google Search API key or CX not set.")
        return {**_EMPTY_IMAGE, "alt": query}

    try:
        r = await client.get(
            "https://www.googleapis.com/customsearch/v1",
            params={
                "key": GOOGLE_SEARCH_API_KEY,
                "cx": GOOGLE_SEARCH_CX,
                "q": query,
                "searchType": "image",
                "num": 1,
                "imgSize": "large",
                "safe": "active",
            },
        )
        r.raise_for_status()
        items = r.json().get("items", [])
        if items:
            img = items[0]
            return {
                "url": img["link"],
                "alt": img.get("title", query),
                "source": "google",
                "credit": img.get("displayLink", ""),
                "credit_url": img.get("image", {}).get("contextLink", ""),
            }
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 429:
            logger.warning("Google CSE rate limit hit (100/day free tier).")
        else:
            logger.error("Google API error %s for '%s'", e.response.status_code, query)
    except Exception as e:
        logger.error("Google fetch failed for '%s': %s", query, e)

    return {**_EMPTY_IMAGE, "alt": query}


async def fetch_pollen_image(client: httpx.AsyncClient, query: str) -> Dict[str, Any]:
    """
    Generate an AI image using Pollinations.ai (no API key required)
    """

    prompt = (
        f"Stylized editorial illustration about {query}, "
        "highly detailed, beautiful lighting, professional, clean background."
    )

    try:
        url = f"https://image.pollinations.ai/prompt/{prompt.replace(' ', '%20')}"

        return {
            "url": url,
            "alt": prompt,
            "source": "pollinations_ai",
            "credit": "AI Generated",
            "credit_url": "",
        }

    except Exception as e:
        logger.error("Pollinations AI failed for '%s': %s", query, e)

    return {**_EMPTY_IMAGE, "alt": query}


async def process_single_block(
    client: httpx.AsyncClient,
    block: Dict[str, Any],
    ai_generated: bool = False,
) -> Dict[str, Any]:
    """
    Fetches or generates an image for a single article block.

    Args:
        ai_generated: If True, H1/H2 concept images use Pollen AI generation
                      with Unsplash as automatic fallback.
                      H3 tool images always use Google regardless of this flag.
    """
    needs_image, source = should_embed_image(block)

    if not needs_image or not source:
        return block

    if source == "google":
        # Tool/product blocks → always Google
        query = heading_to_query(
            block.get("heading_text") or block.get("heading", ""), max_words=6
        )
        image_data = await fetch_google_image(client, query)
        # Fallback to Unsplash if Google Search fails or keys are missing
        if not image_data.get("url"):
            logger.info("Google Search failed for '%s', falling back to Unsplash.", query)
            image_data = await fetch_unsplash_image(client, query)
    else:
        # Hero/concept blocks → Pollen AI or Unsplash
        query = heading_to_query(block.get("heading_text") or block.get("heading", ""))
        if ai_generated:
            image_data = await fetch_pollen_image(client, query)
            # Graceful fallback: if AI fails, try Unsplash
            if not image_data.get("url"):
                logger.info("Pollen AI failed for '%s', falling back to Unsplash.", query)
                image_data = await fetch_unsplash_image(client, query)
        else:
            image_data = await fetch_unsplash_image(client, query)

    if image_data.get("url"):
        block["image"] = image_data

    return block


async def embed_images_in_article(
    blocks: List[Dict[str, Any]],
    ai_generated: bool = False,
) -> List[Dict[str, Any]]:
    """
    Concurrently fetches or generates images for all eligible blocks.
    Blocks that don't need images, or where all sources fail, are returned unchanged.

    Args:
        blocks:        mapped_article list from your article mapper.
        ai_generated:  If True, H1/H2 images are generated via Pollen AI
                       (falls back to Unsplash on failure).
                       H3 tool screenshots always use Google regardless.

    Returns:
        The same list with an "image" field added to eligible blocks.
    """
    import copy

    async with httpx.AsyncClient(timeout=httpx.Timeout(25.0, connect=10.0)) as client:
        tasks = [
            process_single_block(client, copy.deepcopy(block), ai_generated)
            for block in blocks
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    output = []
    for original, result in zip(blocks, results):
        if isinstance(result, Exception):
            logger.error(
                "Unexpected error processing block '%s': %s",
                original.get("heading", "?"),
                result,
            )
            output.append(original)
        else:
            output.append(result)

    return output