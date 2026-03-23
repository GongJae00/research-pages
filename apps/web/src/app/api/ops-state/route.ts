import { NextRequest, NextResponse } from "next/server";

import { getLiveAgentOperationsSnapshot } from "@/lib/agent-ops-runtime";

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") ?? "ko";
  const snapshot = await getLiveAgentOperationsSnapshot(locale);

  return NextResponse.json(snapshot);
}
