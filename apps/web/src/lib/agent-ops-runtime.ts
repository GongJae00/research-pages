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
    providerConnections: Array.isArray(value.providerConnections) ? value.providerConnections : [],
    autonomy:
      value.autonomy && typeof value.autonomy === "object"
        ? {
            ...createDefaultAutonomyRuntime(locale, fallback.updatedAt),
            ...value.autonomy,
            queue: Array.isArray(value.autonomy.queue) ? value.autonomy.queue : [],
            reports: Array.isArray(value.autonomy.reports) ? value.autonomy.reports : [],
            providerHealth: Array.isArray(value.autonomy.providerHealth)
              ? value.autonomy.providerHealth
              : createDefaultAutonomyRuntime(locale, fallback.updatedAt).providerHealth,
            currentTask:
              value.autonomy.currentTask && typeof value.autonomy.currentTask === "object"
                ? value.autonomy.currentTask
                : createDefaultAutonomyRuntime(locale, fallback.updatedAt).currentTask,
            taskHistory: Array.isArray(value.autonomy.taskHistory)
              ? value.autonomy.taskHistory
              : createDefaultAutonomyRuntime(locale, fallback.updatedAt).taskHistory,
          }
        : createDefaultAutonomyRuntime(locale, fallback.updatedAt),
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

function mergeTeamUpdates(teams: TeamUnit[], runtimeState: AgentOpsRuntimeState) {
  const updates = new Map(runtimeState.teamUpdates.map((entry) => [entry.teamId, entry]));

  return teams.map((team) => {
    const update = updates.get(team.id);

    if (!update) {
      return team;
    }

    return {
      ...team,
      state: update.state ?? team.state,
      objective: update.objective ?? team.objective,
      currentDeliverable: update.currentDeliverable ?? team.currentDeliverable,
      nextHandoff: update.nextHandoff ?? team.nextHandoff,
    };
  });
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
          entry &&
          (entry.providerId === "codex" || entry.providerId === "claude" || entry.providerId === "gemini"),
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
      status: update.status ?? connection.status,
      assignedTeamId: assignedTeam?.id ?? connection.assignedTeamId,
      assignedTeamLabel: assignedTeam?.name ?? connection.assignedTeamLabel,
      summary: typeof update.note === "string" && update.note.trim() ? update.note : connection.summary,
      lastHeartbeat: update.updatedAt,
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

  return {
    ...base,
    activeMode: runtimeState.assistantMode,
    selectedTeamId: runtimeState.selectedTeamId,
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
