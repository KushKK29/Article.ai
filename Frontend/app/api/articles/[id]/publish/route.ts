import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";

type RouteContext = {
  params: { id: string };
};

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = context.params;
    const response = await fetch(getBackendUrl(`/api/v1/articles/${id}/publish`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
