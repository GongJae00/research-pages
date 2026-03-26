import { NextRequest, NextResponse } from "next/server";

import { getDegradedAgentOperationsSnapshot, getLiveAgentOperationsSnapshot } from "@/lib/agent-ops-runtime";

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") ?? "ko";

  try {
    const snapshot = await getLiveAgentOperationsSnapshot(locale);
    return NextResponse.json(snapshot);
  } catch {
    return NextResponse.json(getDegradedAgentOperationsSnapshot(locale), {
      headers: {
        "x-research-os-ops-state": "degraded-fallback",
      },
    });
  }
}
