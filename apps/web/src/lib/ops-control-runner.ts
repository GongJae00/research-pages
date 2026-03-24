import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const commandTimeoutMs = 30_000;
const commandMaxBuffer = 2 * 1024 * 1024;

export interface OpsControlCommandResult {
  ok: boolean;
  command: string;
  cwd: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  ranAt: string;
  signal?: string | null;
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

async function runNodeScript(scriptRelativePath: string, args: string[]) {
  const cwd = await resolveWorkspaceRoot();
  const ranAt = new Date().toISOString();
  const command = `node ${scriptRelativePath} ${args.join(" ")}`.trim();

  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [scriptRelativePath, ...args],
      {
        cwd,
        timeout: commandTimeoutMs,
        maxBuffer: commandMaxBuffer,
        windowsHide: true,
      },
    );

    return {
      ok: true,
      command,
      cwd,
      stdout,
      stderr,
      exitCode: 0,
      ranAt,
    } satisfies OpsControlCommandResult;
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
    } satisfies OpsControlCommandResult;
  }
}

export async function runOpsBridgeCommand(args: string[]) {
  return runNodeScript("scripts/agent-ops.mjs", args);
}

export async function runOpsStackCommand(args: string[]) {
  return runNodeScript("scripts/ops-stack.mjs", args);
}
