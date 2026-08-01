import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl, parseBackendResponse } from "@/lib/backend";

function backendArticlesUrl() {
  return getBackendUrl("/api/v1/articles");
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const headers: Record<string, string> = {};
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const response = await fetch(backendArticlesUrl(), {
      method: "GET",
      headers,
      cache: "no-store"
    });
    const data = await parseBackendResponse(response);
    if (!response.ok) {
      return NextResponse.json({ error: data?.detail || `Upstream error (${response.status})` }, { status: response.status });
    }
    return NextResponse.json({ articles: data.articles ?? [] });
  } catch (error) {
    console.error("failed to fetch articles:", error);
    const message = error instanceof Error ? error.message : "failed to fetch articles";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { topic, payload } = await request.json();
    if (!topic) {
      return NextResponse.json({ error: "topic is required" }, { status: 400 });
    }

    const authHeader = request.headers.get("Authorization");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const response = await fetch(backendArticlesUrl(), {
      method: "POST",
      headers,
      body: JSON.stringify({ topic, payload }),
      cache: "no-store"
    });
    const data = await parseBackendResponse(response);
    if (!response.ok) {
      return NextResponse.json({ error: data?.detail || `Upstream error (${response.status})` }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("save failed:", error);
    const message = error instanceof Error ? error.message : "save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
