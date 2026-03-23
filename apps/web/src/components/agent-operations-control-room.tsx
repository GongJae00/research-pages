"use client";

import {
  ArrowRightLeft,
  Bot,
  CalendarClock,
  Clock3,
  Eye,
  GitBranchPlus,
  MessageSquareShare,
  Play,
  ShieldCheck,
  TerminalSquare,
  UserRoundSearch,
  Users2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { formatAgentOpsTimestamp } from "@/lib/agent-ops-time";
import type {
  AgentMetric,
  AgentOperationsSnapshot,
  AgentState,
  AssistantMode,
  DirectiveStatus,
  HandoffEvent,
  LaneState,
  ProviderStatus,
  TeamState,
} from "@/lib/agent-operations-snapshot";

import styles from "./agent-operations-dashboard.module.css";

interface AgentOperationsControlRoomProps {
  initialSnapshot: AgentOperationsSnapshot;
  locale: string;
}

interface OpsTerminalRun {
  id: string;
  command: string;
  cwd: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  ranAt: string;
  status: "running" | "completed" | "failed";
}

interface OpsTerminalResponse {
  ok: boolean;
  command: string;
  cwd: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  ranAt: string;
  signal?: string | null;
}

interface OpsTerminalSessionSnapshot {
  id: string;
  shellId: "powershell" | "cmd" | "bash";
  shellLabel: string;
  label: string;
  cwd: string;
  pid: number | null;
  createdAt: string;
  updatedAt: string;
  transcript: string;
  status: "running" | "closed" | "error";
  lastInput: string | null;
  exitCode: number | null;
}

interface OpsShellPreset {
  id: "powershell" | "cmd" | "bash";
  label: string;
  description: string;
}

interface OpsTerminalSessionsResponse {
  ok: boolean;
  availableShells: OpsShellPreset[];
  sessions: OpsTerminalSessionSnapshot[];
}

const stateClassMap: Record<AgentState, string> = {
  running: styles.stateRunning,
  reviewing: styles.stateReviewing,
  queued: styles.stateQueued,
  standby: styles.stateStandby,
};

const laneClassMap: Record<LaneState, string> = {
  active: styles.laneActive,
  next: styles.laneNext,
  guarded: styles.laneGuarded,
  scheduled: styles.laneScheduled,
};

const teamClassMap: Record<TeamState, string> = {
  delivering: styles.teamDelivering,
  syncing: styles.teamSyncing,
  queued: styles.teamQueued,
  waiting: styles.teamWaiting,
};

function metricToneClass(metric: AgentMetric) {
  switch (metric.tone) {
    case "blue":
      return styles.metricBlue;
    case "green":
      return styles.metricGreen;
    case "amber":
      return styles.metricAmber;
    case "rose":
      return styles.metricRose;
  }
}

function handoffStatusClass(status: HandoffEvent["status"]) {
  switch (status) {
    case "active":
      return styles.statusActive;
    case "in review":
      return styles.statusReview;
    case "armed":
      return styles.statusArmed;
    case "completed":
      return styles.statusDone;
  }
}

function providerStatusClass(status: ProviderStatus) {
  switch (status) {
    case "connected":
      return styles.statusActive;
    case "ready":
      return styles.statusDone;
    case "attention":
      return styles.statusReview;
  }
}

function isKoreanLocale(locale: string) {
  return locale === "ko";
}

function formatBoardTimestamp(locale: string, value: string) {
  return formatAgentOpsTimestamp(locale, value);
}

function getAgentStateLabel(locale: string, state: AgentState) {
  if (!isKoreanLocale(locale)) {
    return state;
  }

  switch (state) {
    case "running":
      return "실행 중";
    case "reviewing":
      return "검토 중";
    case "queued":
      return "대기열";
    case "standby":
      return "대기";
  }
}

function getTeamStateLabel(locale: string, state: TeamState) {
  if (!isKoreanLocale(locale)) {
    return state;
  }

  switch (state) {
    case "delivering":
      return "진행 중";
    case "syncing":
      return "동기화 중";
    case "queued":
      return "대기열";
    case "waiting":
      return "대기";
  }
}

function getLaneStateLabel(locale: string, state: LaneState) {
  if (!isKoreanLocale(locale)) {
    return state;
  }

  switch (state) {
    case "active":
      return "활성";
    case "next":
      return "다음";
    case "guarded":
      return "보호됨";
    case "scheduled":
      return "예약됨";
  }
}

function getHandoffStatusLabel(locale: string, status: HandoffEvent["status"]) {
  if (!isKoreanLocale(locale)) {
    return status;
  }

  switch (status) {
    case "active":
      return "진행 중";
    case "in review":
      return "검토 중";
    case "armed":
      return "준비됨";
    case "completed":
      return "완료";
  }
}

function getDirectiveStatusLabel(locale: string, status: DirectiveStatus) {
  if (!isKoreanLocale(locale)) {
    return status;
  }

  switch (status) {
    case "idle":
      return "대기";
    case "active":
      return "활성";
    case "paused":
      return "정지";
    case "completed":
      return "완료";
  }
}

function getProviderStatusLabel(locale: string, status: ProviderStatus) {
  if (!isKoreanLocale(locale)) {
    return status;
  }

  switch (status) {
    case "ready":
      return "준비됨";
    case "connected":
      return "연결됨";
    case "attention":
      return "확인 필요";
  }
}

function getTaskPacketStatusLabel(
  locale: string,
  status: "planned" | "fallback" | "failed",
) {
  if (!isKoreanLocale(locale)) {
    return status;
  }

  switch (status) {
    case "planned":
      return "계획 완료";
    case "fallback":
      return "fallback";
    case "failed":
      return "실패";
  }
}

function getChannelLabel(locale: string, channel: "assistant" | "team" | "review") {
  if (!isKoreanLocale(locale)) {
    return channel;
  }

  switch (channel) {
    case "assistant":
      return "비서";
    case "team":
      return "팀";
    case "review":
      return "검토";
  }
}

function formatDirectiveSource(locale: string, source: string) {
  if (source === "terminal bridge" || source === "터미널 브리지") {
    return isKoreanLocale(locale) ? "터미널 브리지" : "Terminal bridge";
  }

  return source;
}

function formatActorLabel(locale: string, actor: string) {
  if (isKoreanLocale(locale) && actor === "You") {
    return "당신";
  }

  return actor;
}

function formatDirectiveTitle(locale: string, title: string) {
  if (!isKoreanLocale(locale)) {
    return title;
  }

  if (title === "Operator directive") {
    return "운영자 지시";
  }
  if (title === "Pause requested") {
    return "정지 요청";
  }
  if (title === "Resume approved") {
    return "재개 승인";
  }
  if (title.startsWith("Focus ")) {
    return `포커스: ${title.slice("Focus ".length)}`;
  }

  return title;
}

function formatConversationSubject(locale: string, subject: string) {
  if (!isKoreanLocale(locale)) {
    return subject;
  }

  switch (subject) {
    case "New terminal directive":
      return "새 터미널 지시";
    case "Pause the active queue":
      return "활성 큐 정지";
    case "Resume planning":
      return "재개 계획";
    case "Terminal focus change":
      return "터미널 포커스 변경";
    case "Operator note":
      return "운영자 메모";
    default:
      return subject;
  }
}

function getTeamMemberCountLabel(locale: string, count: number) {
  return isKoreanLocale(locale) ? `멤버 ${count}명` : `${count} members`;
}

function getLiveOpsCopy(locale: string) {
  if (isKoreanLocale(locale)) {
    return {
      terminalLabel: "실행 데크",
      terminalTitle: "관제실 안에서 로컬 명령 실행",
      terminalBody:
        "여기서 `pnpm ops`, `git status`, 점검 명령을 직접 실행하고 결과를 바로 봅니다. 실행 뒤에는 보드 상태를 즉시 다시 읽어옵니다.",
      terminalInputLabel: "실행 명령",
      terminalPlaceholder: "corepack pnpm ops -- status",
      terminalRun: "명령 실행",
      terminalRunning: "실행 중",
      terminalExamplesLabel: "빠른 실행",
      terminalHistoryLabel: "최근 실행",
      terminalHistoryEmpty: "아직 관제실에서 실행한 명령이 없습니다.",
      terminalOutputLabel: "출력",
      terminalErrorLabel: "오류",
      terminalExitLabel: "종료 코드",
      terminalCwdLabel: "작업 경로",
      terminalHint: "Ctrl+Enter로 현재 명령을 실행할 수 있습니다.",
      terminalRequestFailed: "관제실 터미널 요청에 실패했습니다.",
      terminalUnknownError: "명령 실행 중 알 수 없는 오류가 발생했습니다.",
      topologyLabel: "지휘 체계",
      topologyTitle: "탑다운 지시와 바텀업 보고",
      topologyBody:
        "선택된 팀 기준으로 운영자, 비서, 팀장, 팀원, 현재 산출물, 그리고 다시 올라오는 보고 흐름을 분리해서 봅니다.",
      topDownLabel: "탑다운 지시",
      bottomUpLabel: "바텀업 보고",
      operatorNode: "운영자",
      assistantNode: "비서",
      leadNode: "팀장",
      memberNode: "팀원과 연결 CLI",
      deliverableNode: "현재 산출물",
      packetNode: "보고 패킷",
      receiptNode: "운영자 수신",
      directiveNodeTitle: "현재 운영 지시",
      noCli: "연결된 CLI 없음",
      noEvents: "아직 실시간 보고가 없습니다.",
      running: "실행 중",
      completed: "완료",
      failed: "실패",
      latestEventLabel: "가장 최근 보고",
    };
  }

  return {
    terminalLabel: "Execution deck",
    terminalTitle: "Run local commands from the control room",
    terminalBody:
      "Execute `pnpm ops`, `git status`, and bounded inspection commands here, then read the result without leaving the board. The board refreshes right after each run.",
    terminalInputLabel: "Command",
    terminalPlaceholder: "corepack pnpm ops -- status",
    terminalRun: "Run command",
    terminalRunning: "Running",
    terminalExamplesLabel: "Quick runs",
    terminalHistoryLabel: "Recent runs",
    terminalHistoryEmpty: "No commands have been run from the control room yet.",
    terminalOutputLabel: "Output",
    terminalErrorLabel: "Error",
    terminalExitLabel: "Exit code",
    terminalCwdLabel: "Working directory",
    terminalHint: "Use Ctrl+Enter to run the current command.",
    terminalRequestFailed: "The control-room terminal request failed.",
    terminalUnknownError: "An unknown error happened while running the command.",
    topologyLabel: "Command topology",
    topologyTitle: "Top-down directives and bottom-up reporting",
    topologyBody:
      "For the selected team, inspect the operator, assistant, lead, members, live deliverable, and the reporting packet that comes back up the chain.",
    topDownLabel: "Top-down directive",
    bottomUpLabel: "Bottom-up report",
    operatorNode: "Operator",
    assistantNode: "Assistant",
    leadNode: "Lead",
    memberNode: "Members and attached CLI",
    deliverableNode: "Current deliverable",
    packetNode: "Reporting packet",
    receiptNode: "Operator receipt",
    directiveNodeTitle: "Current directive",
    noCli: "No CLI attached",
    noEvents: "No live reporting event yet.",
    running: "Running",
    completed: "Completed",
    failed: "Failed",
    latestEventLabel: "Latest report",
  };
}

function getTerminalSessionCopy(locale: string) {
  if (isKoreanLocale(locale)) {
    return {
      label: "라이브 셸 세션",
      title: "관제실 안에 붙어 있는 로컬 터미널",
      body: "PowerShell이나 CMD 세션을 이 보드 안에서 열고, 그 안에서 `codex`, `claude`, `gemini`, `pnpm`, `git` 같은 CLI를 이어서 실행할 수 있습니다.",
      launchLabel: "세션 열기",
      sessionListLabel: "열려 있는 세션",
      transcriptLabel: "세션 출력",
      transcriptEmpty: "아직 열린 셸 세션이 없습니다. 위 버튼으로 PowerShell 또는 CMD 세션을 시작하세요.",
      selectPrompt: "먼저 세션 하나를 선택하세요.",
      inputLabel: "세션 입력",
      inputPlaceholder: "corepack pnpm ops -- status",
      send: "입력 전송",
      stop: "세션 종료",
      creating: "세션 여는 중",
      sending: "전송 중",
      stopping: "종료 중",
      noSession: "세션 없음",
      shellLabel: "셸",
      cwdLabel: "작업 경로",
      updatedLabel: "마지막 갱신",
      lastInputLabel: "마지막 입력",
      localOnly: "이 기능은 현재 로컬 개발 환경에서만 동작합니다.",
    };
  }

  return {
    label: "Live shell sessions",
    title: "Keep a local terminal docked inside the control room",
    body: "Open a PowerShell or shell session inside this board, then keep running `codex`, `claude`, `gemini`, `pnpm`, or `git` commands without leaving the control room.",
    launchLabel: "Open a session",
    sessionListLabel: "Open sessions",
    transcriptLabel: "Session transcript",
    transcriptEmpty: "No live shell session is open yet. Start a PowerShell or shell session above.",
    selectPrompt: "Select a session first.",
    inputLabel: "Session input",
    inputPlaceholder: "corepack pnpm ops -- status",
    send: "Send input",
    stop: "Stop session",
    creating: "Creating",
    sending: "Sending",
    stopping: "Stopping",
    noSession: "No session",
    shellLabel: "Shell",
    cwdLabel: "Working directory",
    updatedLabel: "Updated",
    lastInputLabel: "Last input",
    localOnly: "This dock is available in local development only.",
  };
}

function getTerminalSessionStatusLabel(
  locale: string,
  status: OpsTerminalSessionSnapshot["status"],
) {
  if (!isKoreanLocale(locale)) {
    return status;
  }

  switch (status) {
    case "running":
      return "실행 중";
    case "closed":
      return "종료됨";
    case "error":
      return "오류";
  }
}

function getInteractionStageCopy(locale: string) {
  if (isKoreanLocale(locale)) {
    return {
      operatorTitle: "당신이 비서에게 내리는 지시",
      operatorBody: "지금 선택된 팀과 실시간 셸까지 포함해서, 운영자가 어떤 요구를 아래로 내리는지 한 눈에 봅니다.",
      assistantTitle: "전담 비서가 지시를 번역하는 방식",
      assistantBody: "비서는 당신의 요구를 팀장이 바로 실행할 수 있는 작업 단위로 바꾸고, 멈춤과 재개 규칙까지 같이 붙입니다.",
      leadTitle: "선택된 팀장이 실행 큐를 쥐고 있는 상태",
      leadBody: "팀장은 하나의 레인만 들고 가며, 붙어 있는 CLI와 팀원들을 현재 산출물 쪽으로 정렬합니다.",
      swarmTitle: "팀원과 연결된 CLI가 실제로 움직이는 층",
      swarmBody: "여기서 각 팀원이 맡은 작업, 현재 상태, 그리고 파일 범위가 보입니다.",
      reportTitle: "바텀업 보고가 다시 올라오는 구조",
      reportBody: "팀원 실행 상태가 팀장 보고로 묶이고, 비서가 운영자에게 다시 요약 패킷을 올립니다.",
      traceLabel: "실시간 상호작용 트레이스",
      traceTitle: "누가 누구와 말하고 있는지",
      traceBody: "선택한 팀을 기준으로 비서, 팀장, 리뷰어가 어떤 메시지를 주고받는지 흐름대로 봅니다.",
      noTrace: "선택한 팀에 아직 보이는 상호작용이 없습니다.",
      targetTeam: "지시 대상",
      activeShell: "붙은 셸",
      lane: "현재 레인",
      deliverable: "현재 산출물",
      nextHandoff: "다음 핸드오프",
      latestPacket: "최신 보고 패킷",
      teamLead: "팀장",
      teamMembers: "실행 중인 팀원",
      attachedCli: "연결된 CLI",
    };
  }

  return {
    operatorTitle: "What you are telling the secretary to do",
    operatorBody: "See the current operator directive together with the active team and live shell context that the instruction is flowing into.",
    assistantTitle: "How the dedicated assistant translates it",
    assistantBody: "The assistant turns your request into a bounded queue item, adds the pause or resume rule, and routes it to the right lead.",
    leadTitle: "How the selected lead is holding the queue",
    leadBody: "The lead stays on one lane, keeps the attached CLI sessions aligned, and drives the current deliverable forward.",
    swarmTitle: "Where members and CLI are actually moving",
    swarmBody: "This is the execution layer: who owns what, what state they are in, and which file slices they are carrying.",
    reportTitle: "How bottom-up reporting comes back up",
    reportBody: "Member execution is packed into a lead handoff, then summarized by the assistant into an operator-facing packet.",
    traceLabel: "Live interaction trace",
    traceTitle: "Who is talking to whom",
    traceBody: "Follow the selected team's visible messages as the assistant, lead, and reviewers coordinate around the slice.",
    noTrace: "There is no visible interaction for the selected team yet.",
    targetTeam: "Target team",
    activeShell: "Attached shell",
    lane: "Current lane",
    deliverable: "Current deliverable",
    nextHandoff: "Next handoff",
    latestPacket: "Latest report packet",
    teamLead: "Lead",
    teamMembers: "Active members",
    attachedCli: "Attached CLI",
  };
}

function getAutonomyPanelCopy(locale: string) {
  if (isKoreanLocale(locale)) {
    return {
      label: "자율 루프",
      title: "내가 답하지 않아도 계속 도는 오케스트레이터",
      body: "로컬 daemon이 다음 레인을 고르고, 팀에 작업을 내리고, 보고 패킷을 갱신합니다. 실제 provider가 준비되면 그 provider로 붙고, 아니면 mock planner로 구조만 유지합니다.",
      status: "상태",
      provider: "활성 provider",
      loopCount: "누적 루프",
      currentLane: "현재 레인",
      nextRun: "다음 실행",
      latestSummary: "최신 요약",
      operatorBrief: "운영자 브리프",
      queue: "현재 큐",
      reports: "최근 보고",
      providerHealth: "provider 상태",
      currentTask: "현재 planning packet",
      taskHistory: "최근 planning history",
      taskArtifact: "artifact",
      artifactMissing: "artifact 없음",
      taskObjective: "목표",
      taskDispatch: "팀 지시",
      taskNextAction: "다음 액션",
      taskCheckpoint: "체크포인트",
      taskTeam: "팀",
      enabled: "활성",
      disabled: "비활성",
      stopped: "정지",
      running: "실행 중",
      paused: "일시정지",
      noReports: "아직 자율 루프 보고가 없습니다.",
      noTaskHistory: "아직 planning packet이 없습니다.",
      available: "사용 가능",
      unavailable: "대기",
    };
  }

  return {
    label: "Autonomy loop",
    title: "The orchestrator that keeps moving without waiting for you",
    body: "A local daemon keeps choosing the next lane, dispatching work, and refreshing the operator packet. When a real provider is ready it attaches there; otherwise the mock planner keeps the structure warm.",
    status: "Status",
    provider: "Active provider",
    loopCount: "Loop count",
    currentLane: "Current lane",
    nextRun: "Next run",
    latestSummary: "Latest summary",
    operatorBrief: "Operator brief",
    queue: "Current queue",
    reports: "Recent reports",
    providerHealth: "Provider health",
    currentTask: "Current planning packet",
    taskHistory: "Recent planning history",
    taskArtifact: "Artifact",
    artifactMissing: "No artifact",
    taskObjective: "Objective",
    taskDispatch: "Dispatch",
    taskNextAction: "Next action",
    taskCheckpoint: "Checkpoint",
    taskTeam: "Team",
    enabled: "Enabled",
    disabled: "Disabled",
    stopped: "Stopped",
    running: "Running",
    paused: "Paused",
    noReports: "No autonomy reports yet.",
    noTaskHistory: "No planning history yet.",
    available: "Available",
    unavailable: "Waiting",
  };
}

async function fetchLatestAgentOpsSnapshot(locale: string) {
  const response = await fetch(`/api/ops-state?locale=${locale}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as AgentOperationsSnapshot;
}

async function fetchTerminalSessions() {
  const response = await fetch("/api/ops-terminal", {
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as OpsTerminalSessionsResponse;
}

function getControlRoomCopy(locale: string) {
  if (isKoreanLocale(locale)) {
    return {
      heroEyebrow: "슈퍼바이저 뷰",
      autonomyLabel: "자율 운영 모드",
      snapshotUpdated: "스냅샷 갱신",
      heroMeta: "한 명의 비서가 인터럽트, 브리핑, 재개 라우팅을 맡습니다",
      pulseLabel: "시스템 펄스",
      pulseTitle: "지금 팀이 하고 있는 일",
      pulseBody:
        "위에서 아래로 읽으면 됩니다. 시스템 펄스, 비서 동작, 팀 계층, 커뮤니케이션 피드, 그리고 레인 및 안전 규칙 순서입니다.",
      assistantLabel: "전담 비서",
      assistantOnline: "활성",
      currentFocus: "현재 포커스",
      interruptPacket: "당신이 개입하면 받는 내용",
      terminalBridge: "터미널 브리지",
      terminalConnected: "연결됨",
      terminalWaiting: "대기 중",
      runtimeLive: "실행 중",
      runtimeIdle: "유휴",
      stateFile: "상태 파일",
      lastSync: "마지막 동기화",
      currentDirective: "현재 터미널 지시",
      directiveMetaAt: "기록 시각",
      suggestedPrompts: "비서에게 바로 말할 수 있는 프롬프트",
      providersLabel: "CLI 에이전트 브리지",
      providersTitle: "연결된 터미널과 팀 배정",
      providersBody:
        "Codex, Claude Code, Gemini CLI 같은 로컬 에이전트 세션을 팀에 붙이면, 보드에서 연결 상태와 담당 팀을 바로 볼 수 있습니다.",
      assignedTeam: "배정 팀",
      setupCommand: "연결 명령",
      providerHeartbeat: "마지막 heartbeat",
      allocationLabel: "작업 분배",
      allocationTitle: "팀별로 어떤 에이전트가 붙어 있는지",
      allocationBody:
        "provider 연결은 팀 단위로 배정됩니다. 각 팀 카드에서 현재 산출물과 붙어 있는 CLI 에이전트를 함께 확인할 수 있습니다.",
      simulatorLabel: "상호작용 시뮬레이터",
      simulatorTitle: "비서가 어떻게 반응하는지",
      simulatorBody:
        "비서 모드를 바꿔보면, 당신이 그냥 보고 있을 때와 브리핑을 요청할 때, 작업을 끊을 때, 다시 재개할 때 보드가 어떻게 반응하는지 미리 볼 수 있습니다.",
      currentMode: "현재 비서 모드",
      whatYouSee: "당신이 보게 되는 것",
      whatTeamsHear: "팀이 받는 지시",
      howResumeWorks: "재개 방식",
      operatingLoopLabel: "운영 루프",
      operatingLoopTitle: "지속 작업은 레인 기준으로 돌아갑니다",
      operatingLoopBody:
        "팀은 저장소 전체를 떠돌지 않습니다. 관찰하고, 레인 하나를 고르고, 경계가 있는 슬라이스를 출고하고, 검증한 뒤에야 다음 작업을 스케줄합니다.",
      teamMapLabel: "팀 맵",
      teamMapTitle: "리드, 멤버, 현재 산출물",
      teamMapBody:
        "팀 하나를 선택하면 리드, 현재 산출물, 의존성, 각 멤버가 지금 맡고 있는 일을 확인할 수 있습니다.",
      selectedTeamLabel: "선택된 팀",
      teamLead: "팀 리드",
      currentDeliverable: "현재 산출물",
      nextHandoff: "다음 핸드오프",
      dependencies: "의존성",
      ownedSlice: "담당 범위",
      lastUpdate: "마지막 업데이트",
      communicationLabel: "커뮤니케이션 피드",
      communicationTitle: "선택된 팀이 지금 듣고 있는 내용",
      communicationBody:
        "선택한 팀 기준으로 피드를 따라가며, 비서와 디렉터, 리뷰어가 해당 슬라이스를 어떻게 조율하는지 볼 수 있습니다.",
      rosterLabel: "에이전트 로스터",
      rosterTitle: "팀 간 에이전트 가시성",
      rosterBody:
        "이건 팀 뷰 뒤에 있는 원시 에이전트 roster입니다. 상위 구조가 아니라 파일 소유권 레벨에서 보고 싶을 때 사용합니다.",
      currentLane: "현재 레인",
      focus: "포커스",
      nextCheckpoint: "다음 체크포인트",
      ownedPaths: "담당 경로",
      laneBoardLabel: "레인 보드",
      laneBoardTitle: "작업은 혼돈이 아니라 레인으로 스케줄됩니다",
      laneBoardBody:
        "팀이 반복적으로 도는 레인들입니다. 각 레인은 owner, scope, 그리고 숨은 범위 확장을 막는 guardrail을 함께 보여줍니다.",
      scope: "범위",
      guardrail: "가드레일",
      nextWindow: "다음 창",
      handoffLabel: "최근 핸드오프",
      handoffTitle: "슈퍼바이저 핸드오프 피드",
      handoffBody:
        "큐 레벨에서 보는 화면입니다. 어떤 핸드오프가 끝났는지, 무엇이 아직 검토 중인지, 다음 인터럽트 경로가 어떻게 준비돼 있는지 보여줍니다.",
      pauseLabel: "정지와 재개",
      pauseTitle: "당신이 말을 시작하면 팀이 어떻게 양보하는지",
      pauseBody:
        "당신의 메시지는 우선권을 가져야 하지만, 진행 중인 작업 상태를 잃어서는 안 됩니다. 비서가 소프트 정지를 조율해서 작성자는 깨끗한 체크포인트에서 멈추고, 다음 재개도 의도적으로 이뤄집니다.",
      humanInterrupt: "운영자 인터럽트",
      expansionLabel: "확장 정책",
      expansionTitle: "충돌 없이 팀이 커지는 방식",
      expansionBody:
        "새 에이전트는 보드에서 보이고, 서로 겹치지 않는 범위를 가질 때만 유용합니다. 그래야 팀이 보이지 않는 중복이나 스스로 만든 바쁜 일로 번지지 않습니다.",
      controlledExpansion: "제어된 확장",
      automationLabel: "자동화 주기",
      automationTitle: "무인으로 돌릴 수 있는 것과 없는 것",
      automationBody:
        "반복 자동화는 경계가 있는 작업을 일정에 맞춰 다시 시작할 수 있습니다. 진짜 상시 스웜은 외부 장기 실행 워커나 스케줄러가 필요하기 때문에, 그 한계를 보드에서 계속 드러냅니다.",
      promiseLabel: "관제 약속",
      promiseTitle: "이 보드가 지금 제공하는 것",
      promiseBody:
        "대화할 상대는 전담 비서 한 명, 보이는 팀 계층, 검사 가능한 현재 작업, 예측 가능한 pause/resume 동작, 그리고 자율 실행 가능한 범위와 여전히 승인이 필요한 범위를 분명히 나눠 보여줍니다.",
      controlPromises: [
        {
          title: "조직 가시성",
          body: "raw sub-agent 출력까지 뒤지지 않아도 조직 구조를 바로 파악할 수 있습니다.",
        },
        {
          title: "비서 단일 진입점",
          body: "모든 워커와 각각 대화하는 대신, 한 명의 비서를 통해 리드에게 작업을 라우팅할 수 있습니다.",
        },
        {
          title: "명확한 소유권",
          body: "큐를 다시 돌리기 전에 어떤 팀, 리드, 멤버가 현재 슬라이스를 맡는지 확인할 수 있습니다.",
        },
        {
          title: "현실 경계 확인",
          body: "어디까지가 시뮬레이션된 관제 상태이고, 어디까지가 실제 상시 자동화인지 구분해 볼 수 있습니다.",
        },
      ],
    };
  }

  return {
    heroEyebrow: "Supervisor view",
    autonomyLabel: "Autonomy mode",
    snapshotUpdated: "Snapshot updated",
    heroMeta: "One assistant handles interruption, briefing, and resume routing",
    pulseLabel: "System pulse",
    pulseTitle: "What the team is doing now",
    pulseBody:
      "Read the board from top to bottom: system pulse, assistant behavior, team hierarchy, communication feed, then the lane and safety rules.",
    assistantLabel: "Dedicated assistant",
    assistantOnline: "online",
    currentFocus: "Current focus",
    interruptPacket: "What you receive on interrupt",
    terminalBridge: "Terminal bridge",
    terminalConnected: "Connected",
    terminalWaiting: "Waiting",
    runtimeLive: "live",
    runtimeIdle: "idle",
    stateFile: "State file",
    lastSync: "Last sync",
    currentDirective: "Current terminal directive",
    directiveMetaAt: "at",
    suggestedPrompts: "Suggested prompts for your secretary",
    providersLabel: "CLI agent bridges",
    providersTitle: "Connected terminals and team assignment",
    providersBody:
      "Attach local Codex, Claude Code, or Gemini CLI sessions to a team and the board will show their connection state and ownership in one place.",
    assignedTeam: "Assigned team",
    setupCommand: "Setup command",
    providerHeartbeat: "Last heartbeat",
    allocationLabel: "Work allocation",
    allocationTitle: "Which agents are attached to which teams",
    allocationBody:
      "Provider connections are assigned per team. Each team card shows the current deliverable together with the CLI agents attached to that slice.",
    simulatorLabel: "Interaction simulator",
    simulatorTitle: "How the secretary behaves",
    simulatorBody:
      "Switch the assistant mode to preview how the board reacts when you are passively observing, asking for a briefing, interrupting, or resuming work.",
    currentMode: "Current secretary mode",
    whatYouSee: "What you see",
    whatTeamsHear: "What teams hear",
    howResumeWorks: "How resume works",
    operatingLoopLabel: "Operating loop",
    operatingLoopTitle: "Continuous work stays lane-based",
    operatingLoopBody:
      "The team does not wander across the repo. It observes, selects one lane, ships a bounded slice, verifies it, and only then schedules what comes next.",
    teamMapLabel: "Team map",
    teamMapTitle: "Leads, members, and live deliverables",
    teamMapBody:
      "Pick a team to inspect its lead, current deliverable, dependencies, and what each member is handling right now.",
    selectedTeamLabel: "Selected team",
    teamLead: "Team lead",
    currentDeliverable: "Current deliverable",
    nextHandoff: "Next handoff",
    dependencies: "Dependencies",
    ownedSlice: "Owned slice",
    lastUpdate: "Last update",
    communicationLabel: "Communication feed",
    communicationTitle: "What the selected team is hearing",
    communicationBody:
      "The feed follows the selected team so you can see how the assistant, directors, and reviewers are coordinating around that slice.",
    rosterLabel: "Active roster",
    rosterTitle: "Cross-team agent visibility",
    rosterBody:
      "This is the raw agent roster behind the team view. Use it when you want a file-ownership level read instead of the higher-level team structure.",
    currentLane: "Current lane",
    focus: "Focus",
    nextCheckpoint: "Next checkpoint",
    ownedPaths: "Owned paths",
    laneBoardLabel: "Lane board",
    laneBoardTitle: "Work is scheduled by lane, not by chaos",
    laneBoardBody:
      "These are the recurring lanes the team rotates through. Each one shows its owner, scope, and the guardrail that prevents hidden scope expansion.",
    scope: "Scope",
    guardrail: "Guardrail",
    nextWindow: "Next window",
    handoffLabel: "Recent handoffs",
    handoffTitle: "Supervisor handoff feed",
    handoffBody:
      "This is the queue-level view: which handoffs completed, which are still in review, and which interrupt path is armed next.",
    pauseLabel: "Pause and resume",
    pauseTitle: "How the team yields when you start talking",
    pauseBody:
      "Your message should take priority without losing the state of in-flight work. The assistant coordinates a soft pause so writers stop at clean checkpoints and the next resume action stays intentional.",
    humanInterrupt: "Human interrupt",
    expansionLabel: "Expansion policy",
    expansionTitle: "How the team grows without colliding",
    expansionBody:
      "New agents are useful only when they stay inspectable and own disjoint scope. This prevents the team from expanding into invisible overlap or self-generated busywork.",
    controlledExpansion: "Controlled expansion",
    automationLabel: "Automation cadence",
    automationTitle: "What can run unattended and what cannot",
    automationBody:
      "Recurring automations can relaunch bounded work on a schedule. A true always-on swarm still needs an external long-running worker or scheduler, which is why that limit stays visible on the board.",
    promiseLabel: "Control promise",
    promiseTitle: "What this board gives you right now",
    promiseBody:
      "One dedicated assistant to talk to, visible team hierarchy, inspectable current work, predictable pause and resume behavior, and a clear boundary between what can self-run and what still needs your approval.",
    controlPromises: [
      {
        title: "Org visibility",
        body: "Inspect the org view without digging through raw sub-agent output.",
      },
      {
        title: "Single assistant entry",
        body: "Interact with one secretary that routes work to leads instead of talking to every worker separately.",
      },
      {
        title: "Clear ownership",
        body: "See which team, lead, and member owns the current slice before you redirect the queue.",
      },
      {
        title: "Reality check",
        body: "Tell which parts are simulated control-room state versus true always-on automation.",
      },
    ],
  };
}

export function AgentOperationsControlRoom({
  initialSnapshot,
  locale,
}: AgentOperationsControlRoomProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [selectedModeOverride, setSelectedModeOverride] = useState<AssistantMode | null>(null);
  const [selectedTeamOverride, setSelectedTeamOverride] = useState<string | null>(null);
  const [terminalCommand, setTerminalCommand] = useState("corepack pnpm ops -- status");
  const [terminalRuns, setTerminalRuns] = useState<OpsTerminalRun[]>([]);
  const [terminalSessions, setTerminalSessions] = useState<OpsTerminalSessionSnapshot[]>([]);
  const [availableShells, setAvailableShells] = useState<OpsShellPreset[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionInput, setSessionInput] = useState("corepack pnpm ops -- status");
  const [terminalRequestError, setTerminalRequestError] = useState<string | null>(null);
  const [sessionRequestError, setSessionRequestError] = useState<string | null>(null);
  const [isRunningTerminalCommand, setIsRunningTerminalCommand] = useState(false);
  const [creatingShellId, setCreatingShellId] = useState<OpsShellPreset["id"] | null>(null);
  const [isSendingSessionInput, setIsSendingSessionInput] = useState(false);
  const [isStoppingSession, setIsStoppingSession] = useState(false);
  const copy = getControlRoomCopy(locale);
  const liveCopy = getLiveOpsCopy(locale);
  const sessionCopy = getTerminalSessionCopy(locale);
  const stageCopy = getInteractionStageCopy(locale);
  const autonomyCopy = getAutonomyPanelCopy(locale);
  const controlPromises = [
    {
      icon: ShieldCheck,
      title: copy.controlPromises[0].title,
      body: copy.controlPromises[0].body,
    },
    {
      icon: MessageSquareShare,
      title: copy.controlPromises[1].title,
      body: copy.controlPromises[1].body,
    },
    {
      icon: Users2,
      title: copy.controlPromises[2].title,
      body: copy.controlPromises[2].body,
    },
    {
      icon: Eye,
      title: copy.controlPromises[3].title,
      body: copy.controlPromises[3].body,
    },
  ] as const;

  const selectedMode = selectedModeOverride ?? snapshot.activeMode;
  const selectedTeamId = selectedTeamOverride ?? snapshot.selectedTeamId;

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      try {
        const nextSnapshot = await fetchLatestAgentOpsSnapshot(locale);
        if (!nextSnapshot) {
          return;
        }
        if (mounted) {
          setSnapshot(nextSnapshot);
        }
      } catch {
        // Keep the last known board state when polling fails.
      }
    };

    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 5000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [locale]);

  useEffect(() => {
    let mounted = true;

    const refreshSessions = async () => {
      try {
        const payload = await fetchTerminalSessions();

        if (!payload || !mounted) {
          return;
        }

        setAvailableShells(payload.availableShells);
        setTerminalSessions(payload.sessions);
        setSelectedSessionId((current) => {
          const runningSessions = payload.sessions.filter((session) => session.status === "running");

          if (current && runningSessions.some((session) => session.id === current)) {
            return current;
          }

          return runningSessions[0]?.id ?? null;
        });
      } catch {
        // Keep the last visible session state when polling fails.
      }
    };

    void refreshSessions();
    const timer = window.setInterval(() => {
      void refreshSessions();
    }, 2500);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const assistantMode = useMemo(
    () => snapshot.assistant.modes.find((item) => item.id === selectedMode) ?? snapshot.assistant.modes[0],
    [selectedMode, snapshot.assistant.modes],
  );

  const selectedTeam = useMemo(
    () => snapshot.teams.find((team) => team.id === selectedTeamId) ?? snapshot.teams[0],
    [selectedTeamId, snapshot.teams],
  );
  const providersByTeam = useMemo(() => {
    const mapping = new Map<string, typeof snapshot.providerConnections>();

    for (const connection of snapshot.providerConnections) {
      const current = mapping.get(connection.assignedTeamId) ?? [];
      current.push(connection);
      mapping.set(connection.assignedTeamId, current);
    }

    return mapping;
  }, [snapshot]);

  const visibleConversation = useMemo(
    () =>
      snapshot.conversationFeed.filter(
        (event) => !event.teamId || event.teamId === selectedTeam?.id,
      ),
    [selectedTeam?.id, snapshot.conversationFeed],
  );
  const selectedProviders = useMemo(
    () => (selectedTeam ? providersByTeam.get(selectedTeam.id) ?? [] : []),
    [providersByTeam, selectedTeam],
  );
  const openTerminalSessions = useMemo(
    () => terminalSessions.filter((session) => session.status === "running"),
    [terminalSessions],
  );
  const activeSession = useMemo(
    () =>
      openTerminalSessions.find((session) => session.id === selectedSessionId) ??
      openTerminalSessions[0] ??
      null,
    [openTerminalSessions, selectedSessionId],
  );
  const interactionTrace = useMemo(
    () => [...visibleConversation].slice(0, 4).reverse(),
    [visibleConversation],
  );
  const latestVisibleConversation = visibleConversation[0] ?? null;
  const terminalPresetCommands = [
    "corepack pnpm ops -- status",
    `corepack pnpm ops -- assign codex ${selectedTeam?.id ?? "executive-desk"} "Codex moved to ${selectedTeam?.name ?? "Executive Desk"}."`,
    `corepack pnpm ops -- focus ${selectedTeam?.id ?? "executive-desk"} "Focus on ${selectedTeam?.name ?? "Executive Desk"}."`,
    "corepack pnpm ops -- directive \"Focus on homepage quality next.\"",
    "git status --short",
  ];

  const runTerminalCommand = async (commandValue?: string) => {
    const normalizedCommand = (commandValue ?? terminalCommand).trim();

    if (!normalizedCommand || isRunningTerminalCommand) {
      return;
    }

    const pendingId = `terminal-${Date.now()}`;
    setTerminalRequestError(null);
    setIsRunningTerminalCommand(true);
    setTerminalRuns((current) => [
      {
        id: pendingId,
        command: normalizedCommand,
        cwd: isKoreanLocale(locale) ? "저장소 루트" : "repository root",
        stdout: "",
        stderr: "",
        exitCode: 0,
        ranAt: new Date().toISOString(),
        status: "running" as const,
      },
      ...current,
    ].slice(0, 6));

    try {
      const response = await fetch("/api/ops-terminal", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ command: normalizedCommand }),
      });

      if (!response.ok) {
        throw new Error(liveCopy.terminalRequestFailed);
      }

      const payload = (await response.json()) as OpsTerminalResponse;

      setTerminalRuns((current) =>
        current.map((run) =>
          run.id === pendingId
            ? {
                ...run,
                command: payload.command,
                cwd: payload.cwd,
                stdout: payload.stdout,
                stderr: payload.stderr,
                exitCode: payload.exitCode,
                ranAt: payload.ranAt,
                status: payload.exitCode === 0 ? "completed" : "failed",
              }
            : run,
        ),
      );

      const nextSnapshot = await fetchLatestAgentOpsSnapshot(locale);
      if (nextSnapshot) {
        setSnapshot(nextSnapshot);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : liveCopy.terminalUnknownError;
      setTerminalRequestError(message);
      setTerminalRuns((current) =>
        current.map((run) =>
          run.id === pendingId
            ? {
                ...run,
                stderr: message,
                exitCode: 1,
                status: "failed",
              }
            : run,
        ),
      );
    } finally {
      setIsRunningTerminalCommand(false);
    }
  };

  const createTerminalSession = async (shellId: OpsShellPreset["id"]) => {
    if (creatingShellId) {
      return;
    }

    setSessionRequestError(null);
    setCreatingShellId(shellId);

    try {
      const response = await fetch("/api/ops-terminal", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "session.create",
          shellId,
          label: `${shellId} ${selectedTeam?.name ?? "control room"}`,
        }),
      });

      if (!response.ok) {
        throw new Error(sessionCopy.localOnly);
      }

      const payload = (await response.json()) as {
        ok: boolean;
        session: OpsTerminalSessionSnapshot;
        availableShells: OpsShellPreset[];
        sessions: OpsTerminalSessionSnapshot[];
      };

      setAvailableShells(payload.availableShells);
      setTerminalSessions(payload.sessions);
      setSelectedSessionId(payload.session.id);
    } catch (error) {
      setSessionRequestError(error instanceof Error ? error.message : sessionCopy.localOnly);
    } finally {
      setCreatingShellId(null);
    }
  };

  const sendSessionInput = async () => {
    if (
      !activeSession ||
      activeSession.status !== "running" ||
      !sessionInput.trim() ||
      isSendingSessionInput
    ) {
      return;
    }

    setSessionRequestError(null);
    setIsSendingSessionInput(true);

    try {
      const response = await fetch("/api/ops-terminal", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "session.input",
          sessionId: activeSession.id,
          input: sessionInput,
        }),
      });

      if (!response.ok) {
        throw new Error(sessionCopy.localOnly);
      }

      const payload = (await response.json()) as {
        ok: boolean;
        sessions: OpsTerminalSessionSnapshot[];
      };

      setTerminalSessions(payload.sessions);
    } catch (error) {
      setSessionRequestError(error instanceof Error ? error.message : sessionCopy.localOnly);
    } finally {
      setIsSendingSessionInput(false);
    }
  };

  const stopActiveSession = async () => {
    if (!activeSession || activeSession.status !== "running" || isStoppingSession) {
      return;
    }

    setSessionRequestError(null);
    setIsStoppingSession(true);

    try {
      const response = await fetch("/api/ops-terminal", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "session.stop",
          sessionId: activeSession.id,
        }),
      });

      if (!response.ok) {
        throw new Error(sessionCopy.localOnly);
      }

      const payload = (await response.json()) as {
        ok: boolean;
        sessions: OpsTerminalSessionSnapshot[];
      };

      setTerminalSessions(payload.sessions);
    } catch (error) {
      setSessionRequestError(error instanceof Error ? error.message : sessionCopy.localOnly);
    } finally {
      setIsStoppingSession(false);
    }
  };

  return (
    <div className={styles.shell}>
      <section className={styles.hero}>
        <article className={`${styles.panel} ${styles.heroPanel}`}>
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowDot} aria-hidden="true" />
            {copy.heroEyebrow}
          </span>
          <h2 className={styles.heroTitle}>{snapshot.headline}</h2>
          <p className={styles.heroSummary}>{snapshot.summary}</p>

          <div className={styles.ruleBox}>
            <span className={styles.ruleLabel}>{copy.autonomyLabel}</span>
            <strong className={styles.ruleValue}>{snapshot.autonomyMode}</strong>
            <p className={styles.ruleBody}>{snapshot.autonomyRule}</p>
          </div>

          <div className={styles.heroFooter}>
            <span className={styles.heroMeta}>
              <Clock3 size={16} />
              {copy.snapshotUpdated} {snapshot.generatedAt}
            </span>
            <span className={styles.heroMeta}>
              <ShieldCheck size={16} />
              {copy.heroMeta}
            </span>
          </div>
        </article>

        <aside className={`${styles.panel} ${styles.metricPanel}`}>
          <div className={styles.metricHeading}>
            <span className={styles.sectionLabel}>{copy.pulseLabel}</span>
            <h3 className={styles.sectionTitle}>{copy.pulseTitle}</h3>
            <p className={styles.sectionBody}>{copy.pulseBody}</p>
          </div>

          <div className={styles.metricGrid}>
            {snapshot.metrics.map((metric) => (
              <div
                key={metric.label}
                className={`${styles.metricCard} ${metricToneClass(metric)}`}
              >
                <span className={styles.metricValue}>{metric.value}</span>
                <span className={styles.metricLabel}>{metric.label}</span>
                <span className={styles.metricNote}>{metric.note}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className={styles.sectionGridTwo}>
        <article className={`${styles.panel} ${styles.sectionPanel}`}>
          <span className={styles.sectionLabel}>{copy.assistantLabel}</span>
          <h2 className={styles.sectionTitle}>{snapshot.assistant.name}</h2>
          <p className={styles.sectionBody}>{snapshot.assistant.role}</p>

          <div className={styles.assistantHeroCard}>
            <div className={styles.assistantHead}>
              <div>
                <strong className={styles.assistantStatus}>{snapshot.assistant.status}</strong>
                <p className={styles.assistantBody}>{snapshot.assistant.promise}</p>
              </div>
              <span className={`${styles.stateBadge} ${styles.stateRunning}`}>
                {copy.assistantOnline}
              </span>
            </div>

            <div className={styles.assistantLine}>
              <span className={styles.agentLabel}>{copy.currentFocus}</span>
              <p>{snapshot.assistant.currentFocus}</p>
            </div>

            <div className={styles.assistantLine}>
              <span className={styles.agentLabel}>{copy.interruptPacket}</span>
              <p>{snapshot.assistant.responsePacket}</p>
            </div>

            <div className={styles.runtimeGrid}>
              <div className={styles.runtimeCard}>
                <span className={styles.agentLabel}>{copy.terminalBridge}</span>
                <div className={styles.runtimeHead}>
                  <strong>
                    {snapshot.runtime.terminalConnected
                      ? copy.terminalConnected
                      : copy.terminalWaiting}
                  </strong>
                  <span
                    className={`${styles.statusBadge} ${
                      snapshot.runtime.terminalConnected ? styles.statusActive : styles.statusDone
                    }`}
                  >
                    {snapshot.runtime.terminalConnected ? copy.runtimeLive : copy.runtimeIdle}
                  </span>
                </div>
                <p>
                  {copy.stateFile}: <code>{snapshot.runtime.stateFile}</code>
                </p>
                <span className={styles.runtimeMeta}>
                  {copy.lastSync} {formatBoardTimestamp(locale, snapshot.runtime.lastSync)}
                </span>
              </div>

              <div className={styles.runtimeCard}>
                <span className={styles.agentLabel}>{copy.currentDirective}</span>
                <div className={styles.runtimeHead}>
                  <strong>{formatDirectiveTitle(locale, snapshot.currentDirective.title)}</strong>
                  <span className={`${styles.statusBadge} ${styles.directiveBadge}`}>
                    {getDirectiveStatusLabel(locale, snapshot.currentDirective.status)}
                  </span>
                </div>
                <p>{snapshot.currentDirective.body}</p>
                <span className={styles.runtimeMeta}>
                  {formatDirectiveSource(locale, snapshot.currentDirective.source)} {copy.directiveMetaAt}{" "}
                  {formatBoardTimestamp(locale, snapshot.currentDirective.issuedAt)}
                </span>
              </div>
            </div>

            <div className={styles.autonomyPanel}>
              <div className={styles.autonomyHead}>
                <div>
                  <span className={styles.agentLabel}>{autonomyCopy.label}</span>
                  <strong className={styles.autonomyTitle}>{autonomyCopy.title}</strong>
                  <p className={styles.autonomyBody}>{autonomyCopy.body}</p>
                </div>
                <span
                  className={`${styles.statusBadge} ${
                    snapshot.autonomy.status === "running"
                      ? styles.statusActive
                      : snapshot.autonomy.status === "paused"
                        ? styles.statusReview
                        : styles.statusDone
                  }`}
                >
                  {snapshot.autonomy.status === "running"
                    ? autonomyCopy.running
                    : snapshot.autonomy.status === "paused"
                      ? autonomyCopy.paused
                      : autonomyCopy.stopped}
                </span>
              </div>

              <div className={styles.autonomyMetricGrid}>
                <div className={styles.runtimeCard}>
                  <span className={styles.agentLabel}>{autonomyCopy.status}</span>
                  <strong>
                    {snapshot.autonomy.enabled ? autonomyCopy.enabled : autonomyCopy.disabled}
                  </strong>
                  <span className={styles.runtimeMeta}>
                    {autonomyCopy.loopCount}: {snapshot.autonomy.loopCount}
                  </span>
                </div>
                <div className={styles.runtimeCard}>
                  <span className={styles.agentLabel}>{autonomyCopy.provider}</span>
                  <strong>{snapshot.autonomy.activeProviderLabel}</strong>
                  <span className={styles.runtimeMeta}>
                    {autonomyCopy.nextRun} {formatBoardTimestamp(locale, snapshot.autonomy.nextRunAt)}
                  </span>
                </div>
                <div className={styles.runtimeCard}>
                  <span className={styles.agentLabel}>{autonomyCopy.currentLane}</span>
                  <strong>{snapshot.autonomy.currentLane}</strong>
                  <span className={styles.runtimeMeta}>{snapshot.autonomy.currentTeamId}</span>
                </div>
              </div>

              <div className={styles.autonomyStack}>
                <div className={styles.modeBlock}>
                  <span className={styles.agentLabel}>{autonomyCopy.latestSummary}</span>
                  <p>{snapshot.autonomy.latestSummary}</p>
                </div>
                <div className={styles.modeBlock}>
                  <span className={styles.agentLabel}>{autonomyCopy.operatorBrief}</span>
                  <p>{snapshot.autonomy.operatorBrief}</p>
                </div>
              </div>

              <div className={styles.autonomyGrid}>
                <div className={styles.autonomyCard}>
                  <span className={styles.agentLabel}>{autonomyCopy.queue}</span>
                  <div className={styles.autonomyQueueList}>
                    {snapshot.autonomy.queue.map((item) => (
                      <div className={styles.autonomyQueueRow} key={item.id}>
                        <strong>{item.title}</strong>
                        <span className={styles.runtimeMeta}>
                          {item.owner} · {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.autonomyCard}>
                  <span className={styles.agentLabel}>{autonomyCopy.reports}</span>
                  {snapshot.autonomy.reports.length ? (
                    <div className={styles.autonomyReportList}>
                      {snapshot.autonomy.reports.map((report) => (
                        <article className={styles.autonomyReportRow} key={report.id}>
                          <strong>{report.source}</strong>
                          <p>{report.summary}</p>
                          <span className={styles.runtimeMeta}>
                            {formatBoardTimestamp(locale, report.time)} · {report.nextAction}
                          </span>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.terminalEmpty}>{autonomyCopy.noReports}</div>
                  )}
                </div>
              </div>

              <div className={styles.autonomyGrid}>
                <div className={styles.autonomyCard}>
                  <span className={styles.agentLabel}>{autonomyCopy.currentTask}</span>
                  {snapshot.autonomy.currentTask ? (
                    <article className={styles.autonomyTaskCard}>
                      <div className={styles.autonomyTaskHead}>
                        <div>
                          <strong>{snapshot.autonomy.currentTask.providerLabel}</strong>
                          <span className={styles.runtimeMeta}>
                            {autonomyCopy.taskTeam}: {snapshot.autonomy.currentTask.teamLabel} ·{" "}
                            {snapshot.autonomy.currentTask.lane}
                          </span>
                        </div>
                        <span
                          className={`${styles.statusBadge} ${
                            snapshot.autonomy.currentTask.status === "failed"
                              ? styles.statusReview
                              : snapshot.autonomy.currentTask.status === "fallback"
                                ? styles.statusDone
                                : styles.statusActive
                          }`}
                        >
                          {getTaskPacketStatusLabel(locale, snapshot.autonomy.currentTask.status)}
                        </span>
                      </div>

                      <div className={styles.autonomyTaskStack}>
                        <div className={styles.modeBlock}>
                          <span className={styles.agentLabel}>{autonomyCopy.latestSummary}</span>
                          <p>{snapshot.autonomy.currentTask.summary}</p>
                        </div>
                        <div className={styles.modeBlock}>
                          <span className={styles.agentLabel}>{autonomyCopy.taskObjective}</span>
                          <p>{snapshot.autonomy.currentTask.objective}</p>
                        </div>
                        <div className={styles.modeBlock}>
                          <span className={styles.agentLabel}>{autonomyCopy.taskDispatch}</span>
                          <p>{snapshot.autonomy.currentTask.teamDispatch}</p>
                        </div>
                        <div className={styles.modeBlock}>
                          <span className={styles.agentLabel}>{autonomyCopy.taskNextAction}</span>
                          <p>{snapshot.autonomy.currentTask.nextAction}</p>
                        </div>
                        <div className={styles.modeBlock}>
                          <span className={styles.agentLabel}>{autonomyCopy.taskCheckpoint}</span>
                          <p>{snapshot.autonomy.currentTask.checkpoint}</p>
                        </div>
                      </div>

                      <span className={styles.runtimeMeta}>
                        {autonomyCopy.taskArtifact}:{" "}
                        {snapshot.autonomy.currentTask.artifactPath ?? autonomyCopy.artifactMissing}
                      </span>
                    </article>
                  ) : (
                    <div className={styles.terminalEmpty}>{autonomyCopy.noTaskHistory}</div>
                  )}
                </div>

                <div className={styles.autonomyCard}>
                  <span className={styles.agentLabel}>{autonomyCopy.taskHistory}</span>
                  {snapshot.autonomy.taskHistory.length ? (
                    <div className={styles.autonomyReportList}>
                      {snapshot.autonomy.taskHistory.map((task) => (
                        <article className={styles.autonomyReportRow} key={task.id}>
                          <div className={styles.autonomyTaskHead}>
                            <strong>{task.providerLabel}</strong>
                            <span
                              className={`${styles.statusBadge} ${
                                task.status === "failed"
                                  ? styles.statusReview
                                  : task.status === "fallback"
                                    ? styles.statusDone
                                    : styles.statusActive
                              }`}
                            >
                              {getTaskPacketStatusLabel(locale, task.status)}
                            </span>
                          </div>
                          <p>{task.summary}</p>
                          <span className={styles.runtimeMeta}>
                            {formatBoardTimestamp(locale, task.time)} · {task.teamLabel} ·{" "}
                            {task.artifactPath ?? autonomyCopy.artifactMissing}
                          </span>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.terminalEmpty}>{autonomyCopy.noTaskHistory}</div>
                  )}
                </div>
              </div>

              <div className={styles.promptDeck}>
                <span className={styles.agentLabel}>{autonomyCopy.providerHealth}</span>
                <div className={styles.commandPresetGrid}>
                  {snapshot.autonomy.providerHealth.map((provider) => (
                    <article className={styles.providerHealthCard} key={provider.providerId}>
                      <div className={styles.providerHealthHead}>
                        <strong>{provider.label}</strong>
                        <span
                          className={`${styles.statusBadge} ${
                            provider.available ? styles.statusActive : styles.statusDone
                          }`}
                        >
                          {provider.available ? autonomyCopy.available : autonomyCopy.unavailable}
                        </span>
                      </div>
                      <p>{provider.note}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.guaranteeList}>
              {snapshot.assistant.guarantees.map((item) => (
                <div className={styles.guaranteeRow} key={item}>
                  <ShieldCheck size={16} />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className={styles.promptDeck}>
              <span className={styles.agentLabel}>{copy.suggestedPrompts}</span>
              <div className={styles.chipRow}>
                {snapshot.assistant.suggestedPrompts.map((item) => (
                  <span className={styles.promptChip} key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </article>

        <article className={`${styles.panel} ${styles.sectionPanel}`}>
          <span className={styles.sectionLabel}>{copy.simulatorLabel}</span>
          <h2 className={styles.sectionTitle}>{copy.simulatorTitle}</h2>
          <p className={styles.sectionBody}>{copy.simulatorBody}</p>

          <div className={styles.modeRow}>
            {snapshot.assistant.modes.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.modeButton}${selectedMode === item.id ? ` ${styles.modeButtonActive}` : ""}`}
                onClick={() => setSelectedModeOverride(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <article className={styles.modeCard}>
            <div className={styles.modeCardHead}>
              <div>
                <span className={styles.agentLabel}>{copy.currentMode}</span>
                <h3>{assistantMode.title}</h3>
              </div>
              <span className={`${styles.statusBadge} ${styles.statusActive}`}>{assistantMode.label}</span>
            </div>
            <p className={styles.modeSummary}>{assistantMode.summary}</p>

            <div className={styles.modeGrid}>
              <div className={styles.modeBlock}>
                <span className={styles.agentLabel}>{copy.whatYouSee}</span>
                <p>{assistantMode.operatorView}</p>
              </div>
              <div className={styles.modeBlock}>
                <span className={styles.agentLabel}>{copy.whatTeamsHear}</span>
                <p>{assistantMode.teamInstruction}</p>
              </div>
              <div className={styles.modeBlock}>
                <span className={styles.agentLabel}>{copy.howResumeWorks}</span>
                <p>{assistantMode.resumeRule}</p>
              </div>
            </div>
          </article>
        </article>
      </section>

      <section className={styles.liveDeckGrid}>
        <article className={`${styles.panel} ${styles.sectionPanel}`}>
          <span className={styles.sectionLabel}>{liveCopy.terminalLabel}</span>
          <h2 className={styles.sectionTitle}>{liveCopy.terminalTitle}</h2>
          <p className={styles.sectionBody}>{liveCopy.terminalBody}</p>

          <div className={styles.terminalSessionPanel}>
            <div className={styles.terminalSessionHead}>
              <div>
                <span className={styles.agentLabel}>{sessionCopy.label}</span>
                <strong className={styles.terminalSessionTitle}>{sessionCopy.title}</strong>
                <p className={styles.terminalSessionBody}>{sessionCopy.body}</p>
              </div>
              <span
                className={`${styles.statusBadge} ${
                  activeSession?.status === "running"
                    ? styles.statusActive
                    : activeSession?.status === "error"
                      ? styles.statusReview
                      : styles.statusDone
                }`}
              >
                {activeSession
                  ? getTerminalSessionStatusLabel(locale, activeSession.status)
                  : sessionCopy.noSession}
              </span>
            </div>

            <div className={styles.terminalSessionLaunchRow}>
              <span className={styles.agentLabel}>{sessionCopy.launchLabel}</span>
              <div className={styles.shellPresetRow}>
                {availableShells.map((shell) => (
                  <button
                    key={shell.id}
                    type="button"
                    className={styles.shellPresetButton}
                    onClick={() => void createTerminalSession(shell.id)}
                    disabled={Boolean(creatingShellId)}
                  >
                    {creatingShellId === shell.id ? sessionCopy.creating : shell.label}
                  </button>
                ))}
              </div>
            </div>

            {sessionRequestError ? (
              <div className={styles.terminalInlineError}>
                <strong>{liveCopy.terminalErrorLabel}</strong>
                <span>{sessionRequestError}</span>
              </div>
            ) : null}

            <span className={styles.agentLabel}>{sessionCopy.sessionListLabel}</span>
            <div className={styles.sessionList}>
              {openTerminalSessions.length ? (
                openTerminalSessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    className={`${styles.sessionCard}${
                      activeSession?.id === session.id ? ` ${styles.sessionCardActive}` : ""
                    }`}
                    onClick={() => setSelectedSessionId(session.id)}
                  >
                    <div className={styles.sessionCardHead}>
                      <strong>{session.label}</strong>
                      <span
                        className={`${styles.statusBadge} ${
                          session.status === "running"
                            ? styles.statusActive
                            : session.status === "error"
                              ? styles.statusReview
                              : styles.statusDone
                        }`}
                      >
                        {getTerminalSessionStatusLabel(locale, session.status)}
                      </span>
                    </div>
                    <div className={styles.sessionCardMeta}>
                      <span>
                        {sessionCopy.shellLabel}: {session.shellLabel}
                      </span>
                      <span>
                        {sessionCopy.updatedLabel}: {formatBoardTimestamp(locale, session.updatedAt)}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className={styles.terminalEmpty}>{sessionCopy.transcriptEmpty}</div>
              )}
            </div>

            <div className={styles.sessionTranscriptCard}>
              <div className={styles.terminalComposerHead}>
                <span className={styles.agentLabel}>{sessionCopy.transcriptLabel}</span>
                {activeSession ? (
                  <span className={styles.runtimeMeta}>
                    {sessionCopy.cwdLabel}: <code>{activeSession.cwd}</code>
                  </span>
                ) : null}
              </div>

              <pre className={styles.sessionTranscript}>
                {activeSession?.transcript || sessionCopy.transcriptEmpty}
              </pre>

              <div className={styles.sessionInputMeta}>
                <span className={styles.runtimeMeta}>
                  {activeSession
                    ? `${sessionCopy.updatedLabel} ${formatBoardTimestamp(locale, activeSession.updatedAt)}`
                    : sessionCopy.selectPrompt}
                </span>
                {activeSession?.lastInput ? (
                  <span className={styles.runtimeMeta}>
                    {sessionCopy.lastInputLabel}: <code>{activeSession.lastInput}</code>
                  </span>
                ) : null}
              </div>

              <span className={styles.agentLabel}>{sessionCopy.inputLabel}</span>
              <textarea
                className={styles.terminalInput}
                value={sessionInput}
                onChange={(event) => setSessionInput(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                    event.preventDefault();
                    void sendSessionInput();
                  }
                }}
                placeholder={sessionCopy.inputPlaceholder}
                rows={3}
                disabled={!activeSession}
              />

              <div className={styles.terminalActionRow}>
                <span className={styles.runtimeMeta}>{sessionCopy.localOnly}</span>
                <div className={styles.sessionActionRow}>
                  <button
                    type="button"
                    className={styles.terminalRunButton}
                    onClick={() => void sendSessionInput()}
                    disabled={!activeSession || activeSession.status !== "running" || isSendingSessionInput}
                  >
                    <Play size={16} />
                    {isSendingSessionInput ? sessionCopy.sending : sessionCopy.send}
                  </button>
                  <button
                    type="button"
                    className={styles.terminalSecondaryButton}
                    onClick={() => void stopActiveSession()}
                    disabled={!activeSession || activeSession.status !== "running" || isStoppingSession}
                  >
                    {isStoppingSession ? sessionCopy.stopping : sessionCopy.stop}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.terminalComposer}>
            <div className={styles.terminalComposerHead}>
              <span className={styles.agentLabel}>{liveCopy.terminalInputLabel}</span>
              <span
                className={`${styles.statusBadge} ${
                  isRunningTerminalCommand ? styles.statusActive : styles.statusDone
                }`}
              >
                {isRunningTerminalCommand ? liveCopy.terminalRunning : liveCopy.completed}
              </span>
            </div>

            <textarea
              className={styles.terminalInput}
              value={terminalCommand}
              onChange={(event) => setTerminalCommand(event.target.value)}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                  event.preventDefault();
                  void runTerminalCommand();
                }
              }}
              placeholder={liveCopy.terminalPlaceholder}
              rows={3}
            />

            <div className={styles.terminalActionRow}>
              <span className={styles.runtimeMeta}>{liveCopy.terminalHint}</span>
              <button
                type="button"
                className={styles.terminalRunButton}
                onClick={() => void runTerminalCommand()}
                disabled={isRunningTerminalCommand}
              >
                <Play size={16} />
                {isRunningTerminalCommand ? liveCopy.terminalRunning : liveCopy.terminalRun}
              </button>
            </div>
          </div>

          <div className={styles.promptDeck}>
            <span className={styles.agentLabel}>{liveCopy.terminalExamplesLabel}</span>
            <div className={styles.commandPresetGrid}>
              {terminalPresetCommands.map((command) => (
                <button
                  key={command}
                  type="button"
                  className={styles.commandPresetCard}
                  onClick={() => {
                    setTerminalCommand(command);
                    void runTerminalCommand(command);
                  }}
                  disabled={isRunningTerminalCommand}
                >
                  {command}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.terminalHistory}>
            <div className={styles.terminalHistoryHead}>
              <span className={styles.agentLabel}>{liveCopy.terminalHistoryLabel}</span>
              <TerminalSquare size={18} />
            </div>

            {terminalRequestError ? (
              <div className={styles.terminalInlineError}>
                <strong>{liveCopy.terminalErrorLabel}</strong>
                <span>{terminalRequestError}</span>
              </div>
            ) : null}

            {terminalRuns.length ? (
              <div className={styles.terminalRunList}>
                {terminalRuns.map((run) => (
                  <article className={styles.terminalRunCard} key={run.id}>
                    <div className={styles.terminalRunHead}>
                      <div className={styles.terminalRunMetaBlock}>
                        <strong>{run.command}</strong>
                        <span className={styles.runtimeMeta}>
                          {formatBoardTimestamp(locale, run.ranAt)}
                        </span>
                      </div>
                      <span
                        className={`${styles.statusBadge} ${
                          run.status === "failed"
                            ? styles.statusReview
                            : run.status === "running"
                              ? styles.statusActive
                              : styles.statusDone
                        }`}
                      >
                        {run.status === "failed"
                          ? liveCopy.failed
                          : run.status === "running"
                            ? liveCopy.running
                            : liveCopy.completed}
                      </span>
                    </div>

                    <div className={styles.terminalRunMeta}>
                      <span>
                        {liveCopy.terminalCwdLabel}: <code>{run.cwd}</code>
                      </span>
                      <span>
                        {liveCopy.terminalExitLabel}:{" "}
                        {run.status === "running" ? "..." : String(run.exitCode)}
                      </span>
                    </div>

                    {run.stdout ? (
                      <div className={styles.terminalOutputBlock}>
                        <span className={styles.agentLabel}>{liveCopy.terminalOutputLabel}</span>
                        <pre>{run.stdout}</pre>
                      </div>
                    ) : null}

                    {run.stderr ? (
                      <div className={`${styles.terminalOutputBlock} ${styles.terminalErrorBlock}`}>
                        <span className={styles.agentLabel}>{liveCopy.terminalErrorLabel}</span>
                        <pre>{run.stderr}</pre>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.terminalEmpty}>{liveCopy.terminalHistoryEmpty}</div>
            )}
          </div>
        </article>

        <div className={styles.structureStack}>
          <article className={`${styles.panel} ${styles.sectionPanel}`}>
            <span className={styles.sectionLabel}>{liveCopy.topologyLabel}</span>
            <h2 className={styles.sectionTitle}>{liveCopy.topologyTitle}</h2>
            <p className={styles.sectionBody}>{liveCopy.topologyBody}</p>

            <div className={styles.controlTowerStage}>
              <div className={styles.commandRail}>
                <article className={`${styles.commandTowerCard} ${styles.commandTowerOperator}`}>
                  <div className={styles.commandTowerHead}>
                    <span className={styles.flowNodeLabel}>{liveCopy.operatorNode}</span>
                    <span className={`${styles.statusBadge} ${styles.directiveBadge}`}>
                      {getDirectiveStatusLabel(locale, snapshot.currentDirective.status)}
                    </span>
                  </div>
                  <div className={styles.commandTowerTitle}>
                    <UserRoundSearch size={18} />
                    <strong>{stageCopy.operatorTitle}</strong>
                  </div>
                  <p className={styles.commandTowerBody}>{snapshot.currentDirective.body}</p>
                  <p className={styles.commandTowerNote}>{stageCopy.operatorBody}</p>
                  <div className={styles.commandTowerMetaRow}>
                    <span className={styles.commandTowerChip}>
                      {stageCopy.targetTeam}: {selectedTeam?.name}
                    </span>
                    <span className={styles.commandTowerChip}>
                      {stageCopy.activeShell}: {activeSession?.shellLabel ?? sessionCopy.noSession}
                    </span>
                  </div>
                </article>

                <div className={styles.commandRailBridge}>
                  <span className={styles.flowNodeLabel}>{liveCopy.topDownLabel}</span>
                  <div className={styles.commandRailTrack} />
                  <ArrowRightLeft size={18} />
                  <div className={styles.commandRailTrack} />
                </div>

                <article className={`${styles.commandTowerCard} ${styles.commandTowerAssistant}`}>
                  <div className={styles.commandTowerHead}>
                    <span className={styles.flowNodeLabel}>{liveCopy.assistantNode}</span>
                    <span className={`${styles.statusBadge} ${styles.statusActive}`}>{assistantMode.label}</span>
                  </div>
                  <div className={styles.commandTowerTitle}>
                    <Bot size={18} />
                    <strong>{snapshot.assistant.name}</strong>
                  </div>
                  <p className={styles.commandTowerBody}>{assistantMode.teamInstruction}</p>
                  <p className={styles.commandTowerNote}>{stageCopy.assistantBody}</p>
                  <div className={styles.commandTowerMetaRow}>
                    <span className={styles.commandTowerChip}>
                      {formatDirectiveTitle(locale, snapshot.currentDirective.title)}
                    </span>
                    <span className={styles.commandTowerChip}>{snapshot.assistant.currentFocus}</span>
                  </div>
                </article>
              </div>

              <div className={styles.executionLaneGrid}>
                <article className={`${styles.commandTowerCard} ${styles.commandTowerLead}`}>
                  <div className={styles.commandTowerHead}>
                    <span className={styles.flowNodeLabel}>{stageCopy.teamLead}</span>
                    <span className={`${styles.statusBadge} ${teamClassMap[selectedTeam.state]}`}>
                      {getTeamStateLabel(locale, selectedTeam.state)}
                    </span>
                  </div>
                  <div className={styles.commandTowerTitle}>
                    <GitBranchPlus size={18} />
                    <strong>{selectedTeam.lead}</strong>
                  </div>
                  <p className={styles.commandTowerBody}>{selectedTeam.objective}</p>
                  <p className={styles.commandTowerNote}>{stageCopy.leadBody}</p>
                  <div className={styles.commandTowerMetaRow}>
                    <span className={styles.commandTowerChip}>
                      {stageCopy.lane}: {selectedTeam.lane}
                    </span>
                    <span className={styles.commandTowerChip}>
                      {stageCopy.deliverable}: {selectedTeam.currentDeliverable}
                    </span>
                  </div>
                  <div className={styles.providerDockRow}>
                    <span className={styles.flowNodeLabel}>{stageCopy.attachedCli}</span>
                    <div className={styles.commandTowerMetaRow}>
                      {selectedProviders.length ? (
                        selectedProviders.map((provider) => (
                          <span className={styles.commandTowerChip} key={provider.providerId}>
                            {provider.label}
                          </span>
                        ))
                      ) : (
                        <span className={styles.commandTowerChipMuted}>{liveCopy.noCli}</span>
                      )}
                    </div>
                  </div>
                </article>

                <section className={styles.memberSwarmStage}>
                  <div className={styles.memberSwarmHead}>
                    <div>
                      <span className={styles.flowNodeLabel}>{stageCopy.teamMembers}</span>
                      <h3 className={styles.swarmTitle}>{stageCopy.swarmTitle}</h3>
                      <p className={styles.swarmBody}>{stageCopy.swarmBody}</p>
                    </div>
                    <Users2 size={18} />
                  </div>
                  <div className={styles.memberSwarmGrid}>
                    {selectedTeam.members.map((member) => (
                      <article className={styles.memberSignalCard} key={member.name}>
                        <div className={styles.memberSignalHead}>
                          <div>
                            <strong>{member.name}</strong>
                            <span>{member.title}</span>
                          </div>
                          <span className={`${styles.stateBadge} ${stateClassMap[member.state]}`}>
                            {getAgentStateLabel(locale, member.state)}
                          </span>
                        </div>
                        <p className={styles.memberSignalBody}>{member.currentTask}</p>
                        <div className={styles.commandTowerMetaRow}>
                          {member.ownedPaths.slice(0, 3).map((path) => (
                            <span className={styles.commandTowerChip} key={`${member.name}-${path}`}>
                              {path}
                            </span>
                          ))}
                        </div>
                        <span className={styles.memberSignalMeta}>
                          {copy.lastUpdate}: {member.lastUpdate}
                        </span>
                      </article>
                    ))}
                  </div>
                </section>
              </div>

              <div className={styles.reportStack}>
                <div className={styles.reportStackHead}>
                  <div>
                    <span className={styles.flowNodeLabel}>{liveCopy.bottomUpLabel}</span>
                    <h3 className={styles.swarmTitle}>{stageCopy.reportTitle}</h3>
                    <p className={styles.swarmBody}>{stageCopy.reportBody}</p>
                  </div>
                  <MessageSquareShare size={18} />
                </div>

                <div className={styles.reportCardGrid}>
                  <article className={`${styles.reportCard} ${styles.reportCardPrimary}`}>
                    <span className={styles.flowNodeLabel}>{liveCopy.deliverableNode}</span>
                    <strong>{selectedTeam.currentDeliverable}</strong>
                    <p>{selectedTeam.nextHandoff}</p>
                    <span className={styles.flowNodeMeta}>
                      {stageCopy.nextHandoff}: {selectedTeam.nextHandoff}
                    </span>
                  </article>

                  <article className={styles.reportCard}>
                    <span className={styles.flowNodeLabel}>{liveCopy.packetNode}</span>
                    <strong>{stageCopy.latestPacket}</strong>
                    <p>{snapshot.assistant.responsePacket}</p>
                    <span className={styles.flowNodeMeta}>{snapshot.assistant.currentFocus}</span>
                  </article>

                  <article className={`${styles.reportCard} ${styles.reportCardAccent}`}>
                    <span className={styles.flowNodeLabel}>{liveCopy.receiptNode}</span>
                    <strong>
                      {latestVisibleConversation
                        ? formatConversationSubject(locale, latestVisibleConversation.subject)
                        : liveCopy.noEvents}
                    </strong>
                    <p>
                      {latestVisibleConversation
                        ? latestVisibleConversation.body
                        : snapshot.currentDirective.body}
                    </p>
                    <span className={styles.flowNodeMeta}>
                      {latestVisibleConversation
                        ? `${liveCopy.latestEventLabel} · ${formatBoardTimestamp(locale, latestVisibleConversation.time)}`
                        : formatDirectiveSource(locale, snapshot.currentDirective.source)}
                    </span>
                  </article>
                </div>
              </div>

              <div className={styles.tracePanel}>
                <div className={styles.traceHead}>
                  <div>
                    <span className={styles.flowNodeLabel}>{stageCopy.traceLabel}</span>
                    <h3 className={styles.swarmTitle}>{stageCopy.traceTitle}</h3>
                    <p className={styles.swarmBody}>{stageCopy.traceBody}</p>
                  </div>
                  <CalendarClock size={18} />
                </div>

                {interactionTrace.length ? (
                  <div className={styles.traceList}>
                    {interactionTrace.map((event) => (
                      <article className={styles.traceRow} key={event.id}>
                        <div className={`${styles.traceBubble} ${styles.traceBubbleFrom}`}>
                          <span className={styles.traceActor}>{formatActorLabel(locale, event.from)}</span>
                          <strong>{formatConversationSubject(locale, event.subject)}</strong>
                        </div>
                        <div className={styles.traceArrow}>
                          <ArrowRightLeft size={16} />
                        </div>
                        <div className={`${styles.traceBubble} ${styles.traceBubbleTo}`}>
                          <span className={styles.traceActor}>{formatActorLabel(locale, event.to)}</span>
                          <p>{event.body}</p>
                          <span className={styles.traceMeta}>
                            {getChannelLabel(locale, event.channel)} ·{" "}
                            {formatBoardTimestamp(locale, event.time)}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className={styles.terminalEmpty}>{stageCopy.noTrace}</div>
                )}
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className={`${styles.panel} ${styles.sectionPanel}`}>
        <span className={styles.sectionLabel}>{copy.operatingLoopLabel}</span>
        <h2 className={styles.sectionTitle}>{copy.operatingLoopTitle}</h2>
        <p className={styles.sectionBody}>{copy.operatingLoopBody}</p>

        <div className={styles.pipelineGrid}>
          {snapshot.pipeline.map((step, index) => (
            <article className={styles.pipelineCard} key={step.title}>
              <span className={styles.pipelineIndex}>{String(index + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.sectionGridTwo}>
        <article className={`${styles.panel} ${styles.sectionPanel}`}>
          <span className={styles.sectionLabel}>{copy.providersLabel}</span>
          <h2 className={styles.sectionTitle}>{copy.providersTitle}</h2>
          <p className={styles.sectionBody}>{copy.providersBody}</p>

          <div className={styles.providerGrid}>
            {snapshot.providerConnections.map((connection) => (
              <article className={styles.providerCard} key={connection.providerId}>
                <div className={styles.providerHead}>
                  <div>
                    <strong>{connection.label}</strong>
                    <span>{connection.cliName}</span>
                  </div>
                  <span className={`${styles.statusBadge} ${providerStatusClass(connection.status)}`}>
                    {getProviderStatusLabel(locale, connection.status)}
                  </span>
                </div>

                <p>{connection.summary}</p>

                <div className={styles.providerMetaList}>
                  <div className={styles.providerMetaRow}>
                    <span className={styles.agentLabel}>{copy.assignedTeam}</span>
                    <strong>{connection.assignedTeamLabel}</strong>
                  </div>
                  <div className={styles.providerMetaRow}>
                    <span className={styles.agentLabel}>{copy.providerHeartbeat}</span>
                    <strong>{formatBoardTimestamp(locale, connection.lastHeartbeat)}</strong>
                  </div>
                </div>

                <div className={styles.providerCommandBlock}>
                  <span className={styles.agentLabel}>{copy.setupCommand}</span>
                  <code>{connection.command}</code>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className={`${styles.panel} ${styles.sectionPanel}`}>
          <span className={styles.sectionLabel}>{copy.allocationLabel}</span>
          <h2 className={styles.sectionTitle}>{copy.allocationTitle}</h2>
          <p className={styles.sectionBody}>{copy.allocationBody}</p>

          <div className={styles.allocationList}>
            {snapshot.teams.map((team) => {
              const attachedProviders = providersByTeam.get(team.id) ?? [];

              return (
                <article className={styles.allocationCard} key={team.id}>
                  <div className={styles.teamCardHead}>
                    <div>
                      <strong>{team.name}</strong>
                      <span>{team.currentDeliverable}</span>
                    </div>
                    <span className={`${styles.statusBadge} ${teamClassMap[team.state]}`}>
                      {getTeamStateLabel(locale, team.state)}
                    </span>
                  </div>

                  <div className={styles.providerBadgeRow}>
                    {attachedProviders.length ? (
                      attachedProviders.map((provider) => (
                        <span className={styles.providerBadge} key={`${team.id}-${provider.providerId}`}>
                          {provider.label}
                        </span>
                      ))
                    ) : (
                      <span className={styles.providerEmpty}>{isKoreanLocale(locale) ? "연결된 CLI 없음" : "No CLI attached"}</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </article>
      </section>

      <section className={styles.sectionGridTwo}>
        <article className={`${styles.panel} ${styles.sectionPanel}`}>
          <span className={styles.sectionLabel}>{copy.teamMapLabel}</span>
          <h2 className={styles.sectionTitle}>{copy.teamMapTitle}</h2>
          <p className={styles.sectionBody}>{copy.teamMapBody}</p>

          <div className={styles.teamList}>
            {snapshot.teams.map((team) => (
              <button
                key={team.id}
                type="button"
                className={`${styles.teamCard}${selectedTeam?.id === team.id ? ` ${styles.teamCardActive}` : ""}`}
                onClick={() => setSelectedTeamOverride(team.id)}
              >
                <div className={styles.teamCardHead}>
                  <div>
                    <strong>{team.name}</strong>
                    <span>{team.lead}</span>
                  </div>
                  <span className={`${styles.statusBadge} ${teamClassMap[team.state]}`}>
                    {getTeamStateLabel(locale, team.state)}
                  </span>
                </div>
                <p>{team.objective}</p>
                <div className={styles.teamCardMeta}>
                  <span>{getTeamMemberCountLabel(locale, team.members.length)}</span>
                  <span>{team.lane}</span>
                </div>
              </button>
            ))}
          </div>
        </article>

        <article className={`${styles.panel} ${styles.sectionPanel}`}>
          <span className={styles.sectionLabel}>{copy.selectedTeamLabel}</span>
          <h2 className={styles.sectionTitle}>{selectedTeam?.name}</h2>
          <p className={styles.sectionBody}>{selectedTeam?.objective}</p>

          {selectedTeam ? (
            <div className={styles.teamDetailStack}>
              <div className={styles.teamLeadCard}>
                <div className={styles.teamLeadHead}>
                  <div>
                    <span className={styles.agentLabel}>{copy.teamLead}</span>
                    <strong>{selectedTeam.lead}</strong>
                    <p>{selectedTeam.leadRole}</p>
                  </div>
                  <Users2 size={20} />
                </div>
                <div className={styles.teamLeadGrid}>
                  <div className={styles.modeBlock}>
                    <span className={styles.agentLabel}>{copy.currentDeliverable}</span>
                    <p>{selectedTeam.currentDeliverable}</p>
                  </div>
                  <div className={styles.modeBlock}>
                    <span className={styles.agentLabel}>{copy.nextHandoff}</span>
                    <p>{selectedTeam.nextHandoff}</p>
                  </div>
                </div>
                <div className={styles.agentLine}>
                  <span className={styles.agentLabel}>{copy.dependencies}</span>
                  <div className={styles.chipRow}>
                    {selectedTeam.dependencies.map((item) => (
                      <span className={styles.chip} key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.memberGrid}>
                {selectedTeam.members.map((member) => (
                  <article className={styles.memberCard} key={member.name}>
                    <div className={styles.memberHead}>
                      <div>
                        <strong>{member.name}</strong>
                        <span>{member.title}</span>
                      </div>
                      <span className={`${styles.stateBadge} ${stateClassMap[member.state]}`}>
                        {getAgentStateLabel(locale, member.state)}
                      </span>
                    </div>
                    <p>{member.currentTask}</p>
                    <div className={styles.agentLine}>
                      <span className={styles.agentLabel}>{copy.ownedSlice}</span>
                      <div className={styles.chipRow}>
                        {member.ownedPaths.map((item) => (
                          <span className={styles.chip} key={item}>
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className={styles.memberUpdate}>
                      {copy.lastUpdate}: {member.lastUpdate}
                    </span>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </article>
      </section>

      <section className={styles.sectionGridTwo}>
        <article className={`${styles.panel} ${styles.sectionPanel}`}>
          <span className={styles.sectionLabel}>{copy.communicationLabel}</span>
          <h2 className={styles.sectionTitle}>{copy.communicationTitle}</h2>
          <p className={styles.sectionBody}>{copy.communicationBody}</p>

          <div className={styles.feedList}>
            {visibleConversation.map((event) => (
              <article className={styles.feedRow} key={event.id}>
                <div className={styles.feedTop}>
                  <div>
                    <span className={styles.feedTime}>{formatBoardTimestamp(locale, event.time)}</span>
                    <p className={styles.feedRoute}>
                      {formatActorLabel(locale, event.from)} <ArrowRightLeft size={14} />{" "}
                      {formatActorLabel(locale, event.to)}
                    </p>
                  </div>
                  <span className={`${styles.statusBadge} ${styles.feedChannelBadge}`}>
                    {getChannelLabel(locale, event.channel)}
                  </span>
                </div>
                <strong className={styles.feedSubject}>
                  {formatConversationSubject(locale, event.subject)}
                </strong>
                <p>{event.body}</p>
              </article>
            ))}
          </div>
        </article>

        <article className={`${styles.panel} ${styles.sectionPanel}`}>
          <span className={styles.sectionLabel}>{copy.rosterLabel}</span>
          <h2 className={styles.sectionTitle}>{copy.rosterTitle}</h2>
          <p className={styles.sectionBody}>{copy.rosterBody}</p>

          <div className={styles.agentGrid}>
            {snapshot.agents.map((agent) => (
              <article className={styles.agentCard} key={agent.name}>
                <div className={styles.agentHead}>
                  <div className={styles.agentMeta}>
                    <h3>{agent.name}</h3>
                    <span className={styles.agentRole}>{agent.role}</span>
                  </div>
                  <span className={`${styles.stateBadge} ${stateClassMap[agent.state]}`}>
                    {getAgentStateLabel(locale, agent.state)}
                  </span>
                </div>

                <div className={styles.agentBody}>
                  <div className={styles.agentLine}>
                    <span className={styles.agentLabel}>{copy.currentLane}</span>
                    <span>{agent.lane}</span>
                  </div>
                  <div className={styles.agentLine}>
                    <span className={styles.agentLabel}>{copy.focus}</span>
                    <p>{agent.focus}</p>
                  </div>
                  <div className={styles.agentLine}>
                    <span className={styles.agentLabel}>{copy.nextCheckpoint}</span>
                    <p>{agent.nextCheckpoint}</p>
                  </div>
                  <div className={styles.agentLine}>
                    <span className={styles.agentLabel}>{copy.ownedPaths}</span>
                    <div className={styles.chipRow}>
                      {agent.ownedPaths.map((item) => (
                        <span className={styles.chip} key={item}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className={styles.sectionGridTwo}>
        <article className={`${styles.panel} ${styles.sectionPanel}`}>
          <span className={styles.sectionLabel}>{copy.laneBoardLabel}</span>
          <h2 className={styles.sectionTitle}>{copy.laneBoardTitle}</h2>
          <p className={styles.sectionBody}>{copy.laneBoardBody}</p>

          <div className={styles.laneGrid}>
            {snapshot.lanes.map((lane) => (
              <article className={styles.laneCard} key={lane.name}>
                <div className={styles.laneHead}>
                  <div>
                    <h3>{lane.name}</h3>
                    <span className={styles.laneOwner}>{lane.owner}</span>
                  </div>
                  <span className={`${styles.laneBadge} ${laneClassMap[lane.state]}`}>
                    {getLaneStateLabel(locale, lane.state)}
                  </span>
                </div>

                <div className={styles.laneBody}>
                  <div className={styles.laneMeta}>
                    <span className={styles.agentLabel}>{copy.scope}</span>
                    <p>{lane.scope}</p>
                  </div>
                  <div className={styles.laneMeta}>
                    <span className={styles.agentLabel}>{copy.guardrail}</span>
                    <p>{lane.guardrail}</p>
                  </div>
                  <div className={styles.laneMeta}>
                    <span className={styles.agentLabel}>{copy.nextWindow}</span>
                    <p>{lane.nextWindow}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className={`${styles.panel} ${styles.sectionPanel}`}>
          <span className={styles.sectionLabel}>{copy.handoffLabel}</span>
          <h2 className={styles.sectionTitle}>{copy.handoffTitle}</h2>
          <p className={styles.sectionBody}>{copy.handoffBody}</p>

          <div className={styles.feedList}>
            {snapshot.handoffs.map((event) => (
              <article className={styles.feedRow} key={`${event.time}-${event.summary}`}>
                <div className={styles.feedTop}>
                  <div>
                    <span className={styles.feedTime}>{formatBoardTimestamp(locale, event.time)}</span>
                    <p className={styles.feedRoute}>
                      {formatActorLabel(locale, event.from)} <ArrowRightLeft size={14} />{" "}
                      {formatActorLabel(locale, event.to)}
                    </p>
                  </div>
                  <span className={`${styles.statusBadge} ${handoffStatusClass(event.status)}`}>
                    {getHandoffStatusLabel(locale, event.status)}
                  </span>
                </div>
                <p>{event.summary}</p>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className={styles.sectionGridTwo}>
        <article className={`${styles.panel} ${styles.sectionPanel}`}>
          <span className={styles.sectionLabel}>{copy.pauseLabel}</span>
          <h2 className={styles.sectionTitle}>{copy.pauseTitle}</h2>
          <p className={styles.sectionBody}>{copy.pauseBody}</p>

          <div className={styles.policyGrid}>
            {snapshot.interruptProtocol.map((item) => (
                <article className={styles.policyCard} key={item.title}>
                  <span className={styles.cardMeta}>
                    <UserRoundSearch size={16} />
                    {copy.humanInterrupt}
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
              </article>
            ))}
          </div>
        </article>

        <article className={`${styles.panel} ${styles.sectionPanel}`}>
          <span className={styles.sectionLabel}>{copy.expansionLabel}</span>
          <h2 className={styles.sectionTitle}>{copy.expansionTitle}</h2>
          <p className={styles.sectionBody}>{copy.expansionBody}</p>

          <div className={styles.policyGrid}>
            {snapshot.expansionRules.map((item, index) => {
              const icons = [GitBranchPlus, Eye, Bot];
              const Icon = icons[index] ?? MessageSquareShare;

              return (
                <article className={styles.policyCard} key={item.title}>
                  <span className={styles.cardMeta}>
                    <Icon size={16} />
                    {copy.controlledExpansion}
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              );
            })}
          </div>
        </article>
      </section>

      <section className={styles.sectionGridTwo}>
        <article className={`${styles.panel} ${styles.sectionPanel}`}>
          <span className={styles.sectionLabel}>{copy.automationLabel}</span>
          <h2 className={styles.sectionTitle}>{copy.automationTitle}</h2>
          <p className={styles.sectionBody}>{copy.automationBody}</p>

          <div className={styles.scheduleGrid}>
            {snapshot.automationCadence.map((item) => (
              <article className={styles.scheduleCard} key={item.title}>
                <span className={styles.cardMeta}>
                  <CalendarClock size={16} />
                  {item.cadence}
                </span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </article>

        <article className={`${styles.panel} ${styles.sectionPanel}`}>
          <span className={styles.sectionLabel}>{copy.promiseLabel}</span>
          <h2 className={styles.sectionTitle}>{copy.promiseTitle}</h2>
          <p className={`${styles.sectionBody} ${styles.sectionBodyTight}`}>{copy.promiseBody}</p>

          <div className={styles.promiseList}>
            {controlPromises.map((item) => {
              const Icon = item.icon;

              return (
                <div className={styles.promiseRow} key={item.title}>
                  <div className={styles.promiseIcon}>
                    <Icon size={16} />
                  </div>
                  <div className={styles.promiseCopy}>
                    <strong className={styles.promiseTitle}>{item.title}</strong>
                    <p>{item.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>
    </div>
  );
}
