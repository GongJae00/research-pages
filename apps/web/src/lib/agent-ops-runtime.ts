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
    currentDirective:
      value.currentDirective &&
      typeof value.currentDirective === "object" &&
      typeof value.currentDirective.title === "string" &&
      typeof value.currentDirective.body === "string" &&
      typeof value.currentDirective.issuedAt === "string" &&
      typeof value.currentDirective.source === "string"
        ? {
            ...fallback.currentDirective,
            ...value.currentDirective,
          }
        : fallback.currentDirective,
    conversationFeed: Array.isArray(value.conversationFeed) ? value.conversationFeed : [],
    teamUpdates: Array.isArray(value.teamUpdates) ? value.teamUpdates : [],
    memberUpdates: Array.isArray(value.memberUpdates) ? value.memberUpdates : [],
    providerConnections: Array.isArray(value.providerConnections) ? value.providerConnections : [],
    autonomy:
      value.autonomy && typeof value.autonomy === "object"
        ? {
            ...defaultAutonomy,
            ...value.autonomy,
            queue: Array.isArray(value.autonomy.queue) ? value.autonomy.queue : [],
            reports: Array.isArray(value.autonomy.reports) ? value.autonomy.reports : [],
            providerHealth: Array.isArray(value.autonomy.providerHealth)
              ? value.autonomy.providerHealth
              : defaultAutonomy.providerHealth,
            currentTask:
              value.autonomy.currentTask && typeof value.autonomy.currentTask === "object"
                ? value.autonomy.currentTask
                : defaultAutonomy.currentTask,
            taskHistory: Array.isArray(value.autonomy.taskHistory)
              ? value.autonomy.taskHistory
              : defaultAutonomy.taskHistory,
            currentExecution:
              value.autonomy.currentExecution && typeof value.autonomy.currentExecution === "object"
                ? value.autonomy.currentExecution
                : defaultAutonomy.currentExecution,
            executionHistory: Array.isArray(value.autonomy.executionHistory)
              ? value.autonomy.executionHistory
              : defaultAutonomy.executionHistory,
            activeTasks: Array.isArray(value.autonomy.activeTasks)
              ? value.autonomy.activeTasks
              : defaultAutonomy.activeTasks,
            activeExecutions: Array.isArray(value.autonomy.activeExecutions)
              ? value.autonomy.activeExecutions
              : defaultAutonomy.activeExecutions,
            workers: Array.isArray(value.autonomy.workers)
              ? value.autonomy.workers
              : defaultAutonomy.workers,
            workerHistory: Array.isArray(value.autonomy.workerHistory)
              ? value.autonomy.workerHistory
              : defaultAutonomy.workerHistory,
            interactionBus: Array.isArray(value.autonomy.interactionBus)
              ? value.autonomy.interactionBus
              : defaultAutonomy.interactionBus,
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

function isRuntimeMergeEntry(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === "object" && candidate !== null;
}

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
