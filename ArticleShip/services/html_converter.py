import html
import re
from typing import Any, Dict, List


INLINE_CODE_RE = re.compile(r"`([^`]+)`")
BOLD_RE = re.compile(r"\*\*([^*]+)\*\*")
ITALIC_RE = re.compile(r"\*([^*]+)\*")
LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")


def _slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"\s+", "-", text)
    return text or "section"


def _extract_heading_text(heading: str) -> str:
    return re.sub(r"^#+\s*", "", heading or "").strip()


def _apply_inline_markdown(text: str) -> str:
    escaped = html.escape(text)
    escaped = LINK_RE.sub(r'<a href="\2" target="_blank" rel="noopener noreferrer">\1</a>', escaped)
    escaped = INLINE_CODE_RE.sub(r"<code>\1</code>", escaped)
    escaped = BOLD_RE.sub(r"<strong>\1</strong>", escaped)
    escaped = ITALIC_RE.sub(r"<em>\1</em>", escaped)
    return escaped


def markdown_to_html_fragment(markdown_text: str) -> str:
    lines = markdown_text.splitlines()
    out: List[str] = []
    in_ul = False
    in_ol = False

    def close_lists() -> None:
        nonlocal in_ul, in_ol
        if in_ul:
            out.append("</ul>")
            in_ul = False
        if in_ol:
            out.append("</ol>")
            in_ol = False

    for raw in lines:
        line = raw.strip()
        if not line:
            close_lists()
            continue

        ul_match = re.match(r"^[-*+]\s+(.*)$", line)
        ol_match = re.match(r"^\d+\.\s+(.*)$", line)
        quote_match = re.match(r"^>\s?(.*)$", line)

        if ul_match:
            if in_ol:
                out.append("</ol>")
                in_ol = False
            if not in_ul:
                out.append("<ul>")
                in_ul = True
            out.append(f"<li>{_apply_inline_markdown(ul_match.group(1))}</li>")
            continue

        if ol_match:
            if in_ul:
                out.append("</ul>")
                in_ul = False
            if not in_ol:
                out.append("<ol>")
                in_ol = True
            out.append(f"<li>{_apply_inline_markdown(ol_match.group(1))}</li>")
            continue

        close_lists()

        if quote_match:
            out.append(f"<blockquote>{_apply_inline_markdown(quote_match.group(1))}</blockquote>")
            continue

        out.append(f"<p>{_apply_inline_markdown(line)}</p>")

    close_lists()
    return "\n".join(out)


def convert_final_payload_to_html(final_payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Converts the final formatter payload into a pure HTML article string.

    Expected final_payload shape:
    {
      "meta": {...},
      "seo_data": {...},
      "blocks": [{"heading": "## ...", "level": 2, "content": "...", "image": {...}}, ...]
    }
    """
    meta = final_payload.get("meta", {})
    seo_data = final_payload.get("seo_data", {})
    blocks = final_payload.get("blocks", [])

    html_parts: List[str] = ["<article class=\"article-ship-output\">"]

    for block in blocks:
        heading_raw = str(block.get("heading", "")).strip()
        level = int(block.get("level", 2) or 2)
        level = max(1, min(level, 6))
        heading_text = _extract_heading_text(heading_raw) or "Section"
        content = str(block.get("content", ""))
        image = block.get("image", {}) if isinstance(block.get("image"), dict) else {}
        section_id = _slugify(heading_text)

        html_parts.append(f"<section id=\"{section_id}\">")
        html_parts.append(f"<h{level}>{html.escape(heading_text)}</h{level}>")

        if image.get("url"):
            alt = html.escape(str(image.get("alt", heading_text)))
            src = html.escape(str(image["url"]))
            credit = str(image.get("credit", "")).strip()
            credit_url = str(image.get("credit_url", "")).strip()
            html_parts.append("<figure>")
            html_parts.append(f"<img src=\"{src}\" alt=\"{alt}\" loading=\"lazy\" />")
            if credit:
                if credit_url:
                    html_parts.append(
                        f"<figcaption>Image credit: <a href=\"{html.escape(credit_url)}\" target=\"_blank\" rel=\"noopener noreferrer\">{html.escape(credit)}</a></figcaption>"
                    )
                else:
                    html_parts.append(f"<figcaption>Image credit: {html.escape(credit)}</figcaption>")
            html_parts.append("</figure>")

        if content:
            html_parts.append(markdown_to_html_fragment(content))

        html_parts.append("</section>")

    html_parts.append("</article>")

    return {
        "meta": meta,
        "seo_data": seo_data,
        "html": "\n".join(html_parts),
    }
