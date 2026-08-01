import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl, parseBackendResponse } from "@/lib/backend";

type RouteContext = {
  params: { id: string };
};

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = context.params;
    const response = await fetch(getBackendUrl(`/api/v1/articles/${id}/track-view`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store"
    });

    const data = await parseBackendResponse(response);
    if (!response.ok) {
      return NextResponse.json({ error: data?.detail || `Upstream error (${response.status})` }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("track view failed:", error);
    const message = error instanceof Error ? error.message : "track view failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
