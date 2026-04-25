import os
import json
import asyncio
import logging
from dotenv import load_dotenv
from google import genai
from google.genai import types
from duckduckgo_search import DDGS

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


def _contains_cjk(text: str) -> bool:
    return bool(__import__("re").search(r"[\u4e00-\u9fff]", text or ""))


def _normalize_search_subject(topic: str) -> str:
    subject = (topic or "").strip()
    subject = __import__("re").sub(r"^\s*(why|how|what|when|where|who|which|is|are|can|should|does|do)\s+", "", subject, flags=__import__("re").I)
    subject = __import__("re").sub(r"\s*\([^)]*\)\s*", " ", subject)
    subject = __import__("re").sub(r"\s+", " ", subject).strip(" .,-")
    return subject or topic


def _core_search_terms(topic: str) -> str:
    subject = _normalize_search_subject(topic)
    tokens = [token for token in __import__("re").split(r"[^a-zA-Z0-9]+", subject.lower()) if token]
    stop_words = {
        "the", "and", "or", "for", "with", "in", "on", "at", "to", "of", "a", "an",
        "why", "how", "what", "when", "where", "who", "which", "is", "are", "can", "should",
        "does", "do", "real", "case", "cases", "study", "studies", "user", "complaints", "costs",
        "cost", "costing", "production", "fail", "fails", "failure", "failures", "builders", "builder",
    }
    filtered = [token for token in tokens if token not in stop_words]
    if not filtered:
        return subject
    return " ".join(filtered[:6])


def _retrieve_article_context_sync(topic: str) -> str:
    snippets: list[str] = []

    try:
        ddgs = DDGS()
        topic_lower = topic.lower()
        search_subject = _normalize_search_subject(topic)
        core_terms = _core_search_terms(topic)
        seen_urls: set[str] = set()

        # Step 1: Intent detection
        if any(word in topic_lower for word in ["error", "bug", "fix", "issue"]):
            category = "debug"
        elif any(word in topic_lower for word in ["ai", "llm", "model", "copilot", "cursor", "gpt"]):
            category = "ai"
        elif any(word in topic_lower for word in ["seo", "adsense", "blog", "ranking", "traffic"]):
            category = "seo"
        elif any(word in topic_lower for word in ["history", "war", "ancient", "revolution", "empire"]):
            category = "history"
        elif any(word in topic_lower for word in ["movie", "film", "series", "celebrity", "music"]):
            category = "entertainment"
        elif any(word in topic_lower for word in ["who is", "biography", "life", "early life"]):
            category = "biography"
        elif any(word in topic_lower for word in ["python", "javascript", "typescript", "rust", "golang", "code", "dev", "engineer"]):
            category = "engineering"
        else:
            category = "general"

        # Step 2: Category-based queries
        if category == "debug":
            queries = [
                f"{search_subject} fix solution explained",
                f"{search_subject} stackoverflow answer",
                f"{search_subject} github issue resolution",
                f"{search_subject} root cause analysis",
            ]

        elif category == "ai":
            queries = [
                f"{search_subject} real user complaints",
                f"{search_subject} reddit discussion",
                f"{search_subject} case study failures",
                f"{search_subject} production issues",
                f"{search_subject} vs manual development",
            ]

        elif category == "engineering":
            queries = [
                f"{search_subject} real world implementation problems",
                f"{search_subject} production case study results",
                f"{search_subject} best practices pitfalls 2025",
                f"{search_subject} stackoverflow discussion",
                f"{search_subject} github experience lessons",
            ]

        elif category == "seo":
            queries = [
                f"{search_subject} ranking strategy results",
                f"{search_subject} google algorithm guidelines",
                f"{search_subject} case study traffic growth",
                f"{search_subject} common mistakes penalties",
            ]

        elif category == "history":
            queries = [
                f"{search_subject} causes and effects analysis",
                f"{search_subject} timeline key events",
                f"{search_subject} historical significance",
                f"{search_subject} scholarly perspective",
            ]

        elif category == "entertainment":
            queries = [
                f"{search_subject} review critical reception",
                f"{search_subject} audience reaction discussion",
                f"{search_subject} performance analysis",
            ]

        elif category == "biography":
            queries = [
                f"{search_subject} biography career achievements",
                f"{search_subject} early life background",
                f"{search_subject} impact legacy",
            ]

        else:  # general
            queries = [
                f"{search_subject} real world benefits drawbacks",
                f"{search_subject} expert analysis opinion",
                f"{search_subject} research findings data",
            ]
        
        queries += [
            f"site:reddit.com {search_subject}",
            f"site:news.ycombinator.com {search_subject}",
        ]

        # Step 3: Domain scoring
        def score_domain(url: str) -> int:
            url = url.lower()
            if any(d in url for d in ["wikipedia.org", "britannica.com"]):
                return 5
            if any(d in url for d in [
                "reddit.com", "news.ycombinator.com",
                "stackoverflow.com", "github.com",
                "martinfowler.com", "acm.org", "ieee.org"
            ]):
                return 4
            if any(d in url for d in [
                "medium.com", "dev.to", "substack.com", "infoq.com",
                "smashingmagazine.com", "thenewstack.io",
                "techcrunch.com", "wired.com", "theguardian.com",
                "bbc.com", "nytimes.com"
            ]):
                return 3
            return 1

        temp_results = []
        blocked_domains = [
            "baidu.com", "zhidao.baidu.com", "zhihu.com", "weibo.com",
            "bilibili.com", "douyin.com", "xiaohongshu.com", "csdn.net",
            "cnblogs.com", "36kr.com"
        ]

        for query in queries:
            try:
                results = list(ddgs.text(query, max_results=6))

                for result in results:
                    body = str(result.get("body", "") or "").strip()
                    title = str(result.get("title", "") or "").strip()
                    url = str(result.get("href") or result.get("url") or result.get("link") or "").strip()

                    if not (body or title):
                        continue
                    if url in seen_urls:
                        continue
                    if any(d in url.lower() for d in [
                        "pinterest", "instagram", "facebook",
                        "tiktok", "amazon", "ebay", "quora"
                    ]):
                        continue
                    if any(domain in url.lower() for domain in blocked_domains):
                        continue
                    if _contains_cjk(title) or _contains_cjk(body) or _contains_cjk(url):
                        continue

                    seen_urls.add(url)
                    temp_results.append({
                        "score": score_domain(url),
                        "content": (
                            f"TITLE: {title}\n"
                            f"URL: {url}\n"
                            f"INSIGHT: {body[:500]}"
                        )
                    })

                    if len(temp_results) >= 20:
                        break

                if len(temp_results) >= 20:
                    break

            except Exception:
                continue

        # Sort by authority score
        temp_results.sort(key=lambda x: x["score"], reverse=True)

        # One result per domain for diversity
        final = []
        used_domains: set[str] = set()

        for item in temp_results:
            url = item["content"].split("URL: ")[1].split("\n")[0]
            domain = url.split("/")[2] if "://" in url else url

            if domain in used_domains:
                continue

            used_domains.add(domain)
            final.append(item["content"])

            if len(final) >= 10:
                break

        snippets = final

    except Exception as error:
        logger.warning("Article retrieval failed: %s", error)
    
    fallback_queries = [
        f"Detailed analysis of topic: {topic} ",
    ]
    # Add high-signal sources
    fallback_queries += [
        f"site:reddit.com {topic}",
        f"site:news.ycombinator.com {topic}",
    ]

    if category in ["history", "general", "biography"]:
        fallback_queries += [
            f"site:wikipedia.org {topic}",
            f"site:britannica.com {topic}",
        ]
    
    # Fallback
    if not snippets:
        try:
            ddgs_fallback = DDGS()
            count = 0

            for query in fallback_queries:
                results = list(ddgs_fallback.text(query, max_results=3))

                for result in results:
                    if count >= 10:
                        break

                    body = str(result.get("body", "") or "").strip()
                    title = str(result.get("title", "") or "").strip()
                    url = str(result.get("href") or result.get("url") or result.get("link") or "").strip()
                    if not (body or title):
                        continue
                    if any(domain in url.lower() for domain in [
                        "baidu.com", "zhidao.baidu.com", "zhihu.com", "weibo.com",
                        "bilibili.com", "douyin.com", "xiaohongshu.com", "csdn.net",
                        "cnblogs.com", "36kr.com"
                    ]):
                        continue
                    if _contains_cjk(title) or _contains_cjk(body) or _contains_cjk(url):
                        continue
                    snippets.append(f"TITLE: {title}\nURL: {url}\nINSIGHT: {(body or title)[:500]}")
                    count += 1

                if count >= 10:
                    break
        except Exception:
            pass

    # Final fallback: one last broad query for AI/web topics before giving up.
    if not snippets and ("ai" in topic_lower or "website" in topic_lower):
        try:
            ddgs_last_resort = DDGS()
            for result in list(ddgs_last_resort.text(fallback_queries, max_results=6)):
                body = str(result.get("body", "") or "").strip()
                title = str(result.get("title", "") or "").strip()
                url = str(result.get("href") or result.get("url") or result.get("link") or "").strip()

                if url in seen_urls:
                    continue
                if any(domain in url.lower() for domain in blocked_domains):
                    continue
                if not (body or title):
                    continue
                if _contains_cjk(title) or _contains_cjk(body) or _contains_cjk(url):
                    continue

                seen_urls.add(url)
                snippets.append(
                    f"TITLE: {title}\n"
                    f"URL: {url}\n"
                    f"INSIGHT: {(body or title or topic)[:300]}"
                )

                if len(snippets) >= 3:
                    break
        except Exception:
            pass

    if not snippets:
        return f"No high-quality live context available for: {topic}"

    return "\n\n---\n\n".join(snippets)


def build_prompt(topic: str, seo_data: dict, structure: dict,
                 search_context: str,
                 banned_phrases: list[str] = BANNED_PHRASES) -> str:
    primary_kw = seo_data.get("primary_keyword", "")
    search_intent = seo_data.get("search_intent", "Informational")
    banned = ', '.join(f'"{p}"' for p in banned_phrases)

    return f"""You are a senior technical writer and SEO strategist with 10+ years of experience writing for high-authority publications (Wired, Smashing Magazine, TechCrunch). You write like a domain expert who has actually done the work — opinionated, specific, occasionally contrarian, and never generic. You are not an AI assistant summarizing the internet. You are a practitioner sharing hard-won experience.

Your task: write a comprehensive, publication-ready article following the exact structure below. Every heading must become a substantive, standalone section.

---
TOPIC: "{topic}"

SEARCH CONTEXT (live retrieval snippets):
{search_context}

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

2b. TL;DR SUMMARY BLOCK (new — addresses bounce rate and featured snippet gap)
   Immediately after the opening hook paragraph and before the first H2, insert a structured summary block with horizontal rule separators. Format exactly as follows:

   ---
   **Quick verdict before you read:**
   - ✅ Worked: [2–4 specific tasks where the subject genuinely succeeded]
   - ❌ Failed: [2–4 specific failure areas covered in the article]
   - 💰 Real cost: [one specific financial or time cost from the article]
   - ⏱️ Honest time saving: [overall productivity verdict in one line]
   - 🎯 Who should read this: [one sentence describing the ideal reader]
   ---

   Rules:
   - Every bullet must reference something actually covered in the article body. Do not invent outcomes that don't appear in the content.
   - The ❌ Failed bullets must be specific failure modes, not generic warnings.
     Bad: "❌ Failed: complex tasks"
     Good: "❌ Failed: cross-file state management, OAuth retry logic, multi-tenant query isolation"
   - Keep every line under 12 words. This is a skimmable block, not a paragraph.
   - This block directly targets Google featured snippets for review-intent queries. The structured format (emoji labels + bullet list) is the exact pattern Google pulls for "X review 2025" and "is X worth it" searches.
   - Do not add headers like "## Summary" above it. The bold label and horizontal rules are sufficient. A heading would create a duplicate TOC entry.
   - This block is positioned AFTER the hook but BEFORE the first H2. Hook paragraph stays first to capture attention. TL;DR converts that attention into a commitment to read.

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

27. RETRIEVAL GROUNDING (required)
    Use SEARCH CONTEXT to align examples, terminology, and framing with real-world discourse.
    - Do not copy retrieved snippets verbatim.
    - Do not invent named tools, benchmark figures, or claims that are unsupported by SEO data or retrieved context.
    - If context is weak, stay general and avoid fabricated specifics.

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
    search_context = await asyncio.to_thread(_retrieve_article_context_sync, topic)
    prompt = build_prompt(topic, seo_data, structure, search_context)

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