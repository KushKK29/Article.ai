from services.keyword_engine import generate_seo_keywords
from services.structure_builder import build_article_structure
from services.article_builder import generate_article_content, select_related_articles
from services.content_mapper import parse_markdown_to_mapping
from services.image_fetcher import embed_images_in_article
from services.final_formatter import format_final_article
from services.article_store import list_articles_by_category

async def run_pipeline(topic: str, ai_generated: bool = False) -> Dict[str, Any]:
    """
    Orchestrates the entire article creation pipeline, running all steps in sequence
    and assembling the final publishable JSON payload.
    """
    # Step 1 — SEO keywords & Category
    seo_data = await generate_seo_keywords(topic)
    category = seo_data.get("category", "General")

    # Step 2 — Structure
    structure = await build_article_structure(topic, seo_data)

    # Step 3 — Fetch Related Articles for Internal Linking
    # We fetch all published articles in the same category, then pick the 3-5 most relevant by title.
    candidates = list_articles_by_category(category, exclude_topic=topic)
    related_articles = select_related_articles(topic, candidates) if candidates else None

    # Step 4 — Article content (with internal link injection)
    raw_markdown = await generate_article_content(
        topic, 
        seo_data, 
        structure, 
        related_articles=related_articles
    )

    # Step 5 — Map blocks
    mapped_article = parse_markdown_to_mapping(raw_markdown)

    # Step 6 — Embed images (all blocks fetched concurrently)
    blocks_with_images = await embed_images_in_article(mapped_article, ai_generated=ai_generated)

    # Step 7 — Format final output
    final_payload = format_final_article(topic, seo_data, blocks_with_images, raw_markdown)
    
    # Ensure category is in final payload meta
    if "meta" in final_payload:
        final_payload["meta"]["category"] = category

    return final_payload
