import asyncio
import logging
import time
import httpx
from typing import Dict, Any, List
from services.search.config import MAX_RETRIES, BACKOFF_FACTOR, TIMEOUT_SECONDS
from services.search.models import SearchResult, UnifiedSearchResponse
from services.search.base import (
    BaseSearchProvider,
    SearchError,
    InvalidAPIKeyError,
    QuotaExceededError,
    RateLimitError
)

logger = logging.getLogger(__name__)

async def _request_with_retry(
    client: httpx.AsyncClient,
    method: str,
    url: str,
    headers: Dict[str, str] = None,
    params: Dict[str, Any] = None,
    json_data: Dict[str, Any] = None
) -> httpx.Response:
    """Helper to perform requests with exponential backoff retry."""
    last_err = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            if method.upper() == "POST":
                res = await client.post(url, headers=headers, json=json_data, timeout=TIMEOUT_SECONDS)
            else:
                res = await client.get(url, headers=headers, params=params, timeout=TIMEOUT_SECONDS)

            if res.status_code == 200:
                return res

            if res.status_code in (401, 403):
                raise InvalidAPIKeyError(f"Invalid API Key for URL: {url}")
            elif res.status_code == 429:
                logger.warning(f"Rate limited (429) on {url}, attempt {attempt}/{MAX_RETRIES}")
                if attempt == MAX_RETRIES:
                    raise RateLimitError("Rate limit exceeded and max retries reached.")
            elif res.status_code in (402, 422) or "quota exceeded" in res.text.lower():
                raise QuotaExceededError(f"Quota exceeded for provider on URL: {url}")
            else:
                logger.warning(f"Request failed with status {res.status_code} on {url}, attempt {attempt}/{MAX_RETRIES}")

            # Throw generic error if we didn't raise specific exception
            res.raise_for_status()

        except (httpx.RequestError, httpx.HTTPStatusError) as e:
            last_err = e
            if attempt == MAX_RETRIES:
                raise SearchError(f"Network error after {MAX_RETRIES} attempts: {e}")

        # Sleep with exponential backoff
        sleep_time = BACKOFF_FACTOR ** attempt
        await asyncio.sleep(sleep_time)

    raise SearchError(f"Search request failed: {last_err}")


class TavilyProvider(BaseSearchProvider):
    def __init__(self, api_key: str):
        super().__init__(api_key, "tavily")

    async def search(self, query: str, count: int = 5, include_answer: bool = False) -> UnifiedSearchResponse:
        start_time = time.time()
        url = "https://api.tavily.com/search"
        payload = {
            "api_key": self.api_key,
            "query": query,
            "max_results": count,
            "search_depth": "basic",
            "include_answer": include_answer
        }

        async with httpx.AsyncClient() as client:
            try:
                res = await _request_with_retry(client, "POST", url, json_data=payload)
                data = res.json()
                results = []
                for r in data.get("results", []):
                    results.append(SearchResult(
                        title=r.get("title", ""),
                        url=r.get("url", ""),
                        content=r.get("content", ""),
                        score=r.get("score")
                    ))

                elapsed = (time.time() - start_time) * 1000
                return UnifiedSearchResponse(
                    query=query,
                    provider=self.name,
                    results=results,
                    total_results=len(results),
                    execution_time_ms=elapsed,
                    answer=data.get("answer"),
                    follow_up_questions=data.get("follow_up_questions")
                )
            except Exception as e:
                logger.error(f"Tavily search failed: {e}")
                raise


class ExaProvider(BaseSearchProvider):
    def __init__(self, api_key: str):
        super().__init__(api_key, "exa")

    async def search(self, query: str, count: int = 5, type: str = "auto", use_autoprompt: bool = True) -> UnifiedSearchResponse:
        start_time = time.time()
        url = "https://api.exa.ai/search"
        headers = {
            "x-api-key": self.api_key,
            "content-type": "application/json"
        }
        # Nested contents/highlights and type auto as per Exa API setup guide
        payload = {
            "query": query,
            "numResults": count,
            "type": type,
            "useAutoprompt": use_autoprompt,
            "contents": {
                "highlights": True
            }
        }


        async with httpx.AsyncClient() as client:
            try:
                res = await _request_with_retry(client, "POST", url, headers=headers, json_data=payload)
                data = res.json()
                results = []
                for r in data.get("results", []):
                    # Combine highlights into content
                    highlights = r.get("highlights", [])
                    content = " ".join(highlights) if highlights else r.get("text", "")
                    
                    results.append(SearchResult(
                        title=r.get("title") or "Untitled",
                        url=r.get("url", ""),
                        content=content,
                        score=r.get("score"),
                        published_date=r.get("publishedDate")
                    ))

                elapsed = (time.time() - start_time) * 1000
                return UnifiedSearchResponse(
                    query=query,
                    provider=self.name,
                    results=results,
                    total_results=len(results),
                    execution_time_ms=elapsed
                )
            except Exception as e:
                logger.error(f"Exa search failed: {e}")
                raise


class BraveProvider(BaseSearchProvider):
    def __init__(self, api_key: str):
        super().__init__(api_key, "brave")

    async def search(self, query: str, count: int = 5) -> UnifiedSearchResponse:
        start_time = time.time()
        url = "https://api.search.brave.com/res/v1/web/search"
        headers = {
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": self.api_key
        }
        params = {
            "q": query,
            "count": count
        }

        async with httpx.AsyncClient() as client:
            try:
                res = await _request_with_retry(client, "GET", url, headers=headers, params=params)
                data = res.json()
                web_results = data.get("web", {}).get("results", [])
                
                results = []
                for r in web_results:
                    results.append(SearchResult(
                        title=r.get("title", ""),
                        url=r.get("url", ""),
                        content=r.get("description", "")
                    ))

                elapsed = (time.time() - start_time) * 1000
                return UnifiedSearchResponse(
                    query=query,
                    provider=self.name,
                    results=results,
                    total_results=len(results),
                    execution_time_ms=elapsed
                )
            except Exception as e:
                logger.error(f"Brave search failed: {e}")
                raise


class SerpAPIProvider(BaseSearchProvider):
    def __init__(self, api_key: str):
        super().__init__(api_key, "serpapi")

    async def search(self, query: str, count: int = 5) -> UnifiedSearchResponse:
        start_time = time.time()
        url = "https://serpapi.com/search"
        params = {
            "q": query,
            "api_key": self.api_key,
            "num": count,
            "engine": "google"
        }

        async with httpx.AsyncClient() as client:
            try:
                res = await _request_with_retry(client, "GET", url, params=params)
                data = res.json()
                organic = data.get("organic_results", [])
                
                results = []
                for r in organic:
                    results.append(SearchResult(
                        title=r.get("title", ""),
                        url=r.get("link", ""),
                        content=r.get("snippet", "")
                    ))

                elapsed = (time.time() - start_time) * 1000
                return UnifiedSearchResponse(
                    query=query,
                    provider=self.name,
                    results=results,
                    total_results=len(results),
                    execution_time_ms=elapsed
                )
            except Exception as e:
                logger.error(f"SerpAPI search failed: {e}")
                raise
