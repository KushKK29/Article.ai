from typing import Dict, Any

from services.keyword_engine import generate_seo_keywords
from services.structure_builder import build_article_structure
from services.article_builder import generate_article_content
from services.content_mapper import parse_markdown_to_mapping
from services.image_fetcher import embed_images_in_article
from services.final_formatter import format_final_article

async def run_pipeline(topic: str, ai_generated: bool = False) -> Dict[str, Any]:
    """
    Orchestrates the entire article creation pipeline, running all steps in sequence
    and assembling the final publishable JSON payload.
    """
    # Step 1 — SEO keywords
    seo_data = await generate_seo_keywords(topic)

    # Step 2 — Structure
    structure = await build_article_structure(topic, seo_data)

    # Step 3 — Article content
    raw_markdown = await generate_article_content(topic, seo_data, structure)

    # Step 4 — Map blocks
    mapped_article = parse_markdown_to_mapping(raw_markdown)

    # Step 5 — Embed images (all blocks fetched concurrently)
    blocks_with_images = await embed_images_in_article(mapped_article, ai_generated=ai_generated)

    # Step 6 — Format final output
    final_payload = format_final_article(topic, seo_data, blocks_with_images, raw_markdown)

    return final_payload
