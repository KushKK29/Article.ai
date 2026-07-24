# Per-User Ledger, Free-Tier Cap, Admin, Support Impersonation, and Galley Proof Leak — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a server-side free-tier article cap (5, lifetime) with an admin bypass, scope the manuscript archive and galley-proof draft view to the owning user, and add a support impersonation endpoint — closing two real cross-tenant data leaks along the way.

**Architecture:** A single hardcoded-email privilege module (`ArticleShip/services/privileges.py`) is the source of truth for admin/support status, imported by `main.py`. Article ownership is added via a new `user_id` field on the `articles` collection, threaded through `save_article` at both call sites (HTTP route and background worker). The two article-creation job routes share one gating helper instead of duplicating the free-tier check. Frontend changes are additive: a 402-aware branch in the generate flow, an updated tier-limit constant, and a small impersonation form gated by the logged-in user's own email.

**Tech Stack:** FastAPI + Pydantic + PyMongo (backend), Next.js/React + TypeScript (frontend), pytest-free — this repo uses ad hoc `assert`-based `test_*.py` scripts (see `ArticleShip/test_fixes.py` for the existing style to match), no pytest config present.

## Global Constraints

- Free tier cap: 5 articles, lifetime (not monthly), counted via `usage.completed_jobs`.
- Admin email: `kush282930@gmail.com` — bypasses free-tier cap, sees unfiltered manuscript archive and unfiltered galley-proof drafts, can impersonate.
- Support email: `support@articleship.com` — can impersonate any user; does NOT get the archive/galley-proof bypass (admin-only).
- Impersonation: support authenticates as themselves, then supplies a target email; backend issues a normal-shaped access token for the target user (full access, same as that user's own login) — no new token type, no scoped/read-only token.
- Manuscript archive and galley-proof drafts: every non-admin user sees only their own articles; legacy articles with no `user_id` are effectively admin-only (they match no regular user's filter).
- Galley proof (`/blog/[slug]`) stays public/no-auth for `status == "published"` articles only; drafts require owner-or-admin auth and return 404 (not 403) to non-owners to avoid confirming existence.
- No new dependencies, no ORM, no `role` field on the user document — hardcoded email sets only.
- Match existing code style: plain PyMongo queries, Pydantic `BaseModel` request bodies grouped near related models, FastAPI `Depends(get_current_user)` for auth, ad hoc assert-based test scripts (not pytest).

---

## File Structure

- **Create:** `ArticleShip/services/privileges.py` — `ADMIN_EMAILS`, `SUPPORT_EMAILS`, `PRIVILEGED_EMAILS`, `FREE_TIER_ARTICLE_LIMIT`, `is_admin(email)`, `is_privileged(email)`, `over_free_tier_limit(user)` helper.
- **Modify:** `ArticleShip/main.py` — import privileges module; add `ImpersonateRequest` model; add `POST /api/v1/auth/impersonate` route; gate `generate_full_article_hybrid_html` and `schedule_article` with the free-tier check; scope `GET /api/v1/articles` (list + slug branches) by owner/admin; pass `current_user["id"]` into `save_article` at the HTTP call site.
- **Modify:** `ArticleShip/services/article_store.py` — `save_article` gains a `user_id` parameter and field; `list_articles` gains a `user_id` filter parameter; `get_article_by_slug` behavior for drafts is enforced by the caller (main.py), not this function, to keep the "public read" primitive dumb.
- **Modify:** `ArticleShip/worker.py` — pass `job["user_id"]` into `save_article`.
- **Modify:** `Frontend/app/api/generate/route.ts` — forward the real backend status code (incl. 402) instead of collapsing everything to 502.
- **Modify:** `Frontend/app/generate/page.tsx` — handle `response.status === 402` with an upgrade message + link to `/pricing`.
- **Modify:** `Frontend/app/account/page.tsx` — `TIER_INFO.free.credits`: `3` → `5`; add impersonation form (email input + button), rendered only when `user?.email` is in a small frontend allowlist constant.
- **Modify:** `Frontend/lib/AuthContext.tsx` — add `applyToken(token, user)` method to apply an externally-obtained token/user pair (reused by impersonation), exposed via `AuthState`.
- **Test:** `ArticleShip/test_privileges.py` — assert-based script covering the free-tier gate and admin bypass logic.
- **Test:** `ArticleShip/test_article_ownership.py` — assert-based script covering `list_articles` owner filtering and `save_article` persisting `user_id`.

---

### Task 1: Privileges module + free-tier gate helper

**Files:**
- Create: `ArticleShip/services/privileges.py`
- Test: `ArticleShip/test_privileges.py`

**Interfaces:**
- Produces: `ADMIN_EMAILS: set[str]`, `SUPPORT_EMAILS: set[str]`, `PRIVILEGED_EMAILS: set[str]`, `FREE_TIER_ARTICLE_LIMIT: int`, `is_admin(email: str) -> bool`, `is_privileged(email: str) -> bool`, `over_free_tier_limit(user: dict) -> bool`.

- [ ] **Step 1: Write the module**

```python
# ArticleShip/services/privileges.py
"""Hardcoded privileged-account allowlists. Two accounts today — a `role`
field on the user document is the upgrade path if this list ever grows."""
from typing import Any, Dict

ADMIN_EMAILS = {"kush282930@gmail.com"}
SUPPORT_EMAILS = {"support@articleship.com"}
PRIVILEGED_EMAILS = ADMIN_EMAILS | SUPPORT_EMAILS

FREE_TIER_ARTICLE_LIMIT = 5


def is_admin(email: str) -> bool:
    return (email or "").strip().lower() in ADMIN_EMAILS


def is_privileged(email: str) -> bool:
    return (email or "").strip().lower() in PRIVILEGED_EMAILS


def over_free_tier_limit(user: Dict[str, Any]) -> bool:
    if is_admin(user.get("email", "")):
        return False
    if user.get("tier", "free") != "free":
        return False
    completed = user.get("usage", {}).get("completed_jobs", 0)
    return completed >= FREE_TIER_ARTICLE_LIMIT
```

Note: emails in `ADMIN_EMAILS`/`SUPPORT_EMAILS` are lowercase; `is_admin`/`is_privileged` lowercase their input to match, since Mongo stores emails lowercased already (`get_user_by_email` does `.strip().lower()`) but user dicts passed in directly (e.g. from JWT claims) may not be guaranteed lowercase.

- [ ] **Step 2: Write the test script**

```python
# ArticleShip/test_privileges.py
from services.privileges import is_admin, is_privileged, over_free_tier_limit, FREE_TIER_ARTICLE_LIMIT

def test_admin_and_support_recognized():
    assert is_admin("kush282930@gmail.com")
    assert is_admin("Kush282930@Gmail.com")  # case-insensitive
    assert not is_admin("someone@example.com")
    assert is_privileged("support@articleship.com")
    assert is_privileged("kush282930@gmail.com")
    assert not is_privileged("someone@example.com")

def test_free_tier_limit():
    free_under = {"email": "u@example.com", "tier": "free", "usage": {"completed_jobs": 4}}
    free_at_limit = {"email": "u@example.com", "tier": "free", "usage": {"completed_jobs": 5}}
    pro_over = {"email": "u@example.com", "tier": "pro", "usage": {"completed_jobs": 999}}
    admin_over = {"email": "kush282930@gmail.com", "tier": "free", "usage": {"completed_jobs": 999}}
    assert not over_free_tier_limit(free_under)
    assert over_free_tier_limit(free_at_limit)
    assert not over_free_tier_limit(pro_over)
    assert not over_free_tier_limit(admin_over)

if __name__ == "__main__":
    test_admin_and_support_recognized()
    test_free_tier_limit()
    print("OK")
```

- [ ] **Step 3: Run it**

Run: `cd ArticleShip && python test_privileges.py`
Expected: `OK` printed, no assertion errors.

- [ ] **Step 4: Commit**

```bash
git add ArticleShip/services/privileges.py ArticleShip/test_privileges.py
git commit -m "feat: add admin/support privilege allowlist and free-tier gate helper"
```

---

### Task 2: Enforce free-tier cap on article generation

**Files:**
- Modify: `ArticleShip/main.py` (imports near line 23-27; routes at line 586-618 and 645-681)

**Interfaces:**
- Consumes: `over_free_tier_limit(user: dict) -> bool` from Task 1.

- [ ] **Step 1: Import the helper**

In `ArticleShip/main.py`, after the existing `from services.auth import (...)` block (line 27), add:

```python
from services.privileges import over_free_tier_limit, is_admin, is_privileged, PRIVILEGED_EMAILS
```

- [ ] **Step 2: Gate `generate_full_article_hybrid_html`**

Modify the route at `main.py:586-618` — insert the check as the first line inside `try:` (before `job_id = uuid4().hex`):

```python
@app.post("/api/v1/generate_full_article_hybrid_html", tags=["End-to-End Orchestrator"])
async def generate_full_article_hybrid_html(
    request: HybridPipelineRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Enqueues a background job to generate a full article with hybrid HTML.
    """
    try:
        if over_free_tier_limit(current_user):
            raise HTTPException(
                status_code=402,
                detail="Free tier limit reached (5 articles). Upgrade to continue generating articles.",
            )
        from uuid import uuid4
        job_id = uuid4().hex
        jobs_col = get_jobs_collection()
        job_doc = {
            "_id": job_id,
            "user_id": current_user["id"],
            "topic": request.topic,
            "image_source": request.image_source,
            "include_inline_styles": request.include_inline_styles,
            "word_count_target": request.word_count_target,
            "image_count": request.image_count,
            "image_spacing": request.image_spacing,
            "status": "queued",
            "current_step": "keywords",
            "created_at": utc_now_iso(),
            "started_at": None,
            "completed_at": None,
            "error_message": None,
            "result_article_id": None
        }
        jobs_col.insert_one(job_doc)
        return {"job_id": job_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

Note: the existing `except Exception as e: raise HTTPException(...)` at the bottom would otherwise re-wrap our own `HTTPException(402, ...)` into a 500 — add `except HTTPException: raise` before it (shown above) so the 402 passes through untouched.

- [ ] **Step 3: Gate `schedule_article` the same way**

Modify `main.py:645-681` identically — same guard, same `except HTTPException: raise` fix:

```python
@app.post("/api/v1/schedule_article", tags=["End-to-End Orchestrator"])
async def schedule_article(
    request: ScheduleArticleRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Schedules an article to be generated and published in the future.
    Authenticated users can only schedule articles for themselves.
    """
    try:
        if over_free_tier_limit(current_user):
            raise HTTPException(
                status_code=402,
                detail="Free tier limit reached (5 articles). Upgrade to continue generating articles.",
            )
        from uuid import uuid4
        job_id = uuid4().hex
        jobs_col = get_jobs_collection()
        job_doc = {
            "_id": job_id,
            "user_id": current_user["id"],
            "topic": request.topic,
            "image_source": request.image_source,
            "include_inline_styles": request.include_inline_styles,
            "word_count_target": request.word_count_target,
            "image_count": request.image_count,
            "image_spacing": request.image_spacing,
            "status": "scheduled",
            "current_step": "keywords",
            "created_at": utc_now_iso(),
            "scheduled_at": request.scheduled_at,
            "auto_publish": request.auto_publish,
            "publish_target": request.publish_target,
            "started_at": None,
            "completed_at": None,
            "error_message": None,
            "result_article_id": None
        }
        jobs_col.insert_one(job_doc)
        return {"job_id": job_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

- [ ] **Step 4: Verify the app still imports cleanly**

Run: `cd ArticleShip && python -c "import main"`
Expected: no exceptions (this catches typos/import errors; full endpoint testing requires a running Mongo instance, out of scope for this static check).

- [ ] **Step 5: Commit**

```bash
git add ArticleShip/main.py
git commit -m "feat: enforce 5-article free-tier cap with admin bypass on generation routes"
```

---

### Task 3: Frontend — surface the 402 as an upgrade prompt

**Files:**
- Modify: `Frontend/app/api/generate/route.ts` (lines 80-89)
- Modify: `Frontend/app/generate/page.tsx` (lines 460-497)
- Modify: `Frontend/app/account/page.tsx` (lines 16-20)

**Interfaces:**
- Consumes: backend now returns `402` with body `{"detail": "Free tier limit reached (5 articles). Upgrade to continue generating articles."}` (Task 2).

- [ ] **Step 1: Stop collapsing backend errors to 502**

In `Frontend/app/api/generate/route.ts`, replace the block at lines 80-89:

```typescript
    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      let detail = errorText;
      try {
        detail = JSON.parse(errorText).detail ?? errorText;
      } catch {
        // not JSON, keep raw text
      }
      return NextResponse.json(
        { error: detail },
        { status: backendResponse.status }
      );
    }
```

- [ ] **Step 2: Handle 402 in the generate page**

In `Frontend/app/generate/page.tsx`, modify the `generate` function (lines 480-483):

```typescript
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({ error: "Generation failed" }));
        if (response.status === 402) {
          addToast("error", "Free tier limit reached", "Upgrade your plan to keep generating articles.");
          router.push("/pricing");
          setLoading(false);
          return;
        }
        throw new Error(errorPayload.error || "Generation failed");
      }
```

- [ ] **Step 3: Update the displayed free-tier limit**

In `Frontend/app/account/page.tsx`, change line 17:

```typescript
  free: { name: "Free Sheet", price: "$0/mo", credits: 5 },
```

- [ ] **Step 4: Manually verify in the browser**

Run the dev server (`cd Frontend && npm run dev`), log in as a free-tier test account with `usage.completed_jobs >= 5` (or temporarily lower `FREE_TIER_ARTICLE_LIMIT` for the check), attempt to generate an article, and confirm: a toast appears and the browser navigates to `/pricing` instead of showing a generic "Submission failed" error.

- [ ] **Step 5: Commit**

```bash
git add Frontend/app/api/generate/route.ts Frontend/app/generate/page.tsx Frontend/app/account/page.tsx
git commit -m "feat: surface free-tier 402 as an upgrade prompt instead of a generic error"
```

---

### Task 4: Article ownership — `user_id` on save, filtered `list_articles`

**Files:**
- Modify: `ArticleShip/services/article_store.py` (`save_article` at 206-229, `list_articles` at 238-249)
- Modify: `ArticleShip/main.py` (`create_saved_article` route, line ~945-957)
- Modify: `ArticleShip/worker.py` (line 163)
- Test: `ArticleShip/test_article_ownership.py`

**Interfaces:**
- Produces: `save_article(topic: str, payload: dict, user_id: str | None = None) -> dict` (adds `"user_id"` to the stored/returned doc); `list_articles(slug=None, status=None, user_id: str | None = None) -> list[dict]` (filters by `user_id` when provided).
- Consumes: nothing new — `current_user["id"]` (HTTP route) and `job["user_id"]` (worker) already exist at both call sites.

- [ ] **Step 1: Add `user_id` to `save_article`**

In `ArticleShip/services/article_store.py`, modify lines 206-229:

```python
def save_article(topic: str, payload: Dict[str, Any], user_id: str | None = None) -> Dict[str, Any]:
    collection = _get_collection()
    stored_payload = _encode_payload_for_storage(payload)

    # Hoist category to a top-level field so we can query without deserialising the payload.
    seo_data = payload.get("seo_data") or payload.get("keywords") or {}
    category = str(seo_data.get("category") or "").strip() or "General"

    article = {
        "id": uuid4().hex,
        "user_id": user_id,
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
```

- [ ] **Step 2: Add `user_id` filter to `list_articles`**

Modify lines 238-249:

```python
def list_articles(slug: str | None = None, status: str | None = None, user_id: str | None = None) -> List[Dict[str, Any]]:
    collection = _get_collection()
    query: Dict[str, Any] = {}
    if slug:
        query["slug"] = slug
    if status:
        query["status"] = status
    if user_id:
        query["user_id"] = user_id
    docs = list(collection.find(query, {"_id": 0}).sort("createdAt", -1))
    return [
        _decode_article_from_storage(doc) or doc
        for doc in docs
    ]
```

- [ ] **Step 3: Pass `current_user["id"]` at the HTTP call site**

In `ArticleShip/main.py`, modify the `create_saved_article` route (~line 954):

```python
        article = save_article(request.topic, request.payload, user_id=current_user["id"])
```

- [ ] **Step 4: Pass `job["user_id"]` at the worker call site**

In `ArticleShip/worker.py`, modify line 163:

```python
        saved_art = save_article(topic, article_payload, user_id=job.get("user_id"))
```

- [ ] **Step 5: Write the test script**

```python
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
```

- [ ] **Step 6: Run it**

Run: `cd ArticleShip && python test_article_ownership.py`
Expected: `OK` printed. Requires `MONGODB_URI` set in the environment (same as running the app itself) — if unavailable in this environment, note that and skip running, but the code changes still apply.

- [ ] **Step 7: Commit**

```bash
git add ArticleShip/services/article_store.py ArticleShip/main.py ArticleShip/worker.py ArticleShip/test_article_ownership.py
git commit -m "feat: add user_id ownership field to saved articles"
```

---

### Task 5: Scope the manuscript archive route by owner/admin

**Files:**
- Modify: `ArticleShip/main.py` (`GET /api/v1/articles` route, lines 891-924)

**Interfaces:**
- Consumes: `is_admin(email) -> bool` (Task 1), `list_articles(..., user_id=...)` (Task 4).

- [ ] **Step 1: Modify the list branch to filter by owner unless admin**

Replace lines 891-924 in `main.py`:

```python
@app.get("/api/v1/articles", tags=["Article Store"])
async def get_saved_articles(
    slug: str | None = None,
    status: str | None = None,
    request: Request = None,
):
    """
    Public: returns published articles (for the blog). When a slug is
    provided the article is returned regardless of auth, but only if it is
    published — drafts require the owner or admin (see galley-proof check
    below). Listing anything other than status=published (e.g. drafts, or
    no filter at all) requires an authenticated caller, and is scoped to
    that caller's own articles unless they are the admin account.
    """
    try:
        if slug:
            article = get_article_by_slug(slug)
            if not article:
                raise HTTPException(status_code=404, detail="Article not found")
            if article.get("status") != "published":
                requester = _require_owner_or_admin(request, article)
                if requester is None:
                    raise HTTPException(status_code=404, detail="Article not found")
            return {"article": article}

        if status != "published":
            auth_header = request.headers.get("authorization") if request else None
            if not auth_header or not auth_header.lower().startswith("bearer "):
                raise HTTPException(status_code=401, detail="Authentication required to list non-published articles")
            token = auth_header.split(" ", 1)[1]
            payload = decode_token(token)
            if payload.get("type") != "access" or not payload.get("sub"):
                raise HTTPException(status_code=401, detail="Invalid or expired token")
            if is_admin(payload.get("email", "")):
                return {"articles": list_articles(status=status)}
            return {"articles": list_articles(status=status, user_id=payload["sub"])}

        return {"articles": list_articles(status=status)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

- [ ] **Step 2: Add the shared owner-or-admin helper used by both the slug and list branches**

Add this helper function above the route (near the other module-level helpers, or directly above `get_saved_articles`):

```python
def _require_owner_or_admin(request: Request, article: Dict[str, Any]) -> Dict[str, Any] | None:
    """Returns the decoded token payload if the caller owns `article` or is admin, else None."""
    auth_header = request.headers.get("authorization") if request else None
    if not auth_header or not auth_header.lower().startswith("bearer "):
        return None
    token = auth_header.split(" ", 1)[1]
    try:
        payload = decode_token(token)
    except HTTPException:
        return None
    if payload.get("type") != "access" or not payload.get("sub"):
        return None
    if is_admin(payload.get("email", "")):
        return payload
    if article.get("user_id") and article["user_id"] == payload["sub"]:
        return payload
    return None
```

This helper is used by the `slug` branch above (galley proof / draft lookup) — Task 6 only adds tests against this same branch, no additional route.

- [ ] **Step 3: Verify the app still imports cleanly**

Run: `cd ArticleShip && python -c "import main"`
Expected: no exceptions.

- [ ] **Step 4: Commit**

```bash
git add ArticleShip/main.py
git commit -m "fix: scope manuscript archive listing and draft-by-slug lookups to owner or admin"
```

*(Note: this task's Step 1 already includes the galley-proof draft fix via `_require_owner_or_admin`, since both leaks live in the same route/branch. Task 6 below is a no-op verification pass, not new code — kept separate only so it has its own test/commit checkpoint per the spec's section split.)*

---

### Task 6: Verify galley-proof draft protection end-to-end

**Files:**
- Test: `ArticleShip/test_article_ownership.py` (extend from Task 4)

**Interfaces:**
- Consumes: `_require_owner_or_admin` and the modified `get_saved_articles` route (Task 5) — this task is verification only, no new production code.

- [ ] **Step 1: Add slug-branch test cases**

Append to `ArticleShip/test_article_ownership.py` (requires the FastAPI app importable and a way to call the route directly, using FastAPI's `TestClient` since no test server is otherwise running):

```python
from fastapi.testclient import TestClient
from main import app
from services.auth import create_access_token
from services.article_store import publish_article

client = TestClient(app)

def test_published_article_visible_without_auth():
    article = save_article("Public Test", {"seo_data": {"category": "Test"}}, user_id="owner-1")
    published = publish_article(article["id"], slug=f"public-test-{article['id'][:8]}")
    try:
        resp = client.get("/api/v1/articles", params={"slug": published["slug"]})
        assert resp.status_code == 200
        assert resp.json()["article"]["id"] == article["id"]
    finally:
        _get_collection().delete_one({"id": article["id"]})

def test_draft_article_hidden_from_non_owner():
    article = save_article("Draft Test", {"seo_data": {"category": "Test"}}, user_id="owner-2")
    # drafts have slug=None; simulate a guessed/leaked slug by setting one directly
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

        owner_token = create_access_token("owner-2", "owner2@example.com")
        resp_owner = client.get(
            "/api/v1/articles", params={"slug": "leaked-draft-slug"},
            headers={"Authorization": f"Bearer {owner_token}"},
        )
        assert resp_owner.status_code == 200

        admin_token = create_access_token("admin-id", "kush282930@gmail.com")
        resp_admin = client.get(
            "/api/v1/articles", params={"slug": "leaked-draft-slug"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp_admin.status_code == 200
    finally:
        _get_collection().delete_one({"id": article["id"]})

if __name__ == "__main__":
    test_save_article_persists_user_id()
    test_list_articles_filters_by_user_id()
    test_published_article_visible_without_auth()
    test_draft_article_hidden_from_non_owner()
    print("OK")
```

Note: `resp_owner`/`resp_admin` above rely on `get_current_user`'s DB lookup NOT being hit for the slug branch (it only decodes the token, per `_require_owner_or_admin` — it doesn't require the token's `sub` to correspond to a real user in the `users` collection). This matches the existing list-branch behavior (line 915-918 today), which also only validates the token shape, not that the user still exists. If this assumption is wrong once run against a real DB, `_require_owner_or_admin` would need a `get_user_by_id` lookup instead of trusting the JWT `email` claim directly — flagging this as the one spot to double check against real behavior.

- [ ] **Step 2: Run it**

Run: `cd ArticleShip && python test_article_ownership.py`
Expected: `OK` printed. Requires `MONGODB_URI` configured.

- [ ] **Step 3: Commit**

```bash
git add ArticleShip/test_article_ownership.py
git commit -m "test: verify galley-proof draft protection for owner, non-owner, and admin"
```

---

### Task 7: Support impersonation endpoint

**Files:**
- Modify: `ArticleShip/main.py` (add `ImpersonateRequest` model near line 72; add route near the other `/api/v1/auth/*` routes)

**Interfaces:**
- Consumes: `is_privileged(email) -> bool`, `PRIVILEGED_EMAILS` (Task 1), `get_user_by_email(email) -> dict | None` and `create_access_token(user_id, email) -> str` (existing, `services/auth.py:98,164`).
- Produces: `POST /api/v1/auth/impersonate` → `{"access_token": str, "token_type": "bearer", "user": {...AuthUser shape...}}`.

- [ ] **Step 1: Add the request model**

In `ArticleShip/main.py`, after `VerifyOtpRequest` (line 70-72), add:

```python
class ImpersonateRequest(BaseModel):
    target_email: EmailStr
```

- [ ] **Step 2: Add `get_user_by_email` to the existing auth import**

Modify the import at line 23-27 — `get_user_by_email` is already imported (line 24), no change needed there. Add `_safe_user` is private (underscore-prefixed) so instead strip `hashed_password` inline in the route rather than importing a private helper.

- [ ] **Step 3: Add the route**

Place near the other `/api/v1/auth/*` routes (after `/auth/me`, i.e. after line ~204-224 based on prior exploration — search for `@app.get("/api/v1/auth/me"` and insert after that function):

```python
@app.post("/api/v1/auth/impersonate", tags=["Auth"])
async def impersonate_user(
    body: ImpersonateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Support/admin-only: issue a full-access token for another user's account,
    for support debugging. Gated by a hardcoded email allowlist (see
    services/privileges.py) — there is no broader role system.
    """
    if not is_privileged(current_user["email"]):
        raise HTTPException(status_code=403, detail="Not authorized")
    target = get_user_by_email(body.target_email)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    token = create_access_token(target["id"], target["email"])
    safe_user = {k: v for k, v in target.items() if k not in ("hashed_password", "_id", "otp_code", "otp_expires_at", "otp_attempts")}
    return {"access_token": token, "token_type": "bearer", "user": safe_user}
```

- [ ] **Step 4: Verify the app still imports cleanly**

Run: `cd ArticleShip && python -c "import main"`
Expected: no exceptions.

- [ ] **Step 5: Write a quick assert-based test using TestClient**

Append to `ArticleShip/test_article_ownership.py`, or create `ArticleShip/test_impersonation.py`:

```python
# ArticleShip/test_impersonation.py
from fastapi.testclient import TestClient
from main import app
from services.auth import create_access_token, create_user, get_user_by_email

client = TestClient(app)

def _ensure_user(email: str, password: str = "testpass123"):
    existing = get_user_by_email(email)
    if existing:
        return existing
    return create_user(email, password)

def test_non_privileged_cannot_impersonate():
    target = _ensure_user("impersonation-target@example.com")
    caller_token = create_access_token("some-random-user-id", "randomuser@example.com")
    resp = client.post(
        "/api/v1/auth/impersonate",
        json={"target_email": "impersonation-target@example.com"},
        headers={"Authorization": f"Bearer {caller_token}"},
    )
    assert resp.status_code in (401, 403)  # 401 if sub doesn't resolve to a real user via get_current_user, 403 if it does but isn't privileged

def test_privileged_caller_gets_target_token():
    target = _ensure_user("impersonation-target2@example.com")
    support_token = create_access_token("support-account-id", "support@articleship.com")
    # NOTE: get_current_user re-fetches the user by `sub` from Mongo, so this
    # test requires a real "support@articleship.com" user account to exist in
    # the DB with id "support-account-id" — sign one up first if not present.
    resp = client.post(
        "/api/v1/auth/impersonate",
        json={"target_email": "impersonation-target2@example.com"},
        headers={"Authorization": f"Bearer {support_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["user"]["email"] == "impersonation-target2@example.com"
    assert "hashed_password" not in data["user"]

if __name__ == "__main__":
    test_non_privileged_cannot_impersonate()
    print("OK (privileged-caller test requires a seeded support@articleship.com account — run manually once one exists)")
```

Note: `test_privileged_caller_gets_target_token` depends on a real `support@articleship.com` account existing in the target DB (since `get_current_user` re-fetches by id from Mongo, a fabricated token with a nonexistent `sub` will 401 before the privilege check even runs). This is a real setup step, not just a test artifact — flag it for Task 8.

- [ ] **Step 6: Run what can run standalone**

Run: `cd ArticleShip && python test_impersonation.py`
Expected: at minimum `test_non_privileged_cannot_impersonate` passes. Full pass requires the seeded support account from Task 8.

- [ ] **Step 7: Commit**

```bash
git add ArticleShip/main.py ArticleShip/test_impersonation.py
git commit -m "feat: add support/admin impersonation endpoint gated by privileged-email allowlist"
```

---

### Task 8: Frontend impersonation UI + AuthContext support

**Files:**
- Modify: `Frontend/lib/AuthContext.tsx` (add `applyToken` method)
- Modify: `Frontend/app/account/page.tsx` (add impersonation form)

**Interfaces:**
- Consumes: `POST /api/v1/auth/impersonate` (Task 7) → `{access_token, token_type, user}`.
- Produces: `applyToken(token: string, user: AuthUser) -> void` added to `AuthState`, exposed via `AuthContext.Provider`.

- [ ] **Step 1: Add `applyToken` to AuthContext**

In `Frontend/lib/AuthContext.tsx`, add after the `login` function (after line 135):

```typescript
  // ── applyToken (used by impersonation: apply an externally-obtained token/user pair) ──
  const applyToken = useCallback((token: string, impersonatedUser: AuthUser) => {
    setAccessToken(token);
    tokenRef.current = token;
    setUser(impersonatedUser);
  }, []);
```

Add `applyToken: (token: string, user: AuthUser) => void;` to the `AuthState` interface (near the other method signatures, lines 31-43), and add `applyToken,` to the `<AuthContext.Provider value={{...}}>` object (line 171).

- [ ] **Step 2: Add a frontend display-only privileged-email check**

In `Frontend/app/account/page.tsx`, near the top with other constants (after `TIER_INFO`, line 20), add:

```typescript
// Display-only — real enforcement is server-side (services/privileges.py).
const IMPERSONATION_ALLOWED_EMAILS = new Set(["support@articleship.com", "kush282930@gmail.com"]);
```

- [ ] **Step 3: Add the impersonation form**

In `Frontend/app/account/page.tsx`, import `useState` (if not already imported) and `applyToken` from `useAuth()`, then add a component section rendered conditionally. Insert near the top of the page body (after the existing account header, before the ledger section):

```typescript
function ImpersonationPanel() {
  const { user, applyToken } = useAuth();
  const [targetEmail, setTargetEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!user?.email || !IMPERSONATION_ALLOWED_EMAILS.has(user.email)) return null;

  const handleImpersonate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/v1/auth/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_email: targetEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Impersonation failed");
      applyToken(data.access_token, data.user);
      window.location.href = "/account";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impersonation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 mb-6 bg-amber-50">
      <h3 className="font-semibold mb-2">Support: Login as User</h3>
      <div className="flex gap-2">
        <input
          type="email"
          value={targetEmail}
          onChange={(e) => setTargetEmail(e.target.value)}
          placeholder="user@example.com"
          className="border rounded px-3 py-2 flex-1"
        />
        <button onClick={handleImpersonate} disabled={loading || !targetEmail} className="px-4 py-2 bg-amber-600 text-white rounded disabled:opacity-50">
          {loading ? "Loading..." : "Login as user"}
        </button>
      </div>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  );
}
```

Render `<ImpersonationPanel />` inside the page's main return, above the existing ledger/billing sections. `authFetch` must already exist in this file's scope (used elsewhere per the earlier exploration, e.g. `/api/jobs?status=completed`) — reuse it as-is, don't reimplement.

- [ ] **Step 4: Manually verify in the browser**

Run `cd Frontend && npm run dev`. Log in as a seeded `kush282930@gmail.com` or `support@articleship.com` account (see Task 8's dependency on a seeded support account, same as Task 7). Confirm: the panel is invisible for a normal user, visible for these two, and successfully switches the session to a target user's account (verify by checking the ledger/account info updates to the target user's data).

- [ ] **Step 5: Commit**

```bash
git add Frontend/lib/AuthContext.tsx Frontend/app/account/page.tsx
git commit -m "feat: add support impersonation UI gated by privileged email"
```

---

## Post-plan setup note (not a task — an operational dependency)

Tasks 7 and 8 assume `support@articleship.com` and `kush282930@gmail.com` exist as real signed-up accounts in the `users` collection (impersonation and admin-bypass checks both re-fetch the caller from Mongo via `get_current_user`, so a JWT alone isn't enough — the account must actually exist). If they don't exist yet, sign them up through the normal `/signup` + OTP flow before these features can be exercised end-to-end.
