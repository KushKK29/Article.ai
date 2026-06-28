import json
import logging
import time
from services.search.config import CACHE_FILE, CACHE_TTL

logger = logging.getLogger(__name__)

def _load_cache() -> dict:
    if not CACHE_FILE.exists():
        return {}
    try:
        with open(CACHE_FILE, "r") as f:
            return json.load(f)
    except Exception as e:
        logger.warning(f"Failed to load search cache: {e}")
        return {}

def _save_cache(cache: dict) -> None:
    try:
        CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(CACHE_FILE, "w") as f:
            json.dump(cache, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to save search cache: {e}")

def get_cached_results(query: str) -> dict:
    """Returns cached search results if they exist and are within TTL."""
    cache = _load_cache()
    key = query.strip().lower()
    entry = cache.get(key)
    if entry:
        timestamp = entry.get("timestamp", 0)
        if time.time() - timestamp < CACHE_TTL:
            logger.info(f"Cache hit for query: '{query}'")
            return entry.get("results")
        else:
            # Cache expired
            logger.info(f"Cache expired for query: '{query}'")
            cache.pop(key, None)
            _save_cache(cache)
    return {}

def set_cached_results(query: str, results: dict) -> None:
    """Saves search results to cache with current timestamp."""
    cache = _load_cache()
    key = query.strip().lower()
    
    # Prune expired entries to keep cache size healthy
    now = time.time()
    expired = [k for k, v in cache.items() if now - v.get("timestamp", 0) > CACHE_TTL]
    for k in expired:
        cache.pop(k, None)

    cache[key] = {
        "timestamp": now,
        "results": results
    }
    _save_cache(cache)
