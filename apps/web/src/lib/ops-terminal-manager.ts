import { exec, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const commandTimeoutMs = 20_000;
const commandMaxBuffer = 1_024 * 1_024;
const maxTranscriptChars = 24_000;

export type OpsShellId = "powershell" | "cmd" | "bash";
export type OpsTerminalSessionStatus = "running" | "closed" | "error";

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
  lastInput: string | null;
  exitCode: number | null;
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

    const handleClose = (code: number | null) => {
      settle(() => reject(new Error(`Shell exited before session startup completed (exit code ${String(code ?? 0)}).`)));
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

function appendTranscript(record: OpsTerminalSessionRecord, chunk: string) {
  record.snapshot.transcript = trimTranscript(record.snapshot.transcript + chunk);
  record.snapshot.updatedAt = new Date().toISOString();
}

function reconcileSessionState(record: OpsTerminalSessionRecord) {
  if (record.snapshot.status !== "running") {
    return record.snapshot;
  }

  const exitCode = record.child.exitCode;
  const signalCode = record.child.signalCode;

  if (exitCode === null && signalCode === null && !record.child.stdin.destroyed) {
    return record.snapshot;
  }

  record.snapshot.status = record.stopRequestedAt || exitCode === 0 ? "closed" : "error";
  record.snapshot.exitCode = exitCode;
  record.snapshot.pid = null;

  const transitionMessage = record.stopRequestedAt
    ? `${os.EOL}[ops] session stop is still settling; refresh and retry once it closes.${os.EOL}`
    : `${os.EOL}[ops] session is no longer accepting input (exit code ${String(
        exitCode ?? signalCode ?? "unknown",
      )}). Start a new session and retry.${os.EOL}`;

  if (!record.snapshot.transcript.includes(transitionMessage.trim())) {
    appendTranscript(record, transitionMessage);
  }

  return record.snapshot;
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
  const child = spawn(shellSpec.command, shellSpec.args, {
    cwd,
    env: process.env,
    stdio: "pipe",
    windowsHide: true,
  });

  const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = new Date().toISOString();
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
      lastInput: null,
      exitCode: null,
    },
    stopRequestedAt: null,
  };

  child.stdout.on("data", (chunk: Buffer | string) => {
    appendTranscript(record, chunk.toString());
  });

  child.stderr.on("data", (chunk: Buffer | string) => {
    appendTranscript(record, chunk.toString());
  });

  child.on("error", (error) => {
    record.snapshot.status = "error";
    record.snapshot.exitCode = 1;
    appendTranscript(record, `${os.EOL}[ops] session error: ${error.message}${os.EOL}`);
  });

  child.on("close", (code) => {
    const stopRequestedAt = record.stopRequestedAt;
    record.snapshot.status = stopRequestedAt || code === 0 ? "closed" : "error";
    record.snapshot.exitCode = code;
    record.snapshot.pid = null;
    appendTranscript(
      record,
      stopRequestedAt
        ? `${os.EOL}[ops] session stopped by operator at ${stopRequestedAt}${os.EOL}`
        : `${os.EOL}[ops] session closed with exit code ${String(code ?? 0)}${os.EOL}`,
    );
  });

  try {
    await waitForSessionSpawn(child);
  } catch (error) {
    child.stdout.removeAllListeners("data");
    child.stderr.removeAllListeners("data");
    throw new Error(
      `Failed to start ${shellSpec.label} session: ${error instanceof Error ? error.message : "Unknown spawn error."}`,
    );
  }

  appendTranscript(record, `[ops] session opened: ${record.snapshot.label}${os.EOL}`);
  getManagerStore().sessions.set(sessionId, record);
  return record.snapshot;
}

export function sendOpsTerminalInput(sessionId: string, input: string) {
  const record = getManagerStore().sessions.get(sessionId);

  if (!record) {
    throw new Error(`Unknown session "${sessionId}".`);
  }

  reconcileSessionState(record);

  if (record.stopRequestedAt) {
    throw new Error(`Session "${sessionId}" is stopping.`);
  }

  if (record.snapshot.status !== "running") {
    throw new Error(`Session "${sessionId}" is not running.`);
  }

  const normalizedInput = input.trimEnd();
  record.snapshot.lastInput = normalizedInput;
  appendTranscript(record, `${os.EOL}> ${normalizedInput}${os.EOL}`);
  record.child.stdin.write(`${normalizedInput}${os.EOL}`);

  return record.snapshot;
}

export async function stopOpsTerminalSession(sessionId: string) {
  const record = getManagerStore().sessions.get(sessionId);

  if (!record) {
    throw new Error(`Unknown session "${sessionId}".`);
  }

  if (record.snapshot.status !== "running") {
    return record.snapshot;
  }

  record.stopRequestedAt = new Date().toISOString();
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

  return record.snapshot;
}
