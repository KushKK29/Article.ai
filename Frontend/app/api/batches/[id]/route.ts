import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";

type RouteContext = {
  params: { id: string };
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const response = await fetch(getBackendUrl(`/api/v1/batches/${context.params.id}`), {
      cache: "no-store"
    });
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data?.detail || "failed to fetch batch details" }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to fetch batch details";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
