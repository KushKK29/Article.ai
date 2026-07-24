# Per-User Ledger, Free-Tier Cap, Admin, Support Impersonation, and Galley Proof Leak

Date: 2026-07-25

## Problem

Several access-control gaps exist in ArticleShip today:

1. Article generation has no server-side free-tier cap — a free user can generate unlimited articles. The `TIER_INFO` limits shown on the account page (`Frontend/app/account/page.tsx`) are cosmetic only.
2. There's no admin/privileged-account concept anywhere in the backend.
3. There's no way for the internal support team to log in as a user to help debug/support them.
4. The manuscript archive (`GET /api/v1/articles`, backing `Frontend/app/articles/page.tsx`) returns **every** user's saved articles to **any** logged-in user — a genuine cross-tenant data leak. Articles have no `user_id` field at all today.
5. The galley proof page (`Frontend/app/blog/[slug]/page.tsx`, public blog view at `/blog/[slug]`) fetches `GET /api/v1/articles?slug=X` with **no auth at all** — by design, since it's meant to be a public blog page for published posts. The bug: it returns the article regardless of `status`, so **draft/unpublished articles are also exposed to anyone who has or guesses the slug**, no login and no ownership check required.

The account ledger (usage/credits/job history shown on `Frontend/app/account/page.tsx`) is **already correctly per-user** — `usage.completed_jobs` and `/api/jobs` are scoped by `user_id` today. No fix needed there beyond updating the displayed free-tier number.

## Existing system (confirmed by exploration)

- Real DB: MongoDB via `pymongo`, no ORM. `users` collection (`ArticleShip/services/auth.py`), `articles` collection (`ArticleShip/services/article_store.py`), `jobs`/`batches` collections (`main.py`).
- Auth: bcrypt password hashing, JWT access tokens (30 min) + refresh tokens (7 days, httpOnly cookie). `get_current_user` (`auth.py:236-264`) is the FastAPI dependency gating protected routes.
- User doc has no `role`/`is_admin` field — nothing to build admin/support gating on top of.
- `jobs`/`batches` already correctly filter by `{"user_id": current_user["id"]}` (`main.py:693,833,837,858`) — the pattern to mirror for articles.
- Job creation (`main.py:586-618`) never checks `tier`/`credits`/`usage` before enqueueing — this is the free-tier gap.

## Design

### 1. Privileged-accounts constant (backend, single source of truth)

In `ArticleShip/main.py` (or a small shared config module if one already exists for constants — otherwise inline near the top of `main.py`):

```python
ADMIN_EMAILS = {"kush282930@gmail.com"}
SUPPORT_EMAILS = {"support@articleship.com"}
PRIVILEGED_EMAILS = ADMIN_EMAILS | SUPPORT_EMAILS
FREE_TIER_ARTICLE_LIMIT = 5
```

- `ADMIN_EMAILS`: bypasses the free-tier cap, sees the unfiltered manuscript archive.
- `PRIVILEGED_EMAILS`: allowed to call the impersonation endpoint (admin + support both can impersonate, per user decision).

This is a hardcoded allowlist by design — two accounts today, no schema change, easy to audit in one place. Upgrade path if the list ever grows: a `role` field on the user document.

### 2. Free-tier article cap

In the job-creation route (`main.py`, `generate_full_article_hybrid_html` / wherever jobs are inserted, ~line 586-618), before `jobs_col.insert_one(...)`:

```python
if (current_user["email"] not in ADMIN_EMAILS
        and current_user.get("tier", "free") == "free"
        and current_user.get("usage", {}).get("completed_jobs", 0) >= FREE_TIER_ARTICLE_LIMIT):
    raise HTTPException(status_code=402, detail="Free tier limit reached. Upgrade to continue generating articles.")
```

- Lifetime cap (not monthly) — counts `usage.completed_jobs`, which already increments correctly per completed job (`main.py:381-384`).
- Pro/agency tiers remain uncapped server-side (unchanged from today).
- Admin (`kush282930@gmail.com`) bypasses entirely regardless of tier.

Frontend (wherever the generate action calls the job-creation endpoint): catch HTTP 402, show an upgrade message with a link to `/pricing` instead of a generic error.

Also update `Frontend/app/account/page.tsx` — `TIER_INFO.free` limit constant: `3` → `5`, so the displayed cap matches what's enforced.

### 3. Manuscript archive: per-user scoping

**Data model**: add `user_id` to article documents going forward.

- `services/article_store.py`: `save_article(...)` gains a `user_id` parameter, stored on the document alongside existing fields (`id, topic, category, createdAt, ...`).
- The route(s) that call `save_article` (wherever articles are created/saved in `main.py`) pass `current_user["id"]`.
- `list_articles(slug=None, status=None, user_id=None)`: when `user_id` is provided, add `query["user_id"] = user_id` to the existing Mongo query.

**Route** `GET /api/v1/articles` (`main.py:891-924`): after the existing token validation/decoding,

```python
requester_email = payload.get("email")  # or look up user doc if email isn't in the JWT claims
if requester_email not in ADMIN_EMAILS:
    articles = list_articles(status=status, user_id=payload.get("sub"))
else:
    articles = list_articles(status=status)  # unfiltered, admin only
```

Note: need to confirm whether the JWT payload carries `email` directly or only `sub` (user id) — if only `sub`, fetch the user doc to check email against `ADMIN_EMAILS`, same as `get_current_user` already does.

**Legacy articles** (saved before this change, no `user_id` field): left as-is, not backfilled. They simply won't match any regular user's filtered query and will only be visible via the admin's unfiltered path. No migration script, no risk of misattributing old articles to the wrong owner by guessing.

**Result**: free/pro/agency users all see only their own articles (mirrors the existing `jobs`/`batches` pattern exactly). Only `kush282930@gmail.com` retains the unfiltered view.

### 4. Galley proof: stop leaking drafts publicly

Root cause is one function: `get_article_by_slug()` (`ArticleShip/services/article_store.py:293-296`), currently `collection.find_one({"slug": slug})` — no `status` filter. It's called from `main.py:891-924`'s `?slug=` branch, which has no auth check at all today (intentional for the public-blog case, but too broad).

Fix, in the `main.py:891` handler's `slug` branch:

```python
if slug:
    article = get_article_by_slug(slug)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    if article.get("status") != "published":
        # not public — require auth and ownership/admin
        auth_header = request.headers.get("authorization") if request else None
        if not auth_header or not auth_header.lower().startswith("bearer "):
            raise HTTPException(status_code=404, detail="Article not found")
        token = auth_header.split(" ", 1)[1]
        payload = decode_token(token)
        if payload.get("type") != "access" or not payload.get("sub"):
            raise HTTPException(status_code=404, detail="Article not found")
        requester = users_col.find_one({"id": payload["sub"]})
        is_owner = requester and article.get("user_id") == requester["id"]
        is_admin = requester and requester["email"] in ADMIN_EMAILS
        if not (is_owner or is_admin):
            raise HTTPException(status_code=404, detail="Article not found")
    return {"article": article}
```

- Published articles: unchanged, still public, no auth — this is the correct/intended blog behavior.
- Draft articles: 404 (not 403 — avoids confirming a draft exists at all under a guessed slug) unless the requester is the owner or admin.
- Depends on the same `user_id` field being added to article documents in section 3 above — an unowned legacy draft (no `user_id`) will 404 for everyone except admin, consistent with the "leave legacy articles admin-only" decision already made for the archive.
- The "Recently Published" sidebar query (`?status=published`, `main.py:911`) is unaffected — it already only returns published articles.

### 5. Support impersonation

**Backend** — new route `POST /api/v1/auth/impersonate`:

- Requires a valid access token (via `get_current_user`) whose email is in `PRIVILEGED_EMAILS`; otherwise `403`.
- Body: `{"target_email": "..."}`.
- Looks up the target user by email; `404` if not found.
- Issues a normal access token via the existing `create_access_token` with `sub=target_user["id"]` — identical shape and power to that user's own token. No new token type, no "impersonated" flag threaded through every endpoint (per the "full access as that user" decision). No refresh token is issued for the impersonated session — it's a 30-minute window, matching normal access-token lifetime; support re-impersonates if they need longer.

```python
@app.post("/api/v1/auth/impersonate")
async def impersonate_user(body: ImpersonateRequest, current_user=Depends(get_current_user)):
    if current_user["email"] not in PRIVILEGED_EMAILS:
        raise HTTPException(403, "Not authorized")
    target = users_col.find_one({"email": body.target_email})
    if not target:
        raise HTTPException(404, "User not found")
    return {"access_token": create_access_token(target["id"]), "token_type": "bearer"}
```

**Frontend**:
- A small section on the account page (or a dedicated `/support` route), rendered only when the logged-in user's own email is `support@articleship.com` or `kush282930@gmail.com` (display-side convenience only — real enforcement is entirely server-side via the 403 check above).
- Email input + "Login as user" button → calls the impersonate endpoint, then feeds the returned access token into `AuthContext` (same mechanism as a normal login, minus the refresh-cookie step) and reloads the app in that user's context.
- No special "impersonating" banner/indicator is in scope unless requested — keeping this minimal per the "full access, reuse normal token" decision. (Flagging this as a possible follow-up: an "impersonating X, click to exit" banner is a common safety nicety, but wasn't asked for.)

## Out of scope / explicitly not doing

- No new `role` field or RBAC system — hardcoded email sets only.
- No monthly quota reset logic — free tier cap is lifetime.
- No backfill migration for existing articles' `user_id`.
- No impersonation audit log (who impersonated whom, when) — not requested; flagging as a reasonable future addition given this bypasses normal auth.
- No "impersonating" UI indicator/banner during an impersonated session.
- Pro/agency tier caps remain unenforced server-side (unchanged, out of scope for this change).

## Testing

Per-file minimal checks (ponytail: smallest thing that fails if the logic breaks, not full suites):
- Free-tier cap: assert a free user with `completed_jobs=5` is rejected (402) and admin with `completed_jobs=5` is not.
- Archive scoping: assert `list_articles(user_id=X)` only returns docs with `user_id=X`; assert unfiltered call still returns all.
- Impersonation: assert non-privileged caller gets 403; assert privileged caller gets a token whose `sub` matches the target user's id.
- Galley proof: assert a published article's slug returns 200 with no auth header; assert a draft's slug returns 404 with no auth header and 404 for a non-owner's token; assert 200 for the owner's token or an admin's token.
