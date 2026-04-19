import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug");
    const status = url.searchParams.get("status");
    const backendUrl = new URL(getBackendUrl("/api/v1/articles"));

    if (slug) backendUrl.searchParams.set("slug", slug);
    if (status) backendUrl.searchParams.set("status", status);

    const response = await fetch(backendUrl.toString(), { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data?.detail || "failed to fetch articles" }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to fetch articles";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
