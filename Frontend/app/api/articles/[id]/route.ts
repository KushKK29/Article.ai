import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";

type RouteContext = {
  params: { id: string };
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const response = await fetch(getBackendUrl(`/api/v1/articles/${context.params.id}`), {
      cache: "no-store"
    });
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data?.detail || "failed to fetch article" }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to fetch article";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const body = await request.json();
    const response = await fetch(getBackendUrl(`/api/v1/articles/${context.params.id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store"
    });
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data?.detail || "failed to update article" }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to update article";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const response = await fetch(getBackendUrl(`/api/v1/articles/${context.params.id}`), {
      method: "DELETE",
      cache: "no-store"
    });
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data?.detail || "failed to delete article" }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to delete article";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
