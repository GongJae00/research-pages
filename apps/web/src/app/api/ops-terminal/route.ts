import { NextRequest, NextResponse } from "next/server";

import {
  createOpsTerminalSession,
  listOpsShellPresets,
  listOpsTerminalSessions,
  type OpsTerminalCommandResult,
  type OpsTerminalSessionSnapshot,
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

function getCommandRecovery(result: OpsTerminalCommandResult) {
  const stderr = result.stderr.trim();

  if (result.signal) {
    return `The command was interrupted by signal ${result.signal}. Retry the command if the interruption was expected, or inspect the local shell environment before retrying.`;
  }

  if (stderr.includes("timed out")) {
    return "The command timed out. Retry with a shorter command or run it inside an interactive terminal session for longer tasks.";
  }

  if (result.exitCode !== 0) {
    return "Review stderr for the failure details, correct the command or environment issue, then retry or switch to an interactive terminal session.";
  }

  return "Retry the command, or switch to an interactive terminal session if the task needs more context.";
}

function getSessionFailureState(
  session: OpsTerminalSessionSnapshot | null,
  sessionId?: string,
): {
  status: number;
  transition: OpsTerminalFailureTransition;
  recovery: string;
} | null {
  if (sessionId && !session) {
    return {
      status: 404,
      transition: "missing",
      recovery: "Refresh terminal sessions, then retry with an active session or start a new one.",
    };
  }

  if (!session) {
    return null;
  }

  switch (session.status) {
    case "stopping":
      return {
        status: 409,
        transition: "stopping",
        recovery:
          "Wait for the stop request to settle, refresh terminal sessions, then retry with a new active session.",
      };
    case "closed":
      return {
        status: 409,
        transition: "closed",
        recovery: session.stopRequestedAt
          ? "The session has already closed after a stop request. Refresh terminal sessions, then start a new session before retrying."
          : "The session has already closed. Refresh terminal sessions, then start a new session before retrying.",
      };
    case "error":
      return {
        status: 409,
        transition: "error",
        recovery:
          "Review the session transcript for the failure details, then start a new session before retrying.",
      };
    default:
      return null;
  }
}

function getSessionErrorResponse(error: unknown, sessionId?: string) {
  const message = error instanceof Error ? error.message : "Ops terminal request failed.";
  const sessions = listOpsTerminalSessions();
  const session = sessionId ? sessions.find((item) => item.id === sessionId) ?? null : null;
  const availableShells = listOpsShellPresets();
  const sessionFailure = getSessionFailureState(session, sessionId);

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

  if (message.startsWith('Unknown session "') || sessionFailure?.transition === "missing") {
    return buildFailureResponse(
      sessionFailure?.status ?? 404,
      sessionFailure?.transition ?? "missing",
      sessionFailure?.recovery ??
        "Refresh terminal sessions, then retry with an active session or start a new one.",
    );
  }

  if (
    message.includes('" is not running.') ||
    message.includes('" is not accepting input.') ||
    message.includes('" is stopping.')
  ) {
    if (sessionFailure) {
      return buildFailureResponse(
        sessionFailure.status,
        sessionFailure.transition,
        sessionFailure.recovery,
      );
    }
  }

  if (sessionFailure) {
    return buildFailureResponse(
      sessionFailure.status,
      sessionFailure.transition,
      sessionFailure.recovery,
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
        return NextResponse.json(
          result.ok
            ? result
            : {
                ...result,
                transition: "error" as const,
                recovery: getCommandRecovery(result),
                sessions: listOpsTerminalSessions(),
                availableShells: listOpsShellPresets(),
              },
        );
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
