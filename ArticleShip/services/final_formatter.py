from typing import Dict, Any, List

def format_final_article(
    topic: str,
    seo_data: Dict[str, Any],
    article_with_images: List[Dict[str, Any]],
    raw_markdown: str,
) -> Dict[str, Any]:
    """
    Merges all pipeline outputs into a single publishable payload.
    """
    # Extract the META_DESCRIPTION line the model appended at the end
    meta_description = ""
    lines = raw_markdown.strip().splitlines()
    for line in reversed(lines):
        if line.startswith("META_DESCRIPTION:"):
            meta_description = line.replace("META_DESCRIPTION:", "").strip()
            break

    # Calculate word count safely
    word_count = sum(len(str(b.get("content", "")).split()) for b in article_with_images)
    
    # Calculate image count safely
    image_count = sum(1 for b in article_with_images if b.get("image") and b["image"].get("url"))

    return {
        "meta": {
            "topic": topic,
            "primary_keyword": seo_data.get("primary_keyword", ""),
            "search_intent": seo_data.get("search_intent", "Informational"),
            "meta_description": meta_description,
            "word_count": word_count,
            "image_count": image_count,
        },
        "seo_data": seo_data,
        "blocks": article_with_images,
    }
