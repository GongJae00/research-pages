import { NextRequest, NextResponse } from "next/server";

import {
  runOpsBridgeCommand,
  runOpsStackCommand,
} from "@/lib/ops-control-runner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isLocalOpsControlEnabled() {
  return process.env.NODE_ENV !== "production";
}

function normalizeBody(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function commandResponse(result: Awaited<ReturnType<typeof runOpsBridgeCommand>>) {
  return NextResponse.json(result, {
    status: result.ok ? 200 : 500,
  });
}

export async function POST(request: NextRequest) {
  if (!isLocalOpsControlEnabled()) {
    return NextResponse.json({ error: "Ops control is unavailable." }, { status: 404 });
  }

  let body: Record<string, unknown>;

  try {
    body = normalizeBody(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const teamId = typeof body.teamId === "string" ? body.teamId.trim() : "";

  switch (action) {
    case "assistant.directive":
      if (!message) {
        return NextResponse.json({ error: "Directive message is required." }, { status: 400 });
      }
      return commandResponse(await runOpsBridgeCommand(["directive", message]));

    case "assistant.focus":
      if (!teamId || !message) {
        return NextResponse.json({ error: "Focus requires team and message." }, { status: 400 });
      }
      return commandResponse(await runOpsBridgeCommand(["focus", teamId, message]));

    case "assistant.note":
      if (!teamId || !message) {
        return NextResponse.json({ error: "Note requires team and message." }, { status: 400 });
      }
      return commandResponse(await runOpsBridgeCommand(["note", teamId, message]));

    case "assistant.pause":
      if (!message) {
        return NextResponse.json({ error: "Pause message is required." }, { status: 400 });
      }
      return commandResponse(await runOpsBridgeCommand(["pause", message]));

    case "assistant.resume":
      if (!message) {
        return NextResponse.json({ error: "Resume message is required." }, { status: 400 });
      }
      return commandResponse(await runOpsBridgeCommand(["resume", message]));

    case "stack.start":
      return commandResponse(await runOpsStackCommand(["start"]));

    case "stack.stop":
      return commandResponse(await runOpsStackCommand(["stop"]));

    case "stack.status":
      return commandResponse(await runOpsStackCommand(["status"]));

    default:
      return NextResponse.json({ error: `Unsupported action "${action}".` }, { status: 400 });
  }
}
