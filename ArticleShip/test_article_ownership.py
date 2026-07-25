# ArticleShip/test_article_ownership.py
"""Requires MONGODB_URI configured (uses the real dev DB, writes+deletes one throwaway doc)."""
import os
from fastapi.testclient import TestClient
from main import app
from services.article_store import save_article, list_articles, publish_article, _get_collection
from services.auth import create_access_token

client = TestClient(app)

# publish_article() enforces readiness (title, >=300 chars visible content, a primary
# keyword) and derives its own slug -- it does not take a `slug` kwarg. Build a payload
# that clears those checks instead of trying to dictate the slug directly.
_READY_PAYLOAD = {
    "seo_data": {"category": "Test", "primary_keyword": "galley proof testing"},
    "structure": {"h1": "Galley Proof Draft Protection"},
    "content": "<p>" + ("Lorem ipsum dolor sit amet, consectetur adipiscing elit. " * 8) + "</p>",
}

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

def test_published_article_visible_without_auth():
    article = save_article("Public Test", _READY_PAYLOAD, user_id="owner-1")
    try:
        published = publish_article(article["id"])
        assert published["status"] == "published"
        assert published["slug"]

        resp = client.get("/api/v1/articles", params={"slug": published["slug"]})
        assert resp.status_code == 200
        assert resp.json()["article"]["id"] == article["id"]
    finally:
        _get_collection().delete_one({"id": article["id"]})

def test_draft_article_hidden_from_non_owner():
    article = save_article("Draft Test", _READY_PAYLOAD, user_id="owner-2")
    # drafts have slug=None; simulate a guessed/leaked slug by setting one directly
    # while leaving status="draft" -- this is the "galley proof" scenario the route
    # comment describes: a slug alone must not bypass the draft/owner check.
    _get_collection().update_one({"id": article["id"]}, {"$set": {"slug": "leaked-draft-slug"}})
    try:
        resp_no_auth = client.get("/api/v1/articles", params={"slug": "leaked-draft-slug"})
        assert resp_no_auth.status_code == 404

        other_user_token = create_access_token("someone-else-id", "someone-else@example.com")
        resp_other = client.get(
            "/api/v1/articles", params={"slug": "leaked-draft-slug"},
            headers={"Authorization": f"Bearer {other_user_token}"},
        )
        assert resp_other.status_code == 404

        malformed_resp = client.get(
            "/api/v1/articles", params={"slug": "leaked-draft-slug"},
            headers={"Authorization": "Bearer not-a-real-jwt"},
        )
        assert malformed_resp.status_code == 404

        owner_token = create_access_token("owner-2", "owner2@example.com")
        resp_owner = client.get(
            "/api/v1/articles", params={"slug": "leaked-draft-slug"},
            headers={"Authorization": f"Bearer {owner_token}"},
        )
        assert resp_owner.status_code == 200
        assert resp_owner.json()["article"]["id"] == article["id"]

        admin_token = create_access_token("admin-id", "kush282930@gmail.com")
        resp_admin = client.get(
            "/api/v1/articles", params={"slug": "leaked-draft-slug"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp_admin.status_code == 200
        assert resp_admin.json()["article"]["id"] == article["id"]
    finally:
        _get_collection().delete_one({"id": article["id"]})

def test_archive_listing_shows_others_published_but_not_others_drafts():
    my_draft = save_article("My Draft", {"seo_data": {"category": "Test"}}, user_id="viewer-1")
    other_draft = save_article("Other Draft", {"seo_data": {"category": "Test"}}, user_id="other-1")
    other_published = save_article("Other Published", _READY_PAYLOAD, user_id="other-1")
    try:
        other_published = publish_article(other_published["id"])
        assert other_published["status"] == "published"

        viewer_token = create_access_token("viewer-1", "viewer1@example.com")
        resp = client.get("/api/v1/articles", headers={"Authorization": f"Bearer {viewer_token}"})
        assert resp.status_code == 200
        ids = {a["id"] for a in resp.json()["articles"]}

        assert my_draft["id"] in ids
        assert other_published["id"] in ids
        assert other_draft["id"] not in ids
    finally:
        _get_collection().delete_one({"id": my_draft["id"]})
        _get_collection().delete_one({"id": other_draft["id"]})
        _get_collection().delete_one({"id": other_published["id"]})

if __name__ == "__main__":
    test_save_article_persists_user_id()
    test_list_articles_filters_by_user_id()
    test_published_article_visible_without_auth()
    test_draft_article_hidden_from_non_owner()
    test_archive_listing_shows_others_published_but_not_others_drafts()
    print("OK")
