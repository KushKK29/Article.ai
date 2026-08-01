import asyncio
import logging
from dotenv import load_dotenv
from ddgs import DDGS
from utils.topic_categorizer import categorize_topic
from services.llm_client import LLMClient
from services.search.engine import gather_search_context, format_grounding_as_snippets

load_dotenv()

logger = logging.getLogger(__name__)

# ── Explicitly pick the provider/model this service uses ──────────────────
# provider: "gemini" | "openrouter" | "nvidia" | "qwen"
LLM_PROVIDER = "gemini"
LLM_MODEL = "gemini-3-flash-preview"

client = LLMClient(LLM_PROVIDER, LLM_MODEL)


# ── 1. Multi-query retrieval ──────────────────────────────────────────────────
def _retrieve_context_sync(topic: str) -> str:
    snippets: list[str] = []
    seen_urls: set[str] = set()
    category = categorize_topic(topic)

    # Fix 3: topic-aware query selection mirrors article_builder category logic
    if category == "ai":
        queries = [
            f"{topic} real user complaints production failures",
            f"{topic} reddit honest experience",
            f"{topic} vs manual workflow comparison",
        ]
    elif category == "history":
        queries = [
            f"{topic} causes effects analysis",
            f"{topic} scholarly debate",
            f"{topic} timeline key events",
        ]
    elif category == "engineering":
        queries = [
            f"{topic} real world implementation problems",
            f"{topic} reddit developer experience",
            f"{topic} vs alternative approach",
        ]
    elif category == "seo":
        queries = [
            f"{topic} common mistakes penalties",
            f"{topic} reddit case study results",
            f"{topic} vs competing strategy",
        ]
    else:
        queries = [
            f"{topic} problems failures limitations",
            f"{topic} reddit discussion experience",
            f"{topic} vs alternative comparison",
        ]

    try:
        # Fix 1: direct instantiation — context manager not always supported by ddgs
        ddgs = DDGS()

        for query in queries:
            results = list(ddgs.text(query, max_results=4))
            for r in results:
                url   = r.get("href", "").strip()
                body  = r.get("body", "").strip()
                title = r.get("title", "").strip()

                if not body or url in seen_urls:
                    continue
                seen_urls.add(url)
                snippets.append(
                    f"TITLE: {title}\nURL: {url}\nINSIGHT: {body[:400]}"
                )

                if len(snippets) >= 10:
                    break

            if len(snippets) >= 10:
                break

    except Exception as e:
        logger.error("DuckDuckGo search failed: %s", e)

    return "\n\n---\n\n".join(snippets) if snippets else "No context available."


# ── 2. LLM call ───────────────────────────────────────────────────────────────
def _generate_keywords_sync(prompt: str) -> dict:
    # Explicit token limit + truncation retry; raises ValueError on failure.
    return client.generate_json(
        prompt,
        temperature=0.5,                        # fix 5: was 0.3
        max_output_tokens=3072,
    )


# ── 3. Main entry point ───────────────────────────────────────────────────────
async def generate_seo_keywords(topic: str) -> dict:
    """
    RAG-style SEO keyword generator.
    1. Retrieval: 3-angle DuckDuckGo search for rich, diverse signal.
    2. Generation: Gemini generates structured keywords + gap analysis.
    """

    # --- Retrieval Phase ---
    search_context = await asyncio.to_thread(_retrieve_context_sync, topic)

    # DuckDuckGo returned nothing usable — fall back to the paid Tavily/Exa
    # grounding providers rather than failing the whole request. This only
    # fires on total DDG failure, so it shouldn't meaningfully touch quota.
    if search_context == "No context available.":
        try:
            grounding = await gather_search_context(topic)
            formatted = format_grounding_as_snippets(grounding, topic)
        except Exception as e:
            logger.warning("Tavily/Exa grounding fallback failed: %s", e)
            formatted = ""
        if formatted:
            search_context = formatted

    # Fix 4: guard against ungrounded generation when retrieval fails.
    # Raise instead of returning an error dict — callers (worker, pipeline,
    # API endpoints) must see this as a hard failure, not degraded output.
    if search_context == "No context available.":
        logger.error("Keyword generation aborted for '%s': no search context from any provider.", topic)
        raise RuntimeError(
            "Keyword retrieval failed — no search context available from DuckDuckGo or Tavily/Exa. "
            "Cannot generate grounded keywords without live search signal."
        )

    # --- Prompt ---
    prompt = f"""You are a senior SEO strategist building keyword research for 'ArticleShip', a high-authority content platform.

Your task: generate a comprehensive, publication-ready keyword set for the topic below. Base your analysis on BOTH the topic and the provided search context — do not invent keywords not supported by real search behavior.

TOPIC: "{topic}"

SEARCH CONTEXT (from live web results — 3 signal angles: failures, community, comparisons):
{search_context}

COMPETITIVE SIGNAL ANALYSIS (derive from search context before generating):
Before outputting keywords, internally identify:
- What angles do the top results already cover? (these are saturated)
- What user frustrations or questions appear in the snippets but are not addressed by the titles? (these are keyword opportunities)
- What comparison or failure-mode queries appear but have weak results? (these are low-competition entry points)

Use this analysis to bias your keyword selection toward underserved angles.
Do not output this analysis — use it to inform your keyword choices.

KEYWORD RULES:
- primary_keyword: The single highest-value keyword. Must be specific enough to be winnable — avoid pure head terms like "AI" or "software jobs". Prefer a 2–4 word phrase with clear search intent. Bias toward long-tail, experience-based queries over generic category terms.
  NATURAL ENGLISH REQUIRED: the primary keyword is repeated verbatim in the H1, intro, one H2, and closing — so it must read as a grammatical English phrase a human editor would write, not a search-box keyword mash.
  Bad: "top 15 job portals 2026 remote india" (word salad — poisons every heading that repeats it)
  Good: "best remote job portals in India" or "job portals for remote work 2026"
  Test: can the phrase open a normal sentence unchanged? If not, rewrite it.
- secondary_keywords: 3–5 keywords that support the primary. Each must target a distinct angle (one tool-focused, one workflow-focused, one outcome-focused, one risk/failure-focused). No near-duplicates of the primary. At least one secondary keyword must target a failure, mistake, or limitation angle.
- long_tail_keywords: 5–7 full question or clause phrases (8–15 words each). These must reflect ACTUAL questions people type — use the search context as your signal. At least 2 must be phrased as first-person or experiential queries. At least 1 must target a comparison.
- lsi_keywords: 5–7 semantically related terms. Conceptually related but NOT synonyms or rewordings of the primary keyword. Include at least 2 terms that relate to failure modes, limitations, or risks.
- search_intent: Classify as exactly one of: Informational, Transactional, Navigational, or Commercial. Base this on the dominant intent visible in the search context snippets.
- content_angle: The single most underserved angle based on the search context. Must be written as a specific editorial directive, not a gap description.
  Format: "[Primary audience] searching for [topic] are finding [what exists]. This article should instead lead with [specific missing angle] — specifically [one concrete example of what that looks like]."
  Bad: "Most articles cover features. None cover failures."
  Good: "Developers searching for Copilot reviews find feature lists and pricing comparisons. This article should lead with reproducible failure scenarios in production codebases — specifically race conditions and context-window blindness in files over 400 lines."
- keyword_gaps: Explicit capture of competitive landscape derived from retrieved snippets.
- target_audience: Who is searching this and why — directly informs the article hook.

CATEGORY CLASSIFICATION:
Based on the topic and search context, classify this article into exactly one of these categories:
- "SEO & Content" — keyword research, on-page SEO, backlinks, content strategy, blog growth, Google rankings, AdSense
- "AI & Dev Tools" — LLMs, AI coding assistants (Copilot, Cursor), GPT, model APIs, AI-powered workflows
- "Software Engineering" — programming languages, frameworks, architecture, DevOps, system design, debugging
- "Web Development" — frontend, backend, CSS, JavaScript, React, Next.js, APIs, databases
- "Data & Analytics" — data science, machine learning, BI tools, SQL, Python for data, statistics
- "Product & Startups" — SaaS, growth hacking, founding a company, product management, go-to-market
- "Career & Industry" — hiring, interviews, job market, remote work, engineering culture, salary
- "Science & Research" — academic studies, scientific method, physics, biology, chemistry, research papers
- "History & Society" — historical events, civilisations, social movements, geopolitics, economics
- "Entertainment & Culture" — movies, music, books, gaming, celebrity, pop culture, reviews
- "Health & Wellness" — fitness, nutrition, mental health, medicine, biohacking
- "Finance & Investing" — personal finance, stocks, crypto, real estate, trading strategies
- "General" — topics that don't clearly fit any of the above

Pick the single best-matching category. Do not invent a new category name.

OUTPUT: Respond with a single valid JSON object only. No markdown code fences. No explanation text before or after. No trailing commas.

Required JSON schema:
{{
  "primary_keyword": "string",
  "secondary_keywords": ["string", "string", "string"],
  "long_tail_keywords": ["string", "string", "string", "string", "string"],
  "lsi_keywords": ["string", "string", "string", "string", "string"],
  "search_intent": "Informational | Transactional | Navigational | Commercial",
  "content_angle": "string",
  "category": "SEO & Content | AI & Dev Tools | Software Engineering | Web Development | Data & Analytics | Product & Startups | Career & Industry | Science & Research | History & Society | Entertainment & Culture | Health & Wellness | Finance & Investing | General",
  "keyword_gaps": {{
    "saturated": ["keywords already well-covered by top results"],
    "underserved": ["keywords with search demand but weak existing content"],
    "avoid": ["keywords too competitive or too vague to win"]
  }},
  "target_audience": {{
    "primary": "one sentence describing the core reader",
    "experience_level": "beginner | intermediate | expert",
    "search_trigger": "what specific situation made them search this"
  }}
}}"""

    # --- Gemini API Call ---
    # generate_json handles fence stripping, truncation retry, and parsing.
    # Any failure raises and is surfaced by the caller (job marked failed /
    # endpoint returns 500) — never silently passed through as degraded output.
    try:
        return await asyncio.to_thread(_generate_keywords_sync, prompt)
    except Exception as e:
        logger.error("Keyword generation failed for '%s': %s", topic, e)
        raise