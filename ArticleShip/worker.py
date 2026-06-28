import os
import sys
import asyncio
import logging
from pymongo import ReturnDocument
from dotenv import load_dotenv

# Ensure we can import from services directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.article_store import get_jobs_collection, utc_now_iso, save_article, list_articles_by_category, publish_article, get_batches_collection
from services.keyword_engine import generate_seo_keywords
from services.structure_builder import build_article_structure
from services.article_builder import generate_article_content, select_related_articles
from services.content_mapper import parse_markdown_to_mapping
from services.image_fetcher import embed_images_in_article
from services.final_formatter import format_final_article
from services.hybrid_html_converter import convert_final_payload_to_hybrid_html

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("worker")

load_dotenv()


def _job_cost_defaults() -> dict:
    return {
        "gemini": {"calls": 0, "input_tokens": 0, "output_tokens": 0},
        "images": {"calls": 0},
        "estimated_cost": 0.0,
    }


def _merge_job_cost(job: dict, *, gemini_calls: int = 0, image_calls: int = 0) -> dict:
    cost = job.get("job_cost") if isinstance(job.get("job_cost"), dict) else {}
    merged = _job_cost_defaults()
    if isinstance(cost.get("gemini"), dict):
        merged["gemini"].update(cost["gemini"])
    if isinstance(cost.get("images"), dict):
        merged["images"].update(cost["images"])
    merged["gemini"]["calls"] = int(merged["gemini"].get("calls", 0)) + gemini_calls
    merged["images"]["calls"] = int(merged["images"].get("calls", 0)) + image_calls
    merged["estimated_cost"] = float(cost.get("estimated_cost", 0.0) or 0.0)
    return merged


async def process_job(job, jobs_col):
    job_id = job["_id"]
    topic = job["topic"]
    logger.info(f"Starting job {job_id} for topic: {topic}")
    
    try:
        # Step 1: Keywords
        logger.info(f"Job {job_id}: current_step=keywords")
        # Step already set to keywords during claim, but let's be explicit and update if needed
        seo_data = await generate_seo_keywords(topic)
        category = seo_data.get("category", "General")
        
        # Step 2: Outline
        logger.info(f"Job {job_id}: current_step=outline")
        jobs_col.update_one({"_id": job_id}, {"$set": {"current_step": "outline"}})
        
        word_count_target = job.get("word_count_target", 1500)
        image_count = job.get("image_count", 5)
        image_spacing = job.get("image_spacing", 2)
        
        structure = await build_article_structure(
            topic,
            seo_data,
            word_count_target=word_count_target,
            image_count=image_count,
            image_spacing=image_spacing
        )
        
        if "error" in structure:
            raise ValueError(f"Structure generation failed: {structure['error']}")
        
        # Save resolved image slots and count back to the job document
        jobs_col.update_one(
            {"_id": job_id},
            {
                "$set": {
                    "resolved_image_count": structure.get("resolved_image_count", image_count),
                    "assigned_image_slots": structure.get("assigned_image_slots", []),
                }
            }
        )
        
        # Step 3: Content
        logger.info(f"Job {job_id}: current_step=content")
        jobs_col.update_one({"_id": job_id}, {"$set": {"current_step": "content"}})
        candidates = list_articles_by_category(category, exclude_topic=topic)
        related_articles = select_related_articles(topic, candidates) if candidates else None
        raw_markdown = await generate_article_content(
            topic,
            seo_data,
            structure,
            related_articles=related_articles,
            word_count_target=job.get("word_count_target", 1500)
        )
        mapped_article = parse_markdown_to_mapping(raw_markdown)
        
        # Step 4: Images
        logger.info(f"Job {job_id}: current_step=images")
        jobs_col.update_one({"_id": job_id}, {"$set": {"current_step": "images"}})
        ai_generated = (job.get("image_source") == "ai_generated" or job.get("image_source") == "ai")
        assigned_slots = job.get("assigned_image_slots") or structure.get("assigned_image_slots", [])
        blocks_with_images = await embed_images_in_article(
            mapped_article, 
            ai_generated=ai_generated,
            assigned_image_slots=assigned_slots
        )
        
        # Step 5: Formatting
        logger.info(f"Job {job_id}: current_step=formatting")
        jobs_col.update_one({"_id": job_id}, {"$set": {"current_step": "formatting"}})
        final_payload = format_final_article(topic, seo_data, blocks_with_images, raw_markdown)
        if "meta" in final_payload:
            final_payload["meta"]["category"] = category
            
        include_inline_styles = job.get("include_inline_styles", True)
        hybrid_payload = convert_final_payload_to_hybrid_html(
            final_payload,
            include_inline_styles=include_inline_styles
        )
        
        article_payload = {
            "meta": hybrid_payload.get("meta", {}),
            "seo_data": hybrid_payload.get("seo_data", {}),
            "blocks": final_payload.get("blocks", []),
            "html": hybrid_payload.get("html", ""),
            "render_mode": hybrid_payload.get("render_mode", "hybrid_class_plus_optional_inline"),
            "inline_styles_enabled": hybrid_payload.get("inline_styles_enabled", include_inline_styles),
        }
        
        # Save article to database
        saved_art = save_article(topic, article_payload)
        result_article_id = saved_art["id"]
        
        # Auto-publish if requested
        auto_publish_failed = False
        if job.get("auto_publish"):
            logger.info(f"Job {job_id}: auto-publishing article {result_article_id}")
            try:
                publish_article(result_article_id)
            except Exception as publish_error:
                auto_publish_failed = True
                logger.error(f"Job {job_id}: auto-publish failed: {publish_error}")
        
        # Mark job as completed
        jobs_col.update_one(
            {"_id": job_id},
            {
                "$set": {
                    "status": "completed",
                    "current_step": "done",
                    "completed_at": utc_now_iso(),
                    "result_article_id": result_article_id,
                    "auto_publish_failed": auto_publish_failed,
                    "job_cost": _merge_job_cost(job, gemini_calls=3, image_calls=1),
                }
            }
        )
        logger.info(f"Successfully completed job {job_id}. Saved article ID: {saved_art['id']}")
        
        # Update parent batch if present
        if job.get("batch_id"):
            try:
                batches_col = get_batches_collection()
                batches_col.update_one(
                    {"_id": job["batch_id"]},
                    {"$inc": {"completed_count": 1}}
                )
            except Exception as batch_err:
                logger.error(f"Failed to increment batch completed count: {batch_err}")
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error processing job {job_id}: {error_msg}")
        import traceback
        traceback.print_exc()
        jobs_col.update_one(
            {"_id": job_id},
            {
                "$set": {
                    "status": "failed",
                    "completed_at": utc_now_iso(),
                    "error_message": error_msg,
                    "auto_publish_failed": bool(job.get("auto_publish")),
                    "job_cost": _merge_job_cost(job, gemini_calls=3, image_calls=1),
                }
            }
        )
        
        # Update parent batch if present
        if job.get("batch_id"):
            try:
                batches_col = get_batches_collection()
                batches_col.update_one(
                    {"_id": job["batch_id"]},
                    {"$inc": {"failed_count": 1}}
                )
            except Exception as batch_err:
                logger.error(f"Failed to increment batch failed count: {batch_err}")


async def main_loop():
    logger.info("Background worker started. Polling MongoDB for queued jobs...")
    try:
        jobs_col = get_jobs_collection()
    except Exception as e:
        logger.critical(f"Failed to connect to MongoDB: {e}")
        return

    while True:
        try:
            # Atomic claim: Status=queued OR (status=scheduled AND scheduled_at <= now())
            # This serves as the locking mechanism: find_one_and_update is atomic,
            # meaning only one worker instance can claim a given job.
            now_iso = utc_now_iso()
            job = jobs_col.find_one_and_update(
                {
                    "$or": [
                        {"status": "queued"},
                        {
                            "status": "scheduled",
                            "scheduled_at": {"$lte": now_iso}
                        }
                    ]
                },
                {
                    "$set": {
                        "status": "processing",
                        "started_at": now_iso,
                        "current_step": "keywords"
                    }
                },
                sort=[("created_at", 1)],
                return_document=ReturnDocument.AFTER
            )
            
            if job:
                # Run the job
                await process_job(job, jobs_col)
            else:
                # No jobs found, sleep for 2 seconds
                await asyncio.sleep(2)
        except Exception as e:
            logger.error(f"Error in main polling loop: {e}")
            await asyncio.sleep(5)


if __name__ == "__main__":
    try:
        asyncio.run(main_loop())
    except KeyboardInterrupt:
        logger.info("Worker stopped by user.")
