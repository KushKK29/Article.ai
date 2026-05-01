import os
import re
import json
import asyncio
from dotenv import load_dotenv
from google import genai
from google.genai import types
from ddgs import DDGS

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


# ── 1. Multi-query retrieval ──────────────────────────────────────────────────
def _retrieve_context_sync(topic: str) -> str:
    snippets: list[str] = []
    seen_urls: set[str] = set()
    topic_lower = topic.lower()

    # Fix 3: topic-aware query selection mirrors article_builder category logic
    if any(w in topic_lower for w in ["ai", "copilot", "llm", "cursor", "gpt", "chatgpt"]):
        queries = [
            f"{topic} real user complaints production failures",
            f"{topic} reddit honest experience",
            f"{topic} vs manual workflow comparison",
        ]
    elif any(w in topic_lower for w in ["history", "war", "ancient", "empire", "revolution"]):
        queries = [
            f"{topic} causes effects analysis",
            f"{topic} scholarly debate",
            f"{topic} timeline key events",
        ]
    elif any(w in topic_lower for w in ["python", "javascript", "typescript", "rust", "code", "dev", "engineer"]):
        queries = [
            f"{topic} real world implementation problems",
            f"{topic} reddit developer experience",
            f"{topic} vs alternative approach",
        ]
    elif any(w in topic_lower for w in ["seo", "blog", "ranking", "traffic", "adsense"]):
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
    1. Retrieval: 3-angle DuckDuckGo search for rich, diverse signal.
    2. Generation: Gemini generates structured keywords + gap analysis.
    """

    # --- Retrieval Phase ---
    search_context = await asyncio.to_thread(_retrieve_context_sync, topic)

    # Fix 4: guard against ungrounded generation when retrieval fails
    if search_context == "No context available.":
        return {
            "error": "Retrieval failed — no search context available.",
            "message": "Cannot generate grounded keywords without live search signal.",
        }

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

OUTPUT: Respond with a single valid JSON object only. No markdown code fences. No explanation text before or after. No trailing commas.

Required JSON schema:
{{
  "primary_keyword": "string",
  "secondary_keywords": ["string", "string", "string"],
  "long_tail_keywords": ["string", "string", "string", "string", "string"],
  "lsi_keywords": ["string", "string", "string", "string", "string"],
  "search_intent": "Informational | Transactional | Navigational | Commercial",
  "content_angle": "string",
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
        return json.loads(raw)

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