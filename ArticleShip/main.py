from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List

from services.keyword_engine import generate_seo_keywords
from services.structure_builder import build_article_structure
from services.article_builder import generate_article_content
from services.content_mapper import parse_markdown_to_mapping
from services.image_fetcher import embed_images_in_article
from services.pipeline import run_pipeline
from services.html_converter import convert_final_payload_to_html
from services.hybrid_html_converter import convert_final_payload_to_hybrid_html
from services.article_store import save_article, list_articles, get_article_by_slug, get_article_by_id, publish_article, update_article, delete_article

app = FastAPI(
    title="ArticleShip API",
    description="Backend for SEO-Optimized Article Generator",
    version="1.0.0"
)


@app.get("/", tags=["Health"])
async def root_health():
    return {"status": "ok", "service": "ArticleShip API"}


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}

class TopicRequest(BaseModel):
    topic: str

class StructureRequest(BaseModel):
    topic: str
    seo_data: Dict[str, Any]

class ArticleRequest(BaseModel):
    topic: str
    seo_data: Dict[str, Any]
    structure: Dict[str, Any]

class MapperRequest(BaseModel):
    markdown_content: str

class ImageRequest(BaseModel):
    mapped_article: List[Dict[str, Any]]
    image_source: str = "stock" # Can be "stock" (unsplash/google) or "ai_generated"

class PipelineRequest(BaseModel):
    topic: str
    image_source: str = "stock"

class FinalPayloadRequest(BaseModel):
    final_payload: Dict[str, Any]

class HybridFinalPayloadRequest(BaseModel):
    final_payload: Dict[str, Any]
    include_inline_styles: bool = True

class HybridPipelineRequest(BaseModel):
    topic: str
    image_source: str = "stock"
    include_inline_styles: bool = True

class SaveArticleRequest(BaseModel):
    topic: str
    payload: Dict[str, Any]

class ArticlePublishRequest(BaseModel):
    pass

class ArticleUpdateRequest(BaseModel):
    topic: str | None = None
    payload: Dict[str, Any]

@app.post("/api/v1/keywords", tags=["Keyword Engine"])
async def get_keywords(request: TopicRequest):
    """
    Generate an SEO keyword cluster using a RAG approach.
    It scrapes related queries and context from the web, returning optimal keywords.
    """
    try:
        data = await generate_seo_keywords(request.topic)
        return {"topic": request.topic, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/structure", tags=["Structure Builder"])
async def build_structure(request: StructureRequest):
    """
    Generate an article outline structure (H1, H2, H3, H4) based on the topic and generated SEO data.
    """
    try:
        data = await build_article_structure(request.topic, request.seo_data)
        return {"topic": request.topic, "structure": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/article", tags=["RAG Content Generator (Draft)"])
async def build_article(request: ArticleRequest):
    """
    Takes the topic, injected SEO keywords, and strict article structure outline, 
    and writes the comprehensive markdown article content for each section.
    """
    try:
        content = await generate_article_content(request.topic, request.seo_data, request.structure)
        return {
            "topic": request.topic, 
            "article_markdown": content
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/mapper", tags=["Content Mapper"])
async def map_article_content(request: MapperRequest):
    """
    Parses a generated Markdown article and breaks it down into a structured JSON dictionary mapping every heading directly to its content.
    """
    try:
        mapped_data = parse_markdown_to_mapping(request.markdown_content)
        return {"mapped_article": mapped_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/images", tags=["Image Fetcher (parallel)"])
async def fetch_images(request: ImageRequest):
    """
    Takes the structurally mapped article and attaches proper images to sections based on priority rules.
    If image_source is 'ai_generated', uses the Pollen API. Otherwise, uses stock sources (Unsplash/Google).
    """
    try:
        final_data = await embed_images_in_article(request.mapped_article, ai_generated=(request.image_source == "ai_generated"))
        return {"article_with_images": final_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/generate_full_article", tags=["End-to-End Orchestrator"])
async def generate_full_article(request: PipelineRequest):
    """
    Runs the complete ArticleShip pipeline from start to finish.
    Takes a single topic and outputs a perfectly formatted ready-to-publish JSON payload
    including SEO metrics, word counts, and accurately embedded images.
    """
    try:
        final_payload = await run_pipeline(request.topic, ai_generated=(request.image_source == "ai_generated"))
        return final_payload
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/html_from_final", tags=["HTML Converter"])
async def html_from_final(request: FinalPayloadRequest):
    """
    Converts final_formatter output payload into pure HTML.
    """
    try:
        html_payload = convert_final_payload_to_html(request.final_payload)
        return html_payload
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/generate_full_article_html", tags=["End-to-End Orchestrator"])
async def generate_full_article_html(request: PipelineRequest):
    """
    Runs the complete pipeline and returns the same payload plus a pure HTML article.
    """
    try:
        final_payload = await run_pipeline(request.topic, ai_generated=(request.image_source == "ai_generated"))
        html_payload = convert_final_payload_to_html(final_payload)
        return {
            "meta": html_payload.get("meta", {}),
            "seo_data": html_payload.get("seo_data", {}),
            "blocks": final_payload.get("blocks", []),
            "html": html_payload.get("html", ""),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/hybrid_html_from_final", tags=["HTML Converter"])
async def hybrid_html_from_final(request: HybridFinalPayloadRequest):
    """
    Converts final formatter output into hybrid HTML:
    class-based structure + optional minimal inline styles.
    """
    try:
        hybrid_payload = convert_final_payload_to_hybrid_html(
            request.final_payload,
            include_inline_styles=request.include_inline_styles,
        )
        return hybrid_payload
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/generate_full_article_hybrid_html", tags=["End-to-End Orchestrator"])
async def generate_full_article_hybrid_html(request: HybridPipelineRequest):
    """
    Runs the complete pipeline and returns hybrid HTML optimized for frontend rendering.
    """
    try:
        final_payload = await run_pipeline(request.topic, ai_generated=(request.image_source == "ai_generated"))
        hybrid_payload = convert_final_payload_to_hybrid_html(
            final_payload,
            include_inline_styles=request.include_inline_styles,
        )
        return {
            "meta": hybrid_payload.get("meta", {}),
            "seo_data": hybrid_payload.get("seo_data", {}),
            "blocks": final_payload.get("blocks", []),
            "html": hybrid_payload.get("html", ""),
            "render_mode": hybrid_payload.get("render_mode", "hybrid_class_plus_optional_inline"),
            "inline_styles_enabled": hybrid_payload.get("inline_styles_enabled", request.include_inline_styles),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/articles", tags=["Article Store"])
async def get_saved_articles(slug: str | None = None, status: str | None = None):
    """
    Returns all saved articles from MongoDB, or a single article when slug is provided.
    """
    try:
        if slug:
            article = get_article_by_slug(slug)
            if not article:
                raise HTTPException(status_code=404, detail="Article not found")
            return {"article": article}
        return {"articles": list_articles(status=status)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/articles/{article_id}", tags=["Article Store"])
async def get_saved_article(article_id: str):
    """
    Returns a single saved article by id.
    """
    try:
        article = get_article_by_id(article_id)
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        return {"article": article}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/articles", tags=["Article Store"])
async def create_saved_article(request: SaveArticleRequest):
    """
    Persists a generated article payload in MongoDB.
    """
    try:
        article = save_article(request.topic, request.payload)
        return {"ok": True, "article": article}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/articles/{article_id}/publish", tags=["Article Store"])
async def publish_saved_article(article_id: str):
    """
    Validates and publishes a saved article, making it publicly available.
    """
    try:
        article = publish_article(article_id)
        return {"ok": True, "article": article}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/v1/articles/{article_id}", tags=["Article Store"])
async def update_saved_article(article_id: str, request: ArticleUpdateRequest):
    """
    Updates a draft article payload and resets publish state so it can be republished.
    """
    try:
        article = update_article(article_id, request.topic, request.payload)
        return {"ok": True, "article": article}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/v1/articles/{article_id}", tags=["Article Store"])
async def delete_saved_article(article_id: str):
    """
    Permanently deletes a saved article from MongoDB.
    """
    try:
        deleted = delete_article(article_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Article not found")
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)