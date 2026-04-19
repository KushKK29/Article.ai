import os
import json
import asyncio
import logging
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

BANNED_PHRASES = [
    "In conclusion", "It is important to note",
    "In today's fast-paced world", "Delve into",
    "It's worth mentioning", "Game-changer",
    "Revolutionize", "Leverage", "Robust", "Seamless",
    "In this article we will",
]


def build_prompt(topic: str, seo_data: dict, structure: dict,
                 banned_phrases: list[str] = BANNED_PHRASES) -> str:
    primary_kw = seo_data.get("primary_keyword", "")
    search_intent = seo_data.get("search_intent", "Informational")
    banned = ', '.join(f'"{p}"' for p in banned_phrases)

    return f"""You are a senior technical writer and SEO strategist with 10+ years of experience writing for high-authority publications (Wired, Smashing Magazine, TechCrunch). You write like a human expert — opinionated, specific, occasionally contrarian — not like a textbook or an AI assistant.
 
Your task: write a comprehensive, publication-ready article following the exact structure below. Every heading must become a substantive, standalone section.
 
---
TOPIC: "{topic}"
 
SEO INTEGRATION:
- Primary keyword ("{primary_kw}"): MUST appear in the first 2 sentences of the article, in at least one H2 heading verbatim, and in the final paragraph. This is non-negotiable.
- Secondary keywords: weave into H2/H3 openings naturally — one per section, not clustered.
- Long-tail keywords: each must appear at least once in body copy as a natural phrase — never bolted on at the end of a sentence.
- LSI keywords: distribute throughout as supporting vocabulary — they signal topical authority to Google.
- Search intent: {search_intent} — every section must serve this intent. Do not drift into unrelated subtopics.
- Never bold keywords or any search phrase in body text. Bold is for subheadings only.
 
Full SEO data:
{json.dumps(seo_data, indent=2)}
 
---
ARTICLE STRUCTURE (locked — reproduce every heading exactly, correct Markdown hierarchy):
{json.dumps(structure, indent=2)}
 
---
WRITING RULES:
 
1. FORMAT
   Output each heading in Markdown (# H1 / ## H2 / ### H3 / #### H4), immediately followed by its content.
   No heading without content. No content without a heading.
 
2. HOOK (critical — this was flagged as weak in editorial review)
   The first paragraph under H1 MUST open with a scroll-stopping statement — a bold claim, a surprising stat,
   or a direct challenge to a common assumption. Do NOT open with "The conversation surrounding..." or any
   slow-burn scene-setting. Get to the point in sentence one.
   Example of a strong hook: "AI software job replacement is already here — and it is not coming for the
   engineers you think it is."
 
3. KEYWORD IN INTRO (critical SEO fix)
   The primary keyword "{primary_kw}" must appear naturally within the first 2 sentences.
   Google weights the opening 100 words heavily. If the keyword is missing from the intro, the article
   will not rank regardless of content quality.
 
4. COMPLETENESS
   Every heading gets its own dedicated section. Never merge two headings. Never skip one.
 
5. NO INVENTED HEADINGS
   Do not add, rename, or reorder any heading. The structure is locked.
 
6. DEPTH TARGETS
   - H2 sections: 250–400 words minimum. Back every claim with specifics — tool names, real examples,
     named scenarios, or data points.
   - H3 sections: 150–220 words.
   - H4 sections: 80–130 words.
 
7. HUMANIZATION
   Write with a clear point of view. Use "you" and "we" naturally.
   Include at least one counterintuitive insight per H2 — something a beginner would not expect but an
   expert would recognize immediately.
 
8. E-E-A-T SIGNALS
   Include experiential phrases: "in practice," "what we've consistently seen," "the pattern here is,"
   "where this breaks down." These signal genuine expertise to Google's quality raters.
 
9. PARAGRAPH VARIETY
   No two consecutive paragraphs may start with the same word.
   Mix short punchy sentences (under 12 words) with analytical ones (25–35 words).
 
10. FEATURED SNIPPET OPTIMIZATION (new — addresses review feedback)
    For every H2 or H3 that answers a direct question (e.g. "Will AI replace developers?"), write the
    answer in the FIRST 2–3 lines of that section as a direct, self-contained statement. Then expand.
    Format: Direct answer (2–3 lines) → supporting evidence → nuance/counterpoint.
    This directly targets Google featured snippets and position zero.
 
11. INTERNAL LINK PLACEHOLDERS
    Place 3–5 [INTERNAL LINK: suggested topic] anchors throughout the article where a concept warrants
    a deeper standalone article. These must be on specific, meaningful anchor phrases — not generic words.
    Example: [INTERNAL LINK: how to conduct an AI-assisted code review]
 
12. CITATION PLACEHOLDERS (must use real institution names)
    When referencing a statistic or study, insert [SOURCE: institution + year] immediately after the claim.
    Use real institutions: GitHub, Stack Overflow, McKinsey, Gartner, Stanford, MIT, Google, etc.
    Example: "55% of developers report faster task completion with AI pair programming
    [SOURCE: GitHub Copilot Impact Report 2024]."
    Do NOT use vague placeholders like [SOURCE: study]. Be specific.
 
13. FAQ SECTION (new — high-impact for Google snippets)
    The LAST section before the closing paragraph MUST be a short FAQ block with exactly 3 questions.
    Format each question as an H3, followed by a direct 2–4 sentence answer.
    Choose questions that match high-volume long-tail searches from the SEO data provided.
    Example format:
    ### Will AI replace software developers completely?
    No. AI will replace the commodity tasks of software development — boilerplate, routine testing,
    simple CRUD operations — but not the role itself. Engineers who adapt become more valuable, not
    obsolete.
 
14. FORMATTING WITHIN SECTIONS (upgraded — bullets are currently missing from output)

   When to use bullet points (REQUIRED, not optional):
   - Any section listing 3+ discrete items, steps, tools, roles, risks, or strategies
     MUST use a bullet list or numbered list. Do not write these as comma-separated
     prose or run-on paragraphs.
   - Use NUMBERED lists (1. 2. 3.) for sequential steps or ranked items.
   - Use BULLET lists (- item) for unordered sets of distinct items.

   Trigger phrases that MUST produce a list:
   - "The steps are..." → numbered list
   - "These include..." → bullet list  
   - "Key skills/tools/roles/risks/mistakes are..." → bullet list
   - Any H4 section that describes a process or checklist → numbered list

   Hard minimum: Every H2 section MUST contain at least one list element
   (bullet or numbered) unless the entire section is a continuous analytical
   argument that cannot be broken into discrete items.

   Hard maximum: No more than one list per H2. Use lists to break up density,
   not to replace paragraphs entirely.

   Format:
   - Bullet: "- Item text here" (hyphen + space)
   - Numbered: "1. Item text here"
   - Each list item must be 1–2 sentences — not single words or fragments.

   Blockquotes: Use for one memorable expert-voice statement per H2.
   Format: "> The quoted insight here"
 
15. IMAGE ALT TEXT HINTS (new — addresses image SEO gap)
    After every H2 heading line, on a new line write:
    [IMAGE ALT: a 6–10 word descriptive alt text for a relevant image for this section]
    This must describe actual visual content, not repeat the heading.
    Example: [IMAGE ALT: developer reviewing AI-generated code on dual monitors]
 
16. TITLE AND META OPTIMIZATION (new — addresses CTR feedback)
    The H1 title must follow this formula: [Primary keyword] + [year or recency signal] + [curiosity gap or
    strong claim]. Keep it under 65 characters for Google display.
    Example: "AI Software Job Replacement in 2025: What the Data Actually Shows"
 
17. BANNED PHRASES — never use: {banned}
 
18. CLOSING PARAGRAPH (non-negotiable)
    End the final content section (not the FAQ) with a single strong, opinionated paragraph that directly
    challenges the reader. No soft landings. No "only time will tell." Make a clear claim and defend it
    in 3–4 sentences.
 
---
OUTPUT FORMAT — output in this exact order:
1. The complete article in Markdown
2. A blank line
3. Exactly this line (no quotes around the description):
   META_DESCRIPTION: [150–160 character meta description — include primary keyword, written for CTR,
   present tense, active voice]
 
Begin now. Output only the article and the META_DESCRIPTION line — zero preamble, zero commentary."""


async def generate_article_content(
    topic: str,
    seo_data: dict,
    structure: dict,
    *,
    model: str = "gemini-3-flash-preview",
    temperature: float = 0.7,
) -> str:
    """
    Generate full article markdown from topic, SEO data, and locked structure.
    """
    prompt = build_prompt(topic, seo_data, structure)

    try:
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=temperature,
                max_output_tokens=12192,
                candidate_count=1,
            ),
        )

        article = (response.text or "").strip()

        if not article:
            raise ValueError("Model returned an empty response.")

        logger.info("Article generated - approx %d words", len(article.split()))
        return article

    except Exception as e:
        logger.error("Article generation failed: %s", e)
        raise