import { NextRequest, NextResponse } from "next/server";

const FALLBACK_BACKEND_BASE_URL = "http://127.0.0.1:8000";

function backendArticlesUrl() {
  const base = (process.env.BACKEND_BASE_URL ?? FALLBACK_BACKEND_BASE_URL).replace(/\/+$/, "");
  return `${base}/api/v1/articles`;
}

export async function GET() {
  try {
    const response = await fetch(backendArticlesUrl(), {
      method: "GET",
      cache: "no-store"
    });
    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data?.detail || "failed to fetch articles" }, { status: 502 });
    }
    return NextResponse.json({ articles: data.articles ?? [] });
  } catch (error) {
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

    const response = await fetch(backendArticlesUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, payload }),
      cache: "no-store"
    });
    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data?.detail || "save failed" }, { status: 502 });
    }
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
