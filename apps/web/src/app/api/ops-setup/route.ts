import { NextRequest, NextResponse } from "next/server";

import {
  buildAgentOpsSetupManifest,
  renderAgentOpsSetupManifest,
} from "@/lib/agent-ops-setup";
import { getLiveAgentOperationsSnapshot } from "@/lib/agent-ops-runtime";
import type { AgentProviderId } from "@/lib/agent-operations-snapshot";

function getProviderId(value: string | null): AgentProviderId {
  if (value === "claude" || value === "gemini") {
    return value;
  }

  return "codex";
}

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") ?? "ko";
  const providerId = getProviderId(request.nextUrl.searchParams.get("provider"));
  const teamId = request.nextUrl.searchParams.get("team") ?? "executive-desk";
  const format = request.nextUrl.searchParams.get("format") ?? "json";

  const snapshot = await getLiveAgentOperationsSnapshot(locale);
  const manifest = buildAgentOpsSetupManifest(snapshot, locale, providerId, teamId);

  if (format === "txt") {
    return new NextResponse(renderAgentOpsSetupManifest(manifest), {
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    });
  }

  return NextResponse.json(manifest);
}
