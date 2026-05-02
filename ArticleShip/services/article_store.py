import os
import re
import zlib
from base64 import b64decode, b64encode
from datetime import datetime, timezone
from typing import Any, Dict, List
from uuid import uuid4

from dotenv import load_dotenv
from pymongo import MongoClient


load_dotenv()


_CONTENT_COMPRESSION_PREFIX = "zlib64:"


def _get_collection():
    mongo_uri = os.getenv("MONGODB_URI", "").strip()
    if not mongo_uri:
        raise ValueError("MONGODB_URI is not configured")

    db_name = os.getenv("MONGODB_DB_NAME", "articleship").strip() or "articleship"
    collection_name = os.getenv("MONGODB_COLLECTION", "articles").strip() or "articles"

    client = MongoClient(mongo_uri)
    return client[db_name][collection_name]


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9\s-]", "", value)
    value = re.sub(r"[\s-]+", "-", value)
    return value.strip("-") or "article"


def _strip_html(value: str) -> str:
    return re.sub(r"<[^>]+>", " ", value or "")


def _article_title(article: Dict[str, Any]) -> str:
    payload = article.get("payload", {}) or {}
    structure = payload.get("structure", {}) or {}
    meta = payload.get("meta", {}) or {}
    return (
        str(structure.get("h1") or meta.get("title") or article.get("topic") or "Article")
        .strip()
    )


def _has_keywords(payload: Dict[str, Any], topic: str = "") -> bool:
    keywords = payload.get("keywords", {}) or payload.get("seo_data", {}) or {}
    if not isinstance(keywords, dict):
        keywords = {}

    primary = str(keywords.get("primary_keyword", "") or "").strip()
    if primary:
        return True

    # Legacy payload fallback: early pipeline versions stored only meta.primary_keyword.
    meta = payload.get("meta", {}) or {}
    if isinstance(meta, dict) and str(meta.get("primary_keyword", "")).strip():
        return True

    secondary = keywords.get("secondary_keywords") or []
    long_tail = keywords.get("long_tail_keywords") or []
    lsi = keywords.get("lsi_keywords") or []
    if any([secondary, long_tail, lsi]):
        return True

    # Last compatibility fallback: allow legacy articles with a meaningful title/topic.
    structure = payload.get("structure", {}) or {}
    h1 = str(structure.get("h1", "") or "").strip() if isinstance(structure, dict) else ""
    meta_title = str(meta.get("title", "") or "").strip() if isinstance(meta, dict) else ""
    topic_text = str(topic or "").strip()
    return bool(h1 or meta_title or topic_text)


def _flatten_block_content(blocks: Any) -> str:
    if not isinstance(blocks, list):
        return ""

    parts: List[str] = []
    for block in blocks:
        if not isinstance(block, dict):
            continue
        text = str(block.get("content", "") or "").strip()
        if text:
            parts.append(text)

    return "\n".join(parts)


def _content_ready(payload: Dict[str, Any]) -> bool:
    content = str(payload.get("content", "") or "").strip()
    if not content:
        # Backward compatibility: older payloads may only persist block-level content.
        content = _flatten_block_content(payload.get("blocks"))

    visible_length = len(_strip_html(content).strip())
    return visible_length >= 300


def _slug_exists(collection, slug: str, current_id: str | None = None) -> bool:
    query: Dict[str, Any] = {"slug": slug}
    if current_id:
        query["id"] = {"$ne": current_id}
    return collection.find_one(query, {"_id": 1}) is not None


def _generate_unique_slug(collection, base_title: str, current_id: str | None = None) -> str:
    base_slug = _slugify(base_title)
    candidate = base_slug
    counter = 2
    while _slug_exists(collection, candidate, current_id=current_id):
        candidate = f"{base_slug}-{counter}"
        counter += 1
    return candidate


def _compress_content(value: str) -> str:
    raw = value.encode("utf-8")
    compressed = zlib.compress(raw, level=9)

    # Skip compression if it does not save space.
    if len(compressed) >= len(raw):
        return value

    encoded = b64encode(compressed).decode("ascii")
    return f"{_CONTENT_COMPRESSION_PREFIX}{encoded}"


def _decompress_content(value: Any) -> str:
    if not isinstance(value, str):
        return str(value or "")

    if not value.startswith(_CONTENT_COMPRESSION_PREFIX):
        return value

    encoded = value[len(_CONTENT_COMPRESSION_PREFIX):]
    try:
        compressed = b64decode(encoded)
        return zlib.decompress(compressed).decode("utf-8")
    except Exception:
        # If decode fails, return the original string to avoid hard-read failures.
        return value


def _encode_payload_for_storage(payload: Dict[str, Any]) -> Dict[str, Any]:
    encoded_payload = dict(payload or {})
    content = encoded_payload.get("content")

    if isinstance(content, str) and content:
        encoded_payload["content"] = _compress_content(content)

    return encoded_payload


def _decode_payload_from_storage(payload: Dict[str, Any]) -> Dict[str, Any]:
    decoded_payload = dict(payload or {})

    if "content" in decoded_payload:
        decoded_payload["content"] = _decompress_content(decoded_payload.get("content"))

    return decoded_payload


def _decode_article_from_storage(article: Dict[str, Any] | None) -> Dict[str, Any] | None:
    if not article:
        return None

    decoded_article = dict(article)
    raw_view_count = decoded_article.get("viewCount", 0)
    decoded_article["viewCount"] = raw_view_count if isinstance(raw_view_count, int) and raw_view_count >= 0 else 0
    decoded_article["payload"] = _decode_payload_from_storage(decoded_article.get("payload", {}) or {})
    return decoded_article


def save_article(topic: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    collection = _get_collection()
    stored_payload = _encode_payload_for_storage(payload)

    # Hoist category to a top-level field so we can query without deserialising the payload.
    seo_data = payload.get("seo_data") or payload.get("keywords") or {}
    category = str(seo_data.get("category") or "").strip() or "General"

    article = {
        "id": uuid4().hex,
        "topic": topic,
        "category": category,
        "createdAt": _utc_now_iso(),
        "updatedAt": _utc_now_iso(),
        "status": "draft",
        "slug": None,
        "publishedAt": None,
        "viewCount": 0,
        "lastViewedAt": None,
        "payload": stored_payload,
    }
    collection.insert_one(article)
    article.pop("_id", None)
    return _decode_article_from_storage(article) or article


def get_article_by_id(article_id: str) -> Dict[str, Any] | None:
    collection = _get_collection()
    article = collection.find_one({"id": article_id}, {"_id": 0})
    return _decode_article_from_storage(article)


def list_articles(slug: str | None = None, status: str | None = None) -> List[Dict[str, Any]]:
    collection = _get_collection()
    query: Dict[str, Any] = {}
    if slug:
        query["slug"] = slug
    if status:
        query["status"] = status
    docs = list(collection.find(query, {"_id": 0}).sort("createdAt", -1))
    return [
        _decode_article_from_storage(doc) or doc
        for doc in docs
    ]


def list_articles_by_category(category: str, exclude_topic: str = "") -> List[Dict[str, str]]:
    """
    Returns a lightweight list of {title, slug, publishedUrl} for published articles
    in the given category.  Used to build the internal-link candidate list.
    Only published articles with a real slug are included.
    """
    collection = _get_collection()
    query: Dict[str, Any] = {
        "status": "published",
        "category": category,
        "slug": {"$nin": [None, ""]},
    }
    docs = list(
        collection.find(
            query,
            {"_id": 0, "topic": 1, "slug": 1, "publishedUrl": 1, "payload": 1},
        ).sort("publishedAt", -1)
    )

    results: List[Dict[str, str]] = []
    for doc in docs:
        # Derive the human-readable title from the stored payload (same logic as _article_title).
        payload = doc.get("payload") or {}
        structure = payload.get("structure") or {}
        meta = payload.get("meta") or {}
        title = (
            str(structure.get("h1") or meta.get("title") or doc.get("topic") or "").strip()
        )
        if not title:
            continue

        # Skip the article being generated right now to avoid self-links.
        if exclude_topic and title.lower() == exclude_topic.lower():
            continue

        published_url = str(doc.get("publishedUrl") or f"/blog/{doc['slug']}").strip()
        results.append({"title": title, "url": published_url})

    return results


def get_article_by_slug(slug: str) -> Dict[str, Any] | None:
    collection = _get_collection()
    article = collection.find_one({"slug": slug}, {"_id": 0})
    return _decode_article_from_storage(article)


def delete_article(article_id: str) -> bool:
    collection = _get_collection()
    result = collection.delete_one({"id": article_id})
    return result.deleted_count > 0


def track_article_view(article_id: str) -> Dict[str, Any]:
    collection = _get_collection()
    viewed_at = _utc_now_iso()
    collection.update_one(
        {"id": article_id},
        {
            "$inc": {"viewCount": 1},
            "$set": {"lastViewedAt": viewed_at},
        },
    )

    updated_article = _decode_article_from_storage(collection.find_one({"id": article_id}, {"_id": 0}))
    if not updated_article:
        raise ValueError("Article not found")
    return updated_article


def publish_article(article_id: str) -> Dict[str, Any]:
    collection = _get_collection()
    article = _decode_article_from_storage(collection.find_one({"id": article_id}, {"_id": 0}))
    if not article:
        raise ValueError("Article not found")

    payload = article.get("payload", {}) or {}
    title = _article_title(article)

    if not title:
        raise ValueError("Article not ready: missing title")
    if not _content_ready(payload):
        raise ValueError("Article not ready: add at least 300 characters of content")
    if not _has_keywords(payload, str(article.get("topic", "") or "")):
        raise ValueError("Article not ready: missing SEO keywords")

    current_slug = str(article.get("slug") or "").strip()
    if current_slug and article.get("status") == "published":
        published_slug = current_slug
    else:
        published_slug = _generate_unique_slug(collection, title, current_id=article_id)

    published_at = _utc_now_iso()
    collection.update_one(
        {"id": article_id},
        {
            "$set": {
                "status": "published",
                "slug": published_slug,
                "publishedAt": published_at,
                "updatedAt": published_at,
                "publishedUrl": f"/blog/{published_slug}",
            }
        },
    )

    updated_article = _decode_article_from_storage(collection.find_one({"id": article_id}, {"_id": 0}))
    if not updated_article:
        raise ValueError("Unable to load published article")
    return updated_article


def update_article(article_id: str, topic: str | None, payload: Dict[str, Any]) -> Dict[str, Any]:
    collection = _get_collection()
    article = _decode_article_from_storage(collection.find_one({"id": article_id}, {"_id": 0}))
    if not article:
        raise ValueError("Article not found")

    current_topic = topic.strip() if isinstance(topic, str) and topic.strip() else str(article.get("topic", "")).strip()
    updated_at = _utc_now_iso()
    stored_payload = _encode_payload_for_storage(payload)
    collection.update_one(
        {"id": article_id},
        {
            "$set": {
                "topic": current_topic,
                "payload": stored_payload,
                "status": "draft",
                "slug": None,
                "publishedAt": None,
                "publishedUrl": None,
                "updatedAt": updated_at,
            }
        },
    )

    updated_article = _decode_article_from_storage(collection.find_one({"id": article_id}, {"_id": 0}))
    if not updated_article:
        raise ValueError("Unable to load updated article")
    return updated_article
