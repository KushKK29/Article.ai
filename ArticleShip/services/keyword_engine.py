import os
import json
import asyncio
from dotenv import load_dotenv
from google import genai
from google.genai import types
from duckduckgo_search import DDGS

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def _retrieve_context_sync(topic: str) -> str:
    retrieved_context_snippets = []
    try:
        ddgs = DDGS()
        results = list(ddgs.text(f"{topic} target audience seo keywords", max_results=3))
        for r in results:
            snippet = r.get("body", "")
            if snippet:
                retrieved_context_snippets.append(snippet)
    except Exception as e:
        print(f"DuckDuckGo search failed: {e}")
        retrieved_context_snippets.append("No live search context available.")

    return "\n".join(retrieved_context_snippets)


def _generate_keywords_sync(prompt: str):
    return client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.3,
            response_mime_type="application/json",
        ),
    )


async def generate_seo_keywords(topic: str) -> dict:
    """
    RAG-style SEO keyword generator.
    1. Retrieval: DuckDuckGo search for real-world signal.
    2. Generation: Gemini generates structured keywords from topic + context.
    """

    # --- 1. Retrieval Phase ---
    search_context = await asyncio.to_thread(_retrieve_context_sync, topic)

    # --- 2. Augmented Generation Phase ---
    # NOTE: Any { } inside an f-string that are NOT variable placeholders
    # must be escaped as {{ }} — this is the fix for your format error.
    prompt = f"""You are a senior SEO strategist building keyword research for 'ArticleShip', a high-authority content platform.

Your task: generate a comprehensive, publication-ready keyword set for the topic below. Base your analysis on BOTH the topic and the provided search context — do not invent keywords not supported by real search behavior.

TOPIC: "{topic}"

SEARCH CONTEXT (from live web results):
{search_context}

KEYWORD RULES:
- primary_keyword: The single highest-value keyword. Must be specific enough to be winnable — avoid pure head terms like "AI" or "software jobs". Prefer a 2–4 word phrase with clear search intent.
- secondary_keywords: 3–5 keywords that support the primary. Each must target a distinct angle (e.g., one tool-focused, one career-focused, one trend-focused). No near-duplicates of the primary.
- long_tail_keywords: 5–7 full question or clause phrases (8–15 words each). These must reflect ACTUAL questions people type — use the search context as your signal.
- lsi_keywords: 5–7 semantically related terms. These must be conceptually related but NOT synonyms or rewordings of the primary keyword. They signal topical depth to Google.
- search_intent: Classify as exactly one of: Informational, Transactional, Navigational, or Commercial. Base this on the dominant intent visible in the search context snippets.

OUTPUT: Respond with a single valid JSON object only. No markdown code fences. No explanation text before or after. No trailing commas.

Required JSON schema:
{{
  "primary_keyword": "string",
  "secondary_keywords": ["string", "string", "string"],
  "long_tail_keywords": ["string", "string", "string", "string", "string"],
  "lsi_keywords": ["string", "string", "string", "string", "string"],
  "search_intent": "Informational | Transactional | Navigational | Commercial"
}}"""

    # --- 3. Gemini API Call ---
    try:
        response = await asyncio.to_thread(_generate_keywords_sync, prompt)
        return json.loads(response.text)

    except json.JSONDecodeError as e:
        return {"error": f"JSON parse failed: {e}", "raw": response.text}
    except Exception as e:
        return {"error": str(e), "message": "Gemini API call failed."}