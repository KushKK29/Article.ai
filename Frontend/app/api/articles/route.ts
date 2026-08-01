import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl, parseBackendResponse } from "@/lib/backend";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug");
    const status = url.searchParams.get("status");
    const backendUrl = new URL(getBackendUrl("/api/v1/articles"));

    if (slug) backendUrl.searchParams.set("slug", slug);
    if (status) backendUrl.searchParams.set("status", status);

    const authHeader = request.headers.get("Authorization");
    const headers: Record<string, string> = {};
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const response = await fetch(backendUrl.toString(), { headers, cache: "no-store" });
    const data = await parseBackendResponse(response);

    if (!response.ok) {
      return NextResponse.json({ error: data?.detail || `Upstream error (${response.status})` }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("failed to fetch articles:", error);
    const message = error instanceof Error ? error.message : "failed to fetch articles";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
