import { NextRequest, NextResponse } from "next/server";
import { ContentBlock } from "@/lib/types";

const LOCAL_BACKEND_BASE_URL = "http://127.0.0.1:8000";
const PRODUCTION_BACKEND_BASE_URL = "https://article-ai-fs42.onrender.com";
const HYBRID_ENDPOINT_PATH = "/api/v1/generate_full_article_hybrid_html";

function getBackendEndpointUrl() {
  const configuredBase =
    process.env.BACKEND_BASE_URL ??
    process.env.BACKEND_API_URL ??
    (process.env.NODE_ENV === "production" ? PRODUCTION_BACKEND_BASE_URL : LOCAL_BACKEND_BASE_URL);
  const normalizedBase = configuredBase.replace(/\/+$/, "");
  return `${normalizedBase}${HYBRID_ENDPOINT_PATH}`;
}

function buildStructureFromBlocks(blocks: ContentBlock[]) {
  let h1 = "Generated Article";
  const sections: Array<{ h2: string; subsections: Array<{ h3: string; h4_tags: string[] }> }> = [];
  let currentSection: { h2: string; subsections: Array<{ h3: string; h4_tags: string[] }> } | null = null;
  let currentSubsection: { h3: string; h4_tags: string[] } | null = null;

  for (const block of blocks) {
    const heading = block.heading.replace(/^#+\s*/, "").trim();
    if (!heading) continue;

    if (block.level === 1) {
      h1 = heading;
    } else if (block.level === 2) {
      currentSection = { h2: heading, subsections: [] };
      sections.push(currentSection);
      currentSubsection = null;
    } else if (block.level === 3) {
      if (!currentSection) {
        currentSection = { h2: "General", subsections: [] };
        sections.push(currentSection);
      }
      currentSubsection = { h3: heading, h4_tags: [] };
      currentSection.subsections.push(currentSubsection);
    } else if (block.level >= 4 && currentSubsection) {
      currentSubsection.h4_tags.push(heading);
    }
  }

  return { h1, sections };
}

export async function POST(request: NextRequest) {
  try {
    const { topic, ai_generated } = await request.json();

    if (!topic || typeof topic !== "string") {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const imageSource = ai_generated === true ? "ai" : "stock";

    const backendUrl = getBackendEndpointUrl();

    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        image_source: imageSource,
        include_inline_styles: true
      }),
      cache: "no-store"
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      return NextResponse.json(
        {
          error: "Backend generation failed",
          details: errorText
        },
        { status: 502 }
      );
    }

    const payload = await backendResponse.json();
    const seo = payload.seo_data ?? {};
    const blocks: ContentBlock[] = payload.blocks ?? [];
    const structure = buildStructureFromBlocks(blocks);

    const images = blocks
      .filter((block) => !!block.image?.url)
      .map((block) => ({
        heading: block.heading.replace(/^#+\s*/, "").trim(),
        url: block.image?.url ?? "",
        alt: block.image?.alt ?? "",
        caption: block.image?.credit ? `Image credit: ${block.image.credit}` : "Generated image"
      }));

    return NextResponse.json({
      keywords: {
        primary_keyword: seo.primary_keyword ?? "",
        secondary_keywords: seo.secondary_keywords ?? [],
        long_tail_keywords: seo.long_tail_keywords ?? [],
        lsi_keywords: seo.lsi_keywords ?? [],
        search_intent: seo.search_intent ?? "Informational"
      },
      structure,
      content: payload.html ?? "",
      images,
      blocks,
      meta: payload.meta ?? {}
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown generation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
