import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(getBackendUrl("/api/v1/batches"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store"
    });
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data?.detail || "failed to create batch" }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to create batch";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
