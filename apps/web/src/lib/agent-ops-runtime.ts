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

function isDirectiveStatus(
  candidate: unknown,
): candidate is AgentOpsRuntimeState["currentDirective"]["status"] {
  return typeof candidate === "string" && validDirectiveStatuses.has(candidate);
}

function isRuntimeMergeEntry(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === "object" && candidate !== null;
}

function getOptionalRuntimeString(
  entry: Record<string, unknown>,
  key: string,
): string | undefined {
  return typeof entry[key] === "string" ? entry[key] : undefined;
}

function hasNonEmptyRuntimeString(
  entry: Record<string, unknown>,
  key: string,
): boolean {
  return typeof entry[key] === "string" && entry[key].trim().length > 0;
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

function normalizeRuntimeState(candidate: unknown, locale: string): AgentOpsRuntimeState {
  const fallback = createDefaultAgentOpsRuntimeState(locale);
  const defaultAutonomy = createDefaultAutonomyRuntime(locale, fallback.updatedAt);

  if (!candidate || typeof candidate !== "object") {
    return fallback;
  }

  const value = candidate as Partial<AgentOpsRuntimeState>;

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
    autonomy:
      value.autonomy && typeof value.autonomy === "object"
        ? {
            ...defaultAutonomy,
            ...value.autonomy,
            queue: getRuntimeObjectList<AgentOpsRuntimeState["autonomy"]["queue"][number]>(
              value.autonomy.queue,
            ),
            reports: getRuntimeObjectList<AgentOpsRuntimeState["autonomy"]["reports"][number]>(
              value.autonomy.reports,
            ),
            providerHealth: Array.isArray(value.autonomy.providerHealth)
              ? value.autonomy.providerHealth.filter(isRuntimeMergeEntry)
              : defaultAutonomy.providerHealth,
            currentTask:
              value.autonomy.currentTask && typeof value.autonomy.currentTask === "object"
                ? value.autonomy.currentTask
                : defaultAutonomy.currentTask,
            taskHistory: getRuntimeObjectList<AgentOpsRuntimeState["autonomy"]["taskHistory"][number]>(
              value.autonomy.taskHistory,
            ),
            currentExecution:
              value.autonomy.currentExecution && typeof value.autonomy.currentExecution === "object"
                ? value.autonomy.currentExecution
                : defaultAutonomy.currentExecution,
            executionHistory: getRuntimeObjectList<
              AgentOpsRuntimeState["autonomy"]["executionHistory"][number]
            >(value.autonomy.executionHistory),
            activeTasks: getRuntimeObjectList<AgentOpsRuntimeState["autonomy"]["activeTasks"][number]>(
              value.autonomy.activeTasks,
            ),
            activeExecutions: getRuntimeObjectList<
              AgentOpsRuntimeState["autonomy"]["activeExecutions"][number]
            >(value.autonomy.activeExecutions),
            workers: getRuntimeObjectList<AgentOpsRuntimeState["autonomy"]["workers"][number]>(
              value.autonomy.workers,
            ),
            workerHistory: getRuntimeObjectList<
              AgentOpsRuntimeState["autonomy"]["workerHistory"][number]
            >(value.autonomy.workerHistory),
            interactionBus: getRuntimeObjectList<
              AgentOpsRuntimeState["autonomy"]["interactionBus"][number]
            >(value.autonomy.interactionBus),
          }
        : defaultAutonomy,
  };
}

async function readRuntimeState(locale: string) {
  try {
    const stateFilePath = await resolveStateFilePath();
    const raw = await readFile(stateFilePath, "utf8");
    return normalizeRuntimeState(JSON.parse(raw), locale);
  } catch {
    return createDefaultAgentOpsRuntimeState(locale);
  }
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

  const memberUpdates = runtimeState.memberUpdates.flatMap((entry) => {
    if (
      !isRuntimeMergeEntry(entry) ||
      typeof entry.teamId !== "string" ||
      typeof entry.memberName !== "string"
    ) {
      return [];
    }

    const teamMembers = memberDirectory.get(entry.teamId);

    if (!teamMembers?.has(entry.memberName)) {
      return [];
    }

    return [
      {
        ...entry,
        state: entry.state && validAgentStates.has(entry.state) ? entry.state : undefined,
        currentTask: getOptionalRuntimeString(entry, "currentTask"),
        lastUpdate: getOptionalRuntimeString(entry, "lastUpdate"),
      },
    ];
  });

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
