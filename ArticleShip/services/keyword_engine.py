import os
import re
import json
import asyncio
import logging
from dotenv import load_dotenv
from google import genai
from google.genai import types
from ddgs import DDGS
from utils.topic_categorizer import categorize_topic
from services.search.engine import gather_search_context

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
logger = logging.getLogger("KeywordEngine")



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
        print(f"DuckDuckGo search failed: {e}")

    return "\n\n---\n\n".join(snippets) if snippets else "No context available."


# ── 2. Gemini call ────────────────────────────────────────────────────────────
def _generate_keywords_sync(prompt: str):
    return client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.5,                        # fix 5: was 0.3
            response_mime_type="application/json",
        ),
    )


# ── 3. Main entry point ───────────────────────────────────────────────────────
async def generate_seo_keywords(topic: str) -> dict:
    """
    RAG-style SEO keyword generator.
    1. Retrieval: Concurrently fetch Tavily + Exa search context for topic grounding.
    2. Generation: Gemini generates structured primary, secondary, and semantic keywords + gap analysis.
    """

    # --- Retrieval Phase ---
    try:
        context_data = await gather_search_context(topic)
    except Exception as e:
        logger.error(f"Search grounding context retrieval failed: {e}. Falling back to old retrieval.")
        context_data = None

    # Graceful degradation fallback
    if not context_data or not (context_data.get("related_questions") or context_data.get("competing_pages")):
        logger.info("Grounding context retrieval thin or failed. Using fallback search retrieval.")
        fallback_context = await asyncio.to_thread(_retrieve_context_sync, topic)
        if fallback_context == "No context available.":
            # Soft fallback: proceed with Gemini-only keyword generation instead of failing the job
            logger.warning("All retrieval methods returned empty context. Proceeding with Gemini-only generation.")
            fallback_context = "No live context retrieved. Base keywords on topic knowledge only."
        
        context_data = {
            "related_questions": [],
            "related_searches": [],
            "competing_pages": [{"title": "Fallback", "url": "", "snippet_or_summary": fallback_context}]
        }

    # Format the retrieved Tavily + Exa data for the prompt context
    related_qs_str = "\n".join(f"- {q}" for q in context_data.get("related_questions", [])) or "None retrieved."
    related_searches_str = "\n".join(f"- {s}" for s in context_data.get("related_searches", [])) or "None retrieved."
    competing_pages_str = ""
    for idx, page in enumerate(context_data.get("competing_pages", []), 1):
        competing_pages_str += f"{idx}. TITLE: {page.get('title')}\n   URL: {page.get('url')}\n   INSIGHT: {page.get('snippet_or_summary', '')[:400]}\n\n"
    if not competing_pages_str:
        competing_pages_str = "None retrieved."

    search_context_text = f"""RELATED QUESTIONS (People Also Ask):
{related_qs_str}

RELATED SEARCHES:
{related_searches_str}

COMPETING PAGES Snippets:
{competing_pages_str}"""

    # --- Prompt ---
    prompt = f"""You are a senior SEO strategist building keyword research for 'ArticleShip', a high-authority content platform.

Your task: generate a comprehensive, publication-ready keyword set for the topic below. Base your analysis on BOTH the topic and the provided search context — do not invent keywords not supported by real search behavior.

TOPIC: "{topic}"

SEARCH CONTEXT (ground truth query suggestions and top competitor content insights):
{search_context_text}

Here are real search queries and questions people ask about this topic:
{related_searches_str}
{related_qs_str}
Use these to inform your keyword selection.

COMPETITIVE SIGNAL ANALYSIS (derive from search context before generating):
Before outputting keywords, internally identify:
- What angles do the top results already cover? (these are saturated)
- What user frustrations or questions appear in the snippets but are not addressed by the titles? (these are keyword opportunities)
- What comparison or failure-mode queries appear but have weak results? (these are low-competition entry points)

Use this analysis to bias your keyword selection toward underserved angles.
Do not output this analysis — use it to inform your keyword choices.

KEYWORD RULES:
- primary_keyword: The single highest-value keyword. Exactly ONE main target keyword. Must be specific enough to be winnable — avoid pure head terms like "AI" or "software jobs". Prefer a 2–4 word phrase with clear search intent. Bias toward long-tail, experience-based queries over generic category terms.
- secondary_keywords: 3–6 keywords that support the primary. Each must target a distinct angle (one tool-focused, one workflow-focused, one outcome-focused, one risk/failure-focused). No near-duplicates of the primary. At least one secondary keyword must target a failure, mistake, or limitation angle.
- semantic_keywords: 5–10 related/LSI terms that round out topical coverage. These inform content depth, not necessarily exact-match usage. At least 2 must target failure modes, limitations, or risks.
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
  "semantic_keywords": ["string", "string", "string", "string", "string"],
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

    # --- Gemini API Call (fix 6: safe response handling) ---
    response = None
    try:
        response = await asyncio.to_thread(_generate_keywords_sync, prompt)

        # Fix 5: regex strip handles leading spaces before fences
        raw = re.sub(r"^```(?:json)?\s*", "", response.text.strip())
        raw = re.sub(r"\s*```$", "", raw).strip()
        parsed = json.loads(raw)

        # Handle backward compatibility / downstream code integration
        if "semantic_keywords" in parsed:
            # Map/split semantic keywords to legacy keys (long_tail_keywords and lsi_keywords)
            # to prevent any downstream errors or frontend crashes
            half = len(parsed["semantic_keywords"]) // 2
            parsed["long_tail_keywords"] = parsed["semantic_keywords"][:half]
            parsed["lsi_keywords"] = parsed["semantic_keywords"][half:]
            if not parsed["long_tail_keywords"]:
                parsed["long_tail_keywords"] = parsed["semantic_keywords"]
            if not parsed["lsi_keywords"]:
                parsed["lsi_keywords"] = parsed["semantic_keywords"]
        else:
            # If model returned legacy format, map it back to new key
            parsed["semantic_keywords"] = parsed.get("long_tail_keywords", []) + parsed.get("lsi_keywords", [])

        # Attach search context for downstream structure/article builder grounding
        parsed["related_questions"] = context_data.get("related_questions", [])
        parsed["related_searches"] = context_data.get("related_searches", [])

        return parsed

    except json.JSONDecodeError as e:
        return {
            "error": f"JSON parse failed: {e}",
            "raw": response.text if response else "No response object",
        }
    except Exception as e:
        return {
            "error": str(e),
            "raw": response.text if response else "API call failed before response",
        }