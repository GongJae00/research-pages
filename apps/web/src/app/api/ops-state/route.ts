import { NextRequest, NextResponse } from "next/server";

import {
  AgentOpsRuntimeStateError,
  getDegradedAgentOperationsSnapshot,
  getLiveAgentOperationsSnapshot,
} from "@/lib/agent-ops-runtime";

function getLiveResponseHeaders() {
  return {
    "cache-control": "no-store, max-age=0",
    "x-research-os-ops-state": "live",
  };
}

function getDegradedResponseHeaders(error: unknown) {
  return {
    "cache-control": "no-store, max-age=0",
    "x-research-os-ops-state": "degraded-fallback",
    "x-research-os-ops-state-reason":
      error instanceof AgentOpsRuntimeStateError
        ? "invalid-runtime-state"
        : "runtime-read-failed",
  };
}

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") ?? "ko";

  try {
    const snapshot = await getLiveAgentOperationsSnapshot(locale);
    return NextResponse.json(snapshot, {
      headers: getLiveResponseHeaders(),
    });
  } catch (error) {
    return NextResponse.json(getDegradedAgentOperationsSnapshot(locale), {
      headers: getDegradedResponseHeaders(error),
    });
  }
}
