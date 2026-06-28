import asyncio
import os
import sys
from pathlib import Path

# Add project root to path to ensure imports work
sys.path.append(str(Path(__file__).resolve().parent))

from services.search import search, export_results, CACHE_FILE, PROVIDERS
from services.search.models import UnifiedSearchResponse, SearchResult
import services.search.config as config

def patch_mock_providers():
    """Patches search providers to run a simulation without needing active internet/API keys."""
    for provider in PROVIDERS:
        # Patch is_available to only check remaining quota, bypassing key requirement for simulation
        def make_is_available(p_name):
            from services.search.usage import get_remaining_quota
            return lambda: get_remaining_quota(p_name) > 0
        provider.is_available = make_is_available(provider.name)

        # Patch search to return a mock response and increment usage
        def make_mock_search(p_name):
            async def mock_search(query: str, count: int = 5) -> UnifiedSearchResponse:
                # Short sleep to simulate network latency
                await asyncio.sleep(0.1)
                mock_results = [
                    SearchResult(
                        title=f"Mock result 1 from {p_name.capitalize()}",
                        url=f"https://example.com/{p_name}/1",
                        content=f"This is a simulated search result snippet from {p_name} for query: {query}",
                        score=0.9
                    )
                ]
                return UnifiedSearchResponse(
                    query=query,
                    provider=p_name,
                    results=mock_results,
                    total_results=len(mock_results),
                    execution_time_ms=100.0
                )
            return mock_search
        provider.search = make_mock_search(provider.name)

async def run_tests():
    print("=== STARTING SEARCH PROVIDER ROTATION SIMULATION ===")
    
    # 1. Clear usage and cache files for a clean simulation run
    if CACHE_FILE.exists():
        CACHE_FILE.unlink()
    if config.USAGE_FILE.exists():
        config.USAGE_FILE.unlink()

    # Apply mock patches
    patch_mock_providers()

    # Configure very low limits in-place to trigger switching quickly
    config.PROVIDER_LIMITS.clear()
    config.PROVIDER_LIMITS.update({
        "tavily": 2,
        "exa": 1,
        "brave": 1,
        "serpapi": 1
    })

    query = "Autonomous Coding Agents"

    # Test 1: Should run Tavily (First Call)
    print("\n--- Test 1: First Call (Expected: Tavily) ---")
    res = await search(query, count=1)
    print(f"Result Provider: {res['provider']}")
    print(f"Snippet: {res['results'][0]['content']}")

    # Test 2: Should run Tavily (Second Call - hits limit of 2)
    print("\n--- Test 2: Second Call (Expected: Tavily) ---")
    res = await search(query + " 2", count=1)
    print(f"Result Provider: {res['provider']}")

    # Test 3: Should rotate to Exa (Tavily exhausted)
    print("\n--- Test 3: Third Call (Expected: Exa) ---")
    res = await search(query + " 3", count=1)
    print(f"Result Provider: {res['provider']}")

    # Test 4: Should rotate to Brave (Exa limit was 1, now exhausted)
    print("\n--- Test 4: Fourth Call (Expected: Brave) ---")
    res = await search(query + " 4", count=1)
    print(f"Result Provider: {res['provider']}")

    # Test 5: Should rotate to SerpAPI (Brave limit was 1, now exhausted)
    print("\n--- Test 5: Fifth Call (Expected: SerpAPI) ---")
    res = await search(query + " 5", count=1)
    print(f"Result Provider: {res['provider']}")

    # Test 6: All exhausted
    print("\n--- Test 6: Sixth Call (Expected: Quota Exception) ---")
    try:
        await search(query + " 6", count=1)
        print("Error: Should have raised quota error but didn't.")
    except Exception as e:
        print(f"Successfully caught quota error: {e}")

    # Restore default limits in-place
    config.PROVIDER_LIMITS.clear()
    config.PROVIDER_LIMITS.update({
        "tavily": 1000,
        "exa": 1000,
        "brave": 1000,
        "serpapi": 250
    })
    
    # Cleanup files
    if CACHE_FILE.exists():
        CACHE_FILE.unlink()
    if config.USAGE_FILE.exists():
        config.USAGE_FILE.unlink()

    print("\n=== SIMULATION COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    asyncio.run(run_tests())
