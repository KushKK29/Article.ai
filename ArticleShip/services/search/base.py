from abc import ABC, abstractmethod
from typing import Dict, Any, List
import httpx
import logging
import asyncio
from services.search.models import UnifiedSearchResponse
from services.search.usage import get_remaining_quota, increment_provider_usage

logger = logging.getLogger(__name__)

class SearchError(Exception):
    """Base exception for search service errors."""
    pass

class InvalidAPIKeyError(SearchError):
    """Raised when an API key is rejected or missing."""
    pass

class QuotaExceededError(SearchError):
    """Raised when the provider quota or limits are reached."""
    pass

class RateLimitError(SearchError):
    """Raised when a 429 Rate Limit response is returned."""
    pass

class BaseSearchProvider(ABC):
    def __init__(self, api_key: str, name: str):
        self.api_key = api_key
        self.name = name.lower()

    @property
    def has_valid_key(self) -> bool:
        """Returns True if the API key is set and non-empty."""
        return bool(self.api_key and self.api_key.strip())

    @property
    def remaining_quota(self) -> int:
        """Returns the remaining monthly quota from usage.json."""
        return get_remaining_quota(self.name)

    def is_available(self) -> bool:
        """Checks if the provider is configured and has quota left."""
        if not self.has_valid_key:
            return False
        return self.remaining_quota > 0

    @abstractmethod
    async def search(self, query: str, count: int = 5) -> UnifiedSearchResponse:
        """Performs search request to provider and returns standardized response."""
        pass
