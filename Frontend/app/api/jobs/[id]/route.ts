import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";

type RouteContext = {
  params: { id: string };
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const response = await fetch(getBackendUrl(`/api/v1/jobs/${context.params.id}`), {
      cache: "no-store"
    });
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data?.detail || "failed to fetch job" }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to fetch job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const response = await fetch(getBackendUrl(`/api/v1/jobs/${context.params.id}`), {
      method: "DELETE",
      cache: "no-store"
    });
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data?.detail || "failed to cancel job" }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to cancel job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
