import asyncio
from ddgs import DDGS
from typing import Dict, Any, List

def _ddg_search_sync(query: str, count: int = 10) -> List[Dict[str, Any]]:
    """
    Synchronous wrapper for DuckDuckGo search using the ddgs package.
    """
    safe_count = int(count) if count and count > 0 else 10
    with DDGS() as ddgs:
        return list(ddgs.text(str(query), max_results=safe_count))

async def perform_ddg_search(query: str, count: int = 10) -> Dict[str, Any]:
    """
    Performs a web search using DuckDuckGo.
    """
    try:
        results = await asyncio.to_thread(_ddg_search_sync, query, count)
        return {
            "query": query,
            "count": len(results),
            "results": results
        }
    except Exception as e:
        print(f"DDG Search Error: {str(e)}")
        return {
            "query": query,
            "count": 0,
            "results": [],
            "error": str(e)
        }
