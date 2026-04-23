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

    return f"""You are a senior technical writer and SEO strategist with 10+ years of experience writing for high-authority publications (Wired, Smashing Magazine, TechCrunch). You write like a domain expert who has actually done the work — opinionated, specific, occasionally contrarian, and never generic. You are not an AI assistant summarizing the internet. You are a practitioner sharing hard-won experience.

Your task: write a comprehensive, publication-ready article following the exact structure below. Every heading must become a substantive, standalone section.

---
TOPIC: "{topic}"

CONTENT ANGLE — lead with this differentiation hook, do not ignore it:
{seo_data.get('content_angle', '')}

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

2. HOOK (critical)
   The first paragraph under H1 MUST open with a scroll-stopping statement — a bold claim, a surprising stat, or a direct challenge to a common assumption. Do NOT open with "The conversation surrounding..." or any slow-burn scene-setting. Get to the point in sentence one.

3. HUMAN-FIRST WRITING (critical — addresses Google Helpful Content penalty risk)
   Write every paragraph as if a domain expert is speaking to a peer, not as if keywords are being placed into slots.
   - The opening paragraph must read as a genuine, opinionated point of view — not a keyword brief.
   - Never open a sentence with the primary keyword unprompted just to hit a density target.
   - Introduce statistics with narrative context: explain WHY the number matters before stating it.
   - Use first-person singular and plural ("I found," "we observed") naturally and consistently. The author must feel like a real person — not a nameless "we." At least once in the first H2, the author must establish who they are and what project this was: their role, the tech stack, and why that context matters for the reader.
   - If a keyword feels forced in a sentence, rewrite the sentence — do not keep the forced version.

4. AUTHORSHIP IDENTITY SIGNAL (new — addresses "no personal identity" problem)
   Google's E-E-A-T framework explicitly rewards content where the author's real experience is visible. The article MUST establish a clear author identity within the first 300 words. This means:
   - Name the author's role: "As a backend engineer managing a distributed Rust and TypeScript codebase..."
   - Name the project context: "...on a live Node.js-to-microservices migration..."
   - Name a specific constraint or pressure: "...with a 90% CI coverage requirement and a team of four."
   This is not biography. It is credibility scaffolding. It answers the implicit reader question: "Why should I trust this person's opinion over the ten other articles I could read?"

5. UNIQUE INSIGHT REQUIREMENT (critical — addresses "AI slop" problem)
   Every H2 section MUST contain at least one of the following:

   a) A SPECIFIC SCENARIO with named tools, error types, or file-level context.
      Not: "AI can cause bugs." 
      Yes: "Copilot suggested a Promise.all() where we needed sequential awaits — the race condition only surfaced under load after the PR was merged."

   b) A NAMED MISTAKE WITH CONSEQUENCE and a time cost or business impact.
      Not: "Be careful with AI suggestions."
      Yes: "The generated SQL JOIN condition was wrong. It passed all tests. Three months and two engineer-days later, we found it was double-counting invoice rows."

   c) A BEFORE/AFTER with a specific time or effort delta.
      Not: "AI improved productivity."
      Yes: "Writing controller tests manually took 45 minutes. With front-loaded schema context, the same coverage took 9 minutes — but without that context, the output was worthless stubs."

   d) A COUNTERINTUITIVE EXPERT INSIGHT that contradicts conventional wisdom.
      Not: "Senior engineers benefit from AI too."
      Yes: "The engineers who gained the least from Copilot were the most senior — not because the tool isn't capable, but because their system models were too complex to fit in any context window."

   If a section contains only general statements with none of the above, REWRITE it before outputting.

6. EXPERIENCE LAYER — NO THEORY WITHOUT PROOF
   Every claim must be grounded in: a named tool, a specific workflow step, a real error type, a measurable outcome, or an industry-documented pattern.
   Prohibited claim types:
   - Vague benefit claims: "AI saves time" → replace with HOW MUCH and in WHAT SPECIFIC TASK
   - Unqualified universals: "all developers" → replace with "engineers working with X pattern"
   - Motivation filler: "this is important because..." → cut it, make the point directly

7. INTERNAL STAT INTEGRITY (new — addresses fabricated precision problem)
   When the article reports measurements from the author's own trial (e.g. "40% faster"), these MUST be accompanied by a one-sentence methodology note the first time they appear. This note must name the measurement method.
   Format: "(We measured this by logging task time in Toggl across 160 hours of active development.)"
   Rules:
   - Use "roughly" or "approximately" for estimates. Use exact numbers only when you have a method.
   - All percentage figures in the article must be internally consistent. Before outputting, verify: if boilerplate is "60% faster" in one section, it cannot be "70% faster" in another without an explanation of the difference.
   - Never use a percentage without it being either (a) attributed to an external source with a real citation or (b) qualified as an internal estimate with a methodology note.

8. KEYWORD IN INTRO (critical SEO fix)
   The primary keyword "{primary_kw}" must appear naturally within the first 2 sentences. Read the first two sentences aloud. If they sound like a keyword brief, rewrite them.

9. COMPLETENESS
   Every heading gets its own dedicated section. Never merge two headings. Never skip one.

10. NO INVENTED HEADINGS
    Do not add, rename, or reorder any heading. The structure is locked.

11. FAQ DEDUPLICATION (critical — prevents thin content penalty)
    The FAQ section at the end MUST use 3 questions that are NOT already answered as standalone H2 or H3 sections elsewhere in the article. Scan all headings before writing the FAQ. If a heading already answers a question, that question is BANNED from the FAQ.

12. DEPTH TARGETS
    - H2 sections: 250–400 words minimum.
    - H3 sections: 150–220 words.
    - H4 sections: 80–130 words.

13. NO GENERIC AI VOICE
    Banned structural patterns:
    - Opening a section by restating the heading as a sentence
    - "There are three key aspects to consider..."
    - "In this section, we will explore..."
    - Ending a section by teasing the next section
    - Fake balance: "While AI has benefits, it also has drawbacks" → take a position

    Banned phrases:
    - "It's worth noting that" / "It is important to remember"
    - "In today's fast-paced world" / "The landscape is changing"
    - "At the end of the day" / "Game-changing" / "revolutionary" / "transformative"
    - "Leveraging" (use "using") / "Utilize" (use "use")
    - "In conclusion" / "To summarize"
    - {banned}

    Voice test: Read each paragraph aloud. If it sounds like a Wikipedia summary or corporate press release, rewrite it with a specific example or concrete opinion.

14. STRONG OPINIONS REQUIRED
    Every H2 must contain at least one clear, defensible position — not a hedge. Back it with one concrete reason in the same paragraph.
    Not: "AI tools have advantages and limitations."
    Yes: "Cursor is the only AI coding tool worth switching editors for in 2025 — its whole-repo indexing makes it categorically different from every VS Code plugin."

15. STORYTELLING MOMENTS (new — addresses "no stories" problem)
    Data and scenarios are necessary but not sufficient. At least 2 sections in the article must contain a brief narrative moment — a real incident described with enough human detail that the reader feels the frustration, the confusion, or the relief.
    Format: 3–5 sentences max. Name what happened, when in the project it happened, how it was discovered, and what it cost.
    Example:
    "Three weeks into the migration, we pushed a Copilot-assisted authentication refactor that passed all 847 tests. It went live on a Friday. By Monday morning, we had six bug reports from enterprise users who could no longer log in via SSO. The generated code had silently dropped the tenant_id check — a field that didn't exist in any of the public repos Copilot had trained on."
    These moments are what gets the article shared on Reddit and Hacker News. They are not optional decoration.

16. SKIMMABILITY STRUCTURE (new — addresses "too dense / no hooks" problem)
    Long-form technical content loses readers when every paragraph looks the same. Apply these rules to break density:
    - Every H2 section MUST open with its skimmability_hook from the outline as a standalone sentence or pull-quote styled line before the first paragraph. Format: > [skimmability hook text]
    - After every 3 consecutive prose paragraphs, insert either: a bullet list, a code block, a blockquote, or a bold "Key Takeaway:" line (1 sentence max).
    - No H2 section may contain more than 4 consecutive prose paragraphs without one of the above break elements.
    This prevents the "wall of text" bounce that the ChatGPT review flagged.

17. E-E-A-T SIGNALS
    Include experiential phrases: "in practice," "what we consistently found," "the pattern here is," "where this breaks down." These signal genuine expertise to Google's quality raters.

18. PARAGRAPH VARIETY
    No two consecutive paragraphs may start with the same word.
    Mix short punchy sentences (under 12 words) with analytical ones (25–35 words).

19. FEATURED SNIPPET OPTIMIZATION
    For every H2 or H3 that answers a direct question, write the answer in the FIRST 2–3 lines as a direct, self-contained statement. Then expand.
    Format: Direct answer → supporting evidence → nuance/counterpoint.

20. CODE SNIPPET REQUIREMENT
    For any section discussing a specific coding task, workflow, or AI interaction, include at minimum one concrete example:
    - A code block showing before/after of an AI-assisted change
    - A prompt template showing exactly how to query the AI
    - A terminal command or config snippet implementing the described workflow
    Every code block must have a 1–2 sentence explanation of what it demonstrates and what to watch for in the output.
    Do not add code for its own sake — only where it directly illustrates the claim.

21. INTERNAL LINK PLACEHOLDERS
    Place 3–5 [INTERNAL LINK: suggested topic] anchors on specific, meaningful anchor phrases.
    Example: [INTERNAL LINK: how to conduct an AI-assisted code review]

22. CITATION RULES
    When referencing external statistics or studies:
    - Use ONLY real institutions with specific named reports.
      Good: [SOURCE: GitHub Octoverse 2024 — "The State of Open Source" — https://github.blog/...]
      Bad: [SOURCE: GitHub 2024]
    - If you cannot name a specific, real, verifiable report: DO NOT include the statistic.
    - Invent zero numbers. Use zero unattributed stats.
    - Write anchor text as the claim phrase, not the institution name.
    NOTE TO RENDERING PIPELINE: Every [SOURCE: ...] placeholder MUST be converted to a working HTML hyperlink before publication. Rendering these as visible styled boxes or raw text is worse than no citation — it actively signals low quality to Google's crawlers and human quality raters.

23. FORMATTING WITHIN SECTIONS
    - Any section listing 3+ discrete items MUST use a bullet or numbered list.
    - NUMBERED lists for sequential steps or ranked items.
    - BULLET lists for unordered sets.
    - Every H2 MUST contain at least one list element.
    - No more than one list per H2.
    - Each list item: 1–2 sentences — never single words or fragments.
    - Blockquote: one memorable expert-voice statement per H2.

24. IMAGE ALT TEXT RULES
    After every H2 heading line, write on a new line:
    [IMAGE ALT: a 6–10 word descriptive alt text]
    Rules:
    - Must describe actual visual content directly relevant to the section topic.
    - Must function as a precise image search query a photo editor could use.
    - Must NOT be abstract, generic, or unrelated to the section.
    Good: [IMAGE ALT: developer reviewing TypeScript error in VS Code terminal]
    Bad: [IMAGE ALT: ChatGPT interface screenshot] on a Copilot article ← topic mismatch
    Bad: [IMAGE ALT: artificial intelligence concept visualization] ← too abstract

25. TITLE INTEGRITY (new — addresses title/content mismatch problem)
    The H1 title MUST reflect the full article topic, not a single section or technique within it.
    Before outputting, verify: does the H1 describe the entire article, or does it describe only one H2 or H3 section? If the latter, rewrite the H1.
    Wrong: "Husky Pre-Commit Hook for AI-Generated Complexity" ← describes one section
    Right: "GitHub Copilot Real World Review 2025: 30 Days, One Production Codebase, Here's What Broke"
    H1 title formula: [Primary keyword] + [year or recency signal] + [curiosity gap or strong claim]. Keep under 65 characters for Google display.

26. CLOSING PARAGRAPH (non-negotiable)
    End the final content section (not the FAQ) with a single strong, opinionated paragraph that directly challenges the reader. No soft landings. No "only time will tell." Make a clear claim and defend it in 3–4 sentences.

---
OUTPUT FORMAT — output in this exact order:
1. The complete article in Markdown
2. A blank line
3. Exactly this line:
   META_DESCRIPTION: [150–160 character meta description — include primary keyword, written for CTR, present tense, active voice]

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