import asyncio
import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Depends, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

load_dotenv()

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Dict, Any, List

from services.keyword_engine import generate_seo_keywords
from services.structure_builder import build_article_structure
from services.article_builder import generate_article_content, _retrieve_article_context_sync
from services.content_mapper import parse_markdown_to_mapping
from services.image_fetcher import embed_images_in_article
from services.pipeline import run_pipeline
from services.html_converter import convert_final_payload_to_html
from services.hybrid_html_converter import convert_final_payload_to_hybrid_html
from services.article_store import save_article, list_articles, get_article_by_slug, get_article_by_id, publish_article, update_article, delete_article, track_article_view, get_jobs_collection, utc_now_iso, get_batches_collection
from services.ddg_search import perform_ddg_search
from services.auth import (
    create_user, get_user_by_email, verify_password, get_current_user,
    create_access_token, create_refresh_token, decode_token, REFRESH_TOKEN_EXPIRE_DAYS,
    generate_and_store_otp, verify_otp_code, is_verified, OTP_EXPIRE_MINUTES,
)
from services.privileges import over_free_tier_limit, is_admin, is_privileged, PRIVILEGED_EMAILS
from services.payment_service import (
    create_checkout_session, create_billing_portal_session,
    verify_webhook_event, handle_webhook_event,
)
from services.email_service import send_email



app = FastAPI(
    title="ArticleShip API",
    description="Backend for SEO-Optimized Article Generator",
    version="1.0.0"
)

logger = logging.getLogger("articleship")

_default_dev_origins = ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"]
_extra_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_default_dev_origins + _extra_origins,
    allow_credentials=True,   # needed so the browser sends httpOnly cookies
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def _log_unhandled_exception(request: Request, exc: Exception):
    """Logs any exception a route didn't explicitly convert to an HTTPException.
    The response body is a generic message — the real exception (which can
    contain DB URIs, file paths, etc.) goes to the server log only, not the
    client response."""
    logger.error("Unhandled error: %s", exc, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# ---------------------------------------------------------------------------
# Auth request/response models
# ---------------------------------------------------------------------------

class SignupRequest(BaseModel):
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ImpersonateRequest(BaseModel):
    target_email: EmailStr


class CheckoutRequest(BaseModel):
    tier: str


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str


class ContactFormRequest(BaseModel):
    subject: str = Field(max_length=200)
    body: str = Field(max_length=5000)
    reply_to: EmailStr


@app.get("/", tags=["Health"])
async def root_health():
    return {"status": "ok", "service": "ArticleShip API"}


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------

@app.post("/api/v1/auth/signup", tags=["Auth"])
async def signup(request: SignupRequest):
    """
    Register a new user (or resend a code to an existing unverified one) and
    email a 6-digit verification code. No tokens issued yet — call
    /api/v1/auth/verify-otp with the code to complete signup and log in.
    """
    if len(request.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    existing = get_user_by_email(request.email)
    if existing and is_verified(existing):
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    # Resending only re-issues the OTP — it must never change the password of
    # an account the caller hasn't proven they own yet (that proof is the OTP
    # itself), or anyone could hijack someone else's in-flight signup.
    user = existing if existing else create_user(request.email, request.password)

    otp = generate_and_store_otp(user["id"])
    send_email(
        user["email"],
        "Your ArticleShip verification code",
        f"Your verification code is {otp}. It expires in {OTP_EXPIRE_MINUTES} minutes.",
    )
    return {"message": "Verification code sent to your email.", "email": user["email"]}


@app.post("/api/v1/auth/verify-otp", tags=["Auth"])
async def verify_otp(request: VerifyOtpRequest, response: Response):
    """
    Verifies the emailed code and completes signup: marks the account
    verified, returns an access token, and sets the refresh-token cookie.
    """
    user = get_user_by_email(request.email)
    if not user:
        raise HTTPException(status_code=404, detail="No signup found for this email.")

    verify_otp_code(user["id"], request.otp)

    user = get_user_by_email(request.email)  # re-fetch: verify_otp_code just cleared the otp fields
    safe = {k: v for k, v in user.items() if k != "hashed_password"}
    access_token = create_access_token(safe["id"], safe["email"])
    refresh_token = create_refresh_token(safe["id"])
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/api/v1/auth/refresh",
    )
    return {"access_token": access_token, "token_type": "bearer", "user": safe}


@app.post("/api/v1/auth/login", tags=["Auth"])
async def login(request: LoginRequest, response: Response):
    """
    Validate credentials. Returns access token in body; sets refresh token
    in an httpOnly cookie.
    """
    user = get_user_by_email(request.email)
    if not user or not verify_password(request.password, user.get("hashed_password", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if not is_verified(user):
        raise HTTPException(status_code=403, detail="Please verify your email before logging in.")

    safe = {k: v for k, v in user.items() if k != "hashed_password"}
    access_token = create_access_token(safe["id"], safe["email"])
    refresh_token = create_refresh_token(safe["id"])
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,     # required for SameSite=None; loopback hosts (localhost/127.0.0.1)
        samesite="none", # are treated as secure contexts, so this also works over local HTTP
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/api/v1/auth/refresh",
    )
    return {"access_token": access_token, "token_type": "bearer", "user": safe}


@app.post("/api/v1/auth/refresh", tags=["Auth"])
async def refresh_access_token(req: Request, response: Response):
    """
    Exchange the httpOnly refresh_token cookie for a fresh access token.
    """
    token = req.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token cookie found.")
    payload = decode_token(token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Token is not a refresh token.")
    user_id = payload.get("sub")
    from services.auth import get_user_by_id
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")
    new_access = create_access_token(user["id"], user["email"])
    return {"access_token": new_access, "token_type": "bearer"}


@app.post("/api/v1/auth/logout", tags=["Auth"])
async def logout(response: Response):
    """Clear the refresh-token cookie."""
    response.delete_cookie(
        key="refresh_token",
        path="/api/v1/auth/refresh",
        secure=True,
        samesite="none",
    )
    return {"ok": True}


@app.get("/api/v1/auth/me", tags=["Auth"])
async def me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Return the currently authenticated user profile."""
    return {"user": current_user}


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
    logger.warning("IMPERSONATION: %s -> %s", current_user["email"], target["email"])
    token = create_access_token(target["id"], target["email"])
    safe_user = {k: v for k, v in target.items() if k not in ("hashed_password", "_id", "otp_code", "otp_expires_at", "otp_attempts")}
    return {"access_token": token, "token_type": "bearer", "user": safe_user}


# ---------------------------------------------------------------------------
# Billing endpoints
# ---------------------------------------------------------------------------

@app.post("/api/v1/billing/checkout", tags=["Billing"])
async def billing_checkout(request: CheckoutRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Creates a Stripe Checkout session for the requested tier, returns its URL."""
    url = create_checkout_session(current_user, request.tier)
    return {"url": url}


@app.post("/api/v1/billing/portal", tags=["Billing"])
async def billing_portal(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Creates a Stripe Billing Portal session for the current user, returns its URL."""
    url = create_billing_portal_session(current_user)
    return {"url": url}


@app.post("/api/v1/billing/webhook", tags=["Billing"])
async def billing_webhook(request: Request):
    """Stripe calls this directly — authenticated via signature, not a bearer token."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    event = verify_webhook_event(payload, sig_header)
    try:
        handle_webhook_event(event)
    except Exception as e:
        logger.error(
            "Webhook handling failed for event type=%s id=%s: %s",
            event.get("type"), event.get("id"), e, exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Webhook processing failed")
    return {"received": True}


@app.get("/api/v1/search", tags=["Search"])
async def search(q: str = Query(...), count: int = 10):
    """
    Search the web using DuckDuckGo.
    """
    # Note: perform_ddg_search never raises — it catches its own errors and
    # returns {"error": ...} with empty results, so surface that as a real
    # error response instead of silently returning 200 with no results.
    results = await perform_ddg_search(q, count)
    if results.get("error"):
        raise HTTPException(status_code=502, detail=results["error"])
    return results


# ponytail: in-memory rate limit, single-process only — matches the frontend's
# route.ts limiter; move both to Redis together if throughput requires it.
_CONTACT_RATE_LIMIT_WINDOW_SECONDS = 3600
_CONTACT_RATE_LIMIT_MAX_ATTEMPTS = 5
_contact_rate_limit: Dict[str, Any] = {}

def _contact_rate_limited(reply_to: str) -> bool:
    import time
    now = time.time()
    entry = _contact_rate_limit.get(reply_to)
    if not entry or now > entry["reset_at"]:
        _contact_rate_limit[reply_to] = {"count": 1, "reset_at": now + _CONTACT_RATE_LIMIT_WINDOW_SECONDS}
        return False
    if entry["count"] >= _CONTACT_RATE_LIMIT_MAX_ATTEMPTS:
        return True
    entry["count"] += 1
    return False


@app.post("/api/email/contact", tags=["Email"])
async def send_contact_email(request: ContactFormRequest):
    """
    Internal endpoint: sends contact form submissions to support@articleship.com.
    Hardcoded recipient prevents email relay attacks; reply_to allows sender responses.
    Rate-limited per reply_to since this is reachable directly, not just via the
    frontend's own (separately rate-limited) proxy route.
    """
    if _contact_rate_limited(request.reply_to):
        raise HTTPException(status_code=429, detail="Too many submissions. Please try again later.")
    try:
        support_email = os.getenv("SUPPORT_EMAIL", "support@articleship.com")
        send_email(
            support_email,
            request.subject,
            request.body + f"\n\nReply to: {request.reply_to}"
        )
        # Send confirmation to user
        send_email(
            request.reply_to,
            "We received your message",
            "Thank you for contacting ArticleShip. We'll respond within 24 hours."
        )
        return {"success": True}
    except Exception as e:
        logger.error(f"Contact form submission failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send message")



from utils.constants import MAX_IMAGE_COUNT


class ArticleGenParams(BaseModel):
    word_count_target: int = 1500
    image_count: int = 5
    image_spacing: int = 2

    @field_validator("word_count_target")
    @classmethod
    def validate_word_count_target(cls, v: int) -> int:
        if v not in [500, 1000, 1500, 2500]:
            raise ValueError("word_count_target must be one of [500, 1000, 1500, 2500]")
        return v

    @field_validator("image_count")
    @classmethod
    def validate_image_count(cls, v: int) -> int:
        if not (0 <= v <= MAX_IMAGE_COUNT):
            raise ValueError(f"image_count must be between 0 and {MAX_IMAGE_COUNT}")
        return v

    @field_validator("image_spacing")
    @classmethod
    def validate_image_spacing(cls, v: int) -> int:
        if v < 1:
            raise ValueError("image_spacing must be at least 1")
        return v


class TopicRequest(BaseModel):
    topic: str


class StructureRequest(ArticleGenParams):
    topic: str
    seo_data: Dict[str, Any]


class ArticleRequest(ArticleGenParams):
    topic: str
    seo_data: Dict[str, Any]
    structure: Dict[str, Any]


class MapperRequest(BaseModel):
    markdown_content: str


class ImageRequest(BaseModel):
    mapped_article: List[Dict[str, Any]]
    image_source: str = "stock"  # Can be "stock" (unsplash/google) or "ai_generated"


class PipelineRequest(ArticleGenParams):
    topic: str
    image_source: str = "stock"


class FinalPayloadRequest(BaseModel):
    final_payload: Dict[str, Any]


class HybridFinalPayloadRequest(BaseModel):
    final_payload: Dict[str, Any]
    include_inline_styles: bool = True


class HybridPipelineRequest(ArticleGenParams):
    topic: str
    image_source: str = "stock"
    include_inline_styles: bool = True


class ScheduleArticleRequest(ArticleGenParams):
    topic: str
    scheduled_at: str
    auto_publish: bool = False
    publish_target: str | None = None
    image_source: str = "stock"
    include_inline_styles: bool = True


MAX_BATCH_TOPICS = 20

class BatchCreateRequest(ArticleGenParams):
    topics: List[str]
    name: str | None = None
    scheduled_at: str | None = None
    stagger_minutes: int | None = None
    auto_publish: bool = False
    image_source: str = "stock"
    include_inline_styles: bool = True

    @field_validator("topics")
    @classmethod
    def _validate_topics(cls, value: List[str]) -> List[str]:
        if not value:
            raise ValueError("topics must not be empty")
        if len(value) > MAX_BATCH_TOPICS:
            raise ValueError(f"A batch may contain at most {MAX_BATCH_TOPICS} topics")
        return value

class SaveArticleRequest(BaseModel):
    topic: str
    payload: Dict[str, Any]

class ArticlePublishRequest(BaseModel):
    pass

class ArticleUpdateRequest(BaseModel):
    topic: str | None = None
    payload: Dict[str, Any]

class RetryJobRequest(BaseModel):
    pass

def _job_cost_defaults() -> Dict[str, Any]:
    return {
        "gemini": {"calls": 0, "input_tokens": 0, "output_tokens": 0},
        "images": {"calls": 0},
        "estimated_cost": 0.0,
    }

@app.post("/api/v1/keywords", tags=["Keyword Engine"])
async def get_keywords(request: TopicRequest):
    """
    Generate an SEO keyword cluster using a RAG approach.
    It scrapes related queries and context from the web, returning optimal keywords.
    """
    data = await generate_seo_keywords(request.topic)
    return {"topic": request.topic, "data": data}

@app.post("/api/v1/structure", tags=["Structure Builder"])
async def build_structure(request: StructureRequest):
    """
    Generate an article outline structure (H1, H2, H3, H4) based on the topic and generated SEO data.
    """
    data = await build_article_structure(
        request.topic,
        request.seo_data,
        word_count_target=request.word_count_target,
        image_count=request.image_count,
        image_spacing=request.image_spacing,
    )
    return {"topic": request.topic, "structure": data}

@app.post("/api/v1/article", tags=["RAG Content Generator (Draft)"])
async def build_article(request: ArticleRequest):
    """
    Takes the topic, injected SEO keywords, and strict article structure outline, 
    and writes the comprehensive markdown article content for each section.
    """
    content = await generate_article_content(request.topic, request.seo_data, request.structure)
    return {
        "topic": request.topic, 
        "article_markdown": content
    }

@app.get("/api/v1/llm-test", tags=["Debug"])
async def llm_test(provider: str = Query(...), model: str | None = None):
    """
    Debug: fire a tiny prompt at one specific provider (no fallback), so each
    fallback provider/key can be verified in isolation.
    e.g. /api/v1/llm-test?provider=qwen
    """
    import time
    from services.llm_client import LLMClient, PROVIDER_CONFIG, default_model_for

    if provider not in PROVIDER_CONFIG:
        raise HTTPException(status_code=400, detail=f"Unknown provider. Choose one of: {list(PROVIDER_CONFIG)}")

    resolved_model = model or default_model_for(provider)
    started = time.time()
    try:
        client = LLMClient(provider, resolved_model)
        response = await asyncio.to_thread(
            client._generate_raw,
            "Reply with exactly the two characters: OK",
            max_output_tokens=500,
        )
        return {
            "ok": bool(response.text.strip()),
            "provider": provider,
            "model": resolved_model,
            "latency_ms": round((time.time() - started) * 1000),
            "text": response.text.strip()[:200],
            "finish_reason": response.finish_reason,
        }
    except Exception as e:
        return {
            "ok": False,
            "provider": provider,
            "model": resolved_model,
            "latency_ms": round((time.time() - started) * 1000),
            "error": str(e)[:500],
        }


@app.post("/api/v1/article-context", tags=["Debug"])
async def get_article_context(request: TopicRequest):
    """
    Returns the live retrieval context used by the article generator.
    """
    logger.info(f"DEBUG: Retrieving context for topic: {request.topic[:80]}")
    context = await asyncio.to_thread(_retrieve_article_context_sync, request.topic)
    logger.info(f"DEBUG: Retrieved context length: {len(context)}")
    logger.info(f"DEBUG: Context starts with: {context[:100]}")
    return {
        "topic": request.topic,
        "context": context,
    }

@app.post("/api/v1/mapper", tags=["Content Mapper"])
async def map_article_content(request: MapperRequest):
    """
    Parses a generated Markdown article and breaks it down into a structured JSON dictionary mapping every heading directly to its content.
    """
    mapped_data = parse_markdown_to_mapping(request.markdown_content)
    return {"mapped_article": mapped_data}

@app.post("/api/v1/images", tags=["Image Fetcher (parallel)"])
async def fetch_images(request: ImageRequest):
    """
    Takes the structurally mapped article and attaches proper images to sections based on priority rules.
    If image_source is 'ai_generated', uses the Pollen API. Otherwise, uses stock sources (Unsplash/Google).
    """
    final_data = await embed_images_in_article(request.mapped_article, ai_generated=(request.image_source == "ai_generated"))
    return {"article_with_images": final_data}

@app.post("/api/v1/generate_full_article", tags=["End-to-End Orchestrator"])
async def generate_full_article(request: PipelineRequest):
    """
    Runs the complete ArticleShip pipeline from start to finish.
    Takes a single topic and outputs a perfectly formatted ready-to-publish JSON payload
    including SEO metrics, word counts, and accurately embedded images.
    """
    final_payload = await run_pipeline(request.topic, ai_generated=(request.image_source == "ai_generated"))
    return final_payload

@app.post("/api/v1/html_from_final", tags=["HTML Converter"])
async def html_from_final(request: FinalPayloadRequest):
    """
    Converts final_formatter output payload into pure HTML.
    """
    html_payload = convert_final_payload_to_html(request.final_payload)
    return html_payload

@app.post("/api/v1/generate_full_article_html", tags=["End-to-End Orchestrator"])
async def generate_full_article_html(request: PipelineRequest):
    """
    Runs the complete pipeline and returns the same payload plus a pure HTML article.
    """
    final_payload = await run_pipeline(request.topic, ai_generated=(request.image_source == "ai_generated"))
    html_payload = convert_final_payload_to_html(final_payload)
    return {
        "meta": html_payload.get("meta", {}),
        "seo_data": html_payload.get("seo_data", {}),
        "blocks": final_payload.get("blocks", []),
        "html": html_payload.get("html", ""),
    }

@app.post("/api/v1/hybrid_html_from_final", tags=["HTML Converter"])
async def hybrid_html_from_final(request: HybridFinalPayloadRequest):
    """
    Converts final formatter output into hybrid HTML:
    class-based structure + optional minimal inline styles.
    """
    hybrid_payload = convert_final_payload_to_hybrid_html(
        request.final_payload,
        include_inline_styles=request.include_inline_styles,
    )
    return hybrid_payload

@app.post("/api/v1/generate_full_article_hybrid_html", tags=["End-to-End Orchestrator"])
async def generate_full_article_hybrid_html(
    request: HybridPipelineRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Enqueues a background job to generate a full article with hybrid HTML.
    """
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

@app.get("/api/v1/jobs/{job_id}", tags=["Jobs"])
async def get_job_status(
    job_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get the status of a background article generation job.
    Users can only retrieve their own jobs; returns 404 if job is not found or not owned by user.
    """
    jobs_col = get_jobs_collection()
    job = jobs_col.find_one({"_id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    # Auth: verify the job belongs to the authenticated user
    if job.get("user_id") != current_user["id"]:
        raise HTTPException(status_code=404, detail="Job not found")
        
    return job

@app.post("/api/v1/schedule_article", tags=["End-to-End Orchestrator"])
async def schedule_article(
    request: ScheduleArticleRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Schedules an article to be generated and published in the future.
    Authenticated users can only schedule articles for themselves.
    """
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

@app.get("/api/v1/jobs", tags=["Jobs"])
async def list_jobs(
    status: str | None = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Returns the authenticated user's jobs, optionally filtered by status.
    """
    jobs_col = get_jobs_collection()
    query: Dict[str, Any] = {"user_id": current_user["id"]}
    if status:
        query["status"] = status
    jobs = list(jobs_col.find(query).sort("created_at", -1))
    return {"jobs": jobs}

@app.delete("/api/v1/jobs/{job_id}", tags=["Jobs"])
async def delete_job(
    job_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Permanently deletes/cancels a job owned by the current user.
    """
    jobs_col = get_jobs_collection()
    job = jobs_col.find_one({"_id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.get("user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not your job")
    if job.get("status") not in ["scheduled", "queued"]:
        raise HTTPException(status_code=400, detail="Cannot cancel a job that is already processing, completed, or failed")
    jobs_col.delete_one({"_id": job_id})
    return {"ok": True}

@app.post("/api/v1/batches", tags=["Batches"])
async def create_batch(
    request: BatchCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Submits a batch list of multiple article topics at once.
    Authenticated users can only create batches for themselves.
    """
    if over_free_tier_limit(current_user):
        raise HTTPException(
            status_code=402,
            detail="Free tier limit reached (5 articles). Upgrade to continue generating articles.",
        )
    from uuid import uuid4
    from datetime import datetime, timedelta, timezone
        
    batch_id = uuid4().hex
    batches_col = get_batches_collection()
    jobs_col = get_jobs_collection()
        
    # Insert batch summary document
    batch_doc = {
        "_id": batch_id,
        "user_id": current_user["id"],
        "name": request.name or f"Batch - {utc_now_iso()}",
        "created_at": utc_now_iso(),
        "total_count": len(request.topics),
        "completed_count": 0,
        "failed_count": 0
    }
    batches_col.insert_one(batch_doc)
        
    # Parse start scheduled time or now
    if request.scheduled_at:
        try:
            clean_iso = request.scheduled_at.replace("Z", "+00:00")
            base_time = datetime.fromisoformat(clean_iso)
        except Exception:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid scheduled_at value: {request.scheduled_at!r} (expected ISO 8601)",
            )
    else:
        base_time = datetime.now(timezone.utc)
            
    job_docs = []
    for idx, topic in enumerate(request.topics):
        job_id = uuid4().hex
        user_id = current_user["id"]  # Auth: use authenticated user's ID
            
        # Determine scheduled time for this job
        job_scheduled_at = None
        job_status = "queued"
            
        if request.stagger_minutes is not None and request.stagger_minutes > 0:
            scheduled_time = base_time + timedelta(minutes=idx * request.stagger_minutes)
            job_scheduled_at = scheduled_time.isoformat().replace("+00:00", "Z")
            job_status = "scheduled"
        elif request.scheduled_at:
            job_scheduled_at = request.scheduled_at
            job_status = "scheduled"
                
        job_doc = {
            "_id": job_id,
            "batch_id": batch_id,
            "user_id": user_id,
            "topic": topic,
            "image_source": request.image_source,
            "include_inline_styles": request.include_inline_styles,
            "word_count_target": request.word_count_target,
            "image_count": request.image_count,
            "image_spacing": request.image_spacing,
            "status": job_status,
            "current_step": "keywords",
            "created_at": utc_now_iso(),
            "scheduled_at": job_scheduled_at,
            "auto_publish": request.auto_publish,
            "publish_target": None,
            "started_at": None,
            "completed_at": None,
            "error_message": None,
            "result_article_id": None,
            "retry_count": 0,
            "auto_publish_failed": False,
            "job_cost": _job_cost_defaults(),
        }
        job_docs.append(job_doc)
            
    if job_docs:
        jobs_col.insert_many(job_docs)

    return {"batch_id": batch_id}

@app.get("/api/v1/batches/{batch_id}", tags=["Batches"])
async def get_batch(
    batch_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get the summary of a batch job and its individual article generation jobs.
    Users can only retrieve their own batches; returns 404 if batch is not found or not owned by user.
    """
    batches_col = get_batches_collection()
    jobs_col = get_jobs_collection()
        
    batch = batches_col.find_one({"_id": batch_id})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
        
    # Auth: verify the batch belongs to the authenticated user
    if batch.get("user_id") != current_user["id"]:
        raise HTTPException(status_code=404, detail="Batch not found")
            
    # Fetch all jobs in this batch
    jobs = list(jobs_col.find({"batch_id": batch_id, "user_id": current_user["id"]}).sort("created_at", 1))
        
    return {
        "batch": batch,
        "jobs": jobs
    }

@app.post("/api/v1/jobs/{job_id}/retry", tags=["Jobs"])
async def retry_job(
    job_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Retry a failed job by resubmitting the same batch item as a new queued job.
    """
    jobs_col = get_jobs_collection()
    original_job = jobs_col.find_one({"_id": job_id, "user_id": current_user["id"]})
    if not original_job:
        raise HTTPException(status_code=404, detail="Job not found")
    if original_job.get("status") != "failed":
        raise HTTPException(status_code=400, detail="Only failed jobs can be retried")

    retry_count = int(original_job.get("retry_count") or 0)
    if retry_count >= 2:
        raise HTTPException(status_code=400, detail="Retry limit reached")

    from uuid import uuid4
    new_job_id = uuid4().hex
    # Resume from the step where the job failed, not from keywords
    failed_step = original_job.get("current_step", "keywords")
    retry_doc = {
        **{k: v for k, v in original_job.items() if k not in ["_id", "created_at", "started_at", "completed_at", "error_message", "result_article_id", "status", "current_step", "retry_count", "auto_publish_failed"]},
        "_id": new_job_id,
        "status": "queued",
        "current_step": failed_step,
        "created_at": utc_now_iso(),
        "started_at": None,
        "completed_at": None,
        "error_message": None,
        "result_article_id": None,
        "retry_count": retry_count + 1,
        "auto_publish_failed": False,
        "job_cost": _job_cost_defaults(),
    }
    jobs_col.insert_one(retry_doc)
    return {"job_id": new_job_id, "retry_count": retry_doc["retry_count"]}

def _decode_bearer_token(request: Request) -> Dict[str, Any] | None:
    """Returns the decoded access-token payload from an optional bearer header, else None."""
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
    return payload


def _require_owner_or_admin(request: Request, article: Dict[str, Any]) -> Dict[str, Any] | None:
    """Returns the decoded token payload if the caller owns `article` or is admin, else None."""
    payload = _decode_bearer_token(request)
    if not payload:
        return None
    if is_admin(payload.get("email", "")):
        return payload
    if article.get("user_id") and article["user_id"] == payload["sub"]:
        return payload
    return None

@app.get("/api/v1/articles", tags=["Article Store"])
async def get_saved_articles(
    slug: str | None = None,
    status: str | None = None,
    request: Request = None,
):
    """
    Public: returns published articles, no auth required. Any other `status`
    (e.g. "draft") is scoped to the caller's own articles, or all matching
    articles if the caller is an admin — checked via an optional bearer token.
    """
    if slug:
        article = get_article_by_slug(slug)
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        if article.get("status") != "published" and not _require_owner_or_admin(request, article):
            raise HTTPException(status_code=404, detail="Article not found")
        return {"article": article}

    if not status or status == "published":
        return {"articles": list_articles(status="published")}

    # Non-published statuses (e.g. "draft") expose private content — scope
    # to the caller's own articles unless they're an admin.
    payload = _decode_bearer_token(request)
    if not payload:
        raise HTTPException(status_code=404, detail="Article not found")
    if is_admin(payload.get("email", "")):
        return {"articles": list_articles(status=status)}
    return {"articles": list_articles(status=status, user_id=payload["sub"])}

@app.get("/api/v1/articles/{article_id}", tags=["Article Store"])
async def get_saved_article(
    article_id: str,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Returns a single saved article by id. Authenticated, and only the owner or
    an admin may fetch it (the public blog looks articles up by slug via
    GET /api/v1/articles?slug=...).
    """
    article = get_article_by_id(article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    if not _require_owner_or_admin(request, article):
        raise HTTPException(status_code=404, detail="Article not found")
    return {"article": article}

@app.post("/api/v1/articles", tags=["Article Store"])
async def create_saved_article(
    request: SaveArticleRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Persists a generated article payload in MongoDB.
    """
    article = save_article(request.topic, request.payload, user_id=current_user["id"])
    return {"ok": True, "article": article}

@app.post("/api/v1/articles/{article_id}/publish", tags=["Article Store"])
async def publish_saved_article(
    article_id: str,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Validates and publishes a saved article, making it publicly available.
    Only the owner or an admin may publish it.
    """
    try:
        existing = get_article_by_id(article_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Article not found")
        if not _require_owner_or_admin(request, existing):
            raise HTTPException(status_code=404, detail="Article not found")
        article = publish_article(article_id)
        return {"ok": True, "article": article}
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/v1/articles/{article_id}/track-view", tags=["Article Store"])
async def track_saved_article_view(article_id: str):
    """
    Increments article view count for analytics tracking.
    Public: called from the public blog page on every reader pageview.
    """
    try:
        article = track_article_view(article_id)
        return {"ok": True, "article": article}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.put("/api/v1/articles/{article_id}", tags=["Article Store"])
async def update_saved_article(
    article_id: str,
    request: ArticleUpdateRequest,
    http_request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Updates a draft article payload and resets publish state so it can be republished.
    Only the owner or an admin may update it.
    """
    try:
        existing = get_article_by_id(article_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Article not found")
        if not _require_owner_or_admin(http_request, existing):
            raise HTTPException(status_code=404, detail="Article not found")
        article = update_article(article_id, request.topic, request.payload)
        return {"ok": True, "article": article}
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/v1/articles/{article_id}", tags=["Article Store"])
async def delete_saved_article(
    article_id: str,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Permanently deletes a saved article from MongoDB. Only the owner or an
    admin may delete it.
    """
    existing = get_article_by_id(article_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Article not found")
    if not _require_owner_or_admin(request, existing):
        raise HTTPException(status_code=404, detail="Article not found")
    deleted = delete_article(article_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Article not found")
    return {"ok": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)