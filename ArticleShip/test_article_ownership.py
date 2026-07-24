# ArticleShip/test_article_ownership.py
"""Requires MONGODB_URI configured (uses the real dev DB, writes+deletes one throwaway doc)."""
import os
from services.article_store import save_article, list_articles, _get_collection

def test_save_article_persists_user_id():
    article = save_article("Ownership Test Topic", {"seo_data": {"category": "Test"}}, user_id="test-user-123")
    try:
        assert article["user_id"] == "test-user-123"
        stored = _get_collection().find_one({"id": article["id"]}, {"_id": 0})
        assert stored["user_id"] == "test-user-123"
    finally:
        _get_collection().delete_one({"id": article["id"]})

def test_list_articles_filters_by_user_id():
    mine = save_article("Mine", {"seo_data": {"category": "Test"}}, user_id="user-a")
    other = save_article("Other", {"seo_data": {"category": "Test"}}, user_id="user-b")
    try:
        mine_list = list_articles(user_id="user-a")
        assert any(a["id"] == mine["id"] for a in mine_list)
        assert not any(a["id"] == other["id"] for a in mine_list)
    finally:
        _get_collection().delete_one({"id": mine["id"]})
        _get_collection().delete_one({"id": other["id"]})

if __name__ == "__main__":
    test_save_article_persists_user_id()
    test_list_articles_filters_by_user_id()
    print("OK")
