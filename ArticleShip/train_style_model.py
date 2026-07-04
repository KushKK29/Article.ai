"""
CLI to "train" the writing-style model from a list of human-authored article
URLs: fetches each page, extracts the main article text, computes a
statistical style fingerprint, stores it, then recomputes the aggregate
style profile(s) used by article_builder.build_prompt.

Usage:
    python train_style_model.py links.txt
    python train_style_model.py https://example.com/post-1 https://example.com/post-2
    python train_style_model.py links.txt --refresh   # re-fetch URLs already in the DB
    python train_style_model.py links.txt --concurrency 8
"""
import argparse
import asyncio
import sys
from typing import List

from services.style_profiler import extract_style_features, fetch_article_text, aggregate_style_profile
from services.style_store import (
    save_style_source,
    save_style_source_failure,
    source_exists,
    list_style_source_features,
    save_style_profile,
)
from utils.topic_categorizer import categorize_topic


def _load_urls(args: List[str]) -> List[str]:
    urls: List[str] = []
    for arg in args:
        if arg.startswith("http://") or arg.startswith("https://"):
            urls.append(arg.strip())
        else:
            with open(arg, "r", encoding="utf-8") as f:
                urls.extend(line.strip() for line in f if line.strip() and not line.startswith("#"))
    # de-dupe while preserving order
    seen = set()
    deduped = []
    for u in urls:
        if u not in seen:
            seen.add(u)
            deduped.append(u)
    return deduped


async def _process_url(url: str, semaphore: asyncio.Semaphore) -> str:
    async with semaphore:
        try:
            text = await asyncio.to_thread(fetch_article_text, url)
            features = await asyncio.to_thread(extract_style_features, text)
            category = categorize_topic(text[:500])
            await asyncio.to_thread(save_style_source, url, text, features, category)
            print(f"[ok]     {url}  ({features['word_count']} words, category={category})")
            return "ok"
        except Exception as e:
            await asyncio.to_thread(save_style_source_failure, url, str(e))
            print(f"[failed] {url}  ({e})")
            return "failed"


def _rebuild_profiles() -> None:
    all_features = list_style_source_features()
    if not all_features:
        print("No successful sources yet — nothing to aggregate.")
        return

    global_profile = aggregate_style_profile(all_features)
    save_style_profile(global_profile, name="global")
    print(
        f"\nRebuilt global style profile from {global_profile['source_count']} sources "
        f"({global_profile['total_words_analyzed']:,} words)."
    )

    categories = {"ai", "debug", "seo", "history", "entertainment", "biography", "engineering", "general"}
    for category in categories:
        cat_features = list_style_source_features(category=category)
        if len(cat_features) < 5:
            continue
        cat_profile = aggregate_style_profile(cat_features)
        save_style_profile(cat_profile, name=category)
        print(f"Rebuilt '{category}' style profile from {cat_profile['source_count']} sources.")


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("sources", nargs="+", help="URLs and/or file paths containing one URL per line")
    parser.add_argument("--refresh", action="store_true", help="Re-fetch URLs already stored")
    parser.add_argument("--concurrency", type=int, default=6, help="Max parallel fetches (default 6)")
    args = parser.parse_args()

    urls = _load_urls(args.sources)
    if not args.refresh:
        urls = [u for u in urls if not source_exists(u)]

    if not urls:
        print("Nothing new to process.")
        _rebuild_profiles()
        return

    print(f"Processing {len(urls)} URL(s) with concurrency={args.concurrency}...\n")
    semaphore = asyncio.Semaphore(args.concurrency)
    results = await asyncio.gather(*(_process_url(u, semaphore) for u in urls))

    ok = results.count("ok")
    failed = results.count("failed")
    print(f"\nDone: {ok} succeeded, {failed} failed.")

    _rebuild_profiles()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        sys.exit(1)
