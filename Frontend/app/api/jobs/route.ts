import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl, parseBackendResponse } from "@/lib/backend";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    
    let url = getBackendUrl("/api/v1/jobs");
    if (status) {
      url += `?status=${status}`;
    }

    const authHeader = request.headers.get("Authorization");
    const headers: Record<string, string> = {};
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const response = await fetch(url, { headers, cache: "no-store" });
    const data = await parseBackendResponse(response);

    if (!response.ok) {
      return NextResponse.json({ error: data?.detail || `Upstream error (${response.status})` }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("failed to fetch jobs:", error);
    const message = error instanceof Error ? error.message : "failed to fetch jobs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get("Authorization");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const response = await fetch(getBackendUrl("/api/v1/schedule_article"), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store"
    });
    const data = await parseBackendResponse(response);

    if (!response.ok) {
      return NextResponse.json({ error: data?.detail || `Upstream error (${response.status})` }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("failed to schedule article:", error);
    const message = error instanceof Error ? error.message : "failed to schedule article";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
