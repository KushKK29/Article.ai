"""
Checks whether the Gemini API is reachable and the configured key/model work.

Usage:
    .venv/bin/python check_gemini.py
    .venv/bin/python check_gemini.py --model gemini-3-flash-preview
"""

import argparse
import os
import sys
import time

from dotenv import load_dotenv

load_dotenv()

DEFAULT_MODEL = "gemini-3-flash-preview"


def main() -> int:
    parser = argparse.ArgumentParser(description="Check Gemini API availability.")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Model to test (default: {DEFAULT_MODEL})")
    args = parser.parse_args()

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("FAIL: GEMINI_API_KEY is not set in the environment / .env file.")
        return 1

    try:
        from google import genai
    except ImportError:
        print("FAIL: the 'google-genai' package is not installed in this environment.")
        return 1

    print(f"Checking Gemini API — model: {args.model}")
    client = genai.Client(api_key=api_key)

    start = time.monotonic()
    try:
        response = client.models.generate_content(
            model=args.model,
            contents="Reply with exactly one word: OK",
        )
        elapsed = time.monotonic() - start
    except Exception as exc:
        elapsed = time.monotonic() - start
        print(f"FAIL: request errored after {elapsed:.2f}s")
        print(f"  {type(exc).__name__}: {exc}")
        return 1

    text = (response.text or "").strip()
    print(f"OK: Gemini API responded in {elapsed:.2f}s")
    print(f"  Response: {text!r}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
