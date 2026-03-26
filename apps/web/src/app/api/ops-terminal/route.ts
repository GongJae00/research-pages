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

type OpsTerminalFailureTransition = "missing" | "stopping" | "closed" | "error";

function isLocalOpsTerminalEnabled() {
  return process.env.NODE_ENV !== "production";
}

function getShellId(value: unknown): OpsShellId {
  if (value === "cmd" || value === "bash") {
    return value;
  }

  return "powershell";
}

function getOpsTerminalErrorResponse(
  error: string,
  status: number,
  transition?: OpsTerminalFailureTransition,
  recovery?: string,
) {
  return NextResponse.json(
    {
      ok: false,
      error,
      transition,
      recovery,
      sessions: listOpsTerminalSessions(),
      availableShells: listOpsShellPresets(),
    },
    { status },
  );
}

function getSessionErrorResponse(error: unknown, sessionId?: string) {
  const message = error instanceof Error ? error.message : "Ops terminal request failed.";
  const sessions = listOpsTerminalSessions();
  const session = sessionId ? sessions.find((item) => item.id === sessionId) ?? null : null;
  const availableShells = listOpsShellPresets();

  const buildFailureResponse = (
    status: number,
    transition: OpsTerminalFailureTransition,
    recovery: string,
  ) =>
    NextResponse.json(
      {
        ok: false,
        error: message,
        transition,
        recovery,
        session,
        sessions,
        availableShells,
      },
      { status },
    );

  if (message.startsWith("Failed to start ")) {
    return buildFailureResponse(
      503,
      "error",
      "The shell session could not start. Confirm the local shell is available, then retry session creation.",
    );
  }

  if (message.startsWith('Unknown session "')) {
    return buildFailureResponse(404, "missing", "Refresh terminal sessions and retry with an active session.");
  }

  if (message.includes('" is not running.')) {
    const transition = session?.status === "error" ? "error" : "closed";
    const recovery =
      session?.status === "error"
        ? "Review the session transcript for the failure, then start a new session before retrying."
        : "Start a new session or stop the stale session before retrying.";

    return buildFailureResponse(409, transition, recovery);
  }

  if (message.includes('" is not accepting input.')) {
    const transition = session?.status === "closed" ? "closed" : "error";
    const recovery =
      transition === "closed"
        ? "Refresh terminal sessions, then start a new session before retrying."
        : "Review the session transcript for the stream failure, then start a new session before retrying.";

    return buildFailureResponse(409, transition, recovery);
  }

  if (message.includes('" is stopping.')) {
    return buildFailureResponse(
      409,
      "stopping",
      "Wait for the stop request to settle, refresh sessions, then retry with a new active session.",
    );
  }

  return NextResponse.json(
    {
      ok: false,
      error: message,
      transition: session?.status === "error" ? "error" : undefined,
      recovery:
        session?.status === "error"
          ? "Review the session transcript for the failure, then start a new session before retrying."
          : undefined,
      session,
      sessions,
      availableShells,
    },
    { status: 500 },
  );
}

export async function GET() {
  if (!isLocalOpsTerminalEnabled()) {
    return getOpsTerminalErrorResponse("Ops terminal is unavailable.", 404);
  }

  return NextResponse.json({
    ok: true,
    availableShells: listOpsShellPresets(),
    sessions: listOpsTerminalSessions(),
  });
}

export async function POST(request: NextRequest) {
  if (!isLocalOpsTerminalEnabled()) {
    return getOpsTerminalErrorResponse("Ops terminal is unavailable.", 404);
  }

  let body: Record<string, unknown> = {};

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return getOpsTerminalErrorResponse(
      "Invalid request body.",
      400,
      "error",
      "Send a valid JSON payload, then retry the terminal action.",
    );
  }

  const action = typeof body.action === "string" ? body.action : "command.run";
  const command = typeof body.command === "string" ? body.command.trim() : "";
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : undefined;

  try {
    switch (action) {
      case "command.run": {
        if (!command) {
          return getOpsTerminalErrorResponse(
            "Command is required.",
            400,
            "error",
            "Provide a command string, then retry the terminal action.",
          );
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
          return getOpsTerminalErrorResponse(
            "Session id and input are required.",
            400,
            "error",
            "Select an active session, provide terminal input, then retry.",
          );
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
          return getOpsTerminalErrorResponse(
            "Session id is required.",
            400,
            "error",
            "Refresh terminal sessions, choose the session to stop, then retry.",
          );
        }

        const result = await stopOpsTerminalSession(sessionId);
        return NextResponse.json({
          ok: true,
          session: result.session,
          transition: result.transition,
          recovery: result.recovery,
          sessions: listOpsTerminalSessions(),
        });
      }

      default:
        return getOpsTerminalErrorResponse(
          `Unsupported action "${action}".`,
          400,
          "error",
          "Use a supported terminal action, then retry the request.",
        );
    }
  } catch (error) {
    return getSessionErrorResponse(error, sessionId);
  }
}
