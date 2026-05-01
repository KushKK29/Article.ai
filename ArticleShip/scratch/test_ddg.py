from ddgs import DDGS
import json

def test_search():
    queries = ["apple", "use of ai in students life", "ai in education"]
    for q in queries:
        print(f"\nTesting: '{q}'")
        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(q, max_results=5))
                print(f"Results: {len(results)}")
                for r in results[:2]:
                    print(f"  - {r.get('title')}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    test_search()
