import html
import re
from typing import Any, Dict, List, Optional

# ── Inline Markdown patterns ────────────────────────────────────────────────
INLINE_CODE_RE  = re.compile(r"`([^`]+)`")
BOLD_RE         = re.compile(r"\*\*([^*]+)\*\*")
ITALIC_RE       = re.compile(r"\*([^*]+)\*")
LINK_RE         = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")

# ── ArticleShip placeholder patterns ────────────────────────────────────────
# [IMAGE ALT: some descriptive text]  — strip from content (already consumed by image block)
IMAGE_ALT_RE    = re.compile(r"\[IMAGE ALT:[^\]]*\]", re.IGNORECASE)

# [SOURCE: institution — title — url]  — LEGACY: render as inline link (new articles use markdown links)
SOURCE_RE       = re.compile(r"\[SOURCE:\s*([^\]]+)\]", re.IGNORECASE)

# [INTERNAL LINK: suggested topic]  — render as a styled anchor placeholder
INTERNAL_LINK_RE = re.compile(r"\[INTERNAL LINK:\s*([^\]]+)\]", re.IGNORECASE)

# META_DESCRIPTION: ... line that sometimes bleeds into last block content
META_DESC_LINE_RE   = re.compile(r"^META_DESCRIPTION:.*$", re.MULTILINE | re.IGNORECASE)

# ALT_TAG_AUDIT: ... line emitted by model at end of article for self-validation
ALT_TAG_AUDIT_RE    = re.compile(r"^ALT_TAG_AUDIT:.*$", re.MULTILINE | re.IGNORECASE)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"\s+", "-", text)
    return text or "section"


def _extract_heading_text(heading: str) -> str:
    return re.sub(r"^#+\s*", "", heading or "").strip()


def _clean_content(content: str) -> str:
    """
    Strip all ArticleShip placeholders that should NOT appear as raw text in output.
    - [IMAGE ALT: ...] — consumed separately by image block, not needed in body
    - META_DESCRIPTION: ... — strip if model leaked it into last block
    - ALT_TAG_AUDIT: ... — model self-validation line, never shown to readers
    """
    content = IMAGE_ALT_RE.sub("", content)
    content = META_DESC_LINE_RE.sub("", content)
    content = ALT_TAG_AUDIT_RE.sub("", content)
    return content.strip()


def _apply_inline_markdown(text: str) -> str:
    """
    Convert inline Markdown + ArticleShip placeholders to HTML.
    Order matters: escape HTML first, then apply patterns.
    """
    escaped = html.escape(text)

    # Markdown links
    escaped = LINK_RE.sub(
        r'<a class="article-link" href="\2" target="_blank" rel="noopener noreferrer">\1</a>',
        escaped,
    )
    # Inline code
    escaped = INLINE_CODE_RE.sub(r'<code class="inline-code">\1</code>', escaped)
    # Bold
    escaped = BOLD_RE.sub(r"<strong>\1</strong>", escaped)
    # Italic
    escaped = ITALIC_RE.sub(r"<em>\1</em>", escaped)

    # [SOURCE: ...] — LEGACY fallback for old articles stored before inline-link format.
    # New articles use [anchor text](url) markdown links handled by LINK_RE above.
    # For old articles: render as an inline anchor if a URL is present, else strip silently.
    def _source_badge(m: re.Match) -> str:
        label = m.group(1).strip()

        url_match = re.search(r'https?://\S+', label)
        url = url_match.group(0).rstrip('.,)">') if url_match else ""

        parts_split = re.split(r'\s+[\u2014\u2013-]{1,2}\s+', label)
        display = parts_split[0].strip() if parts_split else label
        if not display or len(display) > 60:
            display = label[:57].rstrip(" \u2014\u2013-").strip() + "\u2026"

        if url:
            return (
                f'<a class="article-link" href="{html.escape(url)}" '
                f'target="_blank" rel="noopener noreferrer">{html.escape(display)}</a>'
            )
        # No URL — strip the placeholder entirely
        return ""
    escaped = SOURCE_RE.sub(_source_badge, escaped)

    # [INTERNAL LINK: suggested topic]  →  styled anchor placeholder
    def _internal_link(m: re.Match) -> str:
        topic = m.group(1).strip()
        slug = _slugify(topic)
        return (
            f'<a class="internal-link-placeholder" href="/articles/{html.escape(slug)}" '
            f'data-topic="{html.escape(topic)}">{html.escape(topic)}</a>'
        )
    escaped = INTERNAL_LINK_RE.sub(_internal_link, escaped)

    return escaped


# ── Inline style helpers (optional; controlled by include_inline_styles) ────

def _img_style(include_inline_styles: bool) -> str:
    return (
        ' style="width:min(72%,760px);height:auto;border-radius:12px;'
        'display:block;margin:10px auto 12px"'
    ) if include_inline_styles else ""


def _section_style(include_inline_styles: bool) -> str:
    return ' style="margin-top:28px"' if include_inline_styles else ""


def _heading_style(level: int, include_inline_styles: bool) -> str:
    if not include_inline_styles:
        return ""
    if level == 1:
        return (
            ' style="margin:0 0 16px 0;line-height:1.08;'
            'font-size:clamp(2.2rem,5vw,3.4rem);text-align:center;font-weight:700"'
        )
    return ' style="margin:0 0 12px 0;line-height:1.25"'


def _credit_style(include_inline_styles: bool) -> str:
    return (
        ' style="font-size:12px;text-align:center;color:#64748b;margin-top:4px"'
    ) if include_inline_styles else ""


def _p_style(include_inline_styles: bool) -> str:
    return (
        ' style="line-height:1.7;color:#444;margin:0 0 14px 0"'
    ) if include_inline_styles else ""


def _list_style(include_inline_styles: bool) -> str:
    return (
        ' style="line-height:1.7;color:#444;padding-left:22px;margin:0 0 14px 0"'
    ) if include_inline_styles else ""


def _quote_style(include_inline_styles: bool) -> str:
    return (
        ' style="border-left:4px solid #e2e8f0;padding:8px 16px;'
        'color:#334155;font-style:italic;margin:0 0 14px 0"'
    ) if include_inline_styles else ""


def _alt_text_style(include_inline_styles: bool) -> str:
    """Visually hidden helper for screen readers."""
    return (
        ' style="position:absolute;width:1px;height:1px;'
        'overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap"'
    ) if include_inline_styles else ""


# ── Markdown body → HTML ─────────────────────────────────────────────────────

def _is_list_item(line: str) -> bool:
    return bool(re.match(r"^[-*+]\s+", line) or re.match(r"^\d+\.\s+", line))


def _markdown_body_to_html(text: str, include_inline_styles: bool) -> str:
    """
    Convert the cleaned body text of a block to HTML paragraphs, lists, blockquotes.
    Handles all ArticleShip placeholders via _apply_inline_markdown.

    Blank-line tolerance: a blank line between two list items of the same type
    does NOT close the list — Gemini often inserts blank lines between bullets.
    """
    lines = text.splitlines()
    # Pre-pass: collect stripped lines so we can peek ahead
    stripped: List[str] = [l.strip() for l in lines]

    out: List[str] = []
    in_ul = in_ol = False

    def close_lists() -> None:
        nonlocal in_ul, in_ol
        if in_ul:
            out.append("</ul>")
            in_ul = False
        if in_ol:
            out.append("</ol>")
            in_ol = False

    i = 0
    while i < len(stripped):
        line = stripped[i]

        # Blank line — only close list if the next non-empty line is NOT a list item
        if not line:
            # Look ahead for the next non-empty line
            j = i + 1
            while j < len(stripped) and not stripped[j]:
                j += 1
            next_line = stripped[j] if j < len(stripped) else ""
            if not _is_list_item(next_line):
                close_lists()
            i += 1
            continue

        ul_m = re.match(r"^[-*+]\s+(.*)$", line)
        ol_m = re.match(r"^\d+\.\s+(.*)$", line)
        bq_m = re.match(r"^>\s?(.*)$", line)

        if ul_m:
            if in_ol:
                out.append("</ol>")
                in_ol = False
            if not in_ul:
                out.append(f'<ul class="content-list unordered"{_list_style(include_inline_styles)}>')
                in_ul = True
            out.append(f'<li class="content-list-item">{_apply_inline_markdown(ul_m.group(1))}</li>')
            i += 1
            continue

        if ol_m:
            if in_ul:
                out.append("</ul>")
                in_ul = False
            if not in_ol:
                out.append(f'<ol class="content-list ordered"{_list_style(include_inline_styles)}>')
                in_ol = True
            out.append(f'<li class="content-list-item">{_apply_inline_markdown(ol_m.group(1))}</li>')
            i += 1
            continue

        close_lists()

        if bq_m:
            out.append(
                f'<blockquote class="content-quote"{_quote_style(include_inline_styles)}>'
                f'{_apply_inline_markdown(bq_m.group(1))}</blockquote>'
            )
            i += 1
            continue

        # Regular paragraph
        out.append(
            f'<p class="content-text"{_p_style(include_inline_styles)}>'
            f'{_apply_inline_markdown(line)}</p>'
        )
        i += 1

    close_lists()
    return "\n".join(out)


# ── Image ALT extraction (for blocks that received [IMAGE ALT: ...] hints) ──

def _extract_image_alt_hint(content: str) -> Optional[str]:
    """
    If the model wrote [IMAGE ALT: some descriptive text] in the content,
    extract it so we can override a generic Unsplash alt attribute.
    """
    m = IMAGE_ALT_RE.search(content)
    if m:
        # Extract just the text after the colon
        inner = re.search(r"\[IMAGE ALT:\s*([^\]]+)\]", content, re.IGNORECASE)
        if inner:
            return inner.group(1).strip()
    return None


# ── Block → HTML section ─────────────────────────────────────────────────────

def _block_to_html(block: Dict[str, Any], include_inline_styles: bool) -> str:
    heading_raw  = str(block.get("heading", "")).strip()
    level        = max(1, min(int(block.get("level", 2) or 2), 6))
    heading_text = _extract_heading_text(heading_raw) or "Section"
    raw_content  = str(block.get("content", ""))
    image        = block.get("image") if isinstance(block.get("image"), dict) else {}

    section_id = _slugify(heading_text)
    parts: List[str] = []

    parts.append(
        f'<section id="{section_id}" class="article-section level-{level}"'
        f'{_section_style(include_inline_styles)}>'
    )

    # Heading
    h_class = "article-title" if level == 1 else "section-title"
    parts.append(
        f'<h{level} class="{h_class}"{_heading_style(level, include_inline_styles)}>'
        f'{html.escape(heading_text)}</h{level}>'
    )

    # Image block
    # Extract model's [IMAGE ALT: ...] hint before either branch consumes it
    hinted_alt = _extract_image_alt_hint(raw_content)

    if image and image.get("url"):
        # Real image: prefer model alt hint over generic Unsplash description
        img_alt    = hinted_alt or html.escape(str(image.get("alt", heading_text)))
        img_src    = html.escape(str(image["url"]))
        credit     = str(image.get("credit", "")).strip()
        credit_url = str(image.get("credit_url", "")).strip()

        parts.append('<figure class="article-image-wrap">')
        parts.append(
            f'<img class="article-image" src="{img_src}" alt="{img_alt}" '
            f'loading="lazy"{_img_style(include_inline_styles)} />'
        )
        if credit:
            if credit_url:
                parts.append(
                    f'<figcaption class="image-credit"{_credit_style(include_inline_styles)}>'
                    f'Image credit: <a class="article-link" href="{html.escape(credit_url)}" '
                    f'target="_blank" rel="noopener noreferrer">{html.escape(credit)}</a>'
                    f'</figcaption>'
                )
            else:
                parts.append(
                    f'<figcaption class="image-credit"{_credit_style(include_inline_styles)}>'
                    f'Image credit: {html.escape(credit)}</figcaption>'
                )
        parts.append('</figure>')

    elif hinted_alt:
        # No real image URL (Unsplash fetch failed/skipped) but model provided an alt hint.
        # Render a visually-hidden placeholder so the alt text survives for SEO crawlers
        # and screen readers without breaking the visual layout.
        parts.append(
            f'<img class="article-image article-image--pending" '
            f'alt="{html.escape(hinted_alt)}" '
            f'loading="lazy" style="display:none" />'
        )


    # Body content — clean first, then convert
    if raw_content.strip():
        cleaned = _clean_content(raw_content)
        if cleaned:
            parts.append(_markdown_body_to_html(cleaned, include_inline_styles))

    parts.append("</section>")
    return "\n".join(parts)


# ── Public API ───────────────────────────────────────────────────────────────

def convert_final_payload_to_hybrid_html(
    final_payload: Dict[str, Any],
    include_inline_styles: bool = True,
) -> Dict[str, Any]:
    """
    Converts the ArticleShip final formatter payload into publication-ready HTML.

    Handles:
      - All heading levels (H1–H4) as proper semantic tags
      - Images with model-hinted ALT text (overrides generic Unsplash alt)
      - [SOURCE: ...] placeholders → superscript citation badges
      - [INTERNAL LINK: ...] placeholders → styled anchor tags with data-topic attr
      - [IMAGE ALT: ...] markers → extracted and applied to <img>, stripped from body
      - META_DESCRIPTION: line → stripped from content if model leaked it into last block
      - Markdown inline (bold, italic, code, links)
      - Lists (ul/ol) and blockquotes
      - Optional inline styles (include_inline_styles=False for CSS-in-class-only output)

    Args:
        final_payload:         Output from format_final_article() in pipeline.py
        include_inline_styles: If True, add minimal inline CSS for immediate rendering.
                               Set False if you have a full CSS stylesheet.

    Returns:
        {
            "meta":                  { topic, primary_keyword, meta_description, ... },
            "seo_data":              { ... },
            "html":                  "<article class='article-shell'>...</article>",
            "render_mode":           "hybrid_class_plus_optional_inline",
            "inline_styles_enabled": bool,
        }
    """
    meta     = final_payload.get("meta", {})
    seo_data = final_payload.get("seo_data", {})
    blocks   = final_payload.get("blocks", [])

    parts: List[str] = ['<article class="article-shell">']

    for block in blocks:
        parts.append(_block_to_html(block, include_inline_styles))

    parts.append("</article>")

    return {
        "meta":                  meta,
        "seo_data":              seo_data,
        "html":                  "\n".join(parts),
        "render_mode":           "hybrid_class_plus_optional_inline",
        "inline_styles_enabled": include_inline_styles,
    }