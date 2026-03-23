export type AgentState = "running" | "reviewing" | "queued" | "standby";
export type LaneState = "active" | "next" | "guarded" | "scheduled";
export type Tone = "blue" | "green" | "amber" | "rose";
export type AssistantMode = "monitoring" | "briefing" | "pause" | "resume";
export type TeamState = "delivering" | "syncing" | "queued" | "waiting";
export type DirectiveStatus = "idle" | "active" | "paused" | "completed";
export type ProviderStatus = "ready" | "connected" | "attention";
export type AgentProviderId = "codex" | "claude" | "gemini";

import { formatAgentOpsTimestamp } from "@/lib/agent-ops-time";

export interface AgentMetric {
  label: string;
  value: string;
  note: string;
  tone: Tone;
}

export interface PipelineStep {
  title: string;
  body: string;
}

export interface AgentMember {
  name: string;
  role: string;
  state: AgentState;
  lane: string;
  focus: string;
  nextCheckpoint: string;
  ownedPaths: string[];
  collaborators: string[];
}

export interface HandoffEvent {
  time: string;
  from: string;
  to: string;
  summary: string;
  status: "active" | "in review" | "armed" | "completed";
}

export interface LaneCard {
  name: string;
  state: LaneState;
  owner: string;
  scope: string;
  guardrail: string;
  nextWindow: string;
}

export interface PolicyStep {
  title: string;
  body: string;
}

export interface ScheduleCard {
  title: string;
  cadence: string;
  body: string;
}

export interface ProviderConnectionCard {
  providerId: AgentProviderId;
  label: string;
  cliName: string;
  status: ProviderStatus;
  assignedTeamId: string;
  assignedTeamLabel: string;
  summary: string;
  command: string;
  lastHeartbeat: string;
}

export interface AssistantModeCard {
  id: AssistantMode;
  label: string;
  title: string;
  summary: string;
  operatorView: string;
  teamInstruction: string;
  resumeRule: string;
}

export interface AssistantBriefing {
  name: string;
  role: string;
  status: string;
  promise: string;
  currentFocus: string;
  responsePacket: string;
  guarantees: string[];
  suggestedPrompts: string[];
  modes: AssistantModeCard[];
}

export interface TeamStaffMember {
  name: string;
  title: string;
  state: AgentState;
  currentTask: string;
  ownedPaths: string[];
  lastUpdate: string;
}

export interface TeamUnit {
  id: string;
  name: string;
  lead: string;
  leadRole: string;
  state: TeamState;
  lane: string;
  objective: string;
  currentDeliverable: string;
  nextHandoff: string;
  dependencies: string[];
  members: TeamStaffMember[];
}

export interface ConversationEvent {
  id: string;
  teamId?: string;
  channel: "assistant" | "team" | "review";
  time: string;
  from: string;
  to: string;
  subject: string;
  body: string;
}

export interface AutonomyProviderHealth {
  providerId: AgentProviderId | "mock";
  label: string;
  available: boolean;
  note: string;
}

export interface AutonomyQueueItem {
  id: string;
  teamId: string;
  owner: string;
  title: string;
  status: "queued" | "running" | "reported";
}

export interface AutonomyReportItem {
  id: string;
  time: string;
  teamId: string;
  source: string;
  summary: string;
  nextAction: string;
}

export interface AutonomyTaskPacket {
  id: string;
  time: string;
  providerId: AgentProviderId | "mock";
  providerLabel: string;
  teamId: string;
  teamLabel: string;
  lane: string;
  objective: string;
  summary: string;
  operatorBrief: string;
  nextAction: string;
  teamDispatch: string;
  checkpoint: string;
  artifactPath: string | null;
  status: "planned" | "fallback" | "failed";
}

export interface AutonomyExecutionValidation {
  label: string;
  status: "passed" | "failed" | "not-run";
  detail: string;
}

export interface AutonomyExecutionRecord {
  id: string;
  time: string;
  providerId: AgentProviderId | "mock";
  providerLabel: string;
  teamId: string;
  teamLabel: string;
  summary: string;
  operatorBrief: string;
  changedFiles: string[];
  nextAction: string;
  artifactPath: string | null;
  outcome: "changed" | "noop" | "blocked" | "failed";
  validation: AutonomyExecutionValidation[];
}

export interface AutonomyRuntimeStatus {
  enabled: boolean;
  status: "stopped" | "running" | "paused";
  activeProviderId: AgentProviderId | "mock";
  activeProviderLabel: string;
  loopCount: number;
  currentTeamId: string;
  currentLane: string;
  lastRunAt: string;
  nextRunAt: string;
  latestSummary: string;
  operatorBrief: string;
  queue: AutonomyQueueItem[];
  reports: AutonomyReportItem[];
  providerHealth: AutonomyProviderHealth[];
  currentTask: AutonomyTaskPacket | null;
  taskHistory: AutonomyTaskPacket[];
  currentExecution: AutonomyExecutionRecord | null;
  executionHistory: AutonomyExecutionRecord[];
}

export interface RuntimeBridgeStatus {
  terminalConnected: boolean;
  lastSync: string;
  stateFile: string;
}

export interface OperatorDirective {
  source: string;
  issuedAt: string;
  status: DirectiveStatus;
  title: string;
  body: string;
}

export interface TeamRuntimeUpdate {
  teamId: string;
  state?: TeamState;
  currentDeliverable?: string;
  nextHandoff?: string;
  objective?: string;
}

export interface TeamMemberRuntimeUpdate {
  teamId: string;
  memberName: string;
  state?: AgentState;
  currentTask?: string;
  lastUpdate?: string;
}

export interface ProviderConnectionRuntime {
  providerId: AgentProviderId;
  status: ProviderStatus;
  teamId?: string;
  note?: string;
  updatedAt: string;
}

export interface AgentOpsRuntimeState {
  version: number;
  updatedAt: string;
  terminalConnected: boolean;
  assistantMode: AssistantMode;
  selectedTeamId: string;
  currentDirective: OperatorDirective;
  conversationFeed: ConversationEvent[];
  teamUpdates: TeamRuntimeUpdate[];
  memberUpdates: TeamMemberRuntimeUpdate[];
  providerConnections: ProviderConnectionRuntime[];
  autonomy: AutonomyRuntimeStatus;
}

export interface AgentOperationsSnapshot {
  generatedAt: string;
  headline: string;
  summary: string;
  autonomyMode: string;
  autonomyRule: string;
  activeMode: AssistantMode;
  selectedTeamId: string;
  runtime: RuntimeBridgeStatus;
  autonomy: AutonomyRuntimeStatus;
  currentDirective: OperatorDirective;
  metrics: AgentMetric[];
  assistant: AssistantBriefing;
  pipeline: PipelineStep[];
  agents: AgentMember[];
  handoffs: HandoffEvent[];
  lanes: LaneCard[];
  teams: TeamUnit[];
  conversationFeed: ConversationEvent[];
  interruptProtocol: PolicyStep[];
  expansionRules: PolicyStep[];
  automationCadence: ScheduleCard[];
  providerConnections: ProviderConnectionCard[];
}

type AgentOperationsStaticCopy = Omit<
  AgentOperationsSnapshot,
  "generatedAt" | "activeMode" | "selectedTeamId" | "runtime" | "autonomy" | "currentDirective"
>;

export const agentOpsStateRelativePath = ".researchos/agent-ops-state.json";

function isKoreanLocale(locale: string) {
  return locale === "ko";
}

function formatSnapshotTime(locale: string) {
  return formatAgentOpsTimestamp(locale, new Date());
}

export function createDefaultOperatorDirective(
  locale: string,
  issuedAt: string,
): OperatorDirective {
  if (isKoreanLocale(locale)) {
    return {
      source: "터미널 브리지",
      issuedAt,
      status: "idle",
      title: "실시간 터미널 지시 없음",
      body: "`node scripts/agent-ops.mjs directive \"...\"`를 실행하면 다음 지시를 관제 보드로 보낼 수 있습니다.",
    };
  }

  return {
    source: "terminal bridge",
    issuedAt,
    status: "idle",
    title: "No live terminal directive",
    body: "Run `node scripts/agent-ops.mjs directive \"...\"` to push your next instruction into the ops board.",
  };
}

export function createDefaultAutonomyRuntime(locale = "en", updatedAt = new Date().toISOString()): AutonomyRuntimeStatus {
  if (isKoreanLocale(locale)) {
    return {
      enabled: false,
      status: "stopped",
      activeProviderId: "mock",
      activeProviderLabel: "대기 중",
      loopCount: 0,
      currentTeamId: "executive-desk",
      currentLane: "대기",
      lastRunAt: updatedAt,
      nextRunAt: updatedAt,
      latestSummary: "아직 자율 루프가 시작되지 않았습니다.",
      operatorBrief: "provider가 준비되면 비서가 다음 레인을 선정하고 보고 패킷을 계속 갱신합니다.",
      queue: [],
      reports: [],
      providerHealth: [
      {
        providerId: "mock",
        label: "Mock planner",
        available: true,
        note: "실제 CLI가 없을 때 구조 점검용 자율 루프만 유지합니다.",
      },
    ],
    currentTask: null,
    taskHistory: [],
    currentExecution: null,
    executionHistory: [],
    };
  }

  return {
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
    operatorBrief: "Once a provider is available, the assistant will keep selecting the next lane and refreshing the report packet.",
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
  };
}

export function createDefaultAgentOpsRuntimeState(locale = "en"): AgentOpsRuntimeState {
  const updatedAt = new Date().toISOString();

  return {
    version: 1,
    updatedAt,
    terminalConnected: false,
    assistantMode: "monitoring",
    selectedTeamId: "executive-desk",
    currentDirective: createDefaultOperatorDirective(locale, updatedAt),
    conversationFeed: [],
    teamUpdates: [],
    memberUpdates: [],
    providerConnections: [],
    autonomy: createDefaultAutonomyRuntime(locale, updatedAt),
  };
}

const koreanSnapshotCopy: AgentOperationsStaticCopy = {
  headline: "자율 웹사이트 운영 관제실",
  summary:
    "이 보드는 ResearchOS 안에서 구현 가능한 가장 현실적인 형태의 운영 모델을 보여줍니다. 한 명의 전담 비서, 보이는 팀 계층, 경계가 있는 병렬 에이전트, 추적 가능한 핸드오프, 그리고 인터럽트에 반응하는 pause/resume 흐름을 한곳에 모았습니다.",
  autonomyMode: "가드레일 기반 자율 운영",
  autonomyRule:
    "쉘, 콘텐츠, 워크플로 폴리싱처럼 위험도가 낮은 작업은 각자 소유한 경로 안에서 계속 진행할 수 있습니다. 아키텍처, 개인정보, 공유 계약, 인프라 변경은 여전히 사람 검토에서 멈춥니다.",
  metrics: [
    {
      label: "가시 팀 수",
      value: "04",
      note: "총괄 데스크, 셸, 워크플로, 신뢰성 데스크",
      tone: "blue",
    },
    {
      label: "병렬 쓰기 레인",
      value: "02",
      note: "서로 겹치지 않는 소유 범위만 동시에 수정합니다",
      tone: "green",
    },
    {
      label: "안전한 정지 창",
      value: "12분",
      note: "운영자가 개입하면 새 작업 배정이 즉시 멈춥니다",
      tone: "amber",
    },
    {
      label: "강제 검토 경계",
      value: "03",
      note: "계약, 개인정보, 아키텍처는 자가 승인하지 않습니다",
      tone: "rose",
    },
  ],
  assistant: {
    name: "Operator Liaison",
    role: "전담 총괄 비서",
    status: "보드를 지켜보며 요청이 각 팀으로 들어가기 전에 분기와 정리를 맡고 있습니다.",
    promise:
      "당신이 말을 걸면 새 작업 배정을 즉시 멈추고, 각 활성 팀의 체크포인트를 모은 뒤, 무엇이 바뀌었는지 요약해서 적절한 리드에게 요청을 전달하고 큐를 다시 정렬합니다.",
    currentFocus:
      "대시보드, 홈페이지, 반복 개선 레인을 각각 따로 뒤지지 않아도 현재 운영 상태를 한곳에서 이해할 수 있게 유지합니다.",
    responsePacket:
      "현재 활성 팀, 변경 파일, 막힌 지점, 안전한 재개 지점, 그리고 요청이 끝난 뒤 가장 적절한 다음 레인까지 묶어서 전달합니다.",
    guarantees: [
      "당신은 모든 워커와 따로 대화하지 않고 비서 한 명과만 상호작용합니다.",
      "활성 작성자는 정지 전에 가장 작은 안전 체크포인트까지 마무리합니다.",
      "모든 팀은 리드, 멤버, 산출물, 다음 핸드오프를 보드에 드러냅니다.",
    ],
    suggestedPrompts: [
      "전부 멈추고 지금 상태를 브리핑해줘.",
      "다음 레인은 홈페이지 품질에만 집중해.",
      "지금 public 페이지를 건드리는 팀이 어디인지 보여줘.",
      "이 대화 끝나면 docs는 뒤로 미루고 다시 진행해.",
    ],
    modes: [
      {
        id: "monitoring",
        label: "모니터링",
        title: "일반 모니터링 모드",
        summary: "비서는 보드를 감시하고, 경계 안의 작업을 허용하며, 다음 큐 항목을 준비합니다.",
        operatorView: "실행을 끊지 않고도 현재 roster, 레인 소유권, 최신 핸드오프를 볼 수 있습니다.",
        teamInstruction: "자기 소유 경로 안에서만 계속 일하고, 검토 경계를 넘는 새 작업은 시작하지 않습니다.",
        resumeRule: "실제로 멈춘 적이 없기 때문에 별도 resume 절차는 필요하지 않습니다.",
      },
      {
        id: "briefing",
        label: "브리핑",
        title: "운영자 직접 브리핑",
        summary: "비서가 모든 팀을 즉시 멈추지는 않고, 먼저 간결한 상태 패킷을 정리해 전달합니다.",
        operatorView: "누가 무엇을 하고 있는지, 무엇이 바뀌었는지, 다음 레인을 풀기 위해 어떤 결정이 필요한지 빠르게 받습니다.",
        teamInstruction: "비서가 스냅샷을 모으는 동안 현재 진행 중인 작은 단계만 계속 수행합니다.",
        resumeRule: "운영자의 방향 전환이 없으면 브리핑 전 계획으로 큐가 이어집니다.",
      },
      {
        id: "pause",
        label: "정지 핸드셰이크",
        title: "소프트 정지 핸드셰이크",
        summary: "새 운영자 요청이 들어와서, 비서가 새 작업 배정을 멈추고 각 팀에 안전 체크포인트까지 정리하라고 요청합니다.",
        operatorView: "어떤 팀이 패치, 검증, 핸드오프를 마무리하는 중인지 보면서 전체 집중이 당신에게 넘어오는 과정을 확인합니다.",
        teamInstruction: "새 작업은 시작하지 않고, 현재 패치나 검증 경계까지만 마무리한 뒤 남은 리스크를 보고합니다.",
        resumeRule: "당신의 요청이 끝나고 큐 우선순위를 다시 정한 뒤에만 재개합니다.",
      },
      {
        id: "resume",
        label: "재개 계획",
        title: "재개 및 재배치 모드",
        summary: "대화가 마무리되면 비서가 어느 팀을 먼저 재가동할지, 무엇을 계속 얼려둘지 결정합니다.",
        operatorView: "다음 레인, 재개 순서, 아직 막혀 있는 작업이 무엇인지 한눈에 봅니다.",
        teamInstruction: "선택된 리드만 먼저 작업을 다시 열고, 나머지는 다음 검증된 핸드오프까지 대기합니다.",
        resumeRule: "예전 스레드를 전부 무작정 살리지 않고 레인 우선순위에 따라 재개합니다.",
      },
    ],
  },
  pipeline: [
    {
      title: "관찰",
      body: "현재 웹사이트 상태에서 보이는 UI 결함, 문서 드리프트, 워크플로 마찰을 수집합니다.",
    },
    {
      title: "레인 하나 선택",
      body: "정확히 하나의 개선 레인과, 그것을 안전하게 낼 수 있는 최소 roster만 고릅니다.",
    },
    {
      title: "실행",
      body: "팀은 자기 소유 경로 안에서만 일하고, 비목표와 중단 조건을 명확히 유지합니다.",
    },
    {
      title: "검증",
      body: "다음 레인에 쓰기 권한을 넘기기 전에 lint, 라우트 확인, 핸드오프 검토를 거칩니다.",
    },
    {
      title: "재스케줄",
      body: "스웜이 스스로 범위를 넓히지 않도록, 다음에도 경계가 있는 레인 하나만 큐에 넣습니다.",
    },
  ],
  agents: [
    {
      name: "Mission Control",
      role: "자율 운영 디렉터",
      state: "running",
      lane: "워크플로 폴리싱",
      focus: "홈페이지 개선 루프가 계속 움직이되, 경계를 넘는 범위 확장이 끼어들지 않도록 관리합니다.",
      nextCheckpoint: "현재 라우트 수정과 검증이 끝난 뒤에만 다음 안전 레인을 엽니다.",
      ownedPaths: ["레인 선택", "우선순위 큐", "핸드오프 정책"],
      collaborators: ["Operator Liaison", "Release Guard"],
    },
    {
      name: "Operator Liaison",
      role: "전담 총괄 비서",
      state: "running",
      lane: "인터럽트 대응",
      focus: "당신이 입력하면 새 작업을 멈추고, 체크포인트를 모아 보드 상태를 요약합니다.",
      nextCheckpoint: "대화가 끼어들 경우 활성 팀을 위한 깔끔한 핸드오프 번들을 준비합니다.",
      ownedPaths: ["인터럽트 상태", "상태 패킷", "재개 큐"],
      collaborators: ["Mission Control", "Release Guard"],
    },
    {
      name: "Shell Builder",
      role: "웹 셸 리드",
      state: "reviewing",
      lane: "표면 QA",
      focus: "슈퍼바이저가 진행 상황을 빠르게 읽을 수 있도록 셸과 대시보드 접근성을 유지합니다.",
      nextCheckpoint: "대시보드 고도화 이후에도 셸 내비게이션과 라우트 구조가 흐려지지 않게 정리합니다.",
      ownedPaths: ["header.tsx", "sidebar.tsx"],
      collaborators: ["Mission Control", "Ops Board Builder"],
    },
    {
      name: "Ops Board Builder",
      role: "관제 보드 리드",
      state: "running",
      lane: "워크플로 폴리싱",
      focus: "대시보드가 보이는 팀, 브리핑, 큐 로직을 갖춘 실제 커맨드 룸처럼 느껴지도록 다듬습니다.",
      nextCheckpoint: "계약, 인증, 전역 스타일을 건드리지 않고 라우트 로컬 UI와 데이터를 정리합니다.",
      ownedPaths: ["ops route", "agent operations component", "snapshot store"],
      collaborators: ["Shell Builder", "Release Guard"],
    },
    {
      name: "Docs Drift Agent",
      role: "문서 리드",
      state: "queued",
      lane: "문서 드리프트",
      focus: "자율 운영 모델과 실제 제품 동작이 어긋나지 않도록 문서를 정렬합니다.",
      nextCheckpoint: "반복 자동화와 escalations 규칙을 같은 운영 모델 문서에 연결합니다.",
      ownedPaths: ["docs/**"],
      collaborators: ["Mission Control"],
    },
    {
      name: "Release Guard",
      role: "검증 게이트",
      state: "standby",
      lane: "신뢰성",
      focus: "현재 슬라이스가 lint와 라우트 리뷰를 통과하기 전에는 다음 쓰기 레인을 열지 않습니다.",
      nextCheckpoint: "대시보드 라우트, 내비게이션 접근, 문서 핸드오프를 묶어서 검증합니다.",
      ownedPaths: ["검증 전용"],
      collaborators: ["Mission Control", "Shell Builder", "Ops Board Builder"],
    },
  ],
  handoffs: [
    {
      time: "T-18m",
      from: "Mission Control",
      to: "Docs Drift Agent",
      summary: "통제되지 않는 완전 자율 주행을 약속하지 말고, 현재 저장소 규칙에 기반한 운영 모델 문서를 작성합니다.",
      status: "completed",
    },
    {
      time: "T-13m",
      from: "Mission Control",
      to: "Shell Builder",
      summary: "슈퍼바이저가 데스크톱과 모바일에서 보드에 진입할 수 있도록 기존 셸에서 관제실 경로를 노출합니다.",
      status: "in review",
    },
    {
      time: "T-09m",
      from: "Mission Control",
      to: "Ops Board Builder",
      summary: "단순 redirect를 레인, 핸드오프, pause/resume 동작이 보이는 실제 운영 보드로 교체합니다.",
      status: "active",
    },
    {
      time: "다음",
      from: "Operator Liaison",
      to: "Mission Control",
      summary: "운영자가 개입하면 새 작업 배정을 멈추고 안전 체크포인트를 기다린 뒤, 정리된 상태 패킷을 반환합니다.",
      status: "armed",
    },
  ],
  lanes: [
    {
      name: "표면 QA 레인",
      state: "next",
      owner: "Shell Builder",
      scope: "홈페이지 가독성, 반응형 마찰, 셸 레벨 시각 결함을 다룹니다.",
      guardrail: "UI 정리 안에 계약 변경이나 개인정보 경계 변경을 숨기지 않습니다.",
      nextWindow: "대시보드 검증 이후",
    },
    {
      name: "워크플로 폴리싱 레인",
      state: "active",
      owner: "Ops Board Builder",
      scope: "홈페이지 팀을 매일 더 쉽게 운영하게 만드는 얇은 수직 슬라이스 하나만 진행합니다.",
      guardrail: "라우트 로컬 코드와 mock 운영 데이터 안에 머뭅니다.",
      nextWindow: "지금",
    },
    {
      name: "신뢰성 레인",
      state: "guarded",
      owner: "Release Guard",
      scope: "lint, 라우트 상태, preview 접근, 릴리스 준비도를 점검합니다.",
      guardrail: "현재 작성자가 손을 멈춘 뒤에만 직렬 검증이 시작됩니다.",
      nextWindow: "코드 완료 직후",
    },
    {
      name: "문서 드리프트 레인",
      state: "scheduled",
      owner: "Docs Drift Agent",
      scope: "운영 플레이북이 실제 시스템 실행 방식과 어긋나지 않게 유지합니다.",
      guardrail: "문서는 동작을 명확히 할 수는 있지만, 조용히 아키텍처를 바꾸지는 않습니다.",
      nextWindow: "매일 점검",
    },
  ],
  teams: [
    {
      id: "executive-desk",
      name: "Executive Desk",
      lead: "Operator Liaison",
      leadRole: "전담 총괄 비서",
      state: "delivering",
      lane: "인터럽트 대응",
      objective: "당신의 요청을 경계가 있는 할당으로 번역하고, 전체 보드가 읽히도록 유지합니다.",
      currentDeliverable: "정리된 pause/resume 계약과 슈퍼바이저용 브리핑 패킷",
      nextHandoff: "대화가 끝나면 Mission Control이 운영자 승인 우선순위를 받아 다음 레인을 엽니다.",
      dependencies: ["Mission Control", "Release Guard"],
      members: [
        {
          name: "Operator Liaison",
          title: "총괄 비서",
          state: "running",
          currentTask: "운영자 인터럽트를 감지하고 활성 팀의 안전 체크포인트를 수집합니다.",
          ownedPaths: ["인터럽트 상태", "상태 패킷", "재개 큐"],
          lastUpdate: "2분 전",
        },
        {
          name: "Mission Control",
          title: "자율 운영 디렉터",
          state: "running",
          currentTask: "대시보드와 문서 슬라이스가 정리되는 동안 레인 우선순위를 안정적으로 유지합니다.",
          ownedPaths: ["레인 선택", "우선순위 큐"],
          lastUpdate: "4분 전",
        },
      ],
    },
    {
      id: "shell-experience",
      name: "Shell and Experience Team",
      lead: "Shell Builder",
      leadRole: "웹 셸 리드",
      state: "syncing",
      lane: "표면 QA",
      objective: "셸, 대시보드, 홈페이지가 충분히 읽히도록 만들어 운영자가 제품을 관제실처럼 다룰 수 있게 합니다.",
      currentDeliverable: "내비게이션 노출, 커맨드 룸 레이아웃, 더 촘촘한 홈페이지 관찰성",
      nextHandoff: "다음 셸 레인이 열리기 전에 Release Guard가 라우트 레벨 동작을 검증합니다.",
      dependencies: ["Executive Desk", "Reliability Desk"],
      members: [
        {
          name: "Shell Builder",
          title: "셸 리드",
          state: "reviewing",
          currentTask: "데스크톱과 모바일 워크스페이스 내비게이션에서 관제실 접근을 읽기 쉽게 유지합니다.",
          ownedPaths: ["header.tsx", "sidebar.tsx"],
          lastUpdate: "6분 전",
        },
        {
          name: "Ops Board Builder",
          title: "관제 보드 리드",
          state: "running",
          currentTask: "슈퍼바이저 보드를 팀 계층과 전담 비서 흐름이 보이는 control room으로 고도화합니다.",
          ownedPaths: ["ops route", "agent operations component", "snapshot store"],
          lastUpdate: "1분 전",
        },
      ],
    },
    {
      id: "workflow-systems",
      name: "Workflow Systems Team",
      lead: "Research Flow Lead",
      leadRole: "워크플로 프로그램 리드",
      state: "queued",
      lane: "워크플로 폴리싱",
      objective: "셸과 감독 모델이 충분히 안정된 뒤에만 실제 연구자 워크플로를 개선합니다.",
      currentDeliverable: "다음 지시에 따라 profile, documents, lab publishing 중 하나를 선택할 경계 있는 다음 슬라이스",
      nextHandoff: "Executive Desk가 단일 워크플로 레인을 선택하고 적절한 owner를 깨웁니다.",
      dependencies: ["Executive Desk", "Shell and Experience Team"],
      members: [
        {
          name: "Profile Steward",
          title: "연구자 워크스페이스 에이전트",
          state: "queued",
          currentTask: "셸 검증이 끝난 뒤 열릴 다음 private workflow 레인을 기다립니다.",
          ownedPaths: ["profile", "affiliations", "funding", "timetable"],
          lastUpdate: "대기 중",
        },
        {
          name: "Document Systems",
          title: "문서 워크플로 에이전트",
          state: "queued",
          currentTask: "다음 document bank 또는 evidence linking 슬라이스가 선택될 때까지 대기합니다.",
          ownedPaths: ["documents", "document evidence", "document stores"],
          lastUpdate: "대기 중",
        },
        {
          name: "Lab Publishing Lead",
          title: "랩 협업 에이전트",
          state: "queued",
          currentTask: "새 범위를 추측하지 않고 public lab과 collaboration 우선순위를 기다립니다.",
          ownedPaths: ["lab", "public pages", "activity log"],
          lastUpdate: "대기 중",
        },
      ],
    },
    {
      id: "reliability-desk",
      name: "Reliability Desk",
      lead: "Release Guard",
      leadRole: "검증 리드",
      state: "waiting",
      lane: "신뢰성",
      objective: "관제실이 보기만 좋아지고 lint, 라우트, 운영 규칙은 조용히 깨지는 상황을 막습니다.",
      currentDeliverable: "각 경계 있는 변경 이후의 lint, typecheck, 라우트 검증, 문서 정렬",
      nextHandoff: "Executive Desk가 릴리스 가능 요약 또는 검토 필요 escalation을 받습니다.",
      dependencies: ["Shell and Experience Team", "Workflow Systems Team"],
      members: [
        {
          name: "Release Guard",
          title: "검증 리드",
          state: "standby",
          currentTask: "현재 작성 슬라이스가 끝나면 흔들림 없이 검증을 돌릴 수 있도록 대기합니다.",
          ownedPaths: ["검증 전용"],
          lastUpdate: "대기 중",
        },
        {
          name: "Docs Drift Agent",
          title: "문서 리드",
          state: "queued",
          currentTask: "자율 운영 모델과 레인 규칙을 실제 운영과 계속 동기화합니다.",
          ownedPaths: ["docs/**"],
          lastUpdate: "9분 전",
        },
      ],
    },
  ],
  conversationFeed: [
    {
      id: "evt-1",
      channel: "assistant",
      teamId: "executive-desk",
      time: "T-11m",
      from: "Operator Liaison",
      to: "당신",
      subject: "슈퍼바이저 패킷 준비 완료",
      body: "지금은 어떤 팀이 활성 상태인지, 어떤 파일이 바뀌었는지, 무엇이 막혀 있는지, 당신이 끼어들면 큐가 어디서 재개될지를 한 번에 설명할 수 있습니다.",
    },
    {
      id: "evt-2",
      channel: "team",
      teamId: "shell-experience",
      time: "T-8m",
      from: "Mission Control",
      to: "Shell Builder",
      subject: "관제실 접근 노출",
      body: "auth, locale frame, global styling은 건드리지 말고 셸에서 operations board에 닿을 수 있게 하세요.",
    },
    {
      id: "evt-3",
      channel: "team",
      teamId: "shell-experience",
      time: "T-6m",
      from: "Ops Board Builder",
      to: "Mission Control",
      subject: "커맨드 룸 확장",
      body: "대시보드 슬라이스를 정적 보드에서 전담 비서 기반 control room으로 확장하고 있습니다. 팀 구조와 상호작용 상태가 보입니다.",
    },
    {
      id: "evt-4",
      channel: "review",
      teamId: "reliability-desk",
      time: "T-3m",
      from: "Release Guard",
      to: "Executive Desk",
      subject: "검증 보류",
      body: "현재 쓰기 슬라이스가 안정적으로 끝나야 lint와 typecheck를 깨끗한 트리에서 돌릴 수 있습니다.",
    },
    {
      id: "evt-5",
      channel: "assistant",
      teamId: "workflow-systems",
      time: "다음",
      from: "Operator Liaison",
      to: "Workflow Systems Team",
      subject: "대기 유지",
      body: "운영자나 Mission Control이 다음 경계 있는 워크플로를 선택하기 전까지 profile이나 documents 레인을 스스로 시작하지 않습니다.",
    },
  ],
  interruptProtocol: [
    {
      title: "배정 즉시 정지",
      body: "당신이 메시지를 보내면 비서는 새 작업 배정을 즉시 멈춰, 기다리는 동안 시스템이 더 넓어지지 않게 합니다.",
    },
    {
      title: "안전 체크포인트까지 마무리",
      body: "활성 작성자는 현재 패치, 검증 명령, 핸드오프 메모까지만 정리하고 완전 정지로 들어갑니다.",
    },
    {
      title: "요약 하나로 반환",
      body: "비서는 활성 팀, 변경 파일, 남은 리스크, 가장 깨끗한 재개 지점을 한 번에 보고합니다.",
    },
    {
      title: "레인 기준 재개",
      body: "대화가 끝난 뒤에는 멈춘 스레드를 전부 깨우지 않고, 가장 우선순위가 높은 레인부터 큐를 다시 시작합니다.",
    },
  ],
  expansionRules: [
    {
      title: "소유권 기준으로만 확장",
      body: "새 specialist는 서로 겹치지 않는 파일 트리나 읽기 전용 리뷰 슬라이스를 맡을 때만 합류합니다.",
    },
    {
      title: "즉흥 추가보다 템플릿 우선",
      body: "새 역할은 workflow, non-goals, data mode, stop conditions가 정의되기 전에는 쓰기 작업을 시작하지 않습니다.",
    },
    {
      title: "모든 helper는 보드에서 보여야 함",
      body: "리드, 멤버, 작업, 다음 체크포인트를 보드에 드러낼 수 없다면 팀에 추가하지 않습니다.",
    },
  ],
  automationCadence: [
    {
      title: "시간별 레인 선택기",
      cadence: "매시간",
      body: "운영자 대화가 없을 때 저장소를 다시 열고 큐를 점검한 뒤, 경계가 있는 레인 하나만 실행합니다.",
    },
    {
      title: "QA 스윕",
      cadence: "6시간마다",
      body: "홈페이지와 셸 표면을 검토한 뒤, 하나의 소유 경로 그룹 안에서만 낮은 위험도의 결함을 수정합니다.",
    },
    {
      title: "문서 및 신뢰성 스윕",
      cadence: "매일",
      body: "문서 드리프트, lint 상태, 미해결 escalation을 정리해 루프가 유지 가능하도록 만듭니다.",
    },
    {
      title: "진짜 24시간 러너",
      cadence: "외부 호스트 필요",
      body: "Codex 자동화는 일정에 맞춰 작업을 다시 시작할 수 있지만, 끊김 없는 상시 실행에는 별도 스케줄러나 워커 호스트가 필요합니다.",
    },
  ],
  providerConnections: [
    {
      providerId: "codex",
      label: "Codex",
      cliName: "Codex app / CLI",
      status: "ready",
      assignedTeamId: "executive-desk",
      assignedTeamLabel: "Executive Desk",
      summary: "총괄 비서와 운영 큐를 가장 먼저 연결하는 기본 터미널 브리지입니다.",
      command:
        'corepack pnpm ops -- connect codex executive-desk "Codex is supervising the queue."',
      lastHeartbeat: "로컬 연결 대기",
    },
    {
      providerId: "claude",
      label: "Claude",
      cliName: "Claude Code",
      status: "ready",
      assignedTeamId: "workflow-systems",
      assignedTeamLabel: "Workflow Systems Team",
      summary: "문서 정리, 워크플로 탐색, 긴 브리핑 레인에 붙이기 좋은 보조 에이전트 슬롯입니다.",
      command:
        'corepack pnpm ops -- connect claude workflow-systems "Claude is attached to workflow systems."',
      lastHeartbeat: "로컬 연결 대기",
    },
    {
      providerId: "gemini",
      label: "Gemini",
      cliName: "Gemini CLI",
      status: "ready",
      assignedTeamId: "shell-experience",
      assignedTeamLabel: "Shell and Experience Team",
      summary: "표면 QA, 디자인 리뷰, 빠른 탐색성 점검에 붙이는 외부 CLI 슬롯입니다.",
      command:
        'corepack pnpm ops -- connect gemini shell-experience "Gemini is reviewing shell surfaces."',
      lastHeartbeat: "로컬 연결 대기",
    },
  ],
};

const englishSnapshotCopy: AgentOperationsStaticCopy = {
  headline: "Autonomous Website Operations Center",
  summary:
    "This board models the closest practical version of your target setup inside ResearchOS: one dedicated liaison for you, visible team hierarchy, bounded parallel agents, handoff traceability, and interrupt-aware pause and resume.",
  autonomyMode: "Guarded autonomy",
  autonomyRule:
    "Low-risk shell, content, and workflow polish can continue inside owned paths. Architecture, privacy, shared contracts, and infrastructure changes still stop for human review.",
  metrics: [
    {
      label: "Visible teams",
      value: "04",
      note: "executive desk, shell, workflow, and reliability desks",
      tone: "blue",
    },
    {
      label: "Parallel write lanes",
      value: "02",
      note: "only disjoint ownership groups write at the same time",
      tone: "green",
    },
    {
      label: "Safe pause window",
      value: "12m",
      note: "new work admission freezes when you interrupt the loop",
      tone: "amber",
    },
    {
      label: "Hard review limits",
      value: "03",
      note: "contracts, privacy, and architecture never self-approve",
      tone: "rose",
    },
  ],
  assistant: {
    name: "Operator Liaison",
    role: "Dedicated executive assistant",
    status: "Watching the board and routing requests before they hit the teams.",
    promise:
      "When you speak, I freeze new task admission, gather each active team's checkpoint, summarize what changed, and route your request to the right lead before resuming the queue.",
    currentFocus:
      "Keep the dashboard, homepage, and recurring website-improvement lanes understandable from one place instead of making you inspect every worker thread.",
    responsePacket:
      "Active teams, changed files, current blockers, safe resume point, and the next best lane after your request ends.",
    guarantees: [
      "You talk to one assistant, not to every worker separately.",
      "Active writers finish the smallest safe checkpoint before pausing.",
      "Every team exposes its lead, members, deliverable, and next handoff.",
    ],
    suggestedPrompts: [
      "Pause everything and brief me.",
      "Focus only on homepage quality for the next lane.",
      "Show me which team is touching public pages.",
      "Resume after this chat and keep docs out of the critical path.",
    ],
    modes: [
      {
        id: "monitoring",
        label: "Monitoring",
        title: "Normal monitoring mode",
        summary: "The assistant watches the board, allows bounded work, and prepares the next queue item.",
        operatorView: "You see the current roster, lane ownership, and newest handoffs without interrupting execution.",
        teamInstruction: "Keep working inside owned paths and avoid starting anything that would cross review boundaries.",
        resumeRule: "No special resume is needed because the system never paused.",
      },
      {
        id: "briefing",
        label: "Briefing",
        title: "Briefing you directly",
        summary: "The assistant composes a concise status packet for you without yet freezing every team.",
        operatorView: "You get a summary of who is doing what, what changed, and what decision would unblock the next lane.",
        teamInstruction: "Continue only current bounded steps while the liaison collects status snapshots.",
        resumeRule: "If you give no redirect, the queue continues from the pre-briefing plan.",
      },
      {
        id: "pause",
        label: "Pause handshake",
        title: "Soft pause handshake",
        summary: "A new operator request has arrived, so the liaison stops new task admission and asks teams to land safe checkpoints.",
        operatorView: "You see which teams are still flushing a patch, validation run, or handoff before full attention shifts to you.",
        teamInstruction: "Do not start new work. Finish the current patch or verification boundary and report unresolved risk.",
        resumeRule: "Resume starts only after your request is complete and the queue is re-ranked.",
      },
      {
        id: "resume",
        label: "Resume planning",
        title: "Resume and re-queue mode",
        summary: "Your conversation is closing, so the assistant decides which team should move first and what should stay frozen.",
        operatorView: "You see the next lane, the resumed team order, and any work that remains blocked.",
        teamInstruction: "Only the chosen lead reopens work; the rest wait until the next verified handoff.",
        resumeRule: "Resume by lane priority, never by blindly reactivating every old thread.",
      },
    ],
  },
  pipeline: [
    {
      title: "Observe",
      body: "Collect visible UI defects, docs drift, and workflow friction from the current website state.",
    },
    {
      title: "Pick one lane",
      body: "Choose exactly one primary improvement lane and the smallest roster that can ship it safely.",
    },
    {
      title: "Execute",
      body: "Let teams work only inside owned paths with explicit non-goals and stop conditions.",
    },
    {
      title: "Verify",
      body: "Run lint, route checks, and handoff review before the next lane receives write access.",
    },
    {
      title: "Reschedule",
      body: "Queue the next bounded lane instead of letting the swarm widen its own scope.",
    },
  ],
  agents: [
    {
      name: "Mission Control",
      role: "Autonomy director",
      state: "running",
      lane: "Workflow polish",
      focus: "Keep the homepage improvement loop moving without allowing cross-boundary scope creep.",
      nextCheckpoint: "Open the next safe lane only after the current route and verification work finish.",
      ownedPaths: ["lane selection", "priority queue", "handoff policy"],
      collaborators: ["Operator Liaison", "Release Guard"],
    },
    {
      name: "Operator Liaison",
      role: "Dedicated executive assistant",
      state: "running",
      lane: "Interrupt readiness",
      focus: "Freeze new work when you type, gather checkpoints, and summarize the board for you.",
      nextCheckpoint: "Prepare a clean handoff bundle if the conversation interrupts active teams.",
      ownedPaths: ["interrupt state", "status packet", "resume queue"],
      collaborators: ["Mission Control", "Release Guard"],
    },
    {
      name: "Shell Builder",
      role: "Web-shell lead",
      state: "reviewing",
      lane: "Surface QA",
      focus: "Keep the shell and dashboard discoverable so the supervisor can inspect progress quickly.",
      nextCheckpoint: "Maintain shell navigation and route clarity after dashboard upgrades.",
      ownedPaths: ["header.tsx", "sidebar.tsx"],
      collaborators: ["Mission Control", "Ops Board Builder"],
    },
    {
      name: "Ops Board Builder",
      role: "Dashboard lead",
      state: "running",
      lane: "Workflow polish",
      focus: "Make the dashboard feel like a real command room with visible teams, briefings, and queue logic.",
      nextCheckpoint: "Ship route-local UI and data without touching contracts, auth, or global styling.",
      ownedPaths: ["ops route", "agent operations component", "snapshot store"],
      collaborators: ["Shell Builder", "Release Guard"],
    },
    {
      name: "Docs Drift Agent",
      role: "Documentation lead",
      state: "queued",
      lane: "Docs drift",
      focus: "Keep the autonomy and operating model aligned with what the product actually does.",
      nextCheckpoint: "Link recurring automation and escalation policy to the same model.",
      ownedPaths: ["docs/**"],
      collaborators: ["Mission Control"],
    },
    {
      name: "Release Guard",
      role: "Verification gate",
      state: "standby",
      lane: "Reliability",
      focus: "Block the next write lane until the current slice passes lint and route-level review.",
      nextCheckpoint: "Verify the dashboard route, navigation access, and docs handoff together.",
      ownedPaths: ["verification only"],
      collaborators: ["Mission Control", "Shell Builder", "Ops Board Builder"],
    },
  ],
  handoffs: [
    {
      time: "T-18m",
      from: "Mission Control",
      to: "Docs Drift Agent",
      summary: "Write an autonomy model grounded in the repo rules instead of promising uncontrolled self-driving behavior.",
      status: "completed",
    },
    {
      time: "T-13m",
      from: "Mission Control",
      to: "Shell Builder",
      summary: "Expose the dashboard route in the existing shell so the supervisor can reach the board from desktop and mobile.",
      status: "in review",
    },
    {
      time: "T-09m",
      from: "Mission Control",
      to: "Ops Board Builder",
      summary: "Replace the dashboard redirect with a real operations board covering lanes, handoffs, and pause-resume behavior.",
      status: "active",
    },
    {
      time: "Next",
      from: "Operator Liaison",
      to: "Mission Control",
      summary: "If the operator interrupts, freeze task admission, wait for safe checkpoints, then return a clean status packet.",
      status: "armed",
    },
  ],
  lanes: [
    {
      name: "Surface QA lane",
      state: "next",
      owner: "Shell Builder",
      scope: "Homepage clarity, responsive friction, and shell-level visual defects.",
      guardrail: "No contract or privacy changes can hide inside UI cleanup.",
      nextWindow: "After dashboard verification",
    },
    {
      name: "Workflow polish lane",
      state: "active",
      owner: "Ops Board Builder",
      scope: "One thin vertical slice that makes the homepage team easier to operate every day.",
      guardrail: "Stay inside route-local code and mock operator data.",
      nextWindow: "Now",
    },
    {
      name: "Reliability lane",
      state: "guarded",
      owner: "Release Guard",
      scope: "Lint, route health, preview access, and release-readiness checks.",
      guardrail: "Serialized verification only after current writers stop changing files.",
      nextWindow: "Immediately after code complete",
    },
    {
      name: "Docs drift lane",
      state: "scheduled",
      owner: "Docs Drift Agent",
      scope: "Keep the operator playbooks aligned with how the system actually runs.",
      guardrail: "Docs can clarify behavior, not silently change architecture.",
      nextWindow: "Daily sweep",
    },
  ],
  teams: [
    {
      id: "executive-desk",
      name: "Executive Desk",
      lead: "Operator Liaison",
      leadRole: "Dedicated executive assistant",
      state: "delivering",
      lane: "Interrupt readiness",
      objective: "Translate your requests into bounded assignments and keep the whole board readable.",
      currentDeliverable: "A clean pause-resume contract and supervisor briefing packet.",
      nextHandoff: "Mission Control receives the next operator-approved priority after the chat ends.",
      dependencies: ["Mission Control", "Release Guard"],
      members: [
        {
          name: "Operator Liaison",
          title: "Executive assistant",
          state: "running",
          currentTask: "Watch for operator interrupts and collect safe checkpoints from active teams.",
          ownedPaths: ["interrupt state", "status packet", "resume queue"],
          lastUpdate: "2m ago",
        },
        {
          name: "Mission Control",
          title: "Autonomy director",
          state: "running",
          currentTask: "Keep lane priority stable while the dashboard and docs slices land.",
          ownedPaths: ["lane selection", "priority queue"],
          lastUpdate: "4m ago",
        },
      ],
    },
    {
      id: "shell-experience",
      name: "Shell and Experience Team",
      lead: "Shell Builder",
      leadRole: "Web-shell lead",
      state: "syncing",
      lane: "Surface QA",
      objective: "Make the shell, dashboard, and homepage surfaces legible enough that you can manage the product like a control room.",
      currentDeliverable: "Navigation exposure, command-room layout, and tighter homepage observability.",
      nextHandoff: "Release Guard verifies route-level behavior before the next shell lane starts.",
      dependencies: ["Executive Desk", "Reliability Desk"],
      members: [
        {
          name: "Shell Builder",
          title: "Shell lead",
          state: "reviewing",
          currentTask: "Keep dashboard access visible in desktop and mobile workspace navigation.",
          ownedPaths: ["header.tsx", "sidebar.tsx"],
          lastUpdate: "6m ago",
        },
        {
          name: "Ops Board Builder",
          title: "Dashboard lead",
          state: "running",
          currentTask: "Deepen the supervisor board into a secretary-led control room with team hierarchy.",
          ownedPaths: ["ops route", "agent operations component", "snapshot store"],
          lastUpdate: "1m ago",
        },
      ],
    },
    {
      id: "workflow-systems",
      name: "Workflow Systems Team",
      lead: "Research Flow Lead",
      leadRole: "Workflow program lead",
      state: "queued",
      lane: "Workflow polish",
      objective: "Improve real researcher workflows only after the shell and supervision model are stable enough to manage them.",
      currentDeliverable: "Next bounded slice for profile, documents, or lab publishing based on your next directive.",
      nextHandoff: "Executive Desk selects a single workflow lane and wakes the right owner.",
      dependencies: ["Executive Desk", "Shell and Experience Team"],
      members: [
        {
          name: "Profile Steward",
          title: "Researcher workspace agent",
          state: "queued",
          currentTask: "Waiting for the next private workflow lane after shell verification clears.",
          ownedPaths: ["profile", "affiliations", "funding", "timetable"],
          lastUpdate: "queued",
        },
        {
          name: "Document Systems",
          title: "Document-workflow agent",
          state: "queued",
          currentTask: "Holding until the next document-bank or evidence-linking slice is selected.",
          ownedPaths: ["documents", "document evidence", "document stores"],
          lastUpdate: "queued",
        },
        {
          name: "Lab Publishing Lead",
          title: "Lab-collaboration agent",
          state: "queued",
          currentTask: "Waiting on public-lab and collaboration priorities instead of guessing new scope.",
          ownedPaths: ["lab", "public pages", "activity log"],
          lastUpdate: "queued",
        },
      ],
    },
    {
      id: "reliability-desk",
      name: "Reliability Desk",
      lead: "Release Guard",
      leadRole: "Verification lead",
      state: "waiting",
      lane: "Reliability",
      objective: "Stop the command room from looking good while silently regressing lint, routes, or operating rules.",
      currentDeliverable: "Lint, typecheck, route validation, and docs alignment after each bounded change.",
      nextHandoff: "Executive Desk gets a release-ready summary or a blocked-by-review escalation.",
      dependencies: ["Shell and Experience Team", "Workflow Systems Team"],
      members: [
        {
          name: "Release Guard",
          title: "Verification lead",
          state: "standby",
          currentTask: "Waiting for the current writing slice to finish so validation can run without churn.",
          ownedPaths: ["verification only"],
          lastUpdate: "standing by",
        },
        {
          name: "Docs Drift Agent",
          title: "Documentation lead",
          state: "queued",
          currentTask: "Keep the autonomy model and lane rules synced with actual operation.",
          ownedPaths: ["docs/**"],
          lastUpdate: "9m ago",
        },
      ],
    },
  ],
  conversationFeed: [
    {
      id: "evt-1",
      channel: "assistant",
      teamId: "executive-desk",
      time: "T-11m",
      from: "Operator Liaison",
      to: "You",
      subject: "Supervisor packet ready",
      body: "I can now tell you who is active, which files changed, what is blocked, and where the queue will resume if you interrupt the team.",
    },
    {
      id: "evt-2",
      channel: "team",
      teamId: "shell-experience",
      time: "T-8m",
      from: "Mission Control",
      to: "Shell Builder",
      subject: "Expose dashboard access",
      body: "Make the operations board reachable from the shell without touching auth, locale frame, or global styling.",
    },
    {
      id: "evt-3",
      channel: "team",
      teamId: "shell-experience",
      time: "T-6m",
      from: "Ops Board Builder",
      to: "Mission Control",
      subject: "Command-room expansion",
      body: "Dashboard slice is moving from a static board to a secretary-led control room with visible teams and interaction states.",
    },
    {
      id: "evt-4",
      channel: "review",
      teamId: "reliability-desk",
      time: "T-3m",
      from: "Release Guard",
      to: "Executive Desk",
      subject: "Verification held",
      body: "I am waiting until the current write slice lands so lint and typecheck can run on a stable tree.",
    },
    {
      id: "evt-5",
      channel: "assistant",
      teamId: "workflow-systems",
      time: "Next",
      from: "Operator Liaison",
      to: "Workflow Systems Team",
      subject: "Stay queued",
      body: "Do not self-start a new profile or documents lane until the operator or Mission Control selects the next bounded workflow.",
    },
  ],
  interruptProtocol: [
    {
      title: "Freeze admission",
      body: "When you send a message, the assistant stops assigning new work immediately so the system does not widen while you wait.",
    },
    {
      title: "Finish safe checkpoints",
      body: "Active writers complete the current patch, validation command, or handoff note before full pause.",
    },
    {
      title: "Return one summary",
      body: "The assistant reports active teams, changed files, unresolved risks, and the cleanest resume point.",
    },
    {
      title: "Resume by lane",
      body: "After the conversation, the queue restarts from the highest-priority lane instead of reviving every paused thread.",
    },
  ],
  expansionRules: [
    {
      title: "Expand only by ownership",
      body: "A new specialist joins only when it owns a disjoint file tree or a read-only review slice.",
    },
    {
      title: "Templates before improvisation",
      body: "Every new role needs a workflow, non-goals, data mode, and stop conditions before it can write.",
    },
    {
      title: "Keep every helper inspectable",
      body: "If a new agent cannot expose its lead, members, task, and next checkpoint on the board, it should not join.",
    },
  ],
  automationCadence: [
    {
      title: "Hourly lane selector",
      cadence: "Every hour",
      body: "Re-open the repo, inspect the queue, and run exactly one bounded lane when no operator conversation is active.",
    },
    {
      title: "QA sweep",
      cadence: "Every 6 hours",
      body: "Review homepage and shell surfaces, then fix only low-risk defects inside one owned path group.",
    },
    {
      title: "Docs and reliability sweep",
      cadence: "Daily",
      body: "Reconcile docs drift, lint health, and open escalations so the loop stays maintainable.",
    },
    {
      title: "True 24-7 runner",
      cadence: "External host required",
      body: "Codex automations can relaunch work on a schedule, but uninterrupted always-on execution still needs an external scheduler or worker host.",
    },
  ],
  providerConnections: [
    {
      providerId: "codex",
      label: "Codex",
      cliName: "Codex app / CLI",
      status: "ready",
      assignedTeamId: "executive-desk",
      assignedTeamLabel: "Executive Desk",
      summary: "Primary terminal bridge for the executive assistant and operating queue.",
      command:
        'corepack pnpm ops -- connect codex executive-desk "Codex is supervising the queue."',
      lastHeartbeat: "Awaiting local connection",
    },
    {
      providerId: "claude",
      label: "Claude",
      cliName: "Claude Code",
      status: "ready",
      assignedTeamId: "workflow-systems",
      assignedTeamLabel: "Workflow Systems Team",
      summary: "Secondary agent slot for documentation, workflow exploration, and longer briefings.",
      command:
        'corepack pnpm ops -- connect claude workflow-systems "Claude is attached to workflow systems."',
      lastHeartbeat: "Awaiting local connection",
    },
    {
      providerId: "gemini",
      label: "Gemini",
      cliName: "Gemini CLI",
      status: "ready",
      assignedTeamId: "shell-experience",
      assignedTeamLabel: "Shell and Experience Team",
      summary: "External CLI slot for surface QA, design review, and fast shell observations.",
      command:
        'corepack pnpm ops -- connect gemini shell-experience "Gemini is reviewing shell surfaces."',
      lastHeartbeat: "Awaiting local connection",
    },
  ],
};

function getStaticSnapshotCopy(locale: string): AgentOperationsStaticCopy {
  return isKoreanLocale(locale) ? koreanSnapshotCopy : englishSnapshotCopy;
}

export function getAgentOperationsSnapshot(locale: string): AgentOperationsSnapshot {
  const generatedAt = formatSnapshotTime(locale);
  const runtime = createDefaultAgentOpsRuntimeState(locale);
  const copy = getStaticSnapshotCopy(locale);

  return {
    generatedAt,
    ...copy,
    activeMode: runtime.assistantMode,
    selectedTeamId: runtime.selectedTeamId,
    runtime: {
      terminalConnected: runtime.terminalConnected,
      lastSync: runtime.updatedAt,
      stateFile: agentOpsStateRelativePath,
    },
    autonomy: runtime.autonomy,
    currentDirective: runtime.currentDirective,
  };
}
