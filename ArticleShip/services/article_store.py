import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, List
from uuid import uuid4

from dotenv import load_dotenv
from pymongo import MongoClient


load_dotenv()


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


def _has_keywords(payload: Dict[str, Any]) -> bool:
    keywords = payload.get("keywords", {}) or {}
    if not isinstance(keywords, dict):
        return False
    if str(keywords.get("primary_keyword", "")).strip():
        return True
    secondary = keywords.get("secondary_keywords") or []
    long_tail = keywords.get("long_tail_keywords") or []
    lsi = keywords.get("lsi_keywords") or []
    return any([secondary, long_tail, lsi])


def _content_ready(payload: Dict[str, Any]) -> bool:
    content = str(payload.get("content", ""))
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


def save_article(topic: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    collection = _get_collection()
    article = {
        "id": uuid4().hex,
        "topic": topic,
        "createdAt": _utc_now_iso(),
        "updatedAt": _utc_now_iso(),
        "status": "draft",
        "slug": None,
        "publishedAt": None,
        "payload": payload,
    }
    collection.insert_one(article)
    article.pop("_id", None)
    return article


def get_article_by_id(article_id: str) -> Dict[str, Any] | None:
    collection = _get_collection()
    return collection.find_one({"id": article_id}, {"_id": 0})


def list_articles(slug: str | None = None, status: str | None = None) -> List[Dict[str, Any]]:
    collection = _get_collection()
    query: Dict[str, Any] = {}
    if slug:
        query["slug"] = slug
    if status:
        query["status"] = status
    docs = list(collection.find(query, {"_id": 0}).sort("createdAt", -1))
    return docs


def get_article_by_slug(slug: str) -> Dict[str, Any] | None:
    collection = _get_collection()
    article = collection.find_one({"slug": slug}, {"_id": 0})
    return article


def delete_article(article_id: str) -> bool:
    collection = _get_collection()
    result = collection.delete_one({"id": article_id})
    return result.deleted_count > 0


def publish_article(article_id: str) -> Dict[str, Any]:
    collection = _get_collection()
    article = collection.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise ValueError("Article not found")

    payload = article.get("payload", {}) or {}
    title = _article_title(article)

    if not title:
        raise ValueError("Article not ready for publishing")
    if not _content_ready(payload):
        raise ValueError("Article not ready for publishing")
    if not _has_keywords(payload):
        raise ValueError("Article not ready for publishing")

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

    updated_article = collection.find_one({"id": article_id}, {"_id": 0})
    if not updated_article:
        raise ValueError("Unable to load published article")
    return updated_article


def update_article(article_id: str, topic: str | None, payload: Dict[str, Any]) -> Dict[str, Any]:
    collection = _get_collection()
    article = collection.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise ValueError("Article not found")

    current_topic = topic.strip() if isinstance(topic, str) and topic.strip() else str(article.get("topic", "")).strip()
    updated_at = _utc_now_iso()
    collection.update_one(
        {"id": article_id},
        {
            "$set": {
                "topic": current_topic,
                "payload": payload,
                "status": "draft",
                "slug": None,
                "publishedAt": None,
                "publishedUrl": None,
                "updatedAt": updated_at,
            }
        },
    )

    updated_article = collection.find_one({"id": article_id}, {"_id": 0})
    if not updated_article:
        raise ValueError("Unable to load updated article")
    return updated_article
