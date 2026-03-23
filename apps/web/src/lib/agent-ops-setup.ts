import type {
  AgentOperationsSnapshot,
  AgentProviderId,
  ProviderConnectionCard,
  TeamUnit,
} from "./agent-operations-snapshot";

export interface AgentOpsSetupManifest {
  locale: string;
  providerId: AgentProviderId;
  providerLabel: string;
  cliName: string;
  teamId: string;
  teamLabel: string;
  title: string;
  summary: string;
  prerequisites: string[];
  workingAgreement: string[];
  successSignals: string[];
  commands: {
    connect: string;
    assign: string;
    note: string;
    pause: string;
  };
}

function isKoreanLocale(locale: string) {
  return locale === "ko";
}

function fallbackProvider(providerId: AgentProviderId): ProviderConnectionCard {
  switch (providerId) {
    case "codex":
      return {
        providerId,
        label: "Codex",
        cliName: "Codex app / CLI",
        status: "ready",
        assignedTeamId: "executive-desk",
        assignedTeamLabel: "Executive Desk",
        summary: "Primary terminal bridge for the executive assistant and operating queue.",
        command:
          'corepack pnpm ops -- connect codex executive-desk "Codex is supervising the queue."',
        lastHeartbeat: "Awaiting local connection",
      };
    case "claude":
      return {
        providerId,
        label: "Claude",
        cliName: "Claude Code",
        status: "ready",
        assignedTeamId: "workflow-systems",
        assignedTeamLabel: "Workflow Systems Team",
        summary: "Secondary agent slot for documentation, workflow exploration, and longer briefings.",
        command:
          'corepack pnpm ops -- connect claude workflow-systems "Claude is attached to workflow systems."',
        lastHeartbeat: "Awaiting local connection",
      };
    case "gemini":
      return {
        providerId,
        label: "Gemini",
        cliName: "Gemini CLI",
        status: "ready",
        assignedTeamId: "shell-experience",
        assignedTeamLabel: "Shell and Experience Team",
        summary: "External CLI slot for surface QA, design review, and fast shell observations.",
        command:
          'corepack pnpm ops -- connect gemini shell-experience "Gemini is reviewing shell surfaces."',
        lastHeartbeat: "Awaiting local connection",
      };
  }
}

function fallbackTeam(teamId: string): TeamUnit {
  return {
    id: teamId,
    name: teamId,
    lead: "Operator Liaison",
    leadRole: "Lead",
    state: "queued",
    lane: "Workflow polish",
    objective: teamId,
    currentDeliverable: teamId,
    nextHandoff: teamId,
    dependencies: [],
    members: [],
  };
}

function getProvider(snapshot: AgentOperationsSnapshot, providerId: AgentProviderId) {
  return snapshot.providerConnections.find((entry) => entry.providerId === providerId) ?? fallbackProvider(providerId);
}

function getTeam(snapshot: AgentOperationsSnapshot, teamId: string) {
  return snapshot.teams.find((entry) => entry.id === teamId) ?? fallbackTeam(teamId);
}

export function buildAgentOpsSetupManifest(
  snapshot: AgentOperationsSnapshot,
  locale: string,
  providerId: AgentProviderId,
  teamId: string,
): AgentOpsSetupManifest {
  const provider = getProvider(snapshot, providerId);
  const team = getTeam(snapshot, teamId);

  const connect = `corepack pnpm ops -- connect ${provider.providerId} ${team.id} "${provider.label} is joining ${team.name}."`;
  const assign = `corepack pnpm ops -- assign ${provider.providerId} ${team.id} "${provider.label} is moving to ${team.name}."`;
  const note = `corepack pnpm ops -- note ${team.id} "${provider.label} finished the current checkpoint and is ready for the next handoff."`;
  const pause = `corepack pnpm ops -- pause "Pause the queue after ${provider.label} lands the current ${team.name} checkpoint."`;

  if (isKoreanLocale(locale)) {
    return {
      locale,
      providerId,
      providerLabel: provider.label,
      cliName: provider.cliName,
      teamId: team.id,
      teamLabel: team.name,
      title: `${provider.label} -> ${team.name} 연결 브리프`,
      summary:
        `${provider.label} 세션을 ${team.name}에 붙여서 ${team.currentDeliverable} 흐름을 맡기는 설정입니다. 전담 비서는 이 연결을 읽고 queue, handoff, pause/resume 흐름에 반영합니다.`,
      prerequisites: [
        "같은 저장소 루트에서 로컬 터미널을 연 상태여야 합니다.",
        `${provider.cliName} 세션이 이미 로그인 또는 실행 가능한 상태여야 합니다.`,
        "홈페이지 또는 /ops 관제실을 열어둔 상태에서 연결 변화를 확인하는 것이 좋습니다.",
      ],
      workingAgreement: [
        `${team.name}의 현재 범위를 넘는 아키텍처, 개인정보, 공유 계약 변경은 여기서 진행하지 않습니다.`,
        "작업이 끝나거나 막히면 `note`, `pause`, `resume` 명령으로 비서에게 상태를 남깁니다.",
        "팀 리드와 충돌하지 않도록 한 번에 한 레인만 명확히 배정합니다.",
      ],
      successSignals: [
        "홈페이지와 /ops에서 provider 상태가 connected로 보입니다.",
        `${team.name} 카드에 ${provider.label} 배지가 붙습니다.`,
        "현재 directive 또는 communication feed에 새 연결 이벤트가 기록됩니다.",
      ],
      commands: {
        connect,
        assign,
        note,
        pause,
      },
    };
  }

  return {
    locale,
    providerId,
    providerLabel: provider.label,
    cliName: provider.cliName,
    teamId: team.id,
    teamLabel: team.name,
    title: `${provider.label} -> ${team.name} setup brief`,
    summary:
      `Attach the ${provider.label} session to ${team.name} so it can help with the current "${team.currentDeliverable}" slice. The dedicated assistant will reflect that connection in queue, handoff, and pause/resume behavior.`,
    prerequisites: [
      "Open a local terminal at the same repository root.",
      `Make sure ${provider.cliName} is already available and authenticated if needed.`,
      "Keep the homepage or /ops board open so you can verify the connection change immediately.",
    ],
    workingAgreement: [
      `Do not cross the current ${team.name} ownership boundary into architecture, privacy, or shared-contract work.`,
      "Use `note`, `pause`, and `resume` to report state back to the assistant when the slice lands or blocks.",
      "Keep one clear lane assignment at a time so the team does not widen scope invisibly.",
    ],
    successSignals: [
      "The homepage and /ops board show the provider as connected.",
      `${team.name} shows a ${provider.label} badge in the allocation view.`,
      "A fresh connection event appears in the directive or communication feed.",
    ],
    commands: {
      connect,
      assign,
      note,
      pause,
    },
  };
}

export function renderAgentOpsSetupManifest(manifest: AgentOpsSetupManifest) {
  const sections = [
    `# ${manifest.title}`,
    "",
    manifest.summary,
    "",
    "## Prerequisites",
    ...manifest.prerequisites.map((item) => `- ${item}`),
    "",
    "## Commands",
    `- connect: ${manifest.commands.connect}`,
    `- assign: ${manifest.commands.assign}`,
    `- note: ${manifest.commands.note}`,
    `- pause: ${manifest.commands.pause}`,
    "",
    "## Working Agreement",
    ...manifest.workingAgreement.map((item) => `- ${item}`),
    "",
    "## Success Signals",
    ...manifest.successSignals.map((item) => `- ${item}`),
    "",
  ];

  return sections.join("\n");
}
