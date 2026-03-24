import { NextRequest, NextResponse } from "next/server";

import {
  createOpsTerminalSession,
  listOpsShellPresets,
  listOpsTerminalSessions,
  runOpsTerminalCommand,
  sendOpsTerminalInput,
  stopOpsTerminalSession,
  type OpsShellId,
} from "@/lib/ops-terminal-manager";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isLocalOpsTerminalEnabled() {
  return process.env.NODE_ENV !== "production";
}

function getShellId(value: unknown): OpsShellId {
  if (value === "cmd" || value === "bash") {
    return value;
  }

  return "powershell";
}

function getSessionErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Ops terminal request failed.";

  if (message.startsWith('Unknown session "')) {
    return NextResponse.json(
      {
        ok: false,
        error: message,
        recovery: "Refresh terminal sessions and retry with an active session.",
        sessions: listOpsTerminalSessions(),
      },
      { status: 404 },
    );
  }

  if (message.includes('" is not running.')) {
    return NextResponse.json(
      {
        ok: false,
        error: message,
        recovery: "Start a new session or stop the stale session before retrying.",
        sessions: listOpsTerminalSessions(),
      },
      { status: 409 },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      error: message,
      sessions: listOpsTerminalSessions(),
    },
    { status: 500 },
  );
}

export async function GET() {
  if (!isLocalOpsTerminalEnabled()) {
    return NextResponse.json({ error: "Ops terminal is unavailable." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    availableShells: listOpsShellPresets(),
    sessions: listOpsTerminalSessions(),
  });
}

export async function POST(request: NextRequest) {
  if (!isLocalOpsTerminalEnabled()) {
    return NextResponse.json({ error: "Ops terminal is unavailable." }, { status: 404 });
  }

  let body: Record<string, unknown> = {};

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "command.run";
  const command = typeof body.command === "string" ? body.command.trim() : "";

  try {
    switch (action) {
      case "command.run": {
        if (!command) {
          return NextResponse.json({ error: "Command is required." }, { status: 400 });
        }

        const result = await runOpsTerminalCommand(command);
        return NextResponse.json(result);
      }

      case "session.create": {
        const session = await createOpsTerminalSession(
          getShellId(body.shellId),
          typeof body.label === "string" ? body.label : undefined,
        );

        return NextResponse.json({
          ok: true,
          session,
          sessions: listOpsTerminalSessions(),
          availableShells: listOpsShellPresets(),
        });
      }

      case "session.input": {
        const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
        const input = typeof body.input === "string" ? body.input : "";

        if (!sessionId || !input.trim()) {
          return NextResponse.json({ error: "Session id and input are required." }, { status: 400 });
        }

        const session = sendOpsTerminalInput(sessionId, input);
        return NextResponse.json({
          ok: true,
          session,
          sessions: listOpsTerminalSessions(),
        });
      }

      case "session.stop": {
        const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";

        if (!sessionId) {
          return NextResponse.json({ error: "Session id is required." }, { status: 400 });
        }

        const session = await stopOpsTerminalSession(sessionId);
        return NextResponse.json({
          ok: true,
          session,
          sessions: listOpsTerminalSessions(),
        });
      }

      default:
        return NextResponse.json({ error: `Unsupported action "${action}".` }, { status: 400 });
    }
  } catch (error) {
    return getSessionErrorResponse(error);
  }
}
