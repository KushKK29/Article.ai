import os
import zlib
from base64 import b64decode, b64encode
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse
from uuid import uuid4

from dotenv import load_dotenv
from pymongo import MongoClient


load_dotenv()

_TEXT_COMPRESSION_PREFIX = "zlib64:"
_GLOBAL_PROFILE_NAME = "global"


@lru_cache(maxsize=1)
def _client() -> MongoClient:
    # Cached singleton — see services/auth.py for why this must not be
    # re-created on every call (each MongoClient owns its own connection pool).
    mongo_uri = os.getenv("MONGODB_URI", "").strip()
    if not mongo_uri:
        raise ValueError("MONGODB_URI is not configured")
    return MongoClient(mongo_uri)


def _db_name() -> str:
    return os.getenv("MONGODB_DB_NAME", "articleship").strip() or "articleship"


def _get_sources_collection():
    name = os.getenv("MONGODB_STYLE_SOURCES_COLLECTION", "style_sources").strip() or "style_sources"
    return _client()[_db_name()][name]


def _get_profiles_collection():
    name = os.getenv("MONGODB_STYLE_PROFILES_COLLECTION", "style_profiles").strip() or "style_profiles"
    return _client()[_db_name()][name]


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _compress(value: str) -> str:
    raw = value.encode("utf-8")
    compressed = zlib.compress(raw, level=9)
    if len(compressed) >= len(raw):
        return value
    return f"{_TEXT_COMPRESSION_PREFIX}{b64encode(compressed).decode('ascii')}"


def _decompress(value: Any) -> str:
    if not isinstance(value, str) or not value.startswith(_TEXT_COMPRESSION_PREFIX):
        return str(value or "")
    try:
        encoded = value[len(_TEXT_COMPRESSION_PREFIX):]
        return zlib.decompress(b64decode(encoded)).decode("utf-8")
    except Exception:
        return value


def _domain(url: str) -> str:
    try:
        return urlparse(url).netloc.lower().removeprefix("www.")
    except Exception:
        return ""


def source_exists(url: str) -> bool:
    collection = _get_sources_collection()
    return collection.find_one({"url": url}, {"_id": 1}) is not None


def save_style_source(
    url: str,
    text: str,
    features: Dict[str, Any],
    category: str = "General",
) -> Dict[str, Any]:
    collection = _get_sources_collection()
    doc = {
        "id": uuid4().hex,
        "url": url,
        "domain": _domain(url),
        "category": category,
        "text": _compress(text),
        "features": features,
        "status": "ok",
        "error": None,
        "fetchedAt": _utc_now_iso(),
    }
    collection.update_one({"url": url}, {"$set": doc}, upsert=True)
    return doc


def save_style_source_failure(url: str, error: str) -> None:
    collection = _get_sources_collection()
    collection.update_one(
        {"url": url},
        {
            "$set": {
                "id": uuid4().hex,
                "url": url,
                "domain": _domain(url),
                "status": "failed",
                "error": error,
                "fetchedAt": _utc_now_iso(),
            }
        },
        upsert=True,
    )


def list_style_source_features(category: Optional[str] = None) -> List[Dict[str, Any]]:
    collection = _get_sources_collection()
    query: Dict[str, Any] = {"status": "ok"}
    if category:
        query["category"] = category
    docs = collection.find(query, {"_id": 0, "features": 1})
    return [doc["features"] for doc in docs if doc.get("features")]


def save_style_profile(profile: Dict[str, Any], name: str = _GLOBAL_PROFILE_NAME) -> Dict[str, Any]:
    collection = _get_profiles_collection()
    doc = dict(profile)
    doc["name"] = name
    doc["updatedAt"] = _utc_now_iso()
    collection.update_one({"name": name}, {"$set": doc}, upsert=True)
    return doc


def get_style_profile(name: str = _GLOBAL_PROFILE_NAME) -> Optional[Dict[str, Any]]:
    collection = _get_profiles_collection()
    doc = collection.find_one({"name": name}, {"_id": 0})
    return doc
