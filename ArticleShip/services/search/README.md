# Reusable Search Integration Layer

A production-ready, unified search layer in Python that integrates multiple search APIs (Tavily, Exa, Brave, SerpAPI) using free monthly quotas, and automatically handles provider rotation, caching, network retries with exponential backoff, and advanced post-processing (RRF merging, domain-reliability scoring, semantic reranking, HTML highlighting).

## Features
- **Provider Rotation & Fallbacks**: Automatically rotates search providers when one hits its monthly limits or key is missing. Order: Tavily -> Exa -> Brave -> SerpAPI.
- **Monthly Usage Tracking**: Automatically tracks usage inside `usage.json` and resets counters on calendar month transitions.
- **Robust Network Calls**: Employs async request processing using `httpx` and exponential backoff retry.
- **Cache Support**: Local file cache (`search_cache.json`) for queries with a 24-hour Time-to-Live (TTL).
- **Concurrent Search**: Aggregates and merges results from multiple search providers concurrently using Reciprocal Rank Fusion (RRF).
- **RAG Post-Processing**: Includes domain-reliability boosting, token overlap density semantic reranking, and keyword HTML `<mark>` highlights.

## API Setup
Ensure the following variables are present in your `.env` file:
```env
TAVILY_API_KEY=your_key
EXA_API_KEY=your_key
BRAVE_API_KEY=your_key
SERPAPI_API_KEY=your_key
```

## Quick Start
```python
import asyncio
from services.search import search, export_results

async def main():
    # Run a sequential search (default)
    results = await search("AI agent autonomy", count=5)
    print(f"Used Provider: {results['provider']}")
    
    # Export results as markdown
    markdown_output = export_results(results, format_type="markdown")
    print(markdown_output)

asyncio.run(main())
```
