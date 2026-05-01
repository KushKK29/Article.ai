"""
DDG Health Check Script
=======================
Tests DuckDuckGo search connectivity used by:
  1. Keyword Engine    (keyword_engine.py)
  2. Structure Builder (structure_builder.py)
  3. Article Builder   (article_builder.py)

Run with:
  c:/Users/Kush/OneDrive/kush/ArticleShip/.venv/Scripts/python scratch/health_check_ddg.py
"""

import sys
import time
from ddgs import DDGS

TOPIC = "use of ai in student life"
PASS  = "[PASS]"
FAIL  = "[FAIL]"
WARN  = "[WARN]"
SEP   = "-" * 60
HEAVY = "=" * 60

def search(query: str, max_results: int = 3) -> list:
    with DDGS() as ddgs:
        return list(ddgs.text(query, max_results=max_results))

def run_test(name: str, queries: list, min_expected: int = 1) -> bool:
    print(f"\n{SEP}")
    print(f"  {name}")
    print(SEP)
    total_results = 0
    for query in queries:
        start = time.time()
        try:
            results = search(query, max_results=3)
            elapsed = round(time.time() - start, 2)
            count = len(results)
            total_results += count
            status = PASS if count > 0 else WARN
            print(f"  {status}  [{elapsed}s]  \"{query[:55]}\"  -> {count} result(s)")
            if results:
                title = results[0].get('title', 'N/A')[:65]
                print(f"         First result: {title}")
        except Exception as e:
            elapsed = round(time.time() - start, 2)
            print(f"  {FAIL}  [{elapsed}s]  \"{query[:55]}\"  -> ERROR: {e}")
    
    overall = PASS if total_results >= min_expected else FAIL
    print(f"\n  Overall: {overall}  ({total_results} total results across {len(queries)} queries)")
    return total_results >= min_expected


def test_keyword_engine() -> bool:
    """Replicates query pattern from keyword_engine.py"""
    queries = [
        f"{TOPIC} target audience seo keywords",
    ]
    return run_test("1. Keyword Engine  (keyword_engine.py)", queries)


def test_structure_builder() -> bool:
    """Replicates the 3-query pattern from structure_builder.py"""
    queries = [
        f"{TOPIC} implementation guide",
        f"{TOPIC} common mistakes",
        f"{TOPIC} best practices 2025",
    ]
    return run_test("2. Structure Builder  (structure_builder.py)", queries)


def test_article_builder() -> bool:
    """Replicates the category-based queries from article_builder.py (general category)"""
    queries = [
        f"{TOPIC} real world benefits drawbacks",
        f"{TOPIC} expert analysis opinion",
        f"{TOPIC} research findings data",
        f"site:reddit.com {TOPIC}",
        f"site:news.ycombinator.com {TOPIC}",
    ]
    return run_test("3. Article Builder  (article_builder.py)", queries, min_expected=2)


if __name__ == "__main__":
    print("\n" + HEAVY)
    print("  ArticleShip -- DuckDuckGo Health Check")
    print(f"  Topic: \"{TOPIC}\"")
    print(HEAVY)

    results = {
        "Keyword Engine":    test_keyword_engine(),
        "Structure Builder": test_structure_builder(),
        "Article Builder":   test_article_builder(),
    }

    print("\n" + HEAVY)
    print("  SUMMARY")
    print(HEAVY)
    all_passed = True
    for service, passed in results.items():
        status = PASS if passed else FAIL
        print(f"  {status}  {service}")
        if not passed:
            all_passed = False

    print(HEAVY)
    if all_passed:
        print("  All services have healthy DDG connectivity.\n")
    else:
        print("  Some services failed. Check output above.\n")

    sys.exit(0 if all_passed else 1)
