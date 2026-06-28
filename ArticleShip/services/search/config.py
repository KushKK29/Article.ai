import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Base directory for the search service
BASE_DIR = Path(__file__).resolve().parent

# File paths
USAGE_FILE = BASE_DIR / "usage.json"
CACHE_FILE = BASE_DIR / "search_cache.json"

# API Keys
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
EXA_API_KEY = os.getenv("EXA_API_KEY")
BRAVE_API_KEY = os.getenv("BRAVE_API_KEY")
SERPAPI_API_KEY = os.getenv("SERPAPI_API_KEY")

# Configurable Monthly Limits
PROVIDER_LIMITS = {
    "tavily": 1000,
    "exa": 1000,
    "brave": 1000,
    "serpapi": 250
}

# Request configuration
TIMEOUT_SECONDS = 15.0
MAX_RETRIES = 3
BACKOFF_FACTOR = 2.0

# Cache configuration
CACHE_TTL = 86400  # 24 hours in seconds
