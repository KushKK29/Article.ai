import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl, parseBackendResponse } from "@/lib/backend";

type RouteContext = {
  params: { id: string };
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const authHeader = request.headers.get("Authorization");
    const headers: Record<string, string> = {};
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const response = await fetch(getBackendUrl(`/api/v1/batches/${context.params.id}`), {
      headers,
      cache: "no-store"
    });
    const data = await parseBackendResponse(response);

    if (!response.ok) {
      return NextResponse.json({ error: data?.detail || `Upstream error (${response.status})` }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("failed to fetch batch details:", error);
    const message = error instanceof Error ? error.message : "failed to fetch batch details";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
