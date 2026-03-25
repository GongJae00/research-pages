import { execFile as execFileCallback, spawn } from "node:child_process";
import {
  mkdir,
  open,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

const stateDir = path.join(process.cwd(), ".researchos");
const runDir = path.join(stateDir, "run");
const supervisorPidFile = path.join(runDir, "supervisor.json");
const supervisorStateFile = path.join(stateDir, "supervisor-state.json");
const webPidFile = path.join(runDir, "web.json");
const autonomyPidFile = path.join(runDir, "autonomy.json");
const autonomyStateFile = path.join(stateDir, "agent-ops-state.json");
const webOut = path.join(stateDir, "dev-web.stdout.log");
const webErr = path.join(stateDir, "dev-web.stderr.log");
const autonomyOut = path.join(stateDir, "autonomy-daemon.stdout.log");
const autonomyErr = path.join(stateDir, "autonomy-daemon.stderr.log");
const tickMs = Number(process.env.RESEARCH_OS_SUPERVISOR_TICK_MS ?? "30000");
const autonomyTickMs = Number(process.env.RESEARCH_OS_AUTONOMY_TICK_MS ?? "90000");
const autonomyStaleAfterMs = Math.max(autonomyTickMs * 8, 20 * 60 * 1000);

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function ensureDirs() {
  await mkdir(runDir, { recursive: true });
}

async function isProcessAlive(pid) {
  if (!pid || typeof pid !== "number") {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const err = error;
    if (err && typeof err === "object" && "code" in err && err.code === "EPERM") {
      return true;
    }

    if (process.platform !== "win32") {
      return false;
    }

    try {
      const { stdout } = await execFile(
        "tasklist.exe",
        ["/FI", `PID eq ${String(pid)}`, "/FO", "CSV", "/NH"],
        {
          windowsHide: true,
        },
      );
      const normalized = stdout.trim();
      if (!normalized || /No tasks are running/i.test(normalized)) {
        return false;
      }
      return normalized.includes(`"${String(pid)}"`) || normalized.includes(`,${String(pid)},`);
    } catch {
      return false;
    }
  }
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function writeJson(filePath, payload) {
  await ensureDirs();
  await writeFile(filePath, JSON.stringify(payload, null, 2));
}

async function openLogPair(stdoutPath, stderrPath) {
  await ensureDirs();
  const stdoutHandle = await open(stdoutPath, "a");
  const stderrHandle = await open(stderrPath, "a");
  return { stdoutHandle, stderrHandle };
}

function spawnDetached(command, args, cwd, stdoutFd, stderrFd) {
  const child = spawn(command, args, {
    cwd,
    detached: true,
    windowsHide: true,
    stdio: ["ignore", stdoutFd, stderrFd],
    env: process.env,
  });
  child.unref();
  return child;
}

async function stopPid(meta, pidFile) {
  if (!meta?.pid || !(await isProcessAlive(meta.pid))) {
    await rm(pidFile, { force: true });
    return false;
  }

  if (process.platform === "win32") {
    const killer = spawn("taskkill.exe", ["/PID", String(meta.pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    });
    await new Promise((resolve) => killer.on("close", resolve));
  } else {
    process.kill(meta.pid, "SIGTERM");
  }

  await rm(pidFile, { force: true });
  return true;
}

async function enableAutonomyBridge() {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/agent-ops.mjs", "autonomy", "on"], {
      cwd: process.cwd(),
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }
      reject(new Error(stderr || `Failed to enable autonomy (exit ${String(code ?? 1)}).`));
    });
    child.on("error", reject);
  });
}

async function startWebProcess(reason) {
  const { stdoutHandle, stderrHandle } = await openLogPair(webOut, webErr);
  const child =
    process.platform === "win32"
      ? spawnDetached(
          "cmd.exe",
          ["/d", "/s", "/c", "corepack pnpm dev:web"],
          process.cwd(),
          stdoutHandle.fd,
          stderrHandle.fd,
        )
      : spawnDetached(
          "sh",
          ["-lc", "corepack pnpm dev:web"],
          process.cwd(),
          stdoutHandle.fd,
          stderrHandle.fd,
        );
  await writeJson(webPidFile, {
    pid: child.pid ?? null,
    command: "corepack pnpm dev:web",
    startedAt: nowIso(),
    stdout: path.relative(process.cwd(), webOut).replace(/\\/g, "/"),
    stderr: path.relative(process.cwd(), webErr).replace(/\\/g, "/"),
    restartReason: reason,
  });
  await stdoutHandle.close();
  await stderrHandle.close();
  return await readJson(webPidFile);
}

async function startAutonomyProcess(reason) {
  await enableAutonomyBridge();
  const { stdoutHandle, stderrHandle } = await openLogPair(autonomyOut, autonomyErr);
  const child = spawnDetached(
    process.execPath,
    ["scripts/agent-ops-daemon.mjs"],
    process.cwd(),
    stdoutHandle.fd,
    stderrHandle.fd,
  );
  await writeJson(autonomyPidFile, {
    pid: child.pid ?? null,
    command: "node scripts/agent-ops-daemon.mjs",
    startedAt: nowIso(),
    stdout: path.relative(process.cwd(), autonomyOut).replace(/\\/g, "/"),
    stderr: path.relative(process.cwd(), autonomyErr).replace(/\\/g, "/"),
    restartReason: reason,
  });
  await stdoutHandle.close();
  await stderrHandle.close();
  return await readJson(autonomyPidFile);
}

function buildDefaultSupervisorState() {
  const startedAt = nowIso();
  return {
    version: 1,
    pid: process.pid,
    startedAt,
    checkedAt: startedAt,
    lastHeartbeatAt: startedAt,
    tickMs,
    status: "healthy",
    webRestartCount: 0,
    autonomyRestartCount: 0,
    lastWebRestartAt: null,
    lastAutonomyRestartAt: null,
    lastRestartReason: null,
    observedLoopCount: 0,
    lastLoopAdvanceAt: null,
    autonomyStateUpdatedAt: null,
    notes: [],
  };
}

async function loadSupervisorState() {
  const existing = await readJson(supervisorStateFile);
  if (!existing || typeof existing !== "object") {
    return buildDefaultSupervisorState();
  }

  return {
    ...buildDefaultSupervisorState(),
    ...existing,
    pid: process.pid,
    tickMs,
    notes: Array.isArray(existing.notes) ? existing.notes.slice(0, 5) : [],
  };
}

function note(supervisorState, message) {
  supervisorState.notes = [message, ...(Array.isArray(supervisorState.notes) ? supervisorState.notes : [])].slice(
    0,
    5,
  );
}

async function ensureSingletonSupervisor() {
  const existing = await readJson(supervisorPidFile);
  if (!existing?.pid) {
    return true;
  }

  if (existing.pid === process.pid) {
    return true;
  }

  if (await isProcessAlive(existing.pid)) {
    return false;
  }

  await rm(supervisorPidFile, { force: true });
  return true;
}

let supervisorToken = null;

async function writeSupervisorPid() {
  supervisorToken = `${process.pid}-${Date.now()}`;
  await writeJson(supervisorPidFile, {
    pid: process.pid,
    command: "node scripts/ops-supervisor.mjs",
    startedAt: nowIso(),
    stdout: path.relative(process.cwd(), path.join(stateDir, "ops-supervisor.stdout.log")).replace(/\\/g, "/"),
    stderr: path.relative(process.cwd(), path.join(stateDir, "ops-supervisor.stderr.log")).replace(/\\/g, "/"),
    token: supervisorToken,
  });
}

async function cleanupSupervisorPid() {
  try {
    const current = await readJson(supervisorPidFile);
    if (current?.token === supervisorToken) {
      await rm(supervisorPidFile, { force: true });
    }
  } catch {
    // ignore
  }
}

async function monitorOnce(supervisorState) {
  const checkedAt = nowIso();
  let recovering = false;
  let degraded = false;

  let webMeta = await readJson(webPidFile);
  if (!webMeta?.pid || !(await isProcessAlive(webMeta.pid))) {
    webMeta = await startWebProcess("supervisor recovered missing web process");
    supervisorState.webRestartCount += 1;
    supervisorState.lastWebRestartAt = checkedAt;
    supervisorState.lastRestartReason = "web process was missing";
    note(supervisorState, "Restarted the web dev server.");
    recovering = true;
  }

  let autonomyMeta = await readJson(autonomyPidFile);
  if (!autonomyMeta?.pid || !(await isProcessAlive(autonomyMeta.pid))) {
    autonomyMeta = await startAutonomyProcess("supervisor recovered missing autonomy daemon");
    supervisorState.autonomyRestartCount += 1;
    supervisorState.lastAutonomyRestartAt = checkedAt;
    supervisorState.lastRestartReason = "autonomy daemon was missing";
    note(supervisorState, "Restarted the autonomy daemon.");
    recovering = true;
  }

  const autonomyState = await readJson(autonomyStateFile);
  const loopCount =
    typeof autonomyState?.autonomy?.loopCount === "number" ? autonomyState.autonomy.loopCount : null;
  const updatedAt = typeof autonomyState?.updatedAt === "string" ? autonomyState.updatedAt : null;
  const stateUpdatedAtMs = updatedAt ? Date.parse(updatedAt) : NaN;
  const staleState =
    Number.isFinite(stateUpdatedAtMs) && Date.now() - stateUpdatedAtMs > autonomyStaleAfterMs;

  if (typeof loopCount === "number") {
    if (loopCount !== supervisorState.observedLoopCount) {
      supervisorState.observedLoopCount = loopCount;
      supervisorState.lastLoopAdvanceAt = checkedAt;
    } else if (supervisorState.lastLoopAdvanceAt === null) {
      supervisorState.lastLoopAdvanceAt = checkedAt;
    }
  }

  supervisorState.autonomyStateUpdatedAt = updatedAt;

  const loopAdvanceAgeMs = supervisorState.lastLoopAdvanceAt
    ? Date.now() - Date.parse(supervisorState.lastLoopAdvanceAt)
    : 0;
  const staleLoop = loopAdvanceAgeMs > autonomyStaleAfterMs;

  if (autonomyMeta?.pid && (staleState || staleLoop)) {
    await stopPid(autonomyMeta, autonomyPidFile);
    autonomyMeta = await startAutonomyProcess("supervisor recovered stale autonomy daemon");
    supervisorState.autonomyRestartCount += 1;
    supervisorState.lastAutonomyRestartAt = checkedAt;
    supervisorState.lastRestartReason = "autonomy loop stalled";
    supervisorState.lastLoopAdvanceAt = checkedAt;
    note(supervisorState, "Restarted the autonomy daemon after stale loop detection.");
    recovering = true;
  } else if (
    (Number.isFinite(stateUpdatedAtMs) &&
      Date.now() - stateUpdatedAtMs > Math.floor(autonomyStaleAfterMs / 2)) ||
    loopAdvanceAgeMs > Math.floor(autonomyStaleAfterMs / 2)
  ) {
    degraded = true;
    note(supervisorState, "Autonomy state is updating slowly; watching for stall recovery.");
  }

  supervisorState.checkedAt = checkedAt;
  supervisorState.lastHeartbeatAt = checkedAt;
  supervisorState.status = recovering ? "recovering" : degraded ? "degraded" : "healthy";
  await writeJson(supervisorStateFile, supervisorState);
}

async function main() {
  await ensureDirs();

  const canStart = await ensureSingletonSupervisor();
  if (!canStart) {
    process.stdout.write("[supervisor] another supervisor is already running; exiting.\n");
    return;
  }

  await writeSupervisorPid();
  const supervisorState = await loadSupervisorState();
  await writeJson(supervisorStateFile, supervisorState);

  const shutdown = async () => {
    await cleanupSupervisorPid();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });
  process.on("exit", () => {
    void cleanupSupervisorPid();
  });

  process.stdout.write(`[supervisor] watching stack in ${stateDir}\n`);
  process.stdout.write(`[supervisor] tick ${tickMs}ms\n`);

  while (true) {
    try {
      await monitorOnce(supervisorState);
    } catch (error) {
      supervisorState.checkedAt = nowIso();
      supervisorState.lastHeartbeatAt = supervisorState.checkedAt;
      supervisorState.status = "degraded";
      supervisorState.lastRestartReason =
        error instanceof Error ? error.message : String(error);
      note(supervisorState, `Supervisor error: ${supervisorState.lastRestartReason}`);
      await writeJson(supervisorStateFile, supervisorState);
    }

    await sleep(tickMs);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
