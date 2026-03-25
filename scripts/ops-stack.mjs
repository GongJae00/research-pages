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
const supervisorOut = path.join(stateDir, "ops-supervisor.stdout.log");
const supervisorErr = path.join(stateDir, "ops-supervisor.stderr.log");
const webOut = path.join(stateDir, "dev-web.stdout.log");
const webErr = path.join(stateDir, "dev-web.stderr.log");
const autonomyOut = path.join(stateDir, "autonomy-daemon.stdout.log");
const autonomyErr = path.join(stateDir, "autonomy-daemon.stderr.log");

function nowIso() {
  return new Date().toISOString();
}

async function ensureDirs() {
  await mkdir(runDir, { recursive: true });
}

async function fileExists(filePath) {
  try {
    await readFile(filePath, "utf8");
    return true;
  } catch {
    return false;
  }
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
      if (!normalized) {
        return false;
      }
      if (/No tasks are running/i.test(normalized)) {
        return false;
      }
      return normalized.includes(`"${String(pid)}"`) || normalized.includes(`,${String(pid)},`);
    } catch {
      return false;
    }
  }
}

async function readPidFile(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function writePidFile(filePath, payload) {
  await writeFile(filePath, JSON.stringify(payload, null, 2));
}

async function removePidFile(filePath) {
  await rm(filePath, { force: true });
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

async function runBridgeAutonomyOn() {
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

async function startStack() {
  await ensureDirs();
  const supervisorMeta = await readPidFile(supervisorPidFile);
  const webMeta = await readPidFile(webPidFile);
  const autonomyMeta = await readPidFile(autonomyPidFile);
  const supervisorRunning = supervisorMeta ? await isProcessAlive(supervisorMeta.pid) : false;
  const webRunning = webMeta ? await isProcessAlive(webMeta.pid) : false;
  const autonomyRunning = autonomyMeta ? await isProcessAlive(autonomyMeta.pid) : false;
  if (!supervisorRunning) {
    await runBridgeAutonomyOn();
    const { stdoutHandle, stderrHandle } = await openLogPair(supervisorOut, supervisorErr);
    const supervisorChild = spawnDetached(
      process.execPath,
      ["scripts/ops-supervisor.mjs"],
      process.cwd(),
      stdoutHandle.fd,
      stderrHandle.fd,
    );
    await writePidFile(supervisorPidFile, {
      pid: supervisorChild.pid ?? null,
      command: "node scripts/ops-supervisor.mjs",
      startedAt: nowIso(),
      stdout: path.relative(process.cwd(), supervisorOut).replace(/\\/g, "/"),
      stderr: path.relative(process.cwd(), supervisorErr).replace(/\\/g, "/"),
    });
    await stdoutHandle.close();
    await stderrHandle.close();
    await new Promise((resolve) => setTimeout(resolve, 1200));
  } else if (!webRunning || !autonomyRunning) {
    await runBridgeAutonomyOn();
  }

  return statusStack();
}

async function stopPid(meta, pidFile) {
  if (!meta?.pid || !(await isProcessAlive(meta.pid))) {
    await removePidFile(pidFile);
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

  await removePidFile(pidFile);
  return true;
}

async function stopStack() {
  const supervisorMeta = await readPidFile(supervisorPidFile);
  const webMeta = await readPidFile(webPidFile);
  const autonomyMeta = await readPidFile(autonomyPidFile);
  const supervisorStopped = await stopPid(supervisorMeta, supervisorPidFile);
  const webStopped = await stopPid(webMeta, webPidFile);
  const autonomyStopped = await stopPid(autonomyMeta, autonomyPidFile);
  await rm(supervisorStateFile, { force: true });

  return {
    stoppedAt: nowIso(),
    supervisorStopped,
    webStopped,
    autonomyStopped,
  };
}

async function statusStack() {
  const supervisorMeta = await readPidFile(supervisorPidFile);
  const supervisorState = await readPidFile(supervisorStateFile);
  const webMeta = await readPidFile(webPidFile);
  const autonomyMeta = await readPidFile(autonomyPidFile);

  return {
    checkedAt: nowIso(),
    supervisor: supervisorMeta
      ? { ...supervisorMeta, running: await isProcessAlive(supervisorMeta.pid) }
      : null,
    web: webMeta
      ? { ...webMeta, running: await isProcessAlive(webMeta.pid) }
      : null,
    autonomy: autonomyMeta
      ? { ...autonomyMeta, running: await isProcessAlive(autonomyMeta.pid) }
      : null,
    health:
      supervisorState && typeof supervisorState === "object"
        ? {
            status:
              typeof supervisorState.status === "string" ? supervisorState.status : "healthy",
            tickMs: typeof supervisorState.tickMs === "number" ? supervisorState.tickMs : null,
            lastHeartbeatAt:
              typeof supervisorState.lastHeartbeatAt === "string"
                ? supervisorState.lastHeartbeatAt
                : null,
            lastRestartReason:
              typeof supervisorState.lastRestartReason === "string"
                ? supervisorState.lastRestartReason
                : null,
            webRestartCount:
              typeof supervisorState.webRestartCount === "number"
                ? supervisorState.webRestartCount
                : 0,
            autonomyRestartCount:
              typeof supervisorState.autonomyRestartCount === "number"
                ? supervisorState.autonomyRestartCount
                : 0,
            observedLoopCount:
              typeof supervisorState.observedLoopCount === "number"
                ? supervisorState.observedLoopCount
                : 0,
            autonomyStateUpdatedAt:
              typeof supervisorState.autonomyStateUpdatedAt === "string"
                ? supervisorState.autonomyStateUpdatedAt
                : null,
          }
        : null,
    controlRoomUrl: "http://localhost:3000/ko/ops",
  };
}

async function main() {
  const command = process.argv[2] ?? "status";
  let result;

  switch (command) {
    case "start":
      result = await startStack();
      break;
    case "stop":
      result = await stopStack();
      break;
    case "status":
      result = await statusStack();
      break;
    default:
      throw new Error(`Unsupported ops-stack command "${command}". Use start, stop, or status.`);
  }

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
