import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).resolve().parent))

from services.search import search, export_results

async def main():
    print("Testing active providers from .env (no mocks)...")
    try:
        results = await search("Latest LLM reasoning models", count=2)
        print(f"\n--- SUCCESS ---")
        print(f"Used Provider: {results.get('provider')}")
        print(f"Execution Time: {results.get('execution_time_ms'):.2f} ms")
        print(export_results(results, format_type="markdown"))
    except Exception as e:
        print(f"\n--- FAILED ---")
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
