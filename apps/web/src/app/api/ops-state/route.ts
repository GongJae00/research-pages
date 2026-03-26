import { NextRequest, NextResponse } from "next/server";

import { getAgentOperationsSnapshot } from "@/lib/agent-operations-snapshot";
import { getLiveAgentOperationsSnapshot } from "@/lib/agent-ops-runtime";

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") ?? "ko";

  try {
    const snapshot = await getLiveAgentOperationsSnapshot(locale);
    return NextResponse.json(snapshot);
  } catch {
    return NextResponse.json(getAgentOperationsSnapshot(locale), {
      headers: {
        "x-research-os-ops-state": "degraded-fallback",
      },
    });
  }
}
