import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    
    let url = getBackendUrl("/api/v1/jobs");
    if (status) {
      url += `?status=${status}`;
    }

    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data?.detail || "failed to fetch jobs" }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to fetch jobs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(getBackendUrl("/api/v1/schedule_article"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store"
    });
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data?.detail || "failed to schedule article" }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to schedule article";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
