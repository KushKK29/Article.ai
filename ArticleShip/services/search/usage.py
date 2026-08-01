import json
import logging
from datetime import datetime, timezone
from services.search.config import USAGE_FILE, PROVIDER_LIMITS

logger = logging.getLogger(__name__)

def _get_current_month() -> str:
    """Returns current month in YYYY-MM format."""
    return datetime.now(timezone.utc).strftime("%Y-%m")

def _initialize_usage_file() -> dict:
    """Creates a fresh usage.json with 0 values and the current month."""
    current_month = _get_current_month()
    default_data = {
        "tavily": 0,
        "exa": 0,
        "brave": 0,
        "serpapi": 0,
        "month": current_month
    }
    try:
        USAGE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(USAGE_FILE, "w") as f:
            json.dump(default_data, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to initialize usage file: {e}")
    return default_data

def get_usage() -> dict:
    """Reads usage.json, automatically resetting if the month has changed."""
    if not USAGE_FILE.exists():
        return _initialize_usage_file()

    try:
        with open(USAGE_FILE, "r") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        logger.warning(f"Malformed usage file, re-initializing: {e}")
        return _initialize_usage_file()

    current_month = _get_current_month()
    if data.get("month") != current_month:
        logger.info(f"Month changed from {data.get('month')} to {current_month}. Resetting quotas.")
        return _initialize_usage_file()

    # Ensure all providers exist in the dict
    updated = False
    for p in PROVIDER_LIMITS:
        if p not in data:
            data[p] = 0
            updated = True
    if updated:
        try:
            with open(USAGE_FILE, "w") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to write updated usage file: {e}")

    return data

def get_provider_limit(provider: str) -> int:
    """Returns the monthly limit for a provider."""
    return PROVIDER_LIMITS.get(provider.lower(), 1000)

def get_remaining_quota(provider: str) -> int:
    """Returns the remaining monthly quota for a provider."""
    provider = provider.lower()
    usage_data = get_usage()
    used = usage_data.get(provider, 0)
    limit = get_provider_limit(provider)
    return max(0, limit - used)

def increment_provider_usage(provider: str) -> None:
    """Increments usage counter for a given provider."""
    provider = provider.lower()
    usage_data = get_usage()
    usage_data[provider] = usage_data.get(provider, 0) + 1
    try:
        with open(USAGE_FILE, "w") as f:
            json.dump(usage_data, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to increment usage for {provider}: {e}")
