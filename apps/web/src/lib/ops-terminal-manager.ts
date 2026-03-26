import { exec, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const commandTimeoutMs = 20_000;
const commandMaxBuffer = 1_024 * 1_024;
const maxTranscriptChars = 24_000;
const stopSettleWaitMs = 300;

export type OpsShellId = "powershell" | "cmd" | "bash";
export type OpsTerminalSessionStatus = "running" | "stopping" | "closed" | "error";

export interface OpsShellPreset {
  id: OpsShellId;
  label: string;
  description: string;
}

export interface OpsTerminalCommandResult {
  ok: boolean;
  command: string;
  cwd: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  ranAt: string;
  signal?: string | null;
}

export interface OpsTerminalSessionSnapshot {
  id: string;
  shellId: OpsShellId;
  shellLabel: string;
  label: string;
  cwd: string;
  pid: number | null;
  createdAt: string;
  updatedAt: string;
  transcript: string;
  status: OpsTerminalSessionStatus;
  statusDetail: string | null;
  lastInput: string | null;
  exitCode: number | null;
  stopRequestedAt: string | null;
}

export interface OpsTerminalStopResult {
  session: OpsTerminalSessionSnapshot;
  transition: "stop-requested" | "stopped" | "already-stopped";
  recovery: string;
}

export class OpsTerminalSessionStartError extends Error {
  sessionId: string;

  constructor(message: string, sessionId: string) {
    super(message);
    this.name = "OpsTerminalSessionStartError";
    this.sessionId = sessionId;
  }
}

interface OpsTerminalSessionRecord {
  child: ChildProcessWithoutNullStreams;
  snapshot: OpsTerminalSessionSnapshot;
  stopRequestedAt: string | null;
}

declare global {
  var __researchOsOpsTerminalManager:
    | {
        sessions: Map<string, OpsTerminalSessionRecord>;
      }
    | undefined;
}

function getManagerStore() {
  if (!globalThis.__researchOsOpsTerminalManager) {
    globalThis.__researchOsOpsTerminalManager = {
      sessions: new Map(),
    };
  }

  return globalThis.__researchOsOpsTerminalManager;
}

async function resolveWorkspaceRoot() {
  let currentDir = process.cwd();

  while (true) {
    const workspaceMarker = path.join(currentDir, "pnpm-workspace.yaml");

    try {
      await access(workspaceMarker);
      return currentDir;
    } catch {
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        return process.cwd();
      }
      currentDir = parentDir;
    }
  }
}

function waitForSessionSpawn(child: ChildProcessWithoutNullStreams) {
  return new Promise<void>((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      child.off("spawn", handleSpawn);
      child.off("error", handleError);
      child.off("close", handleClose);
    };

    const settle = (callback: () => void) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      callback();
    };

    const handleSpawn = () => {
      settle(resolve);
    };

    const handleError = (error: Error) => {
      settle(() => reject(error));
    };

    const handleClose = (code: number | null, signal: NodeJS.Signals | null) => {
      settle(() =>
        reject(
          new Error(
            `Shell exited before session startup completed (${describeSessionTermination(code, signal)}).`,
          ),
        ),
      );
    };

    child.once("spawn", handleSpawn);
    child.once("error", handleError);
    child.once("close", handleClose);
  });
}

function trimTranscript(value: string) {
  if (value.length <= maxTranscriptChars) {
    return value;
  }

  return value.slice(value.length - maxTranscriptChars);
}

function describeSessionTermination(code: number | null, signal: NodeJS.Signals | null) {
  if (typeof code === "number") {
    return `exit code ${code}`;
  }

  if (signal) {
    return `signal ${signal}`;
  }

  return "an unknown termination state";
}

function appendTranscript(record: OpsTerminalSessionRecord, chunk: string) {
  record.snapshot.transcript = trimTranscript(record.snapshot.transcript + chunk);
  record.snapshot.updatedAt = new Date().toISOString();
}

function markSessionInputUnavailable(record: OpsTerminalSessionRecord, reason: string) {
  if (record.snapshot.status === "closed" || record.snapshot.status === "error") {
    return record.snapshot;
  }

  if (record.stopRequestedAt) {
    record.snapshot.status = "stopping";
    record.snapshot.statusDetail = `Stop requested at ${record.stopRequestedAt}. Shell input is closed while waiting for the process to exit.`;
    appendTranscript(
      record,
      `${os.EOL}[ops] shell input closed while stop request is settling; wait for the session to close before retrying.${os.EOL}`,
    );
    return record.snapshot;
  }

  record.snapshot.status = "error";
  record.snapshot.pid = null;
  record.snapshot.statusDetail = reason;
  appendTranscript(record, `${os.EOL}[ops] input stream unavailable: ${reason}${os.EOL}`);

  return record.snapshot;
}

function reconcileSessionState(record: OpsTerminalSessionRecord) {
  if (record.stopRequestedAt) {
    record.snapshot.stopRequestedAt = record.stopRequestedAt;
  }

  if (record.snapshot.status !== "running" && record.snapshot.status !== "stopping") {
    return record.snapshot;
  }

  const exitCode = record.child.exitCode;
  const signalCode = record.child.signalCode;

  if (exitCode === null && signalCode === null) {
    if (record.stopRequestedAt) {
      record.snapshot.status = "stopping";
      record.snapshot.statusDetail =
        record.child.stdin.destroyed || record.child.stdin.writableEnded
          ? `Stop requested at ${record.stopRequestedAt}. Shell input is closed while waiting for the process to exit.`
          : `Stop requested at ${record.stopRequestedAt}. Waiting for the shell process to exit.`;
      return record.snapshot;
    }

    if (!record.child.stdin.destroyed && !record.child.stdin.writableEnded) {
      return record.snapshot;
    }

    return markSessionInputUnavailable(
      record,
      "Shell input stream closed unexpectedly. Start a new session to continue.",
    );
  }

  record.snapshot.status = record.stopRequestedAt || exitCode === 0 ? "closed" : "error";
  record.snapshot.exitCode = exitCode;
  record.snapshot.pid = null;
  record.snapshot.statusDetail = record.stopRequestedAt
    ? `Session stopped after the operator requested a stop at ${record.stopRequestedAt}.`
    : `Session exited unexpectedly with ${describeSessionTermination(exitCode, signalCode)}. Start a new session to continue.`;

  const transitionMessage = record.stopRequestedAt
    ? `${os.EOL}[ops] session stop is still settling; refresh and retry once it closes.${os.EOL}`
    : `${os.EOL}[ops] session is no longer accepting input (${describeSessionTermination(
        exitCode,
        signalCode,
      )}). Start a new session and retry.${os.EOL}`;

  if (!record.snapshot.transcript.includes(transitionMessage.trim())) {
    appendTranscript(record, transitionMessage);
  }

  return record.snapshot;
}

function writeToSessionInput(record: OpsTerminalSessionRecord, input: string) {
  return new Promise<void>((resolve, reject) => {
    record.child.stdin.write(input, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function waitForSessionExit(record: OpsTerminalSessionRecord, timeoutMs: number) {
  if (record.child.exitCode !== null || record.child.signalCode !== null) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const handleClose = () => {
      cleanup();
      resolve();
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      record.child.off("close", handleClose);
    };

    record.child.once("close", handleClose);
  });
}

function getShellSpec(shellId: OpsShellId) {
  if (process.platform === "win32") {
    switch (shellId) {
      case "powershell":
        return {
          command: "powershell.exe",
          args: ["-NoLogo"],
          label: "PowerShell",
          description: "Local PowerShell session",
        };
      case "cmd":
        return {
          command: "cmd.exe",
          args: [],
          label: "Command Prompt",
          description: "Raw Windows shell session",
        };
      case "bash":
        return {
          command: "powershell.exe",
          args: ["-NoLogo"],
          label: "Shell",
          description: "Fallback shell session",
        };
    }
  }

  switch (shellId) {
    case "powershell":
      return {
        command: "bash",
        args: ["-l"],
        label: "Shell",
        description: "Default login shell session",
      };
    case "cmd":
      return {
        command: "sh",
        args: ["-l"],
        label: "Shell",
        description: "POSIX shell session",
      };
    case "bash":
      return {
        command: "bash",
        args: ["-l"],
        label: "Bash",
        description: "Bash session",
      };
  }
}

export function listOpsShellPresets(): OpsShellPreset[] {
  if (process.platform === "win32") {
    return [
      {
        id: "powershell",
        label: "PowerShell",
        description: "Interactive local PowerShell session",
      },
      {
        id: "cmd",
        label: "CMD",
        description: "Interactive command prompt session",
      },
    ];
  }

  return [
    {
      id: "bash",
      label: "Shell",
      description: "Interactive login shell session",
    },
  ];
}

export function listOpsTerminalSessions() {
  const { sessions } = getManagerStore();

  return Array.from(sessions.values())
    .map((record) => reconcileSessionState(record))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function runOpsTerminalCommand(command: string) {
  const cwd = await resolveWorkspaceRoot();
  const ranAt = new Date().toISOString();

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: commandTimeoutMs,
      maxBuffer: commandMaxBuffer,
      windowsHide: true,
    });

    return {
      ok: true,
      command,
      cwd,
      stdout,
      stderr,
      exitCode: 0,
      ranAt,
    } satisfies OpsTerminalCommandResult;
  } catch (error) {
    const failure = error as {
      code?: number | string;
      stdout?: string;
      stderr?: string;
      message?: string;
      signal?: string;
    };

    return {
      ok: false,
      command,
      cwd,
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? failure.message ?? "Command failed.",
      exitCode: typeof failure.code === "number" ? failure.code : 1,
      signal: failure.signal ?? null,
      ranAt,
    } satisfies OpsTerminalCommandResult;
  }
}

export async function createOpsTerminalSession(shellId: OpsShellId, label?: string) {
  const cwd = await resolveWorkspaceRoot();
  const shellSpec = getShellSpec(shellId);
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = new Date().toISOString();
  const child = spawn(shellSpec.command, shellSpec.args, {
    cwd,
    env: process.env,
    stdio: "pipe",
    windowsHide: true,
  });

  const record: OpsTerminalSessionRecord = {
    child,
    snapshot: {
      id: sessionId,
      shellId,
      shellLabel: shellSpec.label,
      label: label?.trim() || shellSpec.label,
      cwd,
      pid: child.pid ?? null,
      createdAt,
      updatedAt: createdAt,
      transcript: "",
      status: "running",
      statusDetail: null,
      lastInput: null,
      exitCode: null,
      stopRequestedAt: null,
    },
    stopRequestedAt: null,
  };
  getManagerStore().sessions.set(sessionId, record);

  child.stdout.on("data", (chunk: Buffer | string) => {
    appendTranscript(record, chunk.toString());
  });

  child.stderr.on("data", (chunk: Buffer | string) => {
    appendTranscript(record, chunk.toString());
  });

  child.stdin.on("error", (error) => {
    markSessionInputUnavailable(
      record,
      `Shell input stream failed: ${error.message}. Start a new session to continue.`,
    );
  });

  child.on("error", (error) => {
    const stopRequestedAt = record.stopRequestedAt;
    record.snapshot.status = "error";
    record.snapshot.exitCode = 1;
    record.snapshot.pid = null;
    record.snapshot.stopRequestedAt = stopRequestedAt;
    record.snapshot.statusDetail = stopRequestedAt
      ? `Shell process error after stop request at ${stopRequestedAt}: ${error.message}`
      : `Shell process error: ${error.message}. Start a new session to continue.`;
    appendTranscript(
      record,
      `${os.EOL}[ops] session error${
        stopRequestedAt ? ` after stop request at ${stopRequestedAt}` : ""
      }: ${error.message}${os.EOL}`,
    );
  });

  child.on("close", (code, signal) => {
    const stopRequestedAt = record.stopRequestedAt;
    const preserveFailureState = record.snapshot.status === "error" && !stopRequestedAt;
    record.snapshot.status = stopRequestedAt
      ? "closed"
      : preserveFailureState || code !== 0
        ? "error"
        : "closed";
    record.snapshot.exitCode = code;
    record.snapshot.pid = null;
    record.snapshot.stopRequestedAt = stopRequestedAt;
    record.snapshot.statusDetail = stopRequestedAt
      ? `Session stopped after the operator requested a stop at ${stopRequestedAt}.`
      : preserveFailureState
        ? `${record.snapshot.statusDetail ?? "Session became unavailable before the shell exited."} Shell later closed with ${describeSessionTermination(code, signal)}.`
        : `Session closed with ${describeSessionTermination(code, signal)}. Start a new session to continue.`;
    appendTranscript(
      record,
      stopRequestedAt
        ? `${os.EOL}[ops] session stopped by operator at ${stopRequestedAt}${os.EOL}`
        : preserveFailureState
          ? `${os.EOL}[ops] session remained in an error state before closing with ${describeSessionTermination(code, signal)}${os.EOL}`
          : `${os.EOL}[ops] session closed with ${describeSessionTermination(code, signal)}${os.EOL}`,
    );
  });

  try {
    await waitForSessionSpawn(child);
  } catch (error) {
    const message = `Failed to start ${shellSpec.label} session: ${
      error instanceof Error ? error.message : "Unknown spawn error."
    }`;
    record.snapshot.status = "error";
    record.snapshot.exitCode = child.exitCode;
    record.snapshot.pid = child.pid ?? null;
    record.snapshot.statusDetail = message;
    record.snapshot.updatedAt = new Date().toISOString();
    appendTranscript(record, `${os.EOL}[ops] ${message}${os.EOL}`);
    throw new OpsTerminalSessionStartError(message, sessionId);
  }

  appendTranscript(record, `[ops] session opened: ${record.snapshot.label}${os.EOL}`);
  return record.snapshot;
}

export async function sendOpsTerminalInput(sessionId: string, input: string) {
  const record = getManagerStore().sessions.get(sessionId);

  if (!record) {
    throw new Error(`Unknown session "${sessionId}".`);
  }

  reconcileSessionState(record);

  if (record.snapshot.status === "stopping") {
    throw new Error(`Session "${sessionId}" is stopping.`);
  }

  if (record.snapshot.status !== "running") {
    throw new Error(`Session "${sessionId}" is not running.`);
  }

  if (record.child.stdin.destroyed || record.child.stdin.writableEnded) {
    markSessionInputUnavailable(
      record,
      "Shell input stream closed unexpectedly. Start a new session to continue.",
    );
    throw new Error(`Session "${sessionId}" is not accepting input.`);
  }

  const normalizedInput = input.trimEnd();
  record.snapshot.lastInput = normalizedInput;
  appendTranscript(record, `${os.EOL}> ${normalizedInput}${os.EOL}`);

  try {
    await writeToSessionInput(record, `${normalizedInput}${os.EOL}`);
  } catch (error) {
    markSessionInputUnavailable(
      record,
      `Shell input stream closed unexpectedly while sending input${
        error instanceof Error && error.message ? `: ${error.message}` : "."
      } Start a new session to continue.`,
    );
    throw new Error(`Session "${sessionId}" is not accepting input.`);
  }

  const currentSession = reconcileSessionState(record);

  if (currentSession.status === "stopping") {
    throw new Error(`Session "${sessionId}" is stopping.`);
  }

  if (currentSession.status !== "running") {
    throw new Error(`Session "${sessionId}" is not accepting input.`);
  }

  return currentSession;
}

export async function stopOpsTerminalSession(sessionId: string) {
  const record = getManagerStore().sessions.get(sessionId);

  if (!record) {
    throw new Error(`Unknown session "${sessionId}".`);
  }

  reconcileSessionState(record);

  if (record.snapshot.status === "error") {
    return {
      session: record.snapshot,
      transition: "already-stopped",
      recovery:
        "Session already failed and is no longer running. Review the session transcript for the failure details, then start a new session before retrying.",
    } satisfies OpsTerminalStopResult;
  }

  if (record.snapshot.status === "closed") {
    return {
      session: record.snapshot,
      transition: "already-stopped",
      recovery: record.snapshot.stopRequestedAt
        ? "Session stop has already completed. Refresh terminal sessions, then start a new session if you still need an interactive shell."
        : "Session is already closed. Start a new session if you still need an interactive shell.",
    } satisfies OpsTerminalStopResult;
  }

  if (record.snapshot.status === "stopping") {
    return {
      session: record.snapshot,
      transition: "stop-requested",
      recovery: "Stop already requested. Wait for the session to close, refresh terminal sessions, then start a new session if needed.",
    } satisfies OpsTerminalStopResult;
  }

  record.stopRequestedAt = new Date().toISOString();
  record.snapshot.status = "stopping";
  record.snapshot.statusDetail = `Stop requested at ${record.stopRequestedAt}. Waiting for the shell process to exit.`;
  record.snapshot.stopRequestedAt = record.stopRequestedAt;
  appendTranscript(record, `${os.EOL}[ops] stop requested by operator${os.EOL}`);

  if (record.snapshot.pid) {
    if (process.platform === "win32") {
      await execAsync(`taskkill /PID ${record.snapshot.pid} /T /F`, {
        windowsHide: true,
      }).catch(() => undefined);
    } else {
      record.child.kill("SIGTERM");
    }
  }

  await waitForSessionExit(record, stopSettleWaitMs);
  const currentSession = reconcileSessionState(record);

  if (currentSession.status === "closed") {
    return {
      session: currentSession,
      transition: "stopped",
      recovery:
        "Session has fully stopped. Refresh terminal sessions, then start a new session if you still need an interactive shell.",
    } satisfies OpsTerminalStopResult;
  }

  return {
    session: currentSession,
    transition: "stop-requested",
    recovery: "Wait for the session to close, then refresh terminal sessions before sending more input.",
  } satisfies OpsTerminalStopResult;
}
