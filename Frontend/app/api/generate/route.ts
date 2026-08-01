import { NextRequest, NextResponse } from "next/server";
import { ContentBlock } from "@/lib/types";
import { getBackendUrl, parseBackendResponse } from "@/lib/backend";

const HYBRID_ENDPOINT_PATH = "/api/v1/generate_full_article_hybrid_html";

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
    const { topic, ai_generated, word_count_target, image_count, image_spacing } = await request.json();

    if (!topic || typeof topic !== "string") {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const imageSource = ai_generated === true ? "ai" : "stock";

    const backendUrl = getBackendUrl(HYBRID_ENDPOINT_PATH);

    const authHeader = request.headers.get("Authorization");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        topic,
        image_source: imageSource,
        include_inline_styles: true,
        word_count_target: word_count_target ?? 1500,
        image_count: image_count ?? 5,
        image_spacing: image_spacing ?? 2
      }),
      cache: "no-store"
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      let detail = errorText;
      try {
        detail = JSON.parse(errorText).detail ?? errorText;
      } catch {
        // not JSON, keep raw text
      }
      return NextResponse.json(
        { error: detail },
        { status: backendResponse.status }
      );
    }

    const payload = await parseBackendResponse(backendResponse);
    if (!payload) {
      console.error("Unknown generation error: non-JSON success response from backend");
      return NextResponse.json({ error: "Unexpected response from backend" }, { status: 502 });
    }
    return NextResponse.json({ job_id: payload.job_id });
  } catch (error) {
    console.error("Unknown generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown generation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
