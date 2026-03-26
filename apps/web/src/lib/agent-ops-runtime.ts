import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  agentOpsStateRelativePath,
  createDefaultAutonomyRuntime,
  createDefaultOperatorDirective,
  createDefaultAgentOpsRuntimeState,
  getAgentOperationsSnapshot,
  type AgentOperationsSnapshot,
  type AgentOpsRuntimeState,
  type ProviderConnectionCard,
  type TeamUnit,
} from "./agent-operations-snapshot";

async function resolveStateFilePath() {
  let currentDir = process.cwd();

  while (true) {
    const candidate = path.join(currentDir, agentOpsStateRelativePath);

    try {
      await access(candidate);
      return candidate;
    } catch {
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        return candidate;
      }
      currentDir = parentDir;
    }
  }
}

function isLocalizedDefaultDirective(directive: AgentOpsRuntimeState["currentDirective"]) {
  return (
    directive.status === "idle" &&
    (directive.title === "No live terminal directive" ||
      directive.title === "실시간 터미널 지시 없음")
  );
}

const validConversationChannels = new Set<AgentOperationsSnapshot["conversationFeed"][number]["channel"]>([
  "assistant",
  "team",
  "review",
]);
const validDirectiveStatuses = new Set<string>(["idle", "active", "paused", "completed"]);
const validAutonomyStatuses = new Set<string>(["stopped", "running", "paused"]);
const validAutonomyProviderIds = new Set<string>(["codex", "claude", "gemini", "mock"]);
const validAutonomyTaskStatuses = new Set<string>(["planned", "fallback", "failed"]);
const validAutonomyExecutionOutcomes = new Set<string>(["changed", "noop", "blocked", "failed"]);

export class AgentOpsRuntimeStateError extends Error {}

function isDirectiveStatus(
  candidate: unknown,
): candidate is AgentOpsRuntimeState["currentDirective"]["status"] {
  return typeof candidate === "string" && validDirectiveStatuses.has(candidate);
}

function isAutonomyStatus(candidate: unknown): candidate is AgentOpsRuntimeState["autonomy"]["status"] {
  return typeof candidate === "string" && validAutonomyStatuses.has(candidate);
}

function isAutonomyProviderId(
  candidate: unknown,
): candidate is AgentOpsRuntimeState["autonomy"]["activeProviderId"] {
  return typeof candidate === "string" && validAutonomyProviderIds.has(candidate);
}

function isRuntimeMergeEntry(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === "object" && candidate !== null && !Array.isArray(candidate);
}

function getOptionalRuntimeString(
  entry: Record<string, unknown>,
  key: string,
): string | undefined {
  return typeof entry[key] === "string" && entry[key].trim().length > 0
    ? entry[key]
    : undefined;
}

function hasNonEmptyRuntimeString(
  entry: Record<string, unknown>,
  key: string,
): boolean {
  return typeof entry[key] === "string" && entry[key].trim().length > 0;
}

function hasValidConnectedRuntimeEnvelope(candidate: Record<string, unknown>) {
  if (candidate.terminalConnected !== true) {
    return true;
  }

  return (
    hasNonEmptyRuntimeString(candidate, "updatedAt") &&
    isRuntimeMergeEntry(candidate.currentDirective) &&
    hasNonEmptyRuntimeString(candidate.currentDirective, "title") &&
    hasNonEmptyRuntimeString(candidate.currentDirective, "body") &&
    hasNonEmptyRuntimeString(candidate.currentDirective, "issuedAt") &&
    hasNonEmptyRuntimeString(candidate.currentDirective, "source") &&
    isDirectiveStatus(candidate.currentDirective.status)
  );
}

function getRuntimeObjectList<T>(candidate: unknown): T[] {
  return Array.isArray(candidate) ? (candidate.filter(isRuntimeMergeEntry) as unknown as T[]) : [];
}

function sanitizeConversationFeed(
  entries: unknown[],
): AgentOpsRuntimeState["conversationFeed"] {
  return entries.flatMap((entry) => {
    type ConversationChannel = AgentOperationsSnapshot["conversationFeed"][number]["channel"];
    const channel =
      isRuntimeMergeEntry(entry) && typeof entry.channel === "string" ? entry.channel : undefined;
    const typedChannel = validConversationChannels.has(channel as ConversationChannel)
      ? (channel as ConversationChannel)
      : undefined;

    if (
      !isRuntimeMergeEntry(entry) ||
      typeof entry.id !== "string" ||
      !typedChannel ||
      typeof entry.time !== "string" ||
      typeof entry.from !== "string" ||
      typeof entry.to !== "string" ||
      typeof entry.subject !== "string" ||
      typeof entry.body !== "string"
    ) {
      return [];
    }

    return [
      {
        id: entry.id,
        channel: typedChannel,
        time: entry.time,
        from: entry.from,
        to: entry.to,
        subject: entry.subject,
        body: entry.body,
        teamId: typeof entry.teamId === "string" ? entry.teamId : undefined,
      },
    ];
  });
}

function sanitizeCurrentDirective(
  candidate: unknown,
  fallback: AgentOpsRuntimeState["currentDirective"],
): AgentOpsRuntimeState["currentDirective"] {
  if (!isRuntimeMergeEntry(candidate)) {
    return fallback;
  }

  if (
    !hasNonEmptyRuntimeString(candidate, "title") ||
    !hasNonEmptyRuntimeString(candidate, "body") ||
    !hasNonEmptyRuntimeString(candidate, "issuedAt") ||
    !hasNonEmptyRuntimeString(candidate, "source")
  ) {
    return fallback;
  }

  return {
    ...fallback,
    ...candidate,
    status: isDirectiveStatus(candidate.status) ? candidate.status : fallback.status,
  };
}

function sanitizeAutonomyCurrentTask(
  candidate: unknown,
): AgentOpsRuntimeState["autonomy"]["currentTask"] {
  type AutonomyCurrentTask = NonNullable<AgentOpsRuntimeState["autonomy"]["currentTask"]>;

  if (
    !isRuntimeMergeEntry(candidate) ||
    !hasNonEmptyRuntimeString(candidate, "id") ||
    !hasNonEmptyRuntimeString(candidate, "time") ||
    !hasNonEmptyRuntimeString(candidate, "providerId") ||
    !hasNonEmptyRuntimeString(candidate, "providerLabel") ||
    !hasNonEmptyRuntimeString(candidate, "teamId") ||
    !hasNonEmptyRuntimeString(candidate, "teamLabel") ||
    !hasNonEmptyRuntimeString(candidate, "lane") ||
    !hasNonEmptyRuntimeString(candidate, "objective") ||
    !hasNonEmptyRuntimeString(candidate, "summary") ||
    !hasNonEmptyRuntimeString(candidate, "operatorBrief") ||
    !hasNonEmptyRuntimeString(candidate, "nextAction") ||
    !hasNonEmptyRuntimeString(candidate, "teamDispatch") ||
    !hasNonEmptyRuntimeString(candidate, "checkpoint") ||
    !hasNonEmptyRuntimeString(candidate, "workItemTitle") ||
    !Array.isArray(candidate.workItemFiles) ||
    candidate.workItemFiles.some((entry) => typeof entry !== "string") ||
    (candidate.artifactPath !== null && typeof candidate.artifactPath !== "string") ||
    typeof candidate.status !== "string" ||
    !validAutonomyTaskStatuses.has(candidate.status)
  ) {
    return null;
  }

  return {
    id: candidate.id as string,
    time: candidate.time as string,
    providerId: candidate.providerId as AutonomyCurrentTask["providerId"],
    providerLabel: candidate.providerLabel as string,
    teamId: candidate.teamId as string,
    teamLabel: candidate.teamLabel as string,
    lane: candidate.lane as string,
    objective: candidate.objective as string,
    summary: candidate.summary as string,
    operatorBrief: candidate.operatorBrief as string,
    nextAction: candidate.nextAction as string,
    teamDispatch: candidate.teamDispatch as string,
    checkpoint: candidate.checkpoint as string,
    workItemTitle: candidate.workItemTitle as string,
    workItemFiles: [...candidate.workItemFiles],
    artifactPath: candidate.artifactPath,
    status: candidate.status as AutonomyCurrentTask["status"],
  };
}

function sanitizeAutonomyCurrentExecution(
  candidate: unknown,
): AgentOpsRuntimeState["autonomy"]["currentExecution"] {
  type AutonomyCurrentExecution = NonNullable<AgentOpsRuntimeState["autonomy"]["currentExecution"]>;
  type ValidationEntry = AutonomyCurrentExecution["validation"][number];

  if (
    !isRuntimeMergeEntry(candidate) ||
    !hasNonEmptyRuntimeString(candidate, "id") ||
    !hasNonEmptyRuntimeString(candidate, "time") ||
    !hasNonEmptyRuntimeString(candidate, "providerId") ||
    !hasNonEmptyRuntimeString(candidate, "providerLabel") ||
    !hasNonEmptyRuntimeString(candidate, "teamId") ||
    !hasNonEmptyRuntimeString(candidate, "teamLabel") ||
    !hasNonEmptyRuntimeString(candidate, "summary") ||
    !hasNonEmptyRuntimeString(candidate, "operatorBrief") ||
    !Array.isArray(candidate.changedFiles) ||
    candidate.changedFiles.some((entry) => typeof entry !== "string") ||
    !hasNonEmptyRuntimeString(candidate, "nextAction") ||
    !hasNonEmptyRuntimeString(candidate, "workItemTitle") ||
    !Array.isArray(candidate.workItemFiles) ||
    candidate.workItemFiles.some((entry) => typeof entry !== "string") ||
    (candidate.artifactPath !== null && typeof candidate.artifactPath !== "string") ||
    (candidate.sessionId !== undefined &&
      candidate.sessionId !== null &&
      typeof candidate.sessionId !== "string") ||
    typeof candidate.outcome !== "string" ||
    !validAutonomyExecutionOutcomes.has(candidate.outcome) ||
    !Array.isArray(candidate.validation)
  ) {
    return null;
  }

  const validation = candidate.validation.flatMap((entry): ValidationEntry[] => {
    if (
      !isRuntimeMergeEntry(entry) ||
      !hasNonEmptyRuntimeString(entry, "label") ||
      (entry.status !== "passed" && entry.status !== "failed" && entry.status !== "not-run") ||
      !hasNonEmptyRuntimeString(entry, "detail")
    ) {
      return [];
    }

    return [
      {
        label: entry.label as string,
        status: entry.status as ValidationEntry["status"],
        detail: entry.detail as string,
      },
    ];
  });

  return {
    id: candidate.id as string,
    time: candidate.time as string,
    providerId: candidate.providerId as AutonomyCurrentExecution["providerId"],
    providerLabel: candidate.providerLabel as string,
    teamId: candidate.teamId as string,
    teamLabel: candidate.teamLabel as string,
    summary: candidate.summary as string,
    operatorBrief: candidate.operatorBrief as string,
    changedFiles: [...candidate.changedFiles],
    nextAction: candidate.nextAction as string,
    workItemTitle: candidate.workItemTitle as string,
    workItemFiles: [...candidate.workItemFiles],
    artifactPath: candidate.artifactPath,
    sessionId:
      typeof candidate.sessionId === "string" || candidate.sessionId === null
        ? candidate.sessionId
        : undefined,
    outcome: candidate.outcome as AutonomyCurrentExecution["outcome"],
    validation,
  };
}

function sanitizeAutonomyRuntime(
  candidate: unknown,
  fallback: AgentOpsRuntimeState["autonomy"],
): AgentOpsRuntimeState["autonomy"] {
  if (!isRuntimeMergeEntry(candidate)) {
    return fallback;
  }

  return {
    ...fallback,
    enabled: typeof candidate.enabled === "boolean" ? candidate.enabled : fallback.enabled,
    status: isAutonomyStatus(candidate.status) ? candidate.status : fallback.status,
    activeProviderId: isAutonomyProviderId(candidate.activeProviderId)
      ? candidate.activeProviderId
      : fallback.activeProviderId,
    activeProviderLabel: getOptionalRuntimeString(candidate, "activeProviderLabel") ?? fallback.activeProviderLabel,
    parallelLimit:
      typeof candidate.parallelLimit === "number" &&
      Number.isFinite(candidate.parallelLimit) &&
      candidate.parallelLimit > 0
        ? Math.floor(candidate.parallelLimit)
        : fallback.parallelLimit,
    currentBatchId:
      candidate.currentBatchId === null || typeof candidate.currentBatchId === "string"
        ? candidate.currentBatchId
        : fallback.currentBatchId,
    loopCount:
      typeof candidate.loopCount === "number" &&
      Number.isFinite(candidate.loopCount) &&
      candidate.loopCount >= 0
        ? Math.floor(candidate.loopCount)
        : fallback.loopCount,
    currentTeamId: getOptionalRuntimeString(candidate, "currentTeamId") ?? fallback.currentTeamId,
    currentLane: getOptionalRuntimeString(candidate, "currentLane") ?? fallback.currentLane,
    lastRunAt: getOptionalRuntimeString(candidate, "lastRunAt") ?? fallback.lastRunAt,
    nextRunAt: getOptionalRuntimeString(candidate, "nextRunAt") ?? fallback.nextRunAt,
    latestSummary: getOptionalRuntimeString(candidate, "latestSummary") ?? fallback.latestSummary,
    operatorBrief: getOptionalRuntimeString(candidate, "operatorBrief") ?? fallback.operatorBrief,
    queue: getRuntimeObjectList<AgentOpsRuntimeState["autonomy"]["queue"][number]>(candidate.queue),
    reports: getRuntimeObjectList<AgentOpsRuntimeState["autonomy"]["reports"][number]>(candidate.reports),
    providerHealth: getRuntimeObjectList<AgentOpsRuntimeState["autonomy"]["providerHealth"][number]>(
      candidate.providerHealth,
    ),
    currentTask: sanitizeAutonomyCurrentTask(candidate.currentTask),
    taskHistory: getRuntimeObjectList<AgentOpsRuntimeState["autonomy"]["taskHistory"][number]>(
      candidate.taskHistory,
    ),
    currentExecution: sanitizeAutonomyCurrentExecution(candidate.currentExecution),
    executionHistory: getRuntimeObjectList<AgentOpsRuntimeState["autonomy"]["executionHistory"][number]>(
      candidate.executionHistory,
    ),
    activeTasks: getRuntimeObjectList<AgentOpsRuntimeState["autonomy"]["activeTasks"][number]>(
      candidate.activeTasks,
    ),
    activeExecutions: getRuntimeObjectList<AgentOpsRuntimeState["autonomy"]["activeExecutions"][number]>(
      candidate.activeExecutions,
    ),
    workers: getRuntimeObjectList<AgentOpsRuntimeState["autonomy"]["workers"][number]>(candidate.workers),
    workerHistory: getRuntimeObjectList<AgentOpsRuntimeState["autonomy"]["workerHistory"][number]>(
      candidate.workerHistory,
    ),
    interactionBus: getRuntimeObjectList<AgentOpsRuntimeState["autonomy"]["interactionBus"][number]>(
      candidate.interactionBus,
    ),
  };
}

function normalizeRuntimeState(candidate: unknown, locale: string): AgentOpsRuntimeState {
  const fallback = createDefaultAgentOpsRuntimeState(locale);
  const defaultAutonomy = createDefaultAutonomyRuntime(locale, fallback.updatedAt);

  if (!isRuntimeMergeEntry(candidate)) {
    return fallback;
  }

  const value = candidate as Partial<AgentOpsRuntimeState>;

  if (!hasValidConnectedRuntimeEnvelope(candidate)) {
    throw new AgentOpsRuntimeStateError(
      "Incomplete live agent ops runtime state cannot be treated as connected.",
    );
  }

  return {
    version: typeof value.version === "number" ? value.version : fallback.version,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : fallback.updatedAt,
    terminalConnected:
      typeof value.terminalConnected === "boolean"
        ? value.terminalConnected
        : fallback.terminalConnected,
    assistantMode:
      value.assistantMode === "monitoring" ||
      value.assistantMode === "briefing" ||
      value.assistantMode === "pause" ||
      value.assistantMode === "resume"
        ? value.assistantMode
        : fallback.assistantMode,
    selectedTeamId:
      typeof value.selectedTeamId === "string" ? value.selectedTeamId : fallback.selectedTeamId,
    currentDirective: sanitizeCurrentDirective(value.currentDirective, fallback.currentDirective),
    conversationFeed: Array.isArray(value.conversationFeed)
      ? sanitizeConversationFeed(value.conversationFeed)
      : [],
    teamUpdates: getRuntimeObjectList<AgentOpsRuntimeState["teamUpdates"][number]>(value.teamUpdates),
    memberUpdates: getRuntimeObjectList<AgentOpsRuntimeState["memberUpdates"][number]>(value.memberUpdates),
    providerConnections: getRuntimeObjectList<AgentOpsRuntimeState["providerConnections"][number]>(
      value.providerConnections,
    ),
    autonomy: sanitizeAutonomyRuntime(value.autonomy, defaultAutonomy),
  };
}

async function readRuntimeState(locale: string) {
  const stateFilePath = await resolveStateFilePath();

  try {
    const raw = await readFile(stateFilePath, "utf8");
    return normalizeRuntimeState(JSON.parse(raw), locale);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return createDefaultAgentOpsRuntimeState(locale);
    }

    // Invalid runtime JSON should surface as a degraded route read instead of
    // looking like a clean defaulted control-plane state.
    if (error instanceof SyntaxError) {
      throw new AgentOpsRuntimeStateError(`Malformed agent ops runtime state at ${stateFilePath}`, {
        cause: error,
      });
    }

    if (error instanceof AgentOpsRuntimeStateError) {
      throw error;
    }

    return createDefaultAgentOpsRuntimeState(locale);
  }
}

function createDegradedDirective(locale: string, issuedAt: string) {
  if (locale === "ko") {
    return {
      source: "ops-state fallback",
      issuedAt,
      status: "idle" as const,
      title: "제어 평면 상태가 기본값으로 대체됨",
      body: "잘못되었거나 불완전한 제어 평면 상태를 무시하고 안전한 기본값으로 응답했습니다. 유효한 상태 파일이 다시 기록될 때까지 미리보기 런타임은 축소 모드로 유지됩니다.",
    };
  }

  return {
    source: "ops-state fallback",
    issuedAt,
    status: "idle" as const,
    title: "Control-plane state degraded to safe defaults",
    body: "Malformed or incomplete control-plane state was ignored. Preview consumers are running on safe defaults until a valid runtime state is written again.",
  };
}

export function getDegradedAgentOperationsSnapshot(locale: string): AgentOperationsSnapshot {
  const snapshot = getAgentOperationsSnapshot(locale);

  return {
    ...snapshot,
    runtime: {
      ...snapshot.runtime,
      terminalConnected: false,
    },
    currentDirective: createDegradedDirective(locale, snapshot.runtime.lastSync),
    autonomy: {
      ...snapshot.autonomy,
      enabled: false,
      status: "stopped",
      latestSummary:
        locale === "ko"
          ? "제어 평면 상태를 읽지 못해 안전한 기본 런타임으로 축소되었습니다."
          : "The control-plane state could not be read, so the preview runtime fell back to safe defaults.",
      operatorBrief:
        locale === "ko"
          ? "상태 파일이 다시 유효해질 때까지 경로는 기본 스냅샷과 축소된 런타임 상태를 반환합니다."
          : "Until the state file is valid again, the route returns the base snapshot with a degraded runtime state.",
    },
  };
}

const validTeamStates = new Set<TeamUnit["state"]>(["delivering", "syncing", "queued", "waiting"]);
const validAgentStates = new Set<TeamUnit["members"][number]["state"]>([
  "running",
  "reviewing",
  "queued",
  "standby",
]);
const validProviderStatuses = new Set<ProviderConnectionCard["status"]>([
  "ready",
  "connected",
  "attention",
]);

function sanitizeRuntimeTeamUpdates(teams: TeamUnit[], runtimeState: AgentOpsRuntimeState) {
  const knownTeamIds = new Set(teams.map((team) => team.id));

  const teamUpdates = runtimeState.teamUpdates.flatMap((entry) => {
    if (!isRuntimeMergeEntry(entry) || typeof entry.teamId !== "string") {
      return [];
    }

    if (!knownTeamIds.has(entry.teamId)) {
      return [];
    }

    return [
      {
        ...entry,
        state: entry.state && validTeamStates.has(entry.state) ? entry.state : undefined,
        objective: getOptionalRuntimeString(entry, "objective"),
        currentDeliverable: getOptionalRuntimeString(entry, "currentDeliverable"),
        nextHandoff: getOptionalRuntimeString(entry, "nextHandoff"),
      },
    ];
  });

  const memberDirectory = new Map(
    teams.map((team) => [team.id, new Set(team.members.map((member) => member.name))]),
  );

  const memberUpdates = Array.from(
    runtimeState.memberUpdates.reduce((updates, entry) => {
      if (
        !isRuntimeMergeEntry(entry) ||
        typeof entry.teamId !== "string" ||
        typeof entry.memberName !== "string"
      ) {
        return updates;
      }

      const teamMembers = memberDirectory.get(entry.teamId);

      if (!teamMembers?.has(entry.memberName)) {
        return updates;
      }

      const updateKey = `${entry.teamId}:${entry.memberName}`;
      const previous = updates.get(updateKey);

      updates.set(updateKey, {
        ...entry,
        ...previous,
        state:
          entry.state && validAgentStates.has(entry.state)
            ? entry.state
            : previous?.state,
        currentTask: getOptionalRuntimeString(entry, "currentTask") ?? previous?.currentTask,
        lastUpdate: getOptionalRuntimeString(entry, "lastUpdate") ?? previous?.lastUpdate,
      });

      return updates;
    }, new Map<string, {
      teamId: string;
      memberName: string;
      state?: TeamUnit["members"][number]["state"];
      currentTask?: string;
      lastUpdate?: string;
    }>()).values(),
  );

  return {
    teamUpdates,
    memberUpdates,
  };
}

function mergeTeamUpdates(teams: TeamUnit[], runtimeState: AgentOpsRuntimeState) {
  const sanitizedUpdates = sanitizeRuntimeTeamUpdates(teams, runtimeState);
  const updates = new Map(sanitizedUpdates.teamUpdates.map((entry) => [entry.teamId, entry]));
  const memberUpdates = sanitizedUpdates.memberUpdates;

  return teams.map((team) => {
    const update = updates.get(team.id);
    const runtimeMembers = memberUpdates.filter((entry) => entry.teamId === team.id);
    const mergedMembers = runtimeMembers.length
      ? team.members.map((member) => {
          const runtimeMember = runtimeMembers.find((entry) => entry.memberName === member.name);

          if (!runtimeMember) {
            return member;
          }

          return {
            ...member,
            state: runtimeMember.state ?? member.state,
            currentTask: runtimeMember.currentTask ?? member.currentTask,
            lastUpdate: runtimeMember.lastUpdate ?? member.lastUpdate,
          };
        })
      : team.members;

    if (!update) {
      return {
        ...team,
        members: mergedMembers,
      };
    }

    return {
      ...team,
      state: update.state ?? team.state,
      objective: update.objective ?? team.objective,
      currentDeliverable: update.currentDeliverable ?? team.currentDeliverable,
      nextHandoff: update.nextHandoff ?? team.nextHandoff,
      members: mergedMembers,
    };
  });
}

function resolveSelectedTeamId(teams: TeamUnit[], selectedTeamId: string, fallbackTeamId: string) {
  const teamIds = new Set(teams.map((team) => team.id));

  if (teamIds.has(selectedTeamId)) {
    return selectedTeamId;
  }

  return teamIds.has(fallbackTeamId) ? fallbackTeamId : teams[0]?.id ?? fallbackTeamId;
}

function mergeProviderConnections(
  baseConnections: ProviderConnectionCard[],
  teams: TeamUnit[],
  runtimeState: AgentOpsRuntimeState,
) {
  const updates = new Map(
    runtimeState.providerConnections
      .filter(
        (entry) =>
          isRuntimeMergeEntry(entry) &&
          (entry.providerId === "codex" ||
            entry.providerId === "claude" ||
            entry.providerId === "gemini"),
      )
      .map((entry) => [entry.providerId, entry]),
  );

  return baseConnections.map((connection) => {
    const update = updates.get(connection.providerId);

    if (!update) {
      return connection;
    }

    const assignedTeam = teams.find((team) => team.id === (update.teamId ?? connection.assignedTeamId));

    return {
      ...connection,
      status:
        typeof update.status === "string" && validProviderStatuses.has(update.status)
          ? update.status
          : connection.status,
      assignedTeamId: assignedTeam?.id ?? connection.assignedTeamId,
      assignedTeamLabel: assignedTeam?.name ?? connection.assignedTeamLabel,
      summary: typeof update.note === "string" && update.note.trim() ? update.note : connection.summary,
      lastHeartbeat:
        typeof update.updatedAt === "string" && update.updatedAt.trim()
          ? update.updatedAt
          : connection.lastHeartbeat,
    };
  });
}

export async function getLiveAgentOperationsSnapshot(
  locale: string,
): Promise<AgentOperationsSnapshot> {
  const base = getAgentOperationsSnapshot(locale);
  const runtimeState = await readRuntimeState(locale);
  const currentDirective = isLocalizedDefaultDirective(runtimeState.currentDirective)
    ? createDefaultOperatorDirective(locale, runtimeState.currentDirective.issuedAt)
    : runtimeState.currentDirective;
  const teams = mergeTeamUpdates(base.teams, runtimeState);
  const selectedTeamId = resolveSelectedTeamId(teams, runtimeState.selectedTeamId, base.selectedTeamId);

  return {
    ...base,
    activeMode: runtimeState.assistantMode,
    selectedTeamId,
    runtime: {
      terminalConnected: runtimeState.terminalConnected,
      lastSync: runtimeState.updatedAt,
      stateFile: agentOpsStateRelativePath,
    },
    autonomy: runtimeState.autonomy,
    currentDirective,
    teams,
    providerConnections: mergeProviderConnections(base.providerConnections, teams, runtimeState),
    conversationFeed: [...runtimeState.conversationFeed, ...base.conversationFeed].slice(0, 16),
  };
}
