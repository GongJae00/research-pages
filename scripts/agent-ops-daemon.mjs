import { execFile as execFileCallback, spawn as spawnCallback } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const stateFile = path.join(process.cwd(), ".researchos", "agent-ops-state.json");
const tickMs = Number(process.env.RESEARCH_OS_AUTONOMY_TICK_MS ?? "90000");
const researchOsStateDir = path.join(process.cwd(), ".researchos");
const autonomyArtifactDir = path.join(researchOsStateDir, "autonomy-artifacts");
const autonomyExecutionDir = path.join(researchOsStateDir, "autonomy-executions");
const autonomyLockPath = path.join(researchOsStateDir, "autonomy.lock.json");
const autonomySchemaPath = path.join(researchOsStateDir, "autonomy-plan-schema.json");
const executionSchemaPath = path.join(researchOsStateDir, "autonomy-execution-schema.json");

const teamCycle = [
  {
    id: "shell-experience",
    name: "Shell and Experience Team",
    lane: "surface QA lane",
    lead: "Shell Builder",
    objective:
      "Polish homepage, shell density, and navigation clarity without crossing product boundaries.",
    deliverable:
      "UI density pass with clearer control-room hierarchy and homepage shell polish.",
    nextHandoff: "Release Guard verifies the visual shell slice before another lane opens.",
  },
  {
    id: "workflow-systems",
    name: "Workflow Systems Team",
    lane: "workflow polish lane",
    lead: "Research Flow Lead",
    objective:
      "Tighten one real researcher workflow and keep the improvement bounded to a single slice.",
    deliverable:
      "One workflow polish brief with the next small interface or copy fix queued.",
    nextHandoff: "Executive Desk reviews the workflow brief and approves one bounded implementation slice.",
  },
  {
    id: "reliability-desk",
    name: "Reliability Desk",
    lane: "collaboration and reliability lane",
    lead: "Release Guard",
    objective:
      "Watch lint, route stability, and preview-facing runtime risks while the other teams keep shipping.",
    deliverable:
      "Reliability check packet covering route health, command deck stability, and follow-up guardrails.",
    nextHandoff: "Mission Control decides whether reliability stays guarded or yields to another lane.",
  },
  {
    id: "executive-desk",
    name: "Executive Desk",
    lane: "docs drift lane",
    lead: "Operator Liaison",
    objective:
      "Keep the operator-facing model, queue rules, and docs aligned with the current control-plane behavior.",
    deliverable:
      "Updated operator brief and refreshed queue packet for the next autonomy pass.",
    nextHandoff: "Operator Liaison routes the refreshed packet back to Mission Control.",
  },
];

const teamMemberRoster = {
  "executive-desk": ["Operator Liaison", "Mission Control"],
  "shell-experience": ["Shell Builder", "Ops Board Builder"],
  "workflow-systems": ["Profile Steward", "Document Systems", "Lab Publishing Lead"],
  "reliability-desk": ["Release Guard", "Docs Drift Agent"],
};

const laneGuidance = {
  "shell-experience": {
    ownedPaths: [
      "apps/web/src/app/[locale]/page.tsx",
      "apps/web/src/components/header.tsx",
      "apps/web/src/components/sidebar.tsx",
      "apps/web/src/components/language-switcher.tsx",
      "apps/web/src/components/preview-mode-banner.tsx",
      "apps/web/src/components/homepage-agent-control-section.tsx",
      "apps/web/src/components/homepage-agent-control-section.module.css",
    ],
    validation: "Review /ko and /en shell surfaces and avoid route, auth, or contract changes.",
    nonGoals: "Do not touch shared contracts, auth boundaries, or non-shell workspace features.",
    validationCommands: [
      "corepack pnpm --filter @research-os/web typecheck",
      "corepack pnpm --filter @research-os/web lint",
    ],
    executionFocus:
      "Improve the homepage shell or internal ops control room in one small visible slice. Favor clarity, density, command visibility, and team-flow readability.",
  },
  "workflow-systems": {
    ownedPaths: [
      "apps/web/src/app/[locale]/profile",
      "apps/web/src/app/[locale]/documents",
      "apps/web/src/app/[locale]/lab",
      "apps/web/src/components/profile-workspace.tsx",
      "apps/web/src/components/document-workspace.tsx",
      "apps/web/src/components/document-evidence-picker.tsx",
      "apps/web/src/components/document-intake-panel.tsx",
      "apps/web/src/components/compact-document-row.tsx",
      "apps/web/src/components/lab-workspace.tsx",
    ],
    validation: "Improve one real researcher workflow and keep the slice bounded to one surface.",
    nonGoals: "Do not widen into architecture, Supabase contracts, or unrelated UI churn.",
    validationCommands: [
      "corepack pnpm --filter @research-os/web typecheck",
      "corepack pnpm --filter @research-os/web lint",
    ],
    executionFocus:
      "Tighten one real workflow slice with small copy, structure, or validation improvements only.",
  },
  "reliability-desk": {
    ownedPaths: [
      "apps/web/src/app/api",
      "apps/web/src/lib",
      "docs/14-terminal-ops-bridge.md",
      "docs/15-local-autonomy-daemon.md",
    ],
    validation: "Watch route health, CLI bridge stability, and low-risk runtime regressions only.",
    nonGoals: "Do not introduce new infrastructure or contract changes without review.",
    validationCommands: [
      "corepack pnpm --filter @research-os/web typecheck",
      "corepack pnpm --filter @research-os/web lint",
    ],
    executionFocus:
      "Fix one low-risk reliability issue in runtime glue, route health, or operator docs without changing shared contracts.",
  },
  "executive-desk": {
    ownedPaths: [
      "docs/12-continuous-improvement-loop.md",
      "docs/13-agent-operations-model.md",
    ],
    validation: "Keep operator docs and queue rules aligned with actual control-plane behavior.",
    nonGoals: "Do not rewrite product scope, architecture, or public workflows.",
    validationCommands: [],
    executionFocus:
      "Keep operator docs, queue wording, and internal control-plane guidance aligned with the actual behavior.",
  },
};

const workItemCatalog = {
  "shell-experience": [
    {
      id: "homepage-control-density",
      title: "Tighten homepage agent control density",
      targetFiles: [
        "apps/web/src/app/[locale]/page.tsx",
        "apps/web/src/components/homepage-agent-control-section.tsx",
        "apps/web/src/components/homepage-agent-control-section.module.css",
      ],
      objective:
        "Reduce above-the-fold waste and make the assistant or CLI setup story more immediately scannable on the homepage.",
      instruction:
        "Compress the homepage agent-control section above the fold. Reduce repeated copy, tighten card spacing, and make the CLI setup flow easier to scan without touching unrelated routes.",
      acceptance:
        "One visible density or hierarchy improvement lands in the homepage control section without expanding scope beyond the public shell.",
    },
    {
      id: "shell-navigation-clarity",
      title: "Clarify shell navigation hierarchy",
      targetFiles: [
        "apps/web/src/components/header.tsx",
        "apps/web/src/components/sidebar.tsx",
        "apps/web/src/components/preview-mode-banner.tsx",
      ],
      objective:
        "Make navigation labels, entry points, and internal preview affordances easier to scan without redesigning unrelated surfaces.",
      instruction:
        "Improve one navigation or preview entry affordance so internal ops and public shell routes are easier to distinguish at a glance.",
      acceptance:
        "Navigation or preview affordances become clearer and denser in one bounded shell slice.",
    },
  ],
  "workflow-systems": [
    {
      id: "profile-workspace-clarity",
      title: "Tighten profile workspace scanning",
      targetFiles: [
        "apps/web/src/app/[locale]/profile/page.tsx",
        "apps/web/src/components/profile-workspace.tsx",
      ],
      objective:
        "Reduce copy friction and make the profile workspace easier to scan in one bounded improvement.",
      instruction:
        "Tighten one profile editing or summary block by reducing repeated copy and making the key fields or actions easier to scan.",
      acceptance:
        "One profile editing or summary section becomes clearer without changing storage, contracts, or auth.",
    },
    {
      id: "document-workspace-density",
      title: "Tighten document workspace queue and list density",
      targetFiles: [
        "apps/web/src/app/[locale]/documents/page.tsx",
        "apps/web/src/components/document-workspace.tsx",
        "apps/web/src/components/document-intake-panel.tsx",
        "apps/web/src/components/compact-document-row.tsx",
      ],
      objective:
        "Make the document upload queue or repository list easier to understand and quicker to act on.",
      instruction:
        "Improve one document queue or repository list slice so the next action is clearer and the list feels denser without changing document storage behavior.",
      acceptance:
        "One document workflow action or hierarchy becomes clearer in the queue or repository view.",
    },
    {
      id: "lab-workspace-structure",
      title: "Clarify lab workspace structure",
      targetFiles: [
        "apps/web/src/app/[locale]/lab/page.tsx",
        "apps/web/src/components/lab-workspace.tsx",
      ],
      objective:
        "Make one lab workflow slice easier to scan without widening into public lab pages or contracts.",
      instruction:
        "Clarify one lab workspace section with denser structure or clearer labels, but keep the change inside the private lab workspace only.",
      acceptance:
        "One bounded layout or copy improvement lands in the lab workspace only.",
    },
  ],
  "reliability-desk": [
    {
      id: "ops-runtime-guard",
      title: "Harden ops runtime merge guards",
      targetFiles: [
        "apps/web/src/lib/agent-ops-runtime.ts",
        "apps/web/src/app/api/ops-state/route.ts",
      ],
      objective:
        "Tighten low-risk runtime handling so malformed or partial control-plane data degrades more cleanly.",
      instruction:
        "Improve one low-risk runtime guard or merge edge case so malformed control-plane data produces clearer, safer behavior.",
      acceptance:
        "One bounded guard or merge-path improvement lands without changing shared contracts.",
    },
    {
      id: "terminal-bridge-clarity",
      title: "Improve ops terminal bridge reliability feedback",
      targetFiles: [
        "apps/web/src/app/api/ops-terminal/route.ts",
        "apps/web/src/lib/ops-terminal-manager.ts",
      ],
      objective:
        "Make the local ops terminal bridge report failures and session state more predictably.",
      instruction:
        "Improve one terminal route or session-manager behavior so failures or session transitions are easier to understand and recover from.",
      acceptance:
        "One bounded reliability improvement lands in terminal route or session-manager glue.",
    },
  ],
  "executive-desk": [
    {
      id: "operator-loop-doc-sync",
      title: "Sync operator docs with the bounded autonomy loop",
      targetFiles: [
        "docs/12-continuous-improvement-loop.md",
        "docs/13-agent-operations-model.md",
      ],
      objective:
        "Keep the operator-facing docs aligned with what the bounded autonomy loop actually does today.",
      instruction:
        "Clarify one operator-facing docs section so it matches the bounded autonomy loop's current behavior without broad documentation churn.",
      acceptance:
        "One doc clarification lands that matches current control-plane behavior without widening product scope.",
    },
  ],
};

const plannerSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  additionalProperties: false,
  required: ["summary", "operatorBrief", "nextAction", "teamDispatch", "checkpoint"],
  properties: {
    summary: { type: "string" },
    operatorBrief: { type: "string" },
    nextAction: { type: "string" },
    teamDispatch: { type: "string" },
    checkpoint: { type: "string" },
  },
};

const executionSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  additionalProperties: false,
  required: ["summary", "operatorBrief", "nextAction", "outcome"],
  properties: {
    summary: { type: "string" },
    operatorBrief: { type: "string" },
    nextAction: { type: "string" },
    outcome: {
      type: "string",
      enum: ["changed", "noop", "blocked"],
    },
  },
};

function nowIso() {
  return new Date().toISOString();
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

function futureIso(msFromNow) {
  return new Date(Date.now() + msFromNow).toISOString();
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function sanitizePathSegment(value) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
}

async function ensureAutonomyAssets() {
  await mkdir(autonomyArtifactDir, { recursive: true });
  await mkdir(autonomyExecutionDir, { recursive: true });
  await writeFile(autonomySchemaPath, JSON.stringify(plannerSchema, null, 2));
  await writeFile(executionSchemaPath, JSON.stringify(executionSchema, null, 2));
}

async function acquireAutonomyLock() {
  await mkdir(researchOsStateDir, { recursive: true });
  const token = `${process.pid}-${Date.now()}`;
  const payload = {
    token,
    pid: process.pid,
    acquiredAt: nowIso(),
  };

  try {
    await writeFile(autonomyLockPath, JSON.stringify(payload, null, 2), {
      flag: "wx",
    });
    return {
      acquired: true,
      token,
      payload,
    };
  } catch (error) {
    if (error?.code !== "EEXIST") {
      throw error;
    }

    try {
      const raw = await readFile(autonomyLockPath, "utf8");
      const currentLock = JSON.parse(raw);
      const acquiredAt = Date.parse(currentLock.acquiredAt ?? "");
      const staleAfterMs = Math.max(tickMs * 2, 15 * 60 * 1000);
      const lockPid =
        typeof currentLock.pid === "number" && Number.isFinite(currentLock.pid)
          ? currentLock.pid
          : null;

      if (lockPid && !(await isProcessAlive(lockPid))) {
        await rm(autonomyLockPath, { force: true });
        return acquireAutonomyLock();
      }

      if (Number.isFinite(acquiredAt) && Date.now() - acquiredAt > staleAfterMs) {
        await rm(autonomyLockPath, { force: true });
        return acquireAutonomyLock();
      }

      return {
        acquired: false,
        token: null,
        payload: currentLock,
      };
    } catch {
      return {
        acquired: false,
        token: null,
        payload: null,
      };
    }
  }
}

async function releaseAutonomyLock(token) {
  if (!token) {
    return;
  }

  try {
    const raw = await readFile(autonomyLockPath, "utf8");
    const currentLock = JSON.parse(raw);
    if (currentLock.token === token) {
      await rm(autonomyLockPath, { force: true });
    }
  } catch {
    // ignore
  }
}

function getLaneGuidance(teamId) {
  return laneGuidance[teamId] ?? {
    ownedPaths: [],
    validation: "Stay within one bounded slice.",
    nonGoals: "Do not expand scope.",
    validationCommands: [],
    executionFocus: "Make one safe bounded improvement only.",
  };
}

function getWorkItems(teamId) {
  return workItemCatalog[teamId] ?? [];
}

function containsKeyword(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function selectWorkItem(teamId, loopCount, operatorDirective = null) {
  const items = getWorkItems(teamId);
  if (!items.length) {
    return {
      id: `${teamId}-default`,
      title: "Bounded improvement slice",
      targetFiles: getLaneGuidance(teamId).ownedPaths,
      objective: "Make one safe bounded improvement in the owned paths.",
      instruction: "Make one safe bounded improvement in the owned paths only.",
      acceptance: "Land one small safe improvement or return blocked with a precise reason.",
    };
  }

  const directiveText =
    operatorDirective && typeof operatorDirective.body === "string"
      ? operatorDirective.body.toLowerCase()
      : "";

  if (teamId === "shell-experience") {
    if (containsKeyword(directiveText, ["홈페이지", "homepage", "landing", "home"])) {
      return items.find((item) => item.id === "homepage-control-density") ?? items[0];
    }
    if (containsKeyword(directiveText, ["네비", "navigation", "sidebar", "header"])) {
      return items.find((item) => item.id === "shell-navigation-clarity") ?? items[0];
    }
  }

  if (teamId === "workflow-systems") {
    if (containsKeyword(directiveText, ["document", "documents", "문서"])) {
      return items.find((item) => item.id === "document-workspace-density") ?? items[0];
    }
    if (containsKeyword(directiveText, ["profile", "profiles", "프로필"])) {
      return items.find((item) => item.id === "profile-workspace-clarity") ?? items[0];
    }
    if (containsKeyword(directiveText, ["lab", "labs", "연구실", "랩"])) {
      return items.find((item) => item.id === "lab-workspace-structure") ?? items[0];
    }
  }

  if (teamId === "shell-experience") {
    if (directiveText.includes("홈페이지") || directiveText.includes("homepage")) {
      return items.find((item) => item.id === "homepage-control-density") ?? items[0];
    }
    if (directiveText.includes("네비") || directiveText.includes("navigation")) {
      return items.find((item) => item.id === "shell-navigation-clarity") ?? items[0];
    }
  }

  if (teamId === "workflow-systems") {
    if (directiveText.includes("document") || directiveText.includes("문서")) {
      return items.find((item) => item.id === "document-workspace-density") ?? items[0];
    }
    if (directiveText.includes("profile") || directiveText.includes("프로필")) {
      return items.find((item) => item.id === "profile-workspace-clarity") ?? items[0];
    }
    if (directiveText.includes("lab") || directiveText.includes("연구실")) {
      return items.find((item) => item.id === "lab-workspace-structure") ?? items[0];
    }
  }

  const teamTurnIndex = Math.max(0, Math.floor((loopCount - 1) / teamCycle.length));
  return items[teamTurnIndex % items.length];
}

function buildFallbackPlan(team, providerLabel, workItem) {
  return {
    summary: `${team.name} is advancing ${workItem.title} within the ${team.lane}, with ${providerLabel} keeping the slice bounded.`,
    operatorBrief: `${team.lead} is holding ${team.name} on ${workItem.title}; latest deliverable: ${team.deliverable}`,
    nextAction: `${providerLabel} should keep ${workItem.title} moving until ${team.nextHandoff}`,
    teamDispatch: `${team.lead} should execute ${workItem.title} inside the owned paths only. ${workItem.instruction}`,
    checkpoint: `${team.name} should pause after ${workItem.title} reaches one safe checkpoint and return one concise report packet.`,
  };
}

function buildPlannerPrompt(team, context = {}, workItem) {
  const guidance = getLaneGuidance(team.id);
  const ownedPaths =
    guidance.ownedPaths.length > 0 ? guidance.ownedPaths.map((entry) => `- ${entry}`).join("\n") : "- none";
  const operatorDirective =
    context.operatorDirective &&
    typeof context.operatorDirective.body === "string" &&
    context.operatorDirective.body.trim()
      ? `Operator directive: ${context.operatorDirective.body}`
      : "Operator directive: none";
  const lastExecution =
    context.lastExecution && typeof context.lastExecution.summary === "string"
      ? `Latest execution outcome: ${context.lastExecution.summary}`
      : "Latest execution outcome: none";
  const lastReport =
    context.lastReport && typeof context.lastReport.summary === "string"
      ? `Latest report summary: ${context.lastReport.summary}`
      : "Latest report summary: none";

  return [
    "You are the local autonomy planner for the ResearchOS internal agent ops board.",
    "Respect AGENTS.md, docs/00-product-vision.md, docs/02-architecture.md, docs/12-continuous-improvement-loop.md, and docs/13-agent-operations-model.md.",
    "This is planning only. Do not propose architecture, privacy, auth-boundary, or shared-contract changes.",
    "Return a concise planning packet for the next bounded autonomy cycle.",
    "Do not describe yourself, your role, or future hypothetical behavior.",
    "Do not say that you are waiting for instructions. The target lane is already defined below.",
    "Every field must refer to the current team, lane, deliverable, and next handoff only.",
    "summary: state what this team is doing right now in one or two sentences.",
    "operatorBrief: tell the operator what changed or what is now ready to inspect.",
    "nextAction: the next bounded action this team should take without widening scope.",
    "teamDispatch: one direct instruction written to the team lead.",
    "checkpoint: the next safe pause or handoff checkpoint.",
    `Team: ${team.name}`,
    `Lane: ${team.lane}`,
    `Lead: ${team.lead}`,
    `Objective: ${team.objective}`,
    `Deliverable: ${team.deliverable}`,
    `Next handoff: ${team.nextHandoff}`,
    `Concrete work item: ${workItem.title}`,
    `Concrete objective: ${workItem.objective}`,
    `Implementation instruction: ${workItem.instruction}`,
    "Target files:",
    workItem.targetFiles.map((entry) => `- ${entry}`).join("\n"),
    `Acceptance: ${workItem.acceptance}`,
    operatorDirective,
    lastExecution,
    lastReport,
    "Owned paths:",
    ownedPaths,
    `Validation target: ${guidance.validation}`,
    `Non-goals: ${guidance.nonGoals}`,
    "Return only a JSON object with exactly these string keys: summary, operatorBrief, nextAction, teamDispatch, checkpoint.",
    "Do not wrap the JSON in markdown or add any extra prose.",
  ].join("\n");
}

function buildArtifactFilePath(loopCount, teamId, providerId) {
  const timestamp = nowIso().replace(/[:.]/g, "-");
  return path.join(
    autonomyArtifactDir,
    `${timestamp}-loop-${String(loopCount).padStart(3, "0")}-${sanitizePathSegment(teamId)}-${sanitizePathSegment(providerId)}.json`,
  );
}

async function writePlannerArtifact({
  loopCount,
  providerId,
  providerLabel,
  team,
  prompt,
  plan,
  status,
  raw,
  errorMessage = null,
}) {
  await ensureAutonomyAssets();
  const artifactPath = buildArtifactFilePath(loopCount, team.id, providerId);
  const relativeArtifactPath = path.relative(process.cwd(), artifactPath).replace(/\\/g, "/");
  await writeFile(
    artifactPath,
    JSON.stringify(
      {
        generatedAt: nowIso(),
        loopCount,
        providerId,
        providerLabel,
        teamId: team.id,
        teamName: team.name,
        lane: team.lane,
        status,
        prompt,
        plan,
        raw,
        errorMessage,
      },
      null,
      2,
    ),
  );
  return relativeArtifactPath;
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
      source: "autonomy daemon",
      issuedAt: updatedAt,
      status: "idle",
      title: "Autonomy loop idle",
      body: "Enable the local autonomy loop to keep the queue moving.",
    },
    conversationFeed: [],
    teamUpdates: [],
    memberUpdates: [],
    providerConnections: [],
    autonomy: {
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
      providerHealth: [
        {
          providerId: "mock",
          label: "Mock planner",
          available: true,
          note: "Fallback runtime used only when no real CLI provider is available.",
        },
      ],
      currentTask: null,
      taskHistory: [],
      currentExecution: null,
      executionHistory: [],
      activeTasks: [],
      activeExecutions: [],
      workers: [],
      workerHistory: [],
      interactionBus: [],
    },
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
      state.autonomy = makeDefaultState().autonomy;
    } else {
      state.autonomy = {
        ...makeDefaultState().autonomy,
        ...state.autonomy,
      };
    }
    state.autonomy.parallelLimit = Math.max(
      2,
      Math.min(Number(state.autonomy.parallelLimit ?? 3) || 3, teamCycle.length),
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
  state.updatedAt = nowIso();
  await mkdir(path.dirname(stateFile), { recursive: true });
  await writeFile(stateFile, JSON.stringify(state, null, 2));
}

function pushEvent(state, event) {
  state.conversationFeed.unshift({
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    time: nowIso(),
    ...event,
  });
  state.conversationFeed = state.conversationFeed.slice(0, 24);
}

function upsertTeamUpdate(state, teamId, updates) {
  const current = state.teamUpdates.find((entry) => entry.teamId === teamId);
  if (current) {
    Object.assign(current, updates);
    return;
  }

  state.teamUpdates.push({ teamId, ...updates });
}

function replaceMemberUpdates(state, teamId, updates) {
  state.memberUpdates = [
    ...state.memberUpdates.filter((entry) => entry.teamId !== teamId),
    ...updates,
  ];
}

function upsertProviderConnection(state, providerId, updates) {
  const current = state.providerConnections.find((entry) => entry.providerId === providerId);
  if (current) {
    Object.assign(current, updates, { updatedAt: nowIso() });
    return;
  }

  state.providerConnections.push({
    providerId,
    status: "connected",
    updatedAt: nowIso(),
    ...updates,
  });
}

async function commandExists(command) {
  try {
    await execFile("where.exe", [command], {
      windowsHide: true,
      timeout: 8000,
    });
    return true;
  } catch {
    return false;
  }
}

async function canRunCodex() {
  try {
    await execFile("cmd.exe", ["/c", "codex.cmd", "--version"], {
      windowsHide: true,
      timeout: 12000,
    });
    return true;
  } catch {
    return false;
  }
}

async function canRunGemini() {
  try {
    await execFile("cmd.exe", ["/c", "gemini.cmd", "--version"], {
      windowsHide: true,
      timeout: 12000,
    });
    return true;
  } catch {
    return false;
  }
}

async function detectProviderHealth() {
  const [hasCodex, hasClaude, hasGemini, canUseCodex, canUseGemini] = await Promise.all([
    commandExists("codex.cmd"),
    commandExists("claude.cmd"),
    commandExists("gemini.cmd"),
    canRunCodex(),
    canRunGemini(),
  ]);

  const health = [
    {
      providerId: "codex",
      label: "Codex CLI",
      available: canUseCodex,
      note: canUseCodex
        ? "Installed and callable through codex.cmd. This is the current live autonomy planner."
        : hasCodex
          ? "CLI wrapper exists, but the current shell could not start a Codex run."
        : "Not found on PATH.",
    },
    {
      providerId: "claude",
      label: "Claude Code",
      available: false,
      note: hasClaude
        ? "CLI installed, but interactive model calls are currently blocked by account usage limits."
        : "Not found on PATH.",
    },
    {
      providerId: "gemini",
      label: "Gemini CLI",
      available: canUseGemini,
      note: canUseGemini
        ? "Installed and callable through gemini.cmd. Available as a fallback autonomy planner."
        : hasGemini
          ? "CLI wrapper exists, but the current shell could not start a Gemini run."
          : "Not found on PATH.",
    },
    {
      providerId: "mock",
      label: "Mock planner",
      available: true,
      note: "Fallback planner keeps the queue, reports, and team rhythm moving when no live provider is ready.",
    },
  ];

  const active = health.find((item) => item.providerId === "codex" && item.available)
    ?? health.find((item) => item.providerId === "claude" && item.available)
    ?? health.find((item) => item.providerId === "gemini" && item.available)
    ?? health.find((item) => item.providerId === "mock");

  return {
    activeProviderId: active.providerId,
    activeProviderLabel: active.label,
    providerHealth: health,
  };
}

function extractJsonObject(raw) {
  const trimmed = raw.replace(/```json|```/gi, "").trim();
  if (!trimmed) {
    throw new Error("No JSON object found in Codex output.");
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through
  }

  const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const candidate = lines[index].replace(/^`|`$/g, "").trim();
    if (!candidate.startsWith("{") || !candidate.endsWith("}")) {
      continue;
    }

    try {
      return JSON.parse(candidate);
    } catch {
      // continue scanning
    }
  }

  const start = trimmed.lastIndexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in Codex output.");
  }

  return JSON.parse(trimmed.slice(start, end + 1));
}

async function readCodexJsonResponse(outputPath, stdout) {
  const candidates = [];

  try {
    const outputFile = await readFile(outputPath, "utf8");
    if (outputFile.trim()) {
      candidates.push({ source: "output-last-message", raw: outputFile });
    }
  } catch {
    // ignore missing or empty file
  }

  if (stdout.trim()) {
    candidates.push({ source: "stdout", raw: stdout });
  }

  let lastError = null;
  for (const candidate of candidates) {
    try {
      return {
        source: candidate.source,
        raw: candidate.raw,
        value: extractJsonObject(candidate.raw),
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("No JSON object found in Codex output.");
}

async function runCommandWithInput(command, args, input, { timeout, maxBuffer }) {
  return new Promise((resolve, reject) => {
    const child = spawnCallback(command, args, {
      cwd: process.cwd(),
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    let totalBytes = 0;
    let timer = null;

    const fail = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timer) {
        clearTimeout(timer);
      }
      error.stdout = stdout;
      error.stderr = stderr;
      try {
        child.kill();
      } catch {
        // ignore
      }
      reject(error);
    };

    timer = setTimeout(() => {
      fail(new Error(`Process timed out after ${timeout}ms.`));
    }, timeout);

    const append = (kind, chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBuffer) {
        fail(new Error(`Process output exceeded ${maxBuffer} bytes.`));
        return;
      }

      const text = chunk.toString("utf8");
      if (kind === "stdout") {
        stdout += text;
      } else {
        stderr += text;
      }
    };

    child.stdout.on("data", (chunk) => {
      append("stdout", chunk);
    });

    child.stderr.on("data", (chunk) => {
      append("stderr", chunk);
    });

    child.on("error", (error) => {
      fail(error);
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timer) {
        clearTimeout(timer);
      }

      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const error = new Error(`Process exited with code ${code}.`);
      error.code = code;
      error.stdout = stdout;
      error.stderr = stderr;
      reject(error);
    });

    child.stdin.end(input, "utf8");
  });
}

async function runCodexExecWithPrompt(prompt, outputPath, args, { timeout, maxBuffer }) {
  await writeFile(outputPath, "", "utf8");
  const { stdout, stderr } = await runCommandWithInput(
    "cmd.exe",
    [
      "/d",
      "/s",
      "/c",
      "codex.cmd",
      "exec",
      "-C",
      process.cwd(),
      "--skip-git-repo-check",
      "-c",
      "mcp_servers.linear.enabled=false",
      "--color",
      "never",
      "--output-last-message",
      outputPath,
      ...args,
    ],
    prompt,
    { timeout, maxBuffer },
  );

  const response = await readCodexJsonResponse(outputPath, stdout);
  return {
    stdout,
    stderr,
    outputFile: response.source === "output-last-message" ? response.raw : "",
    value: response.value,
  };
}

function extractCodexSessionId(stderr = "") {
  const match = stderr.match(/session(?:\s+|_)?id\s*[:=]\s*([a-z0-9-]+)/i);
  return match?.[1] ?? null;
}

function buildBatchId(loopCount) {
  return `batch-${String(loopCount).padStart(3, "0")}-${Date.now()}`;
}

function buildWorkerId(batchId, teamId) {
  return `${batchId}-${sanitizePathSegment(teamId)}`;
}

function getWorkerMemberName(teamId, loopCount) {
  const roster = teamMemberRoster[teamId] ?? [];
  if (!roster.length) {
    return "Autonomy Worker";
  }
  return roster[(Math.max(loopCount, 1) - 1) % roster.length];
}

function getWorkerRole(memberName) {
  if (memberName === "Mission Control") {
    return "Queue director";
  }
  if (memberName === "Shell Builder") {
    return "Surface lead";
  }
  if (memberName === "Ops Board Builder") {
    return "Control-room builder";
  }
  if (memberName === "Profile Steward") {
    return "Profile steward";
  }
  if (memberName === "Document Systems") {
    return "Document systems";
  }
  if (memberName === "Lab Publishing Lead") {
    return "Lab publishing lead";
  }
  if (memberName === "Release Guard") {
    return "Release guard";
  }
  if (memberName === "Docs Drift Agent") {
    return "Docs drift agent";
  }
  return "Autonomy worker";
}

function workerStatusFromExecution(executionRecord, taskPacket) {
  if (!executionRecord) {
    return taskPacket.status === "failed" ? "failed" : "planned";
  }
  if (executionRecord.outcome === "changed") {
    return "changed";
  }
  if (executionRecord.outcome === "noop") {
    return "noop";
  }
  if (executionRecord.outcome === "blocked") {
    return "blocked";
  }
  if (executionRecord.outcome === "failed") {
    return "failed";
  }
  return "running";
}

function buildWorkerState({
  batchId,
  loopCount,
  team,
  taskPacket,
  executionRecord,
  sessionId,
  startedAt,
}) {
  const memberName = getWorkerMemberName(team.id, loopCount);
  const updatedAt = nowIso();
  return {
    id: buildWorkerId(batchId, team.id),
    teamId: team.id,
    teamLabel: team.name,
    memberName,
    role: getWorkerRole(memberName),
    providerId: executionRecord?.providerId ?? taskPacket.providerId,
    providerLabel: executionRecord?.providerLabel ?? taskPacket.providerLabel,
    sessionId,
    workItemTitle: taskPacket.workItemTitle,
    ownedPaths: taskPacket.workItemFiles,
    status: workerStatusFromExecution(executionRecord, taskPacket),
    summary: executionRecord?.summary ?? taskPacket.summary,
    nextAction: executionRecord?.nextAction ?? taskPacket.nextAction,
    changedFiles: executionRecord?.changedFiles ?? [],
    artifactPath: executionRecord?.artifactPath ?? taskPacket.artifactPath,
    startedAt,
    updatedAt,
  };
}

function buildInteractionStatus(executionRecord) {
  if (!executionRecord) {
    return "queued";
  }
  if (executionRecord.outcome === "blocked" || executionRecord.outcome === "failed") {
    return "blocked";
  }
  if (executionRecord.outcome === "changed" || executionRecord.outcome === "noop") {
    return "completed";
  }
  return "running";
}

function buildWorkerInteractionMessages({
  batchId,
  team,
  taskPacket,
  executionRecord,
  worker,
}) {
  const status = buildInteractionStatus(executionRecord);
  const reviewTarget = executionRecord?.validation.some((entry) => entry.status === "failed")
    ? "Release Guard"
    : "Operator Liaison";

  return [
    {
      id: `${batchId}-${team.id}-assistant-dispatch`,
      time: nowIso(),
      teamId: team.id,
      workerId: worker.id,
      from: "Operator Liaison",
      to: team.lead,
      direction: "top-down",
      subject: "Bounded lane dispatch",
      body: taskPacket.teamDispatch,
      status,
    },
    {
      id: `${batchId}-${team.id}-lead-worker`,
      time: nowIso(),
      teamId: team.id,
      workerId: worker.id,
      from: team.lead,
      to: worker.memberName,
      direction: "top-down",
      subject: taskPacket.workItemTitle,
      body: executionRecord?.summary ?? taskPacket.summary,
      status,
    },
    {
      id: `${batchId}-${team.id}-worker-review`,
      time: nowIso(),
      teamId: team.id,
      workerId: worker.id,
      from: worker.memberName,
      to: reviewTarget,
      direction: executionRecord?.validation.some((entry) => entry.status === "failed") ? "peer" : "bottom-up",
      subject: executionRecord?.changedFiles.length ? "Diff ready" : "Checkpoint ready",
      body:
        executionRecord?.changedFiles.length
          ? `${executionRecord.changedFiles.join(", ")} updated. ${executionRecord.nextAction}`
          : (executionRecord?.nextAction ?? taskPacket.checkpoint),
      status,
    },
  ];
}

function isLowQualityPlan(plan) {
  const text = [
    plan.summary,
    plan.operatorBrief,
    plan.nextAction,
    plan.teamDispatch,
    plan.checkpoint,
  ]
    .join(" ")
    .toLowerCase();

  return [
    "operating as the local autonomy planner",
    "acting as the local autonomy planner",
    "local autonomy planner for the researchos internal agent ops board",
    "planner mode active",
    "planner mode only",
    "i’ll treat requests through",
    "i'll treat requests through",
    "planning mode ready",
    "send the board item",
    "send the task or board item",
    "send the work item or objective",
    "no dispatch issued yet",
    "waiting on the specific task",
    "awaiting the first planning target",
    "awaiting the first researchos board item",
    "pending first board item",
    "ready to intake the first board item",
  ].some((pattern) => text.includes(pattern));
}

function isOffTargetPlan(plan, team, workItem) {
  const text = [
    plan.summary,
    plan.operatorBrief,
    plan.nextAction,
    plan.teamDispatch,
    plan.checkpoint,
  ]
    .join(" ")
    .toLowerCase();

  const currentSignals = [team.name, team.lead, workItem.title]
    .map((entry) => entry.toLowerCase())
    .filter(Boolean);
  const otherTeamSignals = teamCycle
    .filter((entry) => entry.id !== team.id)
    .map((entry) => entry.name.toLowerCase());

  const mentionsCurrent = currentSignals.some((entry) => text.includes(entry));
  const mentionsOtherTeam = otherTeamSignals.some((entry) => text.includes(entry));

  return !mentionsCurrent || mentionsOtherTeam;
}

function buildTaskPacket({
  loopCount,
  team,
  providerId,
  providerLabel,
  plan,
  workItem,
  artifactPath,
  status,
}) {
  return {
    id: `task-${loopCount}-${team.id}`,
    time: nowIso(),
    providerId,
    providerLabel,
    teamId: team.id,
    teamLabel: team.name,
    lane: team.lane,
    objective: team.objective,
    summary: plan.summary,
    operatorBrief: plan.operatorBrief,
    nextAction: plan.nextAction,
    teamDispatch: plan.teamDispatch,
    checkpoint: plan.checkpoint,
    workItemTitle: workItem.title,
    workItemFiles: workItem.targetFiles,
    artifactPath,
    status,
  };
}

function buildExecutionArtifactFilePath(loopCount, teamId, providerId) {
  const timestamp = nowIso().replace(/[:.]/g, "-");
  return path.join(
    autonomyExecutionDir,
    `${timestamp}-loop-${String(loopCount).padStart(3, "0")}-${sanitizePathSegment(teamId)}-${sanitizePathSegment(providerId)}.json`,
  );
}

async function writeExecutionArtifact({
  loopCount,
  providerId,
  providerLabel,
  team,
  prompt,
  result,
  changedFiles,
  validation,
  outcome,
  raw,
  errorMessage = null,
}) {
  await ensureAutonomyAssets();
  const artifactPath = buildExecutionArtifactFilePath(loopCount, team.id, providerId);
  const relativeArtifactPath = path.relative(process.cwd(), artifactPath).replace(/\\/g, "/");
  await writeFile(
    artifactPath,
    JSON.stringify(
      {
        generatedAt: nowIso(),
        loopCount,
        providerId,
        providerLabel,
        teamId: team.id,
        teamName: team.name,
        lane: team.lane,
        outcome,
        prompt,
        result,
        changedFiles,
        validation,
        raw,
        errorMessage,
      },
      null,
      2,
    ),
  );
  return relativeArtifactPath;
}

function parseGitStatusPaths(stdout) {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .map((filePath) => {
      const renamedPath = filePath.includes(" -> ")
        ? filePath.split(" -> ").pop()
        : filePath;
      return (renamedPath ?? filePath).replace(/\\/g, "/");
    });
}

async function listDirtyOwnedPaths(ownedPaths) {
  if (!ownedPaths.length) {
    return [];
  }

  try {
    const { stdout } = await execFile(
      "git",
      ["status", "--porcelain", "--", ...ownedPaths],
      {
        cwd: process.cwd(),
        windowsHide: true,
        timeout: 20000,
      },
    );

    return parseGitStatusPaths(stdout);
  } catch {
    return [];
  }
}

async function listStagedPaths() {
  try {
    const { stdout } = await execFile(
      "git",
      ["diff", "--cached", "--name-only"],
      {
        cwd: process.cwd(),
        windowsHide: true,
        timeout: 20000,
      },
    );

    return stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((filePath) => filePath.replace(/\\/g, "/"));
  } catch {
    return [];
  }
}

function getUniquePaths(paths) {
  return [...new Set(paths.map((entry) => entry.replace(/\\/g, "/")))];
}

async function restoreStagedPaths(paths) {
  if (!paths.length) {
    return;
  }

  try {
    await execFile(
      "git",
      ["restore", "--staged", "--", ...paths],
      {
        cwd: process.cwd(),
        windowsHide: true,
        timeout: 20000,
      },
    );
  } catch {
    // Keep the working tree intact even if unstage fails.
  }
}

async function autoLandExecutionChanges(executionRecords, loopCount) {
  const changedRecords = executionRecords.filter(
    (entry) => entry.outcome === "changed" && entry.changedFiles.length > 0,
  );
  const changedPaths = getUniquePaths(changedRecords.flatMap((entry) => entry.changedFiles));

  if (!changedPaths.length) {
    return {
      committed: false,
      commitSha: null,
      files: [],
      reason: "No changed files to land.",
    };
  }

  const preexistingStagedPaths = await listStagedPaths();
  if (preexistingStagedPaths.length) {
    return {
      committed: false,
      commitSha: null,
      files: changedPaths,
      reason: `Skipped auto-land because staged changes already exist: ${preexistingStagedPaths.join(", ")}`,
    };
  }

  const dirtyPaths = await listDirtyOwnedPaths(changedPaths);
  if (!dirtyPaths.length) {
    return {
      committed: false,
      commitSha: null,
      files: changedPaths,
      reason: "Changed files were already clean before auto-land.",
    };
  }

  const touchedTeams = [...new Set(changedRecords.map((entry) => entry.teamId))];
  const message = `Autonomy batch ${String(loopCount)}: ${touchedTeams.join(", ")}`;

  try {
    await execFile(
      "git",
      ["add", "--", ...changedPaths],
      {
        cwd: process.cwd(),
        windowsHide: true,
        timeout: 20000,
      },
    );

    const stagedPaths = await listStagedPaths();
    const unexpectedPaths = stagedPaths.filter((entry) => !changedPaths.includes(entry));
    if (unexpectedPaths.length) {
      await restoreStagedPaths(changedPaths);
      return {
        committed: false,
        commitSha: null,
        files: changedPaths,
        reason: `Skipped auto-land because unrelated staged paths were detected: ${unexpectedPaths.join(", ")}`,
      };
    }

    await execFile(
      "git",
      ["commit", "-m", message],
      {
        cwd: process.cwd(),
        windowsHide: true,
        timeout: 120000,
        maxBuffer: 4 * 1024 * 1024,
      },
    );

    const { stdout: shaStdout } = await execFile(
      "git",
      ["rev-parse", "--short", "HEAD"],
      {
        cwd: process.cwd(),
        windowsHide: true,
        timeout: 20000,
      },
    );

    return {
      committed: true,
      commitSha: shaStdout.trim() || null,
      files: changedPaths,
      reason: message,
    };
  } catch (error) {
    await restoreStagedPaths(changedPaths);
    const messageText = error instanceof Error ? error.message : String(error);
    return {
      committed: false,
      commitSha: null,
      files: changedPaths,
      reason: `Auto-land failed: ${trimTerminalBlock(messageText, 240)}`,
    };
  }
}

function trimTerminalBlock(value, maxLength = 700) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}...` : trimmed;
}

async function runValidationCommand(command) {
  try {
    const { stdout, stderr } = await execFile("cmd.exe", ["/c", command], {
      cwd: process.cwd(),
      windowsHide: true,
      timeout: 300000,
      maxBuffer: 4 * 1024 * 1024,
    });

    return {
      label: command,
      status: "passed",
      detail: trimTerminalBlock(stdout || stderr || "Passed."),
    };
  } catch (error) {
    const stdout = error?.stdout ?? "";
    const stderr = error?.stderr ?? "";
    const message = error instanceof Error ? error.message : String(error);

    return {
      label: command,
      status: "failed",
      detail: trimTerminalBlock(stderr || stdout || message || "Validation failed."),
    };
  }
}

function buildExecutionPrompt(team, taskPacket, operatorDirective, workItem) {
  const guidance = getLaneGuidance(team.id);
  const ownedPaths =
    guidance.ownedPaths.length > 0 ? guidance.ownedPaths.map((entry) => `- ${entry}`).join("\n") : "- none";
  const validationCommands =
    guidance.validationCommands.length > 0
      ? guidance.validationCommands.map((entry) => `- ${entry}`).join("\n")
      : "- no additional validation commands";
  const directiveText =
    operatorDirective && typeof operatorDirective.body === "string" && operatorDirective.body.trim()
      ? operatorDirective.body
      : "No extra operator directive.";

  return [
    "You are the bounded execution worker for the ResearchOS internal agent ops loop.",
    "Respect AGENTS.md, docs/00-product-vision.md, docs/02-architecture.md, docs/12-continuous-improvement-loop.md, and docs/13-agent-operations-model.md.",
    "Make exactly one small safe improvement in the owned paths only.",
    "Do not touch architecture, privacy boundaries, shared contracts, auth boundaries, or unrelated files.",
    "If the task would require broader scope, make no edits and return outcome `blocked`.",
    "You are not waiting for a task. The concrete work item below is the task.",
    "Prefer visible clarity improvements, smaller UI friction, denser information hierarchy, or tighter workflow copy over broad redesign.",
    `Team: ${team.name}`,
    `Lane: ${team.lane}`,
    `Lead: ${team.lead}`,
    `Objective: ${team.objective}`,
    `Deliverable: ${team.deliverable}`,
    `Concrete work item: ${workItem.title}`,
    `Concrete objective: ${workItem.objective}`,
    `Implementation instruction: ${workItem.instruction}`,
    "Target files for this slice:",
    workItem.targetFiles.map((entry) => `- ${entry}`).join("\n"),
    `Acceptance: ${workItem.acceptance}`,
    `Planning summary: ${taskPacket.summary}`,
    `Team dispatch: ${taskPacket.teamDispatch}`,
    `Next action requested: ${taskPacket.nextAction}`,
    `Operator directive: ${directiveText}`,
    `Execution focus: ${guidance.executionFocus}`,
    "Owned paths:",
    ownedPaths,
    `Validation target: ${guidance.validation}`,
    `Non-goals: ${guidance.nonGoals}`,
    "After editing, run these validation commands if you made changes:",
    validationCommands,
    "Return only a JSON object with exactly these keys:",
    "- summary: string",
    "- operatorBrief: string",
    "- nextAction: string",
    "- outcome: one of changed, noop, blocked",
    "Do not wrap the JSON in markdown or add any extra prose.",
  ].join("\n");
}

function buildExecutionRecord({
  loopCount,
  team,
  providerId,
  providerLabel,
  result,
  changedFiles,
  validation,
  artifactPath,
  outcome,
  workItem,
  sessionId = null,
}) {
  return {
    id: `exec-${loopCount}-${team.id}`,
    time: nowIso(),
    providerId,
    providerLabel,
    teamId: team.id,
    teamLabel: team.name,
    summary: result.summary,
    operatorBrief: result.operatorBrief,
    changedFiles,
    nextAction: result.nextAction,
    workItemTitle: workItem.title,
    workItemFiles: workItem.targetFiles,
    artifactPath,
    sessionId,
    outcome,
    validation,
  };
}

function isLowQualityExecutionResult(result, workItem) {
  const text = [result.summary, result.operatorBrief, result.nextAction]
    .join(" ")
    .toLowerCase();

  const genericPatterns = [
    "bounded execution worker role assumed",
    "waiting for the concrete task",
    "waiting for the current task",
    "operate within repo instructions",
    "keep scope tight",
    "role assumed",
  ];

  const mentionsWorkItem = [workItem.title, ...workItem.targetFiles]
    .map((entry) => entry.toLowerCase())
    .some((entry) => text.includes(entry));

  return genericPatterns.some((entry) => text.includes(entry)) || !mentionsWorkItem;
}

async function runCodexExecutor(team, taskPacket, loopCount, operatorDirective, workItem) {
  await ensureAutonomyAssets();
  const guidance = getLaneGuidance(team.id);
  const dirtyBefore = await listDirtyOwnedPaths(guidance.ownedPaths);

  if (dirtyBefore.length) {
    const result = {
      summary: `${team.name} skipped execution because owned paths already contain local changes.`,
      operatorBrief: `Execution stayed blocked to avoid overlapping edits in ${team.name}.`,
      nextAction: "Wait for the owned paths to become clean, then rerun the bounded slice.",
      outcome: "blocked",
    };
    const validation = guidance.validationCommands.map((command) => ({
      label: command,
      status: "not-run",
      detail: "Skipped because the owned paths were already dirty.",
    }));
    const artifactPath = await writeExecutionArtifact({
      loopCount,
      providerId: "codex",
      providerLabel: "Codex CLI",
      team,
      prompt: buildExecutionPrompt(team, taskPacket, operatorDirective, workItem),
      result,
      changedFiles: [],
      validation,
      outcome: "blocked",
      raw: { dirtyBefore },
      errorMessage: `Dirty owned paths: ${dirtyBefore.join(", ")}`,
    });

    return buildExecutionRecord({
      loopCount,
      team,
      providerId: "codex",
      providerLabel: "Codex CLI",
      result,
      changedFiles: [],
      validation,
      artifactPath,
      outcome: "blocked",
      workItem,
    });
  }

  const outputPath = path.join(
    researchOsStateDir,
    `codex-autonomy-execution-${sanitizePathSegment(team.id)}-${String(loopCount).padStart(3, "0")}.json`,
  );
  const prompt = buildExecutionPrompt(team, taskPacket, operatorDirective, workItem);
  let rawStdout = "";
  let rawStderr = "";
  let rawOutputFile = "";
  let sessionId = null;

  try {
    const { stdout, stderr, outputFile, value } = await runCodexExecWithPrompt(
      prompt,
      outputPath,
      ["--full-auto"],
      {
        timeout: 600000,
        maxBuffer: 4 * 1024 * 1024,
      },
    );
    rawStdout = stdout;
    rawStderr = stderr;
    rawOutputFile = outputFile;
    sessionId = extractCodexSessionId(stderr);

    const result = value;
    if (isLowQualityExecutionResult(result, workItem)) {
      throw new Error("Codex returned a generic execution packet without acting on the concrete work item.");
    }
    const changedFiles = await listDirtyOwnedPaths(guidance.ownedPaths);
    const validation = changedFiles.length
      ? await Promise.all(guidance.validationCommands.map((command) => runValidationCommand(command)))
      : guidance.validationCommands.map((command) => ({
          label: command,
          status: "not-run",
          detail: "Skipped because no owned files changed.",
        }));
    const outcome =
      validation.some((entry) => entry.status === "failed")
        ? "failed"
        : changedFiles.length
          ? "changed"
          : result.outcome === "blocked"
            ? "blocked"
            : "noop";
    const artifactPath = await writeExecutionArtifact({
      loopCount,
      providerId: "codex",
      providerLabel: "Codex CLI",
      team,
      prompt,
      result,
      changedFiles,
      validation,
      outcome,
      raw: {
        stdout,
        stderr,
        outputFile,
      },
    });

    return buildExecutionRecord({
      loopCount,
      team,
      providerId: "codex",
      providerLabel: "Codex CLI",
      result,
      changedFiles,
      validation,
      artifactPath,
      outcome,
      workItem,
      sessionId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const changedFiles = await listDirtyOwnedPaths(guidance.ownedPaths);
    const validation = changedFiles.length
      ? await Promise.all(guidance.validationCommands.map((command) => runValidationCommand(command)))
      : guidance.validationCommands.map((command) => ({
          label: command,
          status: "not-run",
          detail: "Skipped because execution failed before validation.",
        }));
    const salvaged = changedFiles.length > 0;
    const result = salvaged
      ? {
          summary: `${team.name} changed owned files but did not return a valid execution packet. Review the bounded diff and validation output before continuing.`,
          operatorBrief: `${team.lead} completed a bounded slice in ${changedFiles.join(", ")}, but the execution packet was incomplete. The board kept the file changes and attached validation results for review.`,
          nextAction:
            validation.some((entry) => entry.status === "failed")
              ? "Review the changed files and failed validation output before another lane opens."
              : "Review the changed files, then queue the next bounded slice once the operator is satisfied.",
          outcome: "changed",
        }
      : {
          summary: `${team.name} execution failed before a safe validation packet could be produced.`,
          operatorBrief: `${team.lead} needs the execution failure reviewed before this lane continues.`,
          nextAction: "Inspect the execution artifact and restart the bounded slice after the failure is understood.",
          outcome: "blocked",
        };
    const outcome = salvaged
      ? validation.some((entry) => entry.status === "failed")
        ? "failed"
        : "changed"
      : "failed";
    const artifactPath = await writeExecutionArtifact({
      loopCount,
      providerId: "codex",
      providerLabel: "Codex CLI",
      team,
      prompt,
      result,
      changedFiles,
      validation,
      outcome,
      raw: {
        stdout: error?.stdout ?? rawStdout ?? "",
        stderr: error?.stderr ?? rawStderr ?? "",
        outputFile: rawOutputFile,
      },
      errorMessage: message,
    });

    return buildExecutionRecord({
      loopCount,
      team,
      providerId: "codex",
      providerLabel: "Codex CLI",
      result,
      changedFiles,
      validation,
      artifactPath,
      outcome,
      workItem,
      sessionId: sessionId ?? extractCodexSessionId(error?.stderr ?? rawStderr ?? ""),
    });
  }
}

async function runCodexPlanner(team, loopCount, context, workItem) {
  await ensureAutonomyAssets();
  const outputPath = path.join(
    researchOsStateDir,
    `codex-autonomy-plan-${sanitizePathSegment(team.id)}-${String(loopCount).padStart(3, "0")}.json`,
  );
  const prompt = buildPlannerPrompt(team, context, workItem);

  const { stdout, stderr, outputFile, value } = await runCodexExecWithPrompt(
    prompt,
    outputPath,
    ["--sandbox", "read-only"],
    {
      timeout: 180000,
      maxBuffer: 2 * 1024 * 1024,
    },
  );

  const plan = value;
  if (isLowQualityPlan(plan) || isOffTargetPlan(plan, team, workItem)) {
    throw new Error("Codex returned a generic planning packet without lane-specific guidance.");
  }
  const artifactPath = await writePlannerArtifact({
    loopCount,
    providerId: "codex",
    providerLabel: "Codex CLI",
    team,
    prompt,
    plan,
    status: "planned",
    raw: {
      stdout,
      stderr,
      outputFile,
    },
  });

  return buildTaskPacket({
    loopCount,
    team,
    providerId: "codex",
    providerLabel: "Codex CLI",
    plan,
    workItem,
    artifactPath,
    status: "planned",
  });
}

async function runGeminiPlanner(team, loopCount, context, workItem) {
  const prompt = buildPlannerPrompt(team, context, workItem);
  const { stdout, stderr } = await execFile(
    "cmd.exe",
    [
      "/c",
      "gemini.cmd",
      "-p",
      prompt,
      "--approval-mode",
      "plan",
      "--output-format",
      "text",
    ],
    {
      windowsHide: true,
      timeout: 120000,
      maxBuffer: 2 * 1024 * 1024,
    },
  );

  const plan = extractJsonObject(stdout);
  if (isLowQualityPlan(plan) || isOffTargetPlan(plan, team, workItem)) {
    throw new Error("Gemini returned a generic planning packet without lane-specific guidance.");
  }
  const artifactPath = await writePlannerArtifact({
    loopCount,
    providerId: "gemini",
    providerLabel: "Gemini CLI",
    team,
    prompt,
    plan,
    status: "planned",
    raw: {
      stdout,
      stderr,
    },
  });

  return buildTaskPacket({
    loopCount,
    team,
    providerId: "gemini",
    providerLabel: "Gemini CLI",
    plan,
    workItem,
    artifactPath,
    status: "planned",
  });
}

async function runPlannerWithFallback(team, loopCount, provider, context) {
  const workItem = selectWorkItem(team.id, loopCount, context.operatorDirective);
  const availableProviders = new Set(
    provider.providerHealth.filter((entry) => entry.available).map((entry) => entry.providerId),
  );
  const failures = [];
  const preferredPlannerId = availableProviders.has("codex")
    ? "codex"
    : provider.activeProviderId;
  const plannerOrder = [
    preferredPlannerId,
    "codex",
    "gemini",
    "mock",
  ].filter((entry, index, array) => array.indexOf(entry) === index);

  for (const plannerId of plannerOrder) {
    if (plannerId !== "mock" && !availableProviders.has(plannerId)) {
      continue;
    }

      try {
      if (plannerId === "codex") {
        return await runCodexPlanner(team, loopCount, context, workItem);
      }

      if (plannerId === "gemini") {
        return await runGeminiPlanner(team, loopCount, context, workItem);
      }

      const fallbackPlan = buildFallbackPlan(team, provider.activeProviderLabel, workItem);
      return buildTaskPacket({
        loopCount,
        team,
        providerId: "mock",
        providerLabel: "Mock planner",
        plan: fallbackPlan,
        workItem,
        artifactPath: null,
        status: "fallback",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (plannerId === "mock") {
        break;
      }

      failures.push({
        providerId: plannerId,
        providerLabel: plannerId === "codex" ? "Codex CLI" : "Gemini CLI",
        errorMessage,
      });
    }
  }

  if (failures.length > 0) {
    const fallbackPlan = buildFallbackPlan(team, provider.activeProviderLabel, workItem);
    const primaryFailure = failures[0];
    const artifactPath = await writePlannerArtifact({
      loopCount,
      providerId: primaryFailure.providerId,
      providerLabel: primaryFailure.providerLabel,
      team,
      prompt: buildPlannerPrompt(team, context, workItem),
      plan: fallbackPlan,
      status: "failed",
      raw: { failures },
      errorMessage: primaryFailure.errorMessage,
    });

    return buildTaskPacket({
      loopCount,
      team,
      providerId: primaryFailure.providerId,
      providerLabel: primaryFailure.providerLabel,
      plan: fallbackPlan,
      workItem,
      artifactPath,
      status: "failed",
    });
  }

  const fallbackPlan = buildFallbackPlan(team, provider.activeProviderLabel, workItem);
  return buildTaskPacket({
    loopCount,
    team,
    providerId: "mock",
    providerLabel: "Mock planner",
    plan: fallbackPlan,
    workItem,
    artifactPath: null,
    status: "fallback",
  });
}

function buildQueue(loopCount, activeTeamIds, reportedTeamIds = []) {
  return teamCycle.map((team, index) => ({
    id: `queue-${loopCount}-${team.id}`,
    teamId: team.id,
    owner: team.lead,
    title: `${team.lane} - ${team.name}`,
    status: activeTeamIds.includes(team.id)
      ? "running"
      : reportedTeamIds.includes(team.id) || index < (loopCount % teamCycle.length)
        ? "reported"
        : "queued",
  }));
}

function selectPreferredTeamForCycle(state, loopCount) {
  const directiveText =
    state.currentDirective && typeof state.currentDirective.body === "string"
      ? state.currentDirective.body.toLowerCase()
      : "";

  if (containsKeyword(directiveText, ["홈페이지", "homepage", "landing", "home"])) {
    return teamCycle.find((team) => team.id === "shell-experience") ?? teamCycle[0];
  }

  if (containsKeyword(directiveText, ["profile", "profiles", "프로필"])) {
    return teamCycle.find((team) => team.id === "workflow-systems") ?? teamCycle[0];
  }

  if (containsKeyword(directiveText, ["document", "documents", "문서"])) {
    return teamCycle.find((team) => team.id === "workflow-systems") ?? teamCycle[0];
  }

  if (containsKeyword(directiveText, ["lab", "labs", "연구실", "랩"])) {
    return teamCycle.find((team) => team.id === "workflow-systems") ?? teamCycle[0];
  }

  if (containsKeyword(directiveText, ["reliability", "reliable", "신뢰성", "안정성"])) {
    return teamCycle.find((team) => team.id === "reliability-desk") ?? teamCycle[0];
  }

  if (directiveText.includes("홈페이지") || directiveText.includes("homepage")) {
    return teamCycle.find((team) => team.id === "shell-experience") ?? teamCycle[0];
  }

  if (directiveText.includes("프로필") || directiveText.includes("profile")) {
    return teamCycle.find((team) => team.id === "workflow-systems") ?? teamCycle[0];
  }

  if (directiveText.includes("문서") || directiveText.includes("document")) {
    return teamCycle.find((team) => team.id === "workflow-systems") ?? teamCycle[0];
  }

  if (directiveText.includes("연구실") || directiveText.includes("lab")) {
    return teamCycle.find((team) => team.id === "workflow-systems") ?? teamCycle[0];
  }

  if (directiveText.includes("신뢰성") || directiveText.includes("reliability")) {
    return teamCycle.find((team) => team.id === "reliability-desk") ?? teamCycle[0];
  }

  return teamCycle[(loopCount - 1) % teamCycle.length];
}

function orderTeamsForCycle(state, loopCount) {
  const preferredTeam = selectPreferredTeamForCycle(state, loopCount);
  const rotatedTeams = [
    ...teamCycle.slice((Math.max(loopCount, 1) - 1) % teamCycle.length),
    ...teamCycle.slice(0, (Math.max(loopCount, 1) - 1) % teamCycle.length),
  ];

  return {
    preferredTeam,
    orderedTeams: [preferredTeam, ...rotatedTeams.filter((team) => team.id !== preferredTeam.id)],
  };
}

async function selectTeamsForCycle(state, loopCount, limit) {
  const { preferredTeam, orderedTeams } = orderTeamsForCycle(state, loopCount);
  const selectedTeams = [];
  const blockedTeams = [];

  for (const team of orderedTeams) {
    const dirtyPaths = await listDirtyOwnedPaths(getLaneGuidance(team.id).ownedPaths);

    if (!dirtyPaths.length) {
      selectedTeams.push(team);
      if (selectedTeams.length >= limit) {
        break;
      }
      continue;
    }

    blockedTeams.push({
      teamId: team.id,
      dirtyPaths,
      preferred: team.id === preferredTeam.id,
    });
  }

  if (selectedTeams.length) {
    return {
      preferredTeamId: preferredTeam.id,
      teams: selectedTeams,
      blockedTeams,
    };
  }

  return {
    preferredTeamId: preferredTeam.id,
    teams: [preferredTeam],
    blockedTeams,
  };
}

function buildReport(team, loopCount, taskPacket, executionRecord = null) {
  return {
    id: `report-${loopCount}-${team.id}`,
    time: nowIso(),
    teamId: team.id,
    source: team.lead,
    summary: executionRecord?.operatorBrief ?? taskPacket.summary,
    nextAction: executionRecord?.nextAction ?? taskPacket.nextAction,
  };
}

function buildBatchSummary(executionRecords) {
  if (!executionRecords.length) {
    return "No worker executed during this autonomy cycle.";
  }

  const changed = executionRecords.filter((entry) => entry.outcome === "changed");
  const blocked = executionRecords.filter((entry) => entry.outcome === "blocked" || entry.outcome === "failed");

  if (changed.length) {
    return changed
      .map((entry) =>
        entry.changedFiles.length
          ? `${entry.teamLabel} updated ${entry.changedFiles.join(", ")}`
          : `${entry.teamLabel} completed ${entry.workItemTitle}`,
      )
      .join(" | ");
  }

  if (blocked.length) {
    return blocked
      .map((entry) => `${entry.teamLabel} is blocked: ${entry.nextAction}`)
      .join(" | ");
  }

  return executionRecords.map((entry) => `${entry.teamLabel}: ${entry.summary}`).join(" | ");
}

function buildBatchOperatorBrief(executionRecords) {
  return executionRecords.map((entry) => entry.operatorBrief).join(" ");
}

function buildPlannerContext(state, teamId) {
  const lastReport = [...(state.autonomy?.reports ?? [])].find((entry) => entry.teamId === teamId);
  const lastExecution = [...(state.autonomy?.executionHistory ?? [])].find(
    (entry) => entry.teamId === teamId,
  );

  return {
    operatorDirective: state.currentDirective,
    lastReport,
    lastExecution,
  };
}

function buildExecutionMemberUpdates(team, executionRecord, taskPacket) {
  const updatedAt = new Date().toLocaleTimeString("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  });
  const memberNames = teamMemberRoster[team.id] ?? [team.lead];
  const primaryMember = memberNames[0];
  const secondaryMember = memberNames[1];
  const activeState =
    executionRecord.outcome === "failed"
      ? "reviewing"
      : executionRecord.outcome === "blocked"
        ? "queued"
        : "running";

  const updates = [];

  if (primaryMember) {
    updates.push({
      teamId: team.id,
      memberName: primaryMember,
      state: activeState,
      currentTask:
        executionRecord.outcome === "blocked"
          ? executionRecord.summary
          : taskPacket.teamDispatch,
      lastUpdate: updatedAt,
    });
  }

  if (secondaryMember) {
    updates.push({
      teamId: team.id,
      memberName: secondaryMember,
      state:
        executionRecord.changedFiles.length > 0
          ? "running"
          : executionRecord.outcome === "failed"
            ? "reviewing"
            : "queued",
      currentTask:
        executionRecord.changedFiles.length > 0
          ? `${executionRecord.providerLabel} touched ${executionRecord.changedFiles.join(", ")}`
          : executionRecord.nextAction,
      lastUpdate: updatedAt,
    });
  }

  return updates;
}

async function runExecutionStep(team, loopCount, taskPacket, state, provider) {
  const workItem = selectWorkItem(team.id, loopCount, state.currentDirective);
  if (taskPacket.status === "failed") {
    return {
      id: `exec-${loopCount}-${team.id}`,
      time: nowIso(),
      providerId: taskPacket.providerId,
      providerLabel: taskPacket.providerLabel,
      teamId: team.id,
      teamLabel: team.name,
      summary: `${team.name} stayed in planning mode because the planner failed before it could hand off a usable bounded slice.`,
      operatorBrief: `Execution was skipped for ${team.name} until the planner failure is reviewed.`,
      changedFiles: [],
      nextAction: "Review the failed planner artifact, then rerun the bounded slice.",
      workItemTitle: workItem.title,
      workItemFiles: workItem.targetFiles,
      artifactPath: taskPacket.artifactPath,
      outcome: "blocked",
      validation: getLaneGuidance(team.id).validationCommands.map((command) => ({
        label: command,
        status: "not-run",
        detail: "Skipped because planning failed before execution could start.",
      })),
    };
  }

  const codexHealth = provider.providerHealth.find((entry) => entry.providerId === "codex");
  if (!codexHealth?.available) {
    return {
      id: `exec-${loopCount}-${team.id}`,
      time: nowIso(),
      providerId: "mock",
      providerLabel: "Execution blocked",
      teamId: team.id,
      teamLabel: team.name,
      summary: `${team.name} could not start a bounded write pass because Codex CLI is unavailable.`,
      operatorBrief: "Reconnect Codex CLI before enabling autonomous code changes.",
      changedFiles: [],
      nextAction: "Reconnect Codex CLI and restart the autonomy loop.",
      workItemTitle: workItem.title,
      workItemFiles: workItem.targetFiles,
      artifactPath: null,
      outcome: "blocked",
      validation: getLaneGuidance(team.id).validationCommands.map((command) => ({
        label: command,
        status: "not-run",
        detail: "Skipped because the execution provider was unavailable.",
      })),
    };
  }

  return runCodexExecutor(team, taskPacket, loopCount, state.currentDirective, workItem);
}

async function runAutonomyCycle() {
  const state = await loadState();

  if (!state.autonomy?.enabled) {
    state.autonomy = {
      ...(state.autonomy ?? makeDefaultState().autonomy),
      status: "stopped",
      nextRunAt: futureIso(tickMs),
    };
    await saveState(state);
    return false;
  }

  const lock = await acquireAutonomyLock();
  if (!lock.acquired) {
    console.log(
      `[autonomy] lock held by another worker${lock.payload?.pid ? ` (pid ${lock.payload.pid})` : ""}; skipping cycle.`,
    );
    return true;
  }

  try {
    const loopCount = Number(state.autonomy.loopCount ?? 0) + 1;
    const provider = await detectProviderHealth();
    const parallelLimit = Math.max(1, Math.min(Number(state.autonomy?.parallelLimit ?? 3), teamCycle.length));
    const batchId = buildBatchId(loopCount);
    const teamSelection = await selectTeamsForCycle(state, loopCount, parallelLimit);
    const batchStartedAt = nowIso();

    const batchResults = await Promise.all(
      teamSelection.teams.map(async (team) => {
        const plannerContext = buildPlannerContext(state, team.id);
        const taskPacket = await runPlannerWithFallback(team, loopCount, provider, plannerContext);
        const executionRecord = await runExecutionStep(team, loopCount, taskPacket, state, provider);
        const report = buildReport(team, loopCount, taskPacket, executionRecord);
        const worker = buildWorkerState({
          batchId,
          loopCount,
          team,
          taskPacket,
          executionRecord,
          sessionId: executionRecord.sessionId ?? null,
          startedAt: batchStartedAt,
        });

        return {
          team,
          taskPacket,
          executionRecord,
          report,
          worker,
          interactions: buildWorkerInteractionMessages({
            batchId,
            team,
            taskPacket,
            executionRecord,
            worker,
          }),
        };
      }),
    );

    const primaryResult = batchResults[0];
    const activeTeamIds = batchResults.map((entry) => entry.team.id);
    const taskPackets = batchResults.map((entry) => entry.taskPacket);
    const executionRecords = batchResults.map((entry) => entry.executionRecord);
    const reports = batchResults.map((entry) => entry.report);
    const workers = batchResults.map((entry) => entry.worker);
    const interactionBus = batchResults.flatMap((entry) => entry.interactions);
    const firstLiveExecution = executionRecords.find((entry) => entry.providerId !== "mock");
    const firstLiveTask = taskPackets.find((entry) => entry.providerId !== "mock");
    const activeProviderId = firstLiveExecution?.providerId ?? firstLiveTask?.providerId ?? provider.activeProviderId;
    const activeProviderLabel =
      firstLiveExecution?.providerLabel ?? firstLiveTask?.providerLabel ?? provider.activeProviderLabel;
    const landingResult = await autoLandExecutionChanges(executionRecords, loopCount);
    const batchSummary = landingResult.committed
      ? `${buildBatchSummary(executionRecords)} Commit ${landingResult.commitSha ?? "landed"} created.`
      : buildBatchSummary(executionRecords);
    const batchOperatorBrief = landingResult.committed
      ? `${buildBatchOperatorBrief(executionRecords)} Commit ${landingResult.commitSha ?? "landed"} is ready for review.`
      : buildBatchOperatorBrief(executionRecords);

    state.autonomy = {
      ...(state.autonomy ?? makeDefaultState().autonomy),
      enabled: true,
      status: "running",
      activeProviderId,
      activeProviderLabel,
      parallelLimit,
      currentBatchId: batchId,
      loopCount,
      currentTeamId: primaryResult.team.id,
      currentLane: primaryResult.team.lane,
      lastRunAt: nowIso(),
      nextRunAt: futureIso(tickMs),
      latestSummary: batchSummary,
      operatorBrief: batchOperatorBrief,
      queue: buildQueue(loopCount, activeTeamIds, activeTeamIds),
      reports: [...reports, ...(state.autonomy?.reports ?? [])].slice(0, 12),
      providerHealth: provider.providerHealth,
      currentTask: primaryResult.taskPacket,
      taskHistory: [...taskPackets, ...(state.autonomy?.taskHistory ?? [])].slice(0, 18),
      currentExecution: primaryResult.executionRecord,
      executionHistory: [...executionRecords, ...(state.autonomy?.executionHistory ?? [])].slice(0, 18),
      activeTasks: taskPackets,
      activeExecutions: executionRecords,
      workers,
      workerHistory: [...workers, ...(state.autonomy?.workerHistory ?? [])].slice(0, 24),
      interactionBus: [...interactionBus, ...(state.autonomy?.interactionBus ?? [])].slice(0, 24),
    };

    state.selectedTeamId = primaryResult.team.id;
    state.assistantMode = "briefing";
    if (state.currentDirective?.source !== "terminal bridge") {
      state.currentDirective = {
        source: "autonomy daemon",
        issuedAt: nowIso(),
        status: "active",
        title: `Autonomy batch #${loopCount}`,
        body: taskPackets.map((entry) => `${entry.teamLabel}: ${entry.teamDispatch}`).join(" "),
      };
    }
    for (const { team, taskPacket, executionRecord } of batchResults) {
      upsertTeamUpdate(state, team.id, {
        state:
          executionRecord.outcome === "failed"
            ? "syncing"
            : executionRecord.outcome === "blocked"
              ? "queued"
              : "delivering",
        objective: team.objective,
        currentDeliverable:
          executionRecord.changedFiles.length > 0
            ? `${team.deliverable} Updated files: ${executionRecord.changedFiles.join(", ")}`
            : taskPacket.workItemTitle,
        nextHandoff:
          executionRecord.outcome === "failed"
            ? `Review failed execution before the next lane. ${executionRecord.nextAction}`
            : executionRecord.nextAction,
      });
      replaceMemberUpdates(state, team.id, buildExecutionMemberUpdates(team, executionRecord, taskPacket));

      pushEvent(state, {
        channel: "team",
        teamId: team.id,
        from: "Mission Control",
        to: team.lead,
        subject: "Autonomy lane dispatch",
        body: taskPacket.teamDispatch,
      });
      pushEvent(state, {
        channel: "team",
        teamId: team.id,
        from: team.lead,
        to: executionRecord.providerLabel,
        subject: "Execution slice",
        body: executionRecord.summary,
      });
      pushEvent(state, {
        channel: "review",
        teamId: team.id,
        from: executionRecord.providerLabel,
        to: "Operator Liaison",
        subject: "Autonomy checkpoint",
        body: `${taskPacket.checkpoint} ${executionRecord.changedFiles.length ? `Changed: ${executionRecord.changedFiles.join(", ")}.` : executionRecord.nextAction}`,
      });
    }

    const codexWorkers = workers.filter((worker) => worker.providerId === "codex");
    if (codexWorkers.length) {
      upsertProviderConnection(state, "codex", {
        status: "connected",
        teamId: primaryResult.team.id,
        note: `${codexWorkers.length} Codex workers are active across ${[...new Set(codexWorkers.map((worker) => worker.teamLabel))].join(", ")}.`,
      });
      state.terminalConnected = true;
    }

    pushEvent(state, {
      channel: "assistant",
      teamId: "executive-desk",
      from: "Operator Liaison",
      to: "You",
      subject: "Autonomy swarm update",
      body: batchOperatorBrief,
    });

    if (landingResult.committed) {
      pushEvent(state, {
        channel: "review",
        teamId: primaryResult.team.id,
        from: "Release Guard",
        to: "You",
        subject: "Autonomy landed commit",
        body: `Commit ${landingResult.commitSha ?? "created"} landed for ${landingResult.files.join(", ")}.`,
      });
    }

    const reroutedPreferred = teamSelection.blockedTeams.find((entry) => entry.preferred);
    if (reroutedPreferred && !activeTeamIds.includes(teamSelection.preferredTeamId)) {
      const reroutedFrom = teamCycle.find((entry) => entry.id === teamSelection.preferredTeamId);
      const activeTeamNames = batchResults.map((entry) => entry.team.name).join(", ");
      pushEvent(state, {
        channel: "assistant",
        teamId: primaryResult.team.id,
        from: "Mission Control",
        to: "Operator Liaison",
        subject: "Autonomy reroute",
        body: `${reroutedFrom?.name ?? "Preferred lane"} was skipped because its owned paths were already dirty. ${activeTeamNames} took the current clean worker slots instead.`,
      });
    }

    await saveState(state);
    console.log(
      `[autonomy] cycle ${loopCount} -> ${workers.map((worker) => `${worker.teamLabel} (${worker.providerLabel})=${worker.status}`).join(" | ")}`,
    );
    return true;
  } finally {
    await releaseAutonomyLock(lock.token);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const runOnce = args.includes("--once");

  if (runOnce) {
    await runAutonomyCycle();
    return;
  }

  console.log(`[autonomy] watching ${stateFile}`);
  console.log(`[autonomy] tick ${tickMs}ms`);

  while (true) {
    const shouldContinue = await runAutonomyCycle();
    if (!shouldContinue) {
      console.log("[autonomy] autonomy is disabled; exiting.");
      return;
    }

    await sleep(tickMs);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
