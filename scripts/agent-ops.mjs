import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const stateFile = path.join(process.cwd(), ".researchos", "agent-ops-state.json");
const autonomyRunFile = path.join(process.cwd(), ".researchos", "run", "autonomy.json");
const knownTeams = new Map([
  ["executive-desk", "Executive Desk"],
  ["shell-experience", "Shell and Experience Team"],
  ["workflow-systems", "Workflow Systems Team"],
  ["reliability-desk", "Reliability Desk"],
]);
const knownProviders = new Map([
  ["codex", "Codex app / CLI"],
  ["claude", "Claude Code"],
  ["gemini", "Gemini CLI"],
]);

function makeDefaultAutonomy(updatedAt) {
  return {
    enabled: false,
    status: "stopped",
    activeProviderId: "mock",
    activeProviderLabel: "Standby",
    parallelLimit: 3,
    currentBatchId: null,
    loopCount: 0,
    currentTeamId: "executive-desk",
    currentLane: "Standby",
    lastRunAt: updatedAt,
    nextRunAt: updatedAt,
    latestSummary: "The autonomy loop has not started yet.",
    operatorBrief:
      "Once a provider is available, the assistant will keep selecting the next lane and refreshing the report packet.",
    queue: [],
    reports: [],
    currentTask: null,
    taskHistory: [],
    currentExecution: null,
    executionHistory: [],
    activeTasks: [],
    activeExecutions: [],
    workers: [],
    workerHistory: [],
    interactionBus: [],
    providerHealth: [
      {
        providerId: "mock",
        label: "Mock planner",
        available: true,
        note: "Fallback runtime used only when no real CLI provider is available.",
      },
    ],
  };
}

function nowIso() {
  return new Date().toISOString();
}

function makeDefaultState() {
  const updatedAt = nowIso();
  return {
    version: 1,
    updatedAt,
    terminalConnected: false,
    assistantMode: "monitoring",
    selectedTeamId: "executive-desk",
    currentDirective: {
      source: "terminal bridge",
      issuedAt: updatedAt,
      status: "idle",
      title: "No live terminal directive",
      body: "Run `node scripts/agent-ops.mjs directive \"...\"` to push an instruction into the ops board.",
    },
    conversationFeed: [],
    teamUpdates: [],
    memberUpdates: [],
    providerConnections: [],
    autonomy: makeDefaultAutonomy(updatedAt),
  };
}

async function loadState() {
  try {
    const state = JSON.parse(await readFile(stateFile, "utf8"));
    if (!Array.isArray(state.memberUpdates)) {
      state.memberUpdates = [];
    }
    if (!Array.isArray(state.providerConnections)) {
      state.providerConnections = [];
    }
    if (!state.autonomy || typeof state.autonomy !== "object") {
      state.autonomy = makeDefaultAutonomy(state.updatedAt ?? nowIso());
    } else {
      state.autonomy = {
        ...makeDefaultAutonomy(state.updatedAt ?? nowIso()),
        ...state.autonomy,
      };
    }
    state.autonomy.parallelLimit = Math.max(
      2,
      Math.min(Number(state.autonomy.parallelLimit ?? 3) || 3, knownTeams.size),
    );
    if (!Array.isArray(state.autonomy.taskHistory)) {
      state.autonomy.taskHistory = [];
    }
    if (!Array.isArray(state.autonomy.executionHistory)) {
      state.autonomy.executionHistory = [];
    }
    if (!Array.isArray(state.autonomy.activeTasks)) {
      state.autonomy.activeTasks = [];
    }
    if (!Array.isArray(state.autonomy.activeExecutions)) {
      state.autonomy.activeExecutions = [];
    }
    if (!Array.isArray(state.autonomy.workers)) {
      state.autonomy.workers = [];
    }
    if (!Array.isArray(state.autonomy.workerHistory)) {
      state.autonomy.workerHistory = [];
    }
    if (!Array.isArray(state.autonomy.interactionBus)) {
      state.autonomy.interactionBus = [];
    }
    if (state.autonomy.currentExecution === undefined) {
      state.autonomy.currentExecution = null;
    }
    return state;
  } catch {
    return makeDefaultState();
  }
}

async function saveState(state) {
  await mkdir(path.dirname(stateFile), { recursive: true });
  state.updatedAt = nowIso();
  await writeFile(stateFile, JSON.stringify(state, null, 2));
}

async function wakeAutonomyDaemonIfPossible(state) {
  if (!state.autonomy?.enabled) {
    return;
  }

  try {
    const meta = JSON.parse(await readFile(autonomyRunFile, "utf8"));
    if (!meta?.pid) {
      return;
    }

    spawn(process.execPath, ["scripts/agent-ops-daemon.mjs", "--once"], {
      cwd: process.cwd(),
      detached: true,
      windowsHide: true,
      stdio: "ignore",
      env: process.env,
    }).unref();
  } catch {
    // Ignore wake failures; the background daemon will pick the directive up on its next tick.
  }
}

async function saveStateAndMaybeWake(state, shouldWake = false) {
  await saveState(state);
  if (shouldWake) {
    await wakeAutonomyDaemonIfPossible(state);
  }
}

function upsertTeamUpdate(state, teamId, updates) {
  const current = state.teamUpdates.find((entry) => entry.teamId === teamId);
  if (current) {
    Object.assign(current, updates);
    return;
  }
  state.teamUpdates.push({ teamId, ...updates });
}

function pushEvent(state, event) {
  state.conversationFeed.unshift({
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    time: nowIso(),
    ...event,
  });
  state.conversationFeed = state.conversationFeed.slice(0, 20);
}

function ensureTeam(teamId) {
  if (!knownTeams.has(teamId)) {
    throw new Error(
      `Unknown team "${teamId}". Use one of: ${[...knownTeams.keys()].join(", ")}`,
    );
  }
}

function ensureProvider(providerId) {
  if (!knownProviders.has(providerId)) {
    throw new Error(
      `Unknown provider "${providerId}". Use one of: ${[...knownProviders.keys()].join(", ")}`,
    );
  }
}

function upsertProviderConnection(state, providerId, updates) {
  const current = state.providerConnections.find((entry) => entry.providerId === providerId);
  if (current) {
    Object.assign(current, updates, { updatedAt: nowIso() });
    return current;
  }

  const created = {
    providerId,
    status: "connected",
    updatedAt: nowIso(),
    ...updates,
  };
  state.providerConnections.push(created);
  return created;
}

function printStatus(state) {
  console.log(`State file: ${stateFile}`);
  console.log(`Bridge: ${state.terminalConnected ? "connected" : "waiting"}`);
  console.log(`Mode: ${state.assistantMode}`);
  console.log(`Selected team: ${state.selectedTeamId}`);
  console.log(`Directive: [${state.currentDirective.status}] ${state.currentDirective.title}`);
  console.log(`Directive body: ${state.currentDirective.body}`);
  if (state.autonomy) {
    console.log(
      `Autonomy: [${state.autonomy.status}] enabled=${state.autonomy.enabled} provider=${state.autonomy.activeProviderLabel} loops=${state.autonomy.loopCount} parallel=${state.autonomy.parallelLimit ?? 1}`,
    );
    console.log(`Autonomy summary: ${state.autonomy.latestSummary}`);
    if (state.autonomy.currentBatchId) {
      console.log(`Current batch: ${state.autonomy.currentBatchId}`);
    }
    if (state.autonomy.currentTask) {
      console.log(
        `Current task: [${state.autonomy.currentTask.status}] ${state.autonomy.currentTask.teamLabel} via ${state.autonomy.currentTask.providerLabel}`,
      );
      console.log(`Current task next action: ${state.autonomy.currentTask.nextAction}`);
      if (state.autonomy.currentTask.artifactPath) {
        console.log(`Current task artifact: ${state.autonomy.currentTask.artifactPath}`);
      }
    }
    if (state.autonomy.currentExecution) {
      console.log(
        `Current execution: [${state.autonomy.currentExecution.outcome}] ${state.autonomy.currentExecution.teamLabel} via ${state.autonomy.currentExecution.providerLabel}`,
      );
      if (state.autonomy.currentExecution.changedFiles.length) {
        console.log(
          `Current execution files: ${state.autonomy.currentExecution.changedFiles.join(", ")}`,
        );
      }
      if (state.autonomy.currentExecution.artifactPath) {
        console.log(
          `Current execution artifact: ${state.autonomy.currentExecution.artifactPath}`,
        );
      }
    }
    if (Array.isArray(state.autonomy.workers) && state.autonomy.workers.length) {
      console.log("Worker swarm:");
      for (const worker of state.autonomy.workers.slice(0, 6)) {
        console.log(
          `  - ${worker.memberName}: [${worker.status}] ${worker.teamLabel} via ${worker.providerLabel}`,
        );
        console.log(`    work: ${worker.workItemTitle}`);
        if (Array.isArray(worker.changedFiles) && worker.changedFiles.length) {
          console.log(`    files: ${worker.changedFiles.join(", ")}`);
        }
        if (worker.sessionId) {
          console.log(`    session: ${worker.sessionId}`);
        }
      }
    }
  }
  if (state.providerConnections.length) {
    console.log("Providers:");
    for (const connection of state.providerConnections) {
      console.log(
        `  - ${connection.providerId}: [${connection.status}] team=${connection.teamId ?? "-"} updated=${connection.updatedAt}`,
      );
      if (connection.note) {
        console.log(`    note: ${connection.note}`);
      }
    }
  } else {
    console.log("Providers: none connected");
  }
  console.log(`Updated: ${state.updatedAt}`);
  console.log("");
  console.log("Examples:");
  console.log('  node scripts/agent-ops.mjs directive "Focus on homepage quality next."');
  console.log('  node scripts/agent-ops.mjs connect codex executive-desk "Codex is supervising the queue."');
  console.log('  node scripts/agent-ops.mjs assign gemini shell-experience "Gemini is reviewing shell surfaces."');
  console.log("  node scripts/agent-ops.mjs disconnect claude");
  console.log('  node scripts/agent-ops.mjs pause "I am reviewing the current state."');
  console.log('  node scripts/agent-ops.mjs resume "Continue with the shell team first."');
  console.log('  node scripts/agent-ops.mjs focus shell-experience "Polish the public homepage hero."');
  console.log('  node scripts/agent-ops.mjs note shell-experience "Use tighter spacing in the hero cards."');
  console.log("  node scripts/agent-ops.mjs autonomy on");
  console.log("  node scripts/agent-ops.mjs autonomy off");
  console.log("  node scripts/agent-ops.mjs clear");
}

async function main() {
  const normalizedArgs = process.argv.slice(2);
  if (normalizedArgs[0] === "--") {
    normalizedArgs.shift();
  }

  const [command = "status", ...rest] = normalizedArgs;
  const state = await loadState();

  switch (command) {
    case "status": {
      printStatus(state);
      return;
    }

    case "connect": {
      const [providerId, maybeTeamId, ...remainingParts] = rest;
      ensureProvider(providerId);
      const requestedTeamId = knownTeams.has(maybeTeamId) ? maybeTeamId : undefined;
      const messageParts = requestedTeamId ? remainingParts : [maybeTeamId, ...remainingParts].filter(Boolean);
      const teamId = requestedTeamId || state.selectedTeamId || "executive-desk";
      ensureTeam(teamId);
      const providerName = knownProviders.get(providerId);
      const teamName = knownTeams.get(teamId);
      const message =
        messageParts.join(" ").trim() || `${providerName} connected to ${teamName}.`;

      state.terminalConnected = true;
      state.assistantMode = "briefing";
      state.selectedTeamId = teamId;
      upsertProviderConnection(state, providerId, {
        status: "connected",
        teamId,
        note: message,
      });
      state.currentDirective = {
        source: "terminal bridge",
        issuedAt: nowIso(),
        status: "active",
        title: `Connect ${providerName}`,
        body: message,
      };
      pushEvent(state, {
        channel: "team",
        teamId,
        from: "You",
        to: providerName,
        subject: "CLI agent connected",
        body: message,
      });
      await saveStateAndMaybeWake(state, true);
      printStatus(state);
      return;
    }

    case "assign": {
      const [providerId, teamId, ...messageParts] = rest;
      ensureProvider(providerId);
      ensureTeam(teamId);
      const providerName = knownProviders.get(providerId);
      const teamName = knownTeams.get(teamId);
      const message =
        messageParts.join(" ").trim() || `${providerName} moved to ${teamName}.`;

      state.terminalConnected = true;
      state.assistantMode = "briefing";
      state.selectedTeamId = teamId;
      upsertProviderConnection(state, providerId, {
        status: "connected",
        teamId,
        note: message,
      });
      state.currentDirective = {
        source: "terminal bridge",
        issuedAt: nowIso(),
        status: "active",
        title: `Assign ${providerName}`,
        body: message,
      };
      pushEvent(state, {
        channel: "team",
        teamId,
        from: "Operator Liaison",
        to: providerName,
        subject: "Provider reassigned",
        body: message,
      });
      await saveStateAndMaybeWake(state, true);
      printStatus(state);
      return;
    }

    case "disconnect": {
      const [providerId, ...messageParts] = rest;
      ensureProvider(providerId);
      const providerName = knownProviders.get(providerId);
      const current = state.providerConnections.find((entry) => entry.providerId === providerId);
      const message =
        messageParts.join(" ").trim() || `${providerName} disconnected from the local bridge.`;

      state.providerConnections = state.providerConnections.filter(
        (entry) => entry.providerId !== providerId,
      );
      state.currentDirective = {
        source: "terminal bridge",
        issuedAt: nowIso(),
        status: "active",
        title: `Disconnect ${providerName}`,
        body: message,
      };
      pushEvent(state, {
        channel: "assistant",
        teamId: current?.teamId ?? "executive-desk",
        from: "You",
        to: "Operator Liaison",
        subject: "CLI agent disconnected",
        body: message,
      });
      await saveStateAndMaybeWake(state, true);
      printStatus(state);
      return;
    }

    case "directive": {
      const message = rest.join(" ").trim();
      if (!message) {
        throw new Error("directive requires text.");
      }

      state.terminalConnected = true;
      state.assistantMode = "briefing";
      state.currentDirective = {
        source: "terminal bridge",
        issuedAt: nowIso(),
        status: "active",
        title: "Operator directive",
        body: message,
      };
      pushEvent(state, {
        channel: "assistant",
        teamId: "executive-desk",
        from: "You",
        to: "Operator Liaison",
        subject: "New terminal directive",
        body: message,
      });
      await saveStateAndMaybeWake(state, true);
      printStatus(state);
      return;
    }

    case "pause": {
      const reason = rest.join(" ").trim() || "Operator requested a pause and summary.";
      state.terminalConnected = true;
      state.assistantMode = "pause";
      state.currentDirective = {
        source: "terminal bridge",
        issuedAt: nowIso(),
        status: "paused",
        title: "Pause requested",
        body: reason,
      };
      pushEvent(state, {
        channel: "assistant",
        teamId: "executive-desk",
        from: "You",
        to: "Operator Liaison",
        subject: "Pause the active queue",
        body: reason,
      });
      await saveStateAndMaybeWake(state, true);
      printStatus(state);
      return;
    }

    case "resume": {
      const reason = rest.join(" ").trim() || "Resume the highest-priority safe lane.";
      state.terminalConnected = true;
      state.assistantMode = "resume";
      state.currentDirective = {
        source: "terminal bridge",
        issuedAt: nowIso(),
        status: "active",
        title: "Resume approved",
        body: reason,
      };
      pushEvent(state, {
        channel: "assistant",
        teamId: "executive-desk",
        from: "You",
        to: "Mission Control",
        subject: "Resume planning",
        body: reason,
      });
      await saveStateAndMaybeWake(state, true);
      printStatus(state);
      return;
    }

    case "focus": {
      const [teamId, ...messageParts] = rest;
      ensureTeam(teamId);
      const message =
        messageParts.join(" ").trim() ||
        `Focus the next lane on ${knownTeams.get(teamId)}.`;

      state.terminalConnected = true;
      state.selectedTeamId = teamId;
      state.assistantMode = "briefing";
      upsertTeamUpdate(state, teamId, {
        state: "delivering",
        currentDeliverable: message,
      });
      state.currentDirective = {
        source: "terminal bridge",
        issuedAt: nowIso(),
        status: "active",
        title: `Focus ${knownTeams.get(teamId)}`,
        body: message,
      };
      pushEvent(state, {
        channel: "team",
        teamId,
        from: "You",
        to: knownTeams.get(teamId),
        subject: "Terminal focus change",
        body: message,
      });
      await saveStateAndMaybeWake(state, true);
      printStatus(state);
      return;
    }

    case "note": {
      const [teamId, ...messageParts] = rest;
      ensureTeam(teamId);
      const message = messageParts.join(" ").trim();
      if (!message) {
        throw new Error("note requires a team id and message.");
      }

      state.terminalConnected = true;
      state.selectedTeamId = teamId;
      pushEvent(state, {
        channel: "team",
        teamId,
        from: "You",
        to: knownTeams.get(teamId),
        subject: "Operator note",
        body: message,
      });
      await saveState(state);
      printStatus(state);
      return;
    }

    case "clear": {
      const nextState = makeDefaultState();
      await saveState(nextState);
      printStatus(nextState);
      return;
    }

    case "autonomy": {
      const [mode = "status"] = rest;

      if (mode === "status") {
        printStatus(state);
        return;
      }

      if (mode === "on") {
        state.autonomy = {
          ...(state.autonomy ?? makeDefaultAutonomy(state.updatedAt ?? nowIso())),
          enabled: true,
          status: "running",
        };
        await saveState(state);
        printStatus(state);
        return;
      }

      if (mode === "off") {
        state.autonomy = {
          ...(state.autonomy ?? makeDefaultAutonomy(state.updatedAt ?? nowIso())),
          enabled: false,
          status: "stopped",
        };
        await saveState(state);
        printStatus(state);
        return;
      }

      throw new Error('autonomy accepts "status", "on", or "off".');
    }

    default:
      throw new Error(
        `Unknown command "${command}". Try status, connect, assign, disconnect, directive, pause, resume, focus, note, autonomy, or clear.`,
      );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
