import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";

type RouteContext = {
  params: { id: string };
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = context.params;
    const authHeader = request.headers.get("Authorization");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const response = await fetch(getBackendUrl(`/api/v1/articles/${id}/publish`), {
      method: "POST",
      headers,
      cache: "no-store"
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data?.detail || "publish failed" }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "publish failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
