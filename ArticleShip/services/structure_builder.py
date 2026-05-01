import os
import re
import json
import asyncio
from dotenv import load_dotenv
from google import genai
from google.genai import types
from ddgs import DDGS

# Load environment variables
load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


# ── 1. Retrieval — topic-aware, URL-deduped, titles captured ─────────────────
def _retrieve_structure_context_sync(topic: str) -> str:
    snippets: list[str] = []
    seen_urls: set[str] = set()
    topic_lower = topic.lower()

    # Issue 1 + 8: topic-aware queries, 4-space indent throughout
    # Fix 1: replaced site: operators — DDGS ignores them silently
    if any(w in topic_lower for w in ["ai", "llm", "copilot", "cursor", "gpt", "chatgpt"]):
        queries = [
            f"{topic} real world experience failures",
            f"{topic} implementation mistakes lessons learned",
            f"{topic} vs manual workflow structured guide",
            f"{topic} reddit honest review 2025",
        ]
    elif any(w in topic_lower for w in ["history", "war", "ancient", "empire", "revolution"]):
        queries = [
            f"{topic} causes effects structured analysis",
            f"{topic} timeline key events guide",
            f"{topic} common misconceptions myths",
        ]
    elif any(w in topic_lower for w in ["python", "javascript", "typescript", "rust", "code", "dev", "engineer"]):
        queries = [
            f"{topic} complete implementation guide",
            f"{topic} common pitfalls production mistakes",
            f"{topic} best practices structured 2025",
            f"{topic} developer experience reddit discussion",
        ]
    elif any(w in topic_lower for w in ["seo", "blog", "ranking", "traffic", "adsense"]):
        queries = [
            f"{topic} step by step strategy guide",
            f"{topic} mistakes to avoid 2025",
            f"{topic} case study results breakdown",
        ]
    else:
        queries = [
            f"{topic} complete guide structured",
            f"{topic} common mistakes pitfalls",
            f"{topic} best practices real world 2025",
            f"{topic} community feedback lessons learned",
        ]

    try:
        # Issue 1: direct instantiation, max_results=4, capture title + URL
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
                # Issue 5 (prompt): include TITLE so model can analyse competitor headings
                snippets.append(
                    f"TITLE: {title}\nURL: {url}\nINSIGHT: {body[:400]}"
                )
                if len(snippets) >= 12:
                    break
            if len(snippets) >= 12:
                break

    except Exception as e:
        print(f"Structure retrieval failed: {e}")

    return "\n\n---\n\n".join(snippets) if snippets else "No context available."


# ── 2. Gemini call — temperature now explicit ─────────────────────────────────
def _generate_structure_sync(prompt: str):
    return client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.4,
        ),
    )


# ── Post-processing helpers ───────────────────────────────────────────────────
def _strip_empty_h4s(structure: dict) -> dict:
    """Fix 3: remove h4_tags keys when empty — reduces downstream noise."""
    for section in structure.get("sections", []):
        for sub in section.get("subsections", []):
            if sub.get("h4_tags") == []:
                sub.pop("h4_tags", None)
    return structure


def _validate_structure(structure: dict) -> list[str]:
    """Fix 4: lightweight validator — returns warnings, never aborts."""
    errors: list[str] = []
    sections = structure.get("sections", [])

    if len(sections) < 4:
        errors.append(f"Too few H2s: {len(sections)} (minimum 4)")

    risk_words = {"fail", "broke", "mistake", "wrong", "problem", "risk", "limitation", "pitfall", "avoid", "warning"}
    if not any(
        any(w in s.get("h2", "").lower() for w in risk_words)
        for s in sections
    ):
        errors.append("No failure/risk-focused H2 found")

    for s in sections:
        if not s.get("skimmability_hook"):
            errors.append(f"Missing skimmability_hook on H2: {s.get('h2')}")
        if len(s.get("subsections", [])) < 2:
            errors.append(f"Fewer than 2 H3s under H2: {s.get('h2')}")

    return errors


# ── 3. Main entry point ───────────────────────────────────────────────────────
async def build_article_structure(topic: str, seo_data: dict) -> dict:
    """
    Takes the topic and SEO keywords generated by the keyword engine
    and creates a structured article outline with proper H1, H2, H3 hierarchy.
    """
    search_context = await asyncio.to_thread(_retrieve_structure_context_sync, topic)

    # Fix 2: soft degraded fallback — better a warned output than no output at all
    if search_context == "No context available.":
        search_context = (
            "No live context retrieved. "
            "Base structure on SEO data and topic knowledge only. "
            "Do not invent competitor references or fabricate statistics."
        )

    # Fix 5: prevent silent empty content_angle reaching the prompt
    content_angle = (
        seo_data.get("content_angle")
        or "No content angle provided — derive the differentiation hook from search context and topic."
    )

    prompt = f"""You are a senior Content Strategist and SEO architect. Your task is to generate a deeply structured, SEO-optimized article outline for 'ArticleShip'.

TOPIC: "{topic}"

SEARCH CONTEXT (live retrieval snippets — includes competitor titles and body excerpts):
{search_context}

COMPETITOR TITLE ANALYSIS (derive before generating structure):
The SEARCH CONTEXT above contains TITLE fields from top-ranking articles.
Before building the outline, internally identify:
- What H2-level topics do these titles imply are already well-covered?
  (these sections need a differentiated angle, not a copy)
- What topics appear in the body snippets but NOT in any title?
  (these are structural gaps — strong candidates for your H2s)
- What failure modes or mistakes appear in snippets but lack dedicated sections
  in competitor titles? (these become your risk/failure H2)

Do not output this analysis. Use it to make your structure choices.

SEO DATA:
{json.dumps(seo_data, indent=2)}

CONTENT ANGLE (use this as the differentiation hook — the article must lead with this):
{content_angle}

STRUCTURE RULES:

1. H1 (exactly one): Formula: [Primary keyword] + [year or recency signal] + 
   [curiosity gap or strong claim]. Under 65 characters.
   
   CLICK-WORTHINESS TEST: The title must answer "why should I read THIS 
   article over the nine others on this topic?" Abstract nouns ("collapse", 
   "evolution", "revolution") fail this test. Specific outcomes pass it.
   
   Bad (abstract): "Blogging Business Model Viability 2025: The Middleman Collapse"
   Good (specific): "Blogging in 2025: What's Actually Dead and What Still Works"
   Bad (abstract): "The SEO Content Landscape Transformation"  
   Good (specific): "SEO Content in 2025: 3 Models That Work, 2 That Are Already Dead"
   
   If your H1 could be the title of a think-piece rather than a 
   practitioner's guide, rewrite it with a specific claim or outcome.

2. H2s (4–7 required): Each H2 is a major standalone section. Distribute secondary keywords across H2 headings — one secondary keyword per H2 where it fits naturally. Do not force it.
   REQUIRED: At least one H2 must be explicitly failure/risk-focused (e.g. "Where Copilot Actually Failed Us"). Generic positive-only structures will not rank against experienced practitioners who document real problems.
   REQUIRED: No two H2s may overlap in scope. Before finalising, check each H2 pair — if both could contain the same paragraph, one of them is redundant.

3. H3s (2–4 per H2): Break each H2 into focused sub-topics. Use long-tail keywords in H3s where relevant — they signal content depth to Google.
   REQUIRED: At least one H3 per article must be a named-mistake or specific-scenario heading (e.g. "The Binary Search Bug That Passed Code Review"). These dramatically increase dwell time and social sharing.

4. H4s (optional, use sparingly): Only add H4s when a sub-topic has 2+ genuinely distinct sub-points. Leave h4_tags as [] if not needed.

5. Content variety (required): The overall structure MUST include:
   - At least one comparison or "X vs Y" section
   - At least one how-to, step-by-step, or practical guide section
   - At least one FAQ, myth-busting, or "common mistakes" section
   CRITICAL — FAQ DEDUPLICATION: The FAQ section heading must cover questions NOT already answered as standalone H2 or H3 headings elsewhere. Scan the full structure before writing the FAQ heading.

6. Keyword placement map:
   - Primary keyword → H1 and at least one H2
   - Secondary keywords → H2 headings
   - Long-tail keywords → H3 headings
   - LSI keywords → inform H3/H4 topics but need not appear verbatim in headings

7. SKIMMABILITY ANCHORS: For each H2, add a skimmability_hook field: a single sentence (max 15 words) that summarises the section's core takeaway.
   REQUIRED: The hook must reflect an actual finding, risk, or outcome — not a generic description of the section. If the search context contains a specific data point or failure mode relevant to this section, use it in the hook.
   Bad:  "This section explains the benefits of using AI coding tools."
   Good: "Copilot is 70% faster on CRUD but actively harmful in algorithm design."

8. No redundancy: Every heading must cover a distinct angle. Do not create two H2s that overlap in scope.

9. RETRIEVAL GROUNDING (required): Use the SEARCH CONTEXT to align headings with real search phrasing and practical user questions. Do not copy sentences verbatim, and do not invent named tools/stats not supported by either SEO DATA or search context.

OUTPUT: A single valid JSON object only. No markdown fences. No explanation. No trailing commas.

Schema:
{{
  "h1": "string",
  "sections": [
    {{
      "h2": "string",
      "skimmability_hook": "string",
      "subsections": [
        {{
          "h3": "string",
          "h4_tags": []
        }}
      ]
    }}
  ]
}}"""

    # Issues 3 + 4: regex fence stripping + split exception handling
    response = None
    try:
        response = await asyncio.to_thread(_generate_structure_sync, prompt)

        raw = response.text.strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw).strip()
        parsed = _strip_empty_h4s(json.loads(raw))  # Fix 3
        warnings = _validate_structure(parsed)       # Fix 4
        if warnings:
            parsed["_validation_warnings"] = warnings
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
