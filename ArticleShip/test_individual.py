import asyncio
import os
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).resolve().parent))

from services.search.providers import TavilyProvider, ExaProvider
from services.search.config import TAVILY_API_KEY, EXA_API_KEY

async def test_tavily():
    print("--- Testing Tavily Provider ---")
    provider = TavilyProvider(TAVILY_API_KEY)
    if not provider.api_key:
        print("Tavily API Key is missing from .env")
        return
    try:
        res = await provider.search("AI agents autonomy", count=1)
        if res.results:
            top = res.results[0]
            print("Tavily Success!")
            print(f"Title: {top.title}")
            print(f"URL: {top.url}")
            print(f"Snippet: {top.content[:150]}...")
        else:
            print("Tavily returned 0 results.")
    except Exception as e:
        print(f"Tavily Failed: {e}")

async def test_exa():
    print("\n--- Testing Exa Provider ---")
    provider = ExaProvider(EXA_API_KEY)
    if not provider.api_key:
        print("Exa API Key is missing from .env")
        return
    try:
        res = await provider.search("AI agents autonomy", count=1)
        if res.results:
            top = res.results[0]
            print("Exa Success!")
            print(f"Title: {top.title}")
            print(f"URL: {top.url}")
            print(f"Snippet: {top.content[:150]}...")
        else:
            print("Exa returned 0 results.")
    except Exception as e:
        print(f"Exa Failed: {e}")

async def main():
    await test_tavily()
    await test_exa()

if __name__ == "__main__":
    asyncio.run(main())
