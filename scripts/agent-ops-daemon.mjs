import { execFile as execFileCallback } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const stateFile = path.join(process.cwd(), ".researchos", "agent-ops-state.json");
const tickMs = Number(process.env.RESEARCH_OS_AUTONOMY_TICK_MS ?? "90000");
const researchOsStateDir = path.join(process.cwd(), ".researchos");
const autonomyArtifactDir = path.join(researchOsStateDir, "autonomy-artifacts");
const autonomyExecutionDir = path.join(researchOsStateDir, "autonomy-executions");
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
      "apps/web/src/components/agent-operations-control-room.tsx",
      "apps/web/src/components/agent-operations-dashboard.module.css",
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
      "apps/web/src/components",
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
      "docs/14-terminal-ops-bridge.md",
      "docs/15-local-autonomy-daemon.md",
    ],
    validation: "Keep operator docs and queue rules aligned with actual control-plane behavior.",
    nonGoals: "Do not rewrite product scope, architecture, or public workflows.",
    validationCommands: [],
    executionFocus:
      "Keep operator docs, queue wording, and internal control-plane guidance aligned with the actual behavior.",
  },
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

function getLaneGuidance(teamId) {
  return laneGuidance[teamId] ?? {
    ownedPaths: [],
    validation: "Stay within one bounded slice.",
    nonGoals: "Do not expand scope.",
    validationCommands: [],
    executionFocus: "Make one safe bounded improvement only.",
  };
}

function buildFallbackPlan(team, providerLabel) {
  return {
    summary: `${team.name} is currently advancing the ${team.lane} with ${providerLabel} keeping the slice bounded.`,
    operatorBrief: `${team.lead} is holding ${team.name}; latest deliverable: ${team.deliverable}`,
    nextAction: `${providerLabel} should stay on ${team.name} until ${team.nextHandoff}`,
    teamDispatch: `${team.name} should keep the ${team.lane} bounded and report the next clean handoff.`,
    checkpoint: `${team.name} should pause at the next clean checkpoint and return one concise report packet.`,
  };
}

function buildPlannerPrompt(team, context = {}) {
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
    operatorDirective,
    lastExecution,
    lastReport,
    "Owned paths:",
    ownedPaths,
    `Validation target: ${guidance.validation}`,
    `Non-goals: ${guidance.nonGoals}`,
    "Return only a JSON object matching the provided schema.",
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
    }
    if (!Array.isArray(state.autonomy.taskHistory)) {
      state.autonomy.taskHistory = [];
    }
    if (!Array.isArray(state.autonomy.executionHistory)) {
      state.autonomy.executionHistory = [];
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
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in Codex output.");
  }

  return JSON.parse(trimmed.slice(start, end + 1));
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

function buildTaskPacket({
  loopCount,
  team,
  providerId,
  providerLabel,
  plan,
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

function buildExecutionPrompt(team, taskPacket, operatorDirective) {
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
    "Prefer visible clarity improvements, smaller UI friction, denser information hierarchy, or tighter workflow copy over broad redesign.",
    `Team: ${team.name}`,
    `Lane: ${team.lane}`,
    `Lead: ${team.lead}`,
    `Objective: ${team.objective}`,
    `Deliverable: ${team.deliverable}`,
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
    "Return only a JSON object matching the provided schema.",
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
    artifactPath,
    outcome,
    validation,
  };
}

async function runCodexExecutor(team, taskPacket, loopCount, operatorDirective) {
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
      prompt: buildExecutionPrompt(team, taskPacket, operatorDirective),
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
    });
  }

  const outputPath = path.join(researchOsStateDir, "codex-autonomy-execution-last.json");
  const prompt = buildExecutionPrompt(team, taskPacket, operatorDirective);

  try {
    const { stdout, stderr } = await execFile(
      "cmd.exe",
      [
        "/c",
        "codex.cmd",
        "exec",
        "-C",
        process.cwd(),
        "--skip-git-repo-check",
        "--full-auto",
        "--output-schema",
        executionSchemaPath,
        "--output-last-message",
        outputPath,
        prompt,
      ],
      {
        windowsHide: true,
        timeout: 600000,
        maxBuffer: 4 * 1024 * 1024,
      },
    );

    const raw = await readFile(outputPath, "utf8");
    const result = extractJsonObject(raw);
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
        outputFile: raw,
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
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const validation = guidance.validationCommands.map((command) => ({
      label: command,
      status: "not-run",
      detail: "Skipped because execution failed before validation.",
    }));
    const result = {
      summary: `${team.name} execution failed before a safe validation packet could be produced.`,
      operatorBrief: `${team.lead} needs the execution failure reviewed before this lane continues.`,
      nextAction: "Inspect the execution artifact and restart the bounded slice after the failure is understood.",
      outcome: "blocked",
    };
    const artifactPath = await writeExecutionArtifact({
      loopCount,
      providerId: "codex",
      providerLabel: "Codex CLI",
      team,
      prompt,
      result,
      changedFiles: [],
      validation,
      outcome: "failed",
      raw: {
        stdout: error?.stdout ?? "",
        stderr: error?.stderr ?? "",
      },
      errorMessage: message,
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
      outcome: "failed",
    });
  }
}

async function runCodexPlanner(team, loopCount, context) {
  await ensureAutonomyAssets();
  const outputPath = path.join(researchOsStateDir, "codex-autonomy-last.json");
  const prompt = buildPlannerPrompt(team, context);

  const { stdout, stderr } = await execFile(
    "cmd.exe",
    [
      "/c",
      "codex.cmd",
      "exec",
      "-C",
      process.cwd(),
      "--skip-git-repo-check",
      "--sandbox",
      "read-only",
      "--output-schema",
      autonomySchemaPath,
      "--output-last-message",
      outputPath,
      prompt,
    ],
    {
      windowsHide: true,
      timeout: 180000,
      maxBuffer: 2 * 1024 * 1024,
    },
  );

  const raw = await readFile(outputPath, "utf8");
  const plan = extractJsonObject(raw);
  if (isLowQualityPlan(plan)) {
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
      outputFile: raw,
    },
  });

  return buildTaskPacket({
    loopCount,
    team,
    providerId: "codex",
    providerLabel: "Codex CLI",
    plan,
    artifactPath,
    status: "planned",
  });
}

async function runGeminiPlanner(team, loopCount, context) {
  const prompt = buildPlannerPrompt(team, context);
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
  if (isLowQualityPlan(plan)) {
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
    artifactPath,
    status: "planned",
  });
}

async function runPlannerWithFallback(team, loopCount, provider, context) {
  const availableProviders = new Set(
    provider.providerHealth.filter((entry) => entry.available).map((entry) => entry.providerId),
  );
  const failures = [];
  const preferredPlannerId = availableProviders.has("gemini")
    ? "gemini"
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
        return await runCodexPlanner(team, loopCount, context);
      }

      if (plannerId === "gemini") {
        return await runGeminiPlanner(team, loopCount, context);
      }

      const fallbackPlan = buildFallbackPlan(team, provider.activeProviderLabel);
      return buildTaskPacket({
        loopCount,
        team,
        providerId: "mock",
        providerLabel: "Mock planner",
        plan: fallbackPlan,
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
    const fallbackPlan = buildFallbackPlan(team, provider.activeProviderLabel);
    const primaryFailure = failures[0];
    const artifactPath = await writePlannerArtifact({
      loopCount,
      providerId: primaryFailure.providerId,
      providerLabel: primaryFailure.providerLabel,
      team,
      prompt: buildPlannerPrompt(team, context),
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
      artifactPath,
      status: "failed",
    });
  }

  const fallbackPlan = buildFallbackPlan(team, provider.activeProviderLabel);
  return buildTaskPacket({
    loopCount,
    team,
    providerId: "mock",
    providerLabel: "Mock planner",
    plan: fallbackPlan,
    artifactPath: null,
    status: "fallback",
  });
}

function buildQueue(loopCount, currentTeamId) {
  return teamCycle.map((team, index) => ({
    id: `queue-${loopCount}-${team.id}`,
    teamId: team.id,
    owner: team.lead,
    title: `${team.lane} - ${team.name}`,
    status: team.id === currentTeamId ? "running" : index < (loopCount % teamCycle.length) ? "reported" : "queued",
  }));
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
      artifactPath: null,
      outcome: "blocked",
      validation: getLaneGuidance(team.id).validationCommands.map((command) => ({
        label: command,
        status: "not-run",
        detail: "Skipped because the execution provider was unavailable.",
      })),
    };
  }

  return runCodexExecutor(team, taskPacket, loopCount, state.currentDirective);
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

  const loopCount = Number(state.autonomy.loopCount ?? 0) + 1;
  const team = teamCycle[(loopCount - 1) % teamCycle.length];
  const provider = await detectProviderHealth();
  const plannerContext = buildPlannerContext(state, team.id);
  const taskPacket = await runPlannerWithFallback(team, loopCount, provider, plannerContext);
  const executionRecord = await runExecutionStep(team, loopCount, taskPacket, state, provider);
  const report = buildReport(team, loopCount, taskPacket, executionRecord);

  state.autonomy = {
    ...(state.autonomy ?? makeDefaultState().autonomy),
    enabled: true,
    status: "running",
    activeProviderId:
      executionRecord.providerId !== "mock" ? executionRecord.providerId : taskPacket.providerId,
    activeProviderLabel:
      executionRecord.providerId !== "mock" ? executionRecord.providerLabel : taskPacket.providerLabel,
    loopCount,
    currentTeamId: team.id,
    currentLane: team.lane,
    lastRunAt: nowIso(),
    nextRunAt: futureIso(tickMs),
    latestSummary: executionRecord.summary,
    operatorBrief: executionRecord.operatorBrief,
    queue: buildQueue(loopCount, team.id),
    reports: [report, ...(state.autonomy?.reports ?? [])].slice(0, 8),
    providerHealth: provider.providerHealth,
    currentTask: taskPacket,
    taskHistory: [taskPacket, ...(state.autonomy?.taskHistory ?? [])].slice(0, 12),
    currentExecution: executionRecord,
    executionHistory: [executionRecord, ...(state.autonomy?.executionHistory ?? [])].slice(0, 12),
  };

  state.selectedTeamId = team.id;
  state.assistantMode = "briefing";
  if (state.currentDirective?.source !== "terminal bridge") {
    state.currentDirective = {
      source: "autonomy daemon",
      issuedAt: nowIso(),
      status: "active",
      title: `Autonomy cycle #${loopCount}`,
      body: taskPacket.teamDispatch,
    };
  }
  upsertTeamUpdate(state, team.id, {
    state: executionRecord.outcome === "failed" ? "syncing" : "delivering",
    objective: team.objective,
    currentDeliverable:
      executionRecord.changedFiles.length > 0
        ? `${team.deliverable} Updated files: ${executionRecord.changedFiles.join(", ")}`
        : team.deliverable,
    nextHandoff:
      executionRecord.outcome === "failed"
        ? `Review failed execution before the next lane. ${executionRecord.nextAction}`
        : team.nextHandoff,
  });
  replaceMemberUpdates(state, team.id, buildExecutionMemberUpdates(team, executionRecord, taskPacket));

  if (executionRecord.providerId !== "mock" && executionRecord.providerId !== "failed") {
    upsertProviderConnection(state, executionRecord.providerId, {
      status: "connected",
      teamId: team.id,
      note:
        executionRecord.changedFiles.length > 0
          ? `${executionRecord.providerLabel} updated ${executionRecord.changedFiles.join(", ")} for ${team.name}.`
          : `${executionRecord.providerLabel} is attached to ${team.name}.`,
    });
    state.terminalConnected = true;
  }

  pushEvent(state, {
    channel: "assistant",
    teamId: "executive-desk",
    from: "Operator Liaison",
    to: "You",
    subject: "Autonomy update",
    body: `${executionRecord.operatorBrief}${executionRecord.artifactPath ? ` Artifact: ${executionRecord.artifactPath}` : ""}`,
  });
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

  await saveState(state);
  console.log(
    `[autonomy] cycle ${loopCount} -> ${team.name} (${taskPacket.providerLabel}) execution=${executionRecord.outcome}`,
  );
  return true;
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
