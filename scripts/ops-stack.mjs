import { spawn } from "node:child_process";
import {
  mkdir,
  open,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const stateDir = path.join(process.cwd(), ".researchos");
const runDir = path.join(stateDir, "run");
const webPidFile = path.join(runDir, "web.json");
const autonomyPidFile = path.join(runDir, "autonomy.json");
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

function isProcessAlive(pid) {
  if (!pid || typeof pid !== "number") {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
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
  await runBridgeAutonomyOn();

  const webMeta = await readPidFile(webPidFile);
  const autonomyMeta = await readPidFile(autonomyPidFile);
  const webRunning = webMeta && isProcessAlive(webMeta.pid);
  const autonomyRunning = autonomyMeta && isProcessAlive(autonomyMeta.pid);

  const status = {
    startedAt: nowIso(),
    web: webMeta ?? null,
    autonomy: autonomyMeta ?? null,
  };

  if (!webRunning) {
    const { stdoutHandle, stderrHandle } = await openLogPair(webOut, webErr);
    const webChild = process.platform === "win32"
      ? spawnDetached("cmd.exe", ["/d", "/s", "/c", "corepack pnpm dev:web"], process.cwd(), stdoutHandle.fd, stderrHandle.fd)
      : spawnDetached("sh", ["-lc", "corepack pnpm dev:web"], process.cwd(), stdoutHandle.fd, stderrHandle.fd);
    await writePidFile(webPidFile, {
      pid: webChild.pid ?? null,
      command: "corepack pnpm dev:web",
      startedAt: nowIso(),
      stdout: path.relative(process.cwd(), webOut).replace(/\\/g, "/"),
      stderr: path.relative(process.cwd(), webErr).replace(/\\/g, "/"),
    });
    await stdoutHandle.close();
    await stderrHandle.close();
    status.web = await readPidFile(webPidFile);
  }

  if (!autonomyRunning) {
    const { stdoutHandle, stderrHandle } = await openLogPair(autonomyOut, autonomyErr);
    const autonomyChild = spawnDetached(
      process.execPath,
      ["scripts/agent-ops-daemon.mjs"],
      process.cwd(),
      stdoutHandle.fd,
      stderrHandle.fd,
    );
    await writePidFile(autonomyPidFile, {
      pid: autonomyChild.pid ?? null,
      command: "node scripts/agent-ops-daemon.mjs",
      startedAt: nowIso(),
      stdout: path.relative(process.cwd(), autonomyOut).replace(/\\/g, "/"),
      stderr: path.relative(process.cwd(), autonomyErr).replace(/\\/g, "/"),
    });
    await stdoutHandle.close();
    await stderrHandle.close();
    status.autonomy = await readPidFile(autonomyPidFile);
  }

  return status;
}

async function stopPid(meta, pidFile) {
  if (!meta?.pid || !isProcessAlive(meta.pid)) {
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
  const webMeta = await readPidFile(webPidFile);
  const autonomyMeta = await readPidFile(autonomyPidFile);
  const webStopped = await stopPid(webMeta, webPidFile);
  const autonomyStopped = await stopPid(autonomyMeta, autonomyPidFile);

  return {
    stoppedAt: nowIso(),
    webStopped,
    autonomyStopped,
  };
}

async function statusStack() {
  const webMeta = await readPidFile(webPidFile);
  const autonomyMeta = await readPidFile(autonomyPidFile);

  return {
    checkedAt: nowIso(),
    web: webMeta
      ? { ...webMeta, running: isProcessAlive(webMeta.pid) }
      : null,
    autonomy: autonomyMeta
      ? { ...autonomyMeta, running: isProcessAlive(autonomyMeta.pid) }
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
