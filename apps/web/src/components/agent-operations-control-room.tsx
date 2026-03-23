"use client";

import {
  ArrowRightLeft,
  Bot,
  CalendarClock,
  MessageSquareShare,
  Play,
  TerminalSquare,
  UserRoundSearch,
  Users2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { formatAgentOpsTimestamp } from "@/lib/agent-ops-time";
import type {
  AgentOperationsSnapshot,
  AgentState,
  AssistantMode,
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
  command: string;
  cwd: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  ranAt: string;
}

interface OpsTerminalSessionSnapshot {
  id: string;
  shellId: "powershell" | "cmd" | "bash";
  shellLabel: string;
  label: string;
  cwd: string;
  updatedAt: string;
  transcript: string;
  status: "running" | "closed" | "error";
  lastInput: string | null;
}

interface OpsShellPreset {
  id: "powershell" | "cmd" | "bash";
  label: string;
}

interface OpsTerminalSessionsResponse {
  availableShells: OpsShellPreset[];
  sessions: OpsTerminalSessionSnapshot[];
}

const stateClassMap: Record<AgentState, string> = {
  running: styles.stateRunning,
  reviewing: styles.stateReviewing,
  queued: styles.stateQueued,
  standby: styles.stateStandby,
};

const teamClassMap: Record<TeamState, string> = {
  delivering: styles.teamDelivering,
  syncing: styles.teamSyncing,
  queued: styles.teamQueued,
  waiting: styles.teamWaiting,
};

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

function t(locale: string, ko: string, en: string) {
  return isKoreanLocale(locale) ? ko : en;
}

function formatBoardTimestamp(locale: string, value: string) {
  return formatAgentOpsTimestamp(locale, value);
}

function getOpsCopy(locale: string) {
  return {
    terminalLabel: t(locale, "실행 데크", "Execution deck"),
    terminalTitle: t(locale, "관제실 안에서 로컬 명령 실행", "Run local commands inside the control room"),
    terminalBody: t(
      locale,
      "여기서 바로 pnpm ops, git, codex, gemini를 치고 결과를 보면서 팀 상태를 같이 봅니다.",
      "Run pnpm ops, git, codex, or gemini here while watching the team state.",
    ),
    terminalInputLabel: t(locale, "실행 명령", "Command"),
    terminalPlaceholder: "corepack pnpm ops -- status",
    terminalRun: t(locale, "명령 실행", "Run command"),
    terminalRunning: t(locale, "실행 중", "Running"),
    terminalExamplesLabel: t(locale, "빠른 실행", "Quick runs"),
    terminalHistoryLabel: t(locale, "최근 실행", "Recent runs"),
    terminalHistoryEmpty: t(locale, "아직 실행한 명령이 없습니다.", "No commands have been run yet."),
    terminalOutputLabel: t(locale, "출력", "Output"),
    terminalErrorLabel: t(locale, "오류", "Error"),
    terminalExitLabel: t(locale, "종료 코드", "Exit code"),
    terminalCwdLabel: t(locale, "작업 경로", "Working directory"),
    terminalHint: t(locale, "Ctrl+Enter로 현재 명령을 실행할 수 있습니다.", "Use Ctrl+Enter to run the current command."),
    terminalModeHint: t(
      locale,
      "이 입력창은 1회 실행 후 바로 종료됩니다. codex, gemini 같은 지속 세션은 아래 버튼으로 세션에 보내세요.",
      "This input runs one-shot commands and exits immediately. Send codex, gemini, and other long-running commands into a live session instead.",
    ),
    sendToSession: t(locale, "세션으로 보내기", "Send to session"),
    dispatchingToSession: t(locale, "세션으로 전송 중", "Sending to session"),
    sessionLabel: t(locale, "라이브 셸 세션", "Live shell sessions"),
    sessionTitle: t(locale, "관제실 안에 붙어 있는 로컬 터미널", "Keep a local terminal docked inside the control room"),
    sessionBody: t(
      locale,
      "PowerShell, CMD, bash 세션을 열고 codex, gemini, pnpm, git을 이 보드 안에서 이어서 실행합니다.",
      "Open a PowerShell, CMD, or bash session and keep running codex, gemini, pnpm, or git without leaving the board.",
    ),
    sessionLaunchLabel: t(locale, "세션 열기", "Open a session"),
    transcriptLabel: t(locale, "세션 출력", "Session transcript"),
    transcriptEmpty: t(locale, "열려 있는 세션이 없습니다.", "No shell session is open yet."),
    selectPrompt: t(locale, "먼저 세션 하나를 선택하세요.", "Select a session first."),
    inputPlaceholder: "corepack pnpm ops -- status",
    send: t(locale, "입력 전송", "Send input"),
    stop: t(locale, "세션 종료", "Stop session"),
    creating: t(locale, "생성 중", "Creating"),
    sending: t(locale, "전송 중", "Sending"),
    stopping: t(locale, "종료 중", "Stopping"),
    noSession: t(locale, "세션 없음", "No session"),
    cwdField: t(locale, "작업 경로", "Working directory"),
    updatedField: t(locale, "업데이트", "Updated"),
    lastInputField: t(locale, "마지막 입력", "Last input"),
    localOnly: t(locale, "이 기능은 로컬 개발 환경에서만 동작합니다.", "This feature is available in local development only."),
    assistantLabel: t(locale, "전담 비서", "Dedicated assistant"),
    assistantOnline: t(locale, "활성", "Online"),
    currentDirective: t(locale, "현재 지시", "Current directive"),
    currentFocus: t(locale, "현재 포커스", "Current focus"),
    assistantSummary: t(
      locale,
      "운영자 지시를 큐로 번역하고 팀으로 내리는 단일 진입점입니다.",
      "A single entry point that translates operator instructions into queued team work.",
    ),
    providersLabel: t(locale, "연결된 CLI", "Connected CLI"),
    handoffLabel: t(locale, "최근 handoff", "Recent handoffs"),
    topologyLabel: t(locale, "지휘 토폴로지", "Command topology"),
    topologyTitle: t(locale, "운영자 -> 비서 -> 팀장 -> 팀원 -> 보고", "Operator -> assistant -> leads -> members -> reports"),
    topologyBody: t(
      locale,
      "팀별 분할, 팀 간 handoff, 그리고 대화/보고 흐름을 한 번에 봅니다.",
      "Inspect team partitions, cross-team handoffs, and conversation or reporting in one view.",
    ),
    bottomUpLabel: t(locale, "바텀업 보고", "Bottom-up reporting"),
    traceLabel: t(locale, "상호작용 trace", "Interaction trace"),
    teamLayerLabel: t(locale, "팀 실행 계층", "Team execution layer"),
    latestPacket: t(locale, "최신 보고 패킷", "Latest report packet"),
    activeExecution: t(locale, "현재 실행", "Current execution"),
    activeProvider: t(locale, "활성 provider", "Active provider"),
    loopCount: t(locale, "루프", "Loop count"),
    generatedAt: t(locale, "스냅샷", "Snapshot"),
    noCli: t(locale, "CLI 없음", "No CLI"),
    noTrace: t(locale, "표시할 상호작용이 없습니다.", "No interaction is visible yet."),
    directiveAt: t(locale, "기록 시각", "at"),
  };
}

function getTeamMemberCountLabel(locale: string, count: number) {
  return t(locale, `멤버 ${count}명`, `${count} members`);
}

function formatDirectiveTitle(locale: string, title: string) {
  if (!isKoreanLocale(locale)) {
    return title;
  }
  if (title === "Operator directive") return "운영자 지시";
  if (title === "Pause requested") return "정지 요청";
  if (title === "Resume approved") return "재개 승인";
  return title;
}

function formatDirectiveSource(locale: string, source: string) {
  if (source === "terminal bridge") {
    return t(locale, "터미널 브리지", "Terminal bridge");
  }
  return source;
}

function getProviderStatusLabel(locale: string, status: ProviderStatus) {
  if (!isKoreanLocale(locale)) {
    return status;
  }
  if (status === "connected") return "연결됨";
  if (status === "ready") return "준비됨";
  return "확인 필요";
}

function formatActorLabel(locale: string, actor: string) {
  return isKoreanLocale(locale) && actor === "You" ? "당신" : actor;
}

function formatConversationSubject(locale: string, subject: string) {
  if (!isKoreanLocale(locale)) {
    return subject;
  }
  if (subject === "New terminal directive") return "새 터미널 지시";
  if (subject === "Pause the active queue") return "활성 큐 정지";
  if (subject === "Resume planning") return "재개 계획";
  if (subject === "Terminal focus change") return "포커스 변경";
  if (subject === "Operator note") return "운영자 메모";
  return subject;
}

async function fetchLatestAgentOpsSnapshot(locale: string) {
  const response = await fetch(`/api/ops-state?locale=${locale}`, { cache: "no-store" });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as AgentOperationsSnapshot;
}

async function fetchTerminalSessions() {
  const response = await fetch("/api/ops-terminal", { cache: "no-store" });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as OpsTerminalSessionsResponse;
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
  const [isDispatchingCommandToSession, setIsDispatchingCommandToSession] = useState(false);
  const [isStoppingSession, setIsStoppingSession] = useState(false);
  const copy = getOpsCopy(locale);

  const selectedMode = selectedModeOverride ?? snapshot.activeMode;
  const selectedTeamId = selectedTeamOverride ?? snapshot.selectedTeamId;

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      const nextSnapshot = await fetchLatestAgentOpsSnapshot(locale);
      if (mounted && nextSnapshot) {
        setSnapshot(nextSnapshot);
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [locale]);

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      const payload = await fetchTerminalSessions();
      if (!mounted || !payload) {
        return;
      }
      setAvailableShells(payload.availableShells);
      setTerminalSessions(payload.sessions);
      setSelectedSessionId((current) => {
        const running = payload.sessions.filter((item) => item.status === "running");
        if (current && running.some((item) => item.id === current)) {
          return current;
        }
        return running[0]?.id ?? null;
      });
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2500);
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
    () => snapshot.teams.find((item) => item.id === selectedTeamId) ?? snapshot.teams[0],
    [selectedTeamId, snapshot.teams],
  );

  const providersByTeam = useMemo(() => {
    const map = new Map<string, typeof snapshot.providerConnections>();
    for (const provider of snapshot.providerConnections) {
      const current = map.get(provider.assignedTeamId) ?? [];
      current.push(provider);
      map.set(provider.assignedTeamId, current);
    }
    return map;
  }, [snapshot]);

  const visibleConversation = useMemo(
    () => snapshot.conversationFeed.filter((item) => !item.teamId || item.teamId === selectedTeam.id),
    [selectedTeam.id, snapshot.conversationFeed],
  );
  const interactionTrace = useMemo(
    () => [...visibleConversation].slice(0, 4).reverse(),
    [visibleConversation],
  );

  const activeSession = useMemo(
    () =>
      terminalSessions.find((item) => item.id === selectedSessionId && item.status === "running") ??
      terminalSessions.find((item) => item.status === "running") ??
      null,
    [selectedSessionId, terminalSessions],
  );

  const visibleTerminalRuns = terminalRuns.slice(0, 1);
  const recentHandoffs = snapshot.handoffs.slice(0, 4);
  const recentExecutions = useMemo(() => {
    const merged = snapshot.autonomy.currentExecution
      ? [snapshot.autonomy.currentExecution, ...snapshot.autonomy.executionHistory]
      : snapshot.autonomy.executionHistory;

    const seen = new Set<string>();
    return merged.filter((execution) => {
      if (seen.has(execution.id)) {
        return false;
      }
      seen.add(execution.id);
      return true;
    }).slice(0, 3);
  }, [snapshot.autonomy.currentExecution, snapshot.autonomy.executionHistory]);
  const terminalPresetCommands = [
    "corepack pnpm ops -- status",
    `corepack pnpm ops -- directive "${t(locale, "홈페이지 품질 개선 계속", "Continue improving homepage quality")}"`,
    `corepack pnpm ops -- focus ${selectedTeam.id} "Focus on ${selectedTeam.name}."`,
    `corepack pnpm ops -- assign codex ${selectedTeam.id} "Codex moved to ${selectedTeam.name}."`,
    "git status --short",
  ];

  const runTerminalCommand = async (commandValue?: string) => {
    const command = (commandValue ?? terminalCommand).trim();
    if (!command || isRunningTerminalCommand) {
      return;
    }

    const pendingId = `terminal-${Date.now()}`;
    setTerminalRequestError(null);
    setIsRunningTerminalCommand(true);
    setTerminalRuns((current) => [
      {
        id: pendingId,
        command,
        cwd: "repository root",
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
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ command }),
      });

      if (!response.ok) {
        throw new Error(t(locale, "명령 실행 요청이 실패했습니다.", "Command execution failed."));
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
      const message = error instanceof Error ? error.message : t(locale, "알 수 없는 오류", "Unknown error");
      setTerminalRequestError(message);
      setTerminalRuns((current) =>
        current.map((run) =>
          run.id === pendingId ? { ...run, stderr: message, exitCode: 1, status: "failed" } : run,
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
    setCreatingShellId(shellId);
    setSessionRequestError(null);
    try {
      const response = await fetch("/api/ops-terminal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "session.create",
          shellId,
          label: `${shellId} ${selectedTeam.name}`,
        }),
      });
      if (!response.ok) {
        throw new Error(t(locale, "세션 생성 실패", "Session creation failed."));
      }
      const payload = (await response.json()) as {
        session: OpsTerminalSessionSnapshot;
        availableShells: OpsShellPreset[];
        sessions: OpsTerminalSessionSnapshot[];
      };
      setAvailableShells(payload.availableShells);
      setTerminalSessions(payload.sessions);
      setSelectedSessionId(payload.session.id);
    } catch (error) {
      setSessionRequestError(error instanceof Error ? error.message : t(locale, "오류", "Error"));
    } finally {
      setCreatingShellId(null);
    }
  };

  const sendSessionInput = async () => {
    if (!activeSession || activeSession.status !== "running" || !sessionInput.trim() || isSendingSessionInput) {
      return;
    }
    setIsSendingSessionInput(true);
    setSessionRequestError(null);
    try {
      const response = await fetch("/api/ops-terminal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "session.input",
          sessionId: activeSession.id,
          input: sessionInput,
        }),
      });
      if (!response.ok) {
        throw new Error(t(locale, "세션 입력 실패", "Session input failed."));
      }
      const payload = (await response.json()) as { sessions: OpsTerminalSessionSnapshot[] };
      setTerminalSessions(payload.sessions);
    } catch (error) {
      setSessionRequestError(error instanceof Error ? error.message : t(locale, "오류", "Error"));
    } finally {
      setIsSendingSessionInput(false);
    }
  };

  const sendCommandToSession = async (commandValue?: string) => {
    const command = (commandValue ?? terminalCommand).trim();
    if (!command || isDispatchingCommandToSession) {
      return;
    }

    setSessionRequestError(null);
    setIsDispatchingCommandToSession(true);

    try {
      let targetSession = activeSession;

      if (!targetSession || targetSession.status !== "running") {
        const defaultShellId = availableShells[0]?.id ?? "powershell";
        const createResponse = await fetch("/api/ops-terminal", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "session.create",
            shellId: defaultShellId,
            label: `${defaultShellId} ${selectedTeam.name}`,
          }),
        });

        if (!createResponse.ok) {
          throw new Error(t(locale, "세션 생성 실패", "Session creation failed."));
        }

        const createPayload = (await createResponse.json()) as {
          session: OpsTerminalSessionSnapshot;
          availableShells: OpsShellPreset[];
          sessions: OpsTerminalSessionSnapshot[];
        };

        setAvailableShells(createPayload.availableShells);
        setTerminalSessions(createPayload.sessions);
        setSelectedSessionId(createPayload.session.id);
        targetSession = createPayload.session;
      }

      const inputResponse = await fetch("/api/ops-terminal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "session.input",
          sessionId: targetSession.id,
          input: command,
        }),
      });

      if (!inputResponse.ok) {
        throw new Error(t(locale, "세션 입력 실패", "Session input failed."));
      }

      const inputPayload = (await inputResponse.json()) as { sessions: OpsTerminalSessionSnapshot[] };
      setTerminalSessions(inputPayload.sessions);
      setSessionInput(command);
    } catch (error) {
      setSessionRequestError(error instanceof Error ? error.message : t(locale, "오류", "Error"));
    } finally {
      setIsDispatchingCommandToSession(false);
    }
  };

  const stopActiveSession = async () => {
    if (!activeSession || activeSession.status !== "running" || isStoppingSession) {
      return;
    }
    setIsStoppingSession(true);
    setSessionRequestError(null);
    try {
      const response = await fetch("/api/ops-terminal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "session.stop",
          sessionId: activeSession.id,
        }),
      });
      if (!response.ok) {
        throw new Error(t(locale, "세션 종료 실패", "Session stop failed."));
      }
      const payload = (await response.json()) as { sessions: OpsTerminalSessionSnapshot[] };
      setTerminalSessions(payload.sessions);
    } catch (error) {
      setSessionRequestError(error instanceof Error ? error.message : t(locale, "오류", "Error"));
    } finally {
      setIsStoppingSession(false);
    }
  };

  return (
    <div className={styles.shell}>
      <section className={styles.operationsWorkbench}>
        <article className={`${styles.panel} ${styles.sectionPanel}`}>
          <span className={styles.sectionLabel}>{copy.terminalLabel}</span>
          <h2 className={styles.sectionTitle}>{copy.terminalTitle}</h2>
          <p className={styles.sectionBody}>{copy.terminalBody}</p>

          <div className={styles.terminalWorkbenchGrid}>
            <div className={styles.terminalSessionColumn}>
              <div className={styles.terminalSessionPanel}>
                <div className={styles.terminalSessionHead}>
                  <div>
                    <span className={styles.agentLabel}>{copy.sessionLabel}</span>
                    <strong className={styles.terminalSessionTitle}>{copy.sessionTitle}</strong>
                    <p className={styles.terminalSessionBody}>{copy.sessionBody}</p>
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
                    {activeSession ? activeSession.status : copy.noSession}
                  </span>
                </div>

                <div className={styles.terminalSessionLaunchRow}>
                  <span className={styles.agentLabel}>{copy.sessionLaunchLabel}</span>
                  <div className={styles.shellPresetRow}>
                    {availableShells.map((shell) => (
                      <button
                        key={shell.id}
                        type="button"
                        className={styles.shellPresetButton}
                        onClick={() => void createTerminalSession(shell.id)}
                        disabled={Boolean(creatingShellId)}
                      >
                        {creatingShellId === shell.id ? copy.creating : shell.label}
                      </button>
                    ))}
                  </div>
                </div>

                {sessionRequestError ? (
                  <div className={styles.terminalInlineError}>
                    <strong>{copy.terminalErrorLabel}</strong>
                    <span>{sessionRequestError}</span>
                  </div>
                ) : null}

                <div className={styles.sessionList}>
                  {terminalSessions.filter((item) => item.status === "running").length ? (
                    terminalSessions
                      .filter((item) => item.status === "running")
                      .map((session) => (
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
                            <span className={`${styles.statusBadge} ${styles.statusActive}`}>
                              {session.shellLabel}
                            </span>
                          </div>
                          <div className={styles.sessionCardMeta}>
                            <span>{copy.cwdField}: {session.cwd}</span>
                            <span>{copy.updatedField}: {formatBoardTimestamp(locale, session.updatedAt)}</span>
                          </div>
                        </button>
                      ))
                  ) : (
                    <div className={styles.terminalEmpty}>{copy.transcriptEmpty}</div>
                  )}
                </div>

                <div className={styles.sessionTranscriptCard}>
                  <div className={styles.terminalComposerHead}>
                    <span className={styles.agentLabel}>{copy.transcriptLabel}</span>
                    {activeSession ? (
                      <span className={styles.runtimeMeta}>{copy.cwdField}: <code>{activeSession.cwd}</code></span>
                    ) : null}
                  </div>

                  <pre className={styles.sessionTranscript}>
                    {activeSession?.transcript || copy.transcriptEmpty}
                  </pre>

                  <div className={styles.sessionInputMeta}>
                    <span className={styles.runtimeMeta}>
                      {activeSession
                        ? `${copy.updatedField} ${formatBoardTimestamp(locale, activeSession.updatedAt)}`
                        : copy.selectPrompt}
                    </span>
                    {activeSession?.lastInput ? (
                      <span className={styles.runtimeMeta}>
                        {copy.lastInputField}: <code>{activeSession.lastInput}</code>
                      </span>
                    ) : null}
                  </div>

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
                    placeholder={copy.inputPlaceholder}
                    rows={3}
                    disabled={!activeSession}
                  />

                  <div className={styles.terminalActionRow}>
                    <span className={styles.runtimeMeta}>{copy.localOnly}</span>
                    <div className={styles.sessionActionRow}>
                      <button
                        type="button"
                        className={styles.terminalRunButton}
                        onClick={() => void sendSessionInput()}
                        disabled={!activeSession || isSendingSessionInput}
                      >
                        <Play size={16} />
                        {isSendingSessionInput ? copy.sending : copy.send}
                      </button>
                      <button
                        type="button"
                        className={styles.terminalSecondaryButton}
                        onClick={() => void stopActiveSession()}
                        disabled={!activeSession || isStoppingSession}
                      >
                        {isStoppingSession ? copy.stopping : copy.stop}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.terminalCommandColumn}>
              <div className={styles.terminalComposer}>
                <div className={styles.terminalComposerHead}>
                  <span className={styles.agentLabel}>{copy.terminalInputLabel}</span>
                  <span
                    className={`${styles.statusBadge} ${
                      isRunningTerminalCommand ? styles.statusActive : styles.statusDone
                    }`}
                  >
                    {isRunningTerminalCommand ? copy.terminalRunning : copy.terminalRun}
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
                  placeholder={copy.terminalPlaceholder}
                  rows={3}
                />

                <div className={styles.terminalActionRow}>
                  <span className={styles.runtimeMeta}>{copy.terminalHint}</span>
                  <div className={styles.sessionActionRow}>
                    <button
                      type="button"
                      className={styles.terminalAuxButton}
                      onClick={() => void sendCommandToSession()}
                      disabled={isDispatchingCommandToSession}
                    >
                      {isDispatchingCommandToSession ? copy.dispatchingToSession : copy.sendToSession}
                    </button>
                    <button
                      type="button"
                      className={styles.terminalRunButton}
                      onClick={() => void runTerminalCommand()}
                      disabled={isRunningTerminalCommand}
                    >
                      <Play size={16} />
                      {isRunningTerminalCommand ? copy.terminalRunning : copy.terminalRun}
                    </button>
                  </div>
                </div>

                <span className={styles.runtimeMeta}>{copy.terminalModeHint}</span>
              </div>

              <div className={styles.promptDeck}>
                <span className={styles.agentLabel}>{copy.terminalExamplesLabel}</span>
                <div className={styles.commandPresetGrid}>
                  {terminalPresetCommands.map((command) => (
                    <button
                      key={command}
                      type="button"
                      className={styles.commandPresetCard}
                      onClick={() => setTerminalCommand(command)}
                      disabled={isRunningTerminalCommand}
                    >
                      {command}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.terminalHistory}>
                <div className={styles.terminalHistoryHead}>
                  <span className={styles.agentLabel}>{copy.terminalHistoryLabel}</span>
                  <TerminalSquare size={18} />
                </div>

                {terminalRequestError ? (
                  <div className={styles.terminalInlineError}>
                    <strong>{copy.terminalErrorLabel}</strong>
                    <span>{terminalRequestError}</span>
                  </div>
                ) : null}

                {visibleTerminalRuns.length ? (
                  <div className={styles.terminalRunList}>
                    {visibleTerminalRuns.map((run) => (
                      <article className={styles.terminalRunCard} key={run.id}>
                        <div className={styles.terminalRunHead}>
                          <div className={styles.terminalRunMetaBlock}>
                            <strong>{run.command}</strong>
                            <span className={styles.runtimeMeta}>{formatBoardTimestamp(locale, run.ranAt)}</span>
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
                            {run.status}
                          </span>
                        </div>

                        <div className={styles.terminalRunMeta}>
                          <span>{copy.terminalCwdLabel}: <code>{run.cwd}</code></span>
                          <span>{copy.terminalExitLabel}: {run.status === "running" ? "..." : run.exitCode}</span>
                        </div>

                        {run.stdout ? (
                          <div className={styles.terminalOutputBlock}>
                            <span className={styles.agentLabel}>{copy.terminalOutputLabel}</span>
                            <pre>{run.stdout}</pre>
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className={styles.terminalEmpty}>{copy.terminalHistoryEmpty}</div>
                )}
              </div>
            </div>
          </div>
        </article>

        <article className={`${styles.panel} ${styles.sectionPanel} ${styles.assistantConsole}`}>
          <div className={styles.assistantConsoleHead}>
            <div>
              <span className={styles.sectionLabel}>{copy.assistantLabel}</span>
              <h2 className={styles.sectionTitle}>{snapshot.assistant.name}</h2>
              <p className={styles.sectionBody}>{copy.assistantSummary}</p>
            </div>
            <span className={`${styles.statusBadge} ${styles.stateRunning}`}>{copy.assistantOnline}</span>
          </div>

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

          <div className={styles.teamSwitchboard}>
            {snapshot.teams.map((team) => (
              <button
                key={team.id}
                type="button"
                className={`${styles.teamSwitchCard}${selectedTeam.id === team.id ? ` ${styles.teamSwitchCardActive}` : ""}`}
                onClick={() => setSelectedTeamOverride(team.id)}
              >
                <div className={styles.teamCardHead}>
                  <div>
                    <strong>{team.name}</strong>
                    <span>{team.lead}</span>
                  </div>
                  <span className={`${styles.statusBadge} ${teamClassMap[team.state]}`}>
                    {team.state}
                  </span>
                </div>
                <div className={styles.teamSwitchMeta}>
                  <span>{getTeamMemberCountLabel(locale, team.members.length)}</span>
                  <span>{team.lane}</span>
                </div>
              </button>
            ))}
          </div>

          <div className={styles.runtimeGrid}>
            <div className={styles.runtimeCard}>
              <span className={styles.agentLabel}>{copy.currentDirective}</span>
              <div className={styles.runtimeHead}>
                <strong>{formatDirectiveTitle(locale, snapshot.currentDirective.title)}</strong>
                <span className={`${styles.statusBadge} ${styles.directiveBadge}`}>
                  {snapshot.currentDirective.status}
                </span>
              </div>
              <p>{snapshot.currentDirective.body}</p>
              <span className={styles.runtimeMeta}>
                {formatDirectiveSource(locale, snapshot.currentDirective.source)} {copy.directiveAt}{" "}
                {formatBoardTimestamp(locale, snapshot.currentDirective.issuedAt)}
              </span>
            </div>

            <div className={styles.runtimeCard}>
              <span className={styles.agentLabel}>{copy.currentFocus}</span>
              <div className={styles.runtimeHead}>
                <strong>{snapshot.assistant.currentFocus}</strong>
                <span className={`${styles.statusBadge} ${styles.statusActive}`}>{assistantMode.label}</span>
              </div>
              <p>{assistantMode.teamInstruction}</p>
              <span className={styles.runtimeMeta}>{assistantMode.resumeRule}</span>
            </div>
          </div>

          <div className={styles.assistantConsoleGrid}>
            <div className={styles.autonomyCard}>
              <span className={styles.agentLabel}>{copy.activeExecution}</span>
              <div className={styles.runtimeHead}>
                <strong>{snapshot.autonomy.activeProviderLabel}</strong>
                <span className={`${styles.statusBadge} ${styles.statusActive}`}>
                  {snapshot.autonomy.loopCount}
                </span>
              </div>
              <p>{snapshot.autonomy.latestSummary}</p>
              <span className={styles.runtimeMeta}>{snapshot.autonomy.operatorBrief}</span>
            </div>

            <div className={styles.assistantMiniStack}>
              <div className={styles.assistantMiniPanel}>
                <span className={styles.agentLabel}>{copy.providersLabel}</span>
                <div className={styles.assistantMiniList}>
                  {snapshot.providerConnections.map((provider) => (
                    <div className={styles.assistantMiniRow} key={provider.providerId}>
                      <strong>{provider.label}</strong>
                      <span className={`${styles.statusBadge} ${providerStatusClass(provider.status)}`}>
                        {getProviderStatusLabel(locale, provider.status)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.assistantMiniPanel}>
                <span className={styles.agentLabel}>{copy.handoffLabel}</span>
                <div className={styles.assistantMiniList}>
                  {recentHandoffs.slice(0, 3).map((event) => (
                    <div className={styles.assistantMiniRow} key={`${event.time}-${event.summary}`}>
                      <strong>{event.from} → {event.to}</strong>
                      <span className={`${styles.statusBadge} ${styles.statusDone}`}>{event.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className={styles.controlRoomPrime}>
        <div className={styles.primeHeader}>
          <div>
            <span className={styles.sectionLabel}>{copy.topologyLabel}</span>
            <h2 className={styles.primeTitle}>{copy.topologyTitle}</h2>
            <p className={styles.sectionBody}>{copy.topologyBody}</p>
          </div>
          <div className={styles.primeHeaderMeta}>
            <span className={styles.commandTowerChip}>
              {copy.generatedAt} {snapshot.generatedAt}
            </span>
            <span className={styles.commandTowerChip}>
              {copy.activeProvider}: {snapshot.autonomy.activeProviderLabel}
            </span>
            <span className={styles.commandTowerChip}>
              {copy.loopCount}: {snapshot.autonomy.loopCount}
            </span>
          </div>
        </div>

        <article className={`${styles.panel} ${styles.sectionPanel}`}>
          <div className={styles.controlTowerStage}>
            <div className={styles.commandRail}>
              <article className={`${styles.commandTowerCard} ${styles.commandTowerOperator}`}>
                <div className={styles.commandTowerHead}>
                  <span className={styles.flowNodeLabel}>Operator</span>
                  <span className={`${styles.statusBadge} ${styles.directiveBadge}`}>
                    {snapshot.currentDirective.status}
                  </span>
                </div>
                <div className={styles.commandTowerTitle}>
                  <UserRoundSearch size={18} />
                  <strong>{formatDirectiveTitle(locale, snapshot.currentDirective.title)}</strong>
                </div>
                <p className={styles.commandTowerBody}>{snapshot.currentDirective.body}</p>
              </article>

              <div className={styles.commandRailBridge}>
                <span className={styles.flowNodeLabel}>Top-down</span>
                <div className={styles.commandRailTrack} />
                <ArrowRightLeft size={18} />
                <div className={styles.commandRailTrack} />
              </div>

              <article className={`${styles.commandTowerCard} ${styles.commandTowerAssistant}`}>
                <div className={styles.commandTowerHead}>
                  <span className={styles.flowNodeLabel}>{copy.assistantLabel}</span>
                  <span className={`${styles.statusBadge} ${styles.statusActive}`}>{assistantMode.label}</span>
                </div>
                <div className={styles.commandTowerTitle}>
                  <Bot size={18} />
                  <strong>{snapshot.assistant.name}</strong>
                </div>
                <p className={styles.commandTowerBody}>{assistantMode.teamInstruction}</p>
              </article>
            </div>

            <section className={styles.teamTopologyStage}>
              <div className={styles.memberSwarmHead}>
                <div>
                  <span className={styles.flowNodeLabel}>{copy.teamLayerLabel}</span>
                  <h3 className={styles.swarmTitle}>
                    {t(locale, "팀별 실행 계층", "Per-team execution layer")}
                  </h3>
                  <p className={styles.swarmBody}>
                    {t(locale, "팀장, 연결 CLI, 팀원 상태를 한 카드에 묶었습니다.", "Each card groups the lead, attached CLI, and member state.")}
                  </p>
                </div>
                <Users2 size={18} />
              </div>

              <div className={styles.teamTopologyGrid}>
                {snapshot.teams.map((team) => {
                  const attachedProviders = providersByTeam.get(team.id) ?? [];
                  return (
                    <button
                      key={team.id}
                      type="button"
                      className={`${styles.teamTopologyCard}${selectedTeam.id === team.id ? ` ${styles.teamTopologyCardActive}` : ""}`}
                      onClick={() => setSelectedTeamOverride(team.id)}
                    >
                      <div className={styles.teamTopologyHead}>
                        <div>
                          <strong>{team.name}</strong>
                          <span>{team.lead}</span>
                        </div>
                        <span className={`${styles.statusBadge} ${teamClassMap[team.state]}`}>{team.state}</span>
                      </div>

                      <p className={styles.commandTowerBody}>{team.currentDeliverable}</p>

                      <div className={styles.teamTopologyMeta}>
                        <span className={styles.commandTowerChip}>{team.lane}</span>
                        {attachedProviders.length ? (
                          attachedProviders.map((provider) => (
                            <span className={styles.commandTowerChip} key={`${team.id}-${provider.providerId}`}>
                              {provider.label}
                            </span>
                          ))
                        ) : (
                          <span className={styles.commandTowerChipMuted}>{copy.noCli}</span>
                        )}
                      </div>

                      <div className={styles.teamTopologyMembers}>
                        {team.members.slice(0, 3).map((member) => (
                          <div className={styles.teamTopologyMemberRow} key={`${team.id}-${member.name}`}>
                            <div>
                              <strong>{member.name}</strong>
                              <span>{member.title}</span>
                            </div>
                            <span className={`${styles.stateBadge} ${stateClassMap[member.state]}`}>
                              {member.state}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className={styles.teamTopologyFooter}>
                        <span>{t(locale, "다음 handoff", "Next handoff")}</span>
                        <strong>{team.nextHandoff}</strong>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className={styles.interactionBoard}>
              <article className={styles.tracePanel}>
                <div className={styles.traceHead}>
                  <div>
                    <span className={styles.flowNodeLabel}>{copy.bottomUpLabel}</span>
                    <h3 className={styles.swarmTitle}>{t(locale, "보고 패킷과 handoff", "Report packets and handoffs")}</h3>
                    <p className={styles.swarmBody}>
                      {t(locale, "실행 결과와 팀 간 전달을 같이 보여줍니다.", "Execution results and handoffs stay in the same surface.")}
                    </p>
                  </div>
                  <MessageSquareShare size={18} />
                </div>

                <div className={styles.reportCardGrid}>
                  <article className={`${styles.reportCard} ${styles.reportCardPrimary}`}>
                    <span className={styles.flowNodeLabel}>{copy.latestPacket}</span>
                    <strong>{selectedTeam.currentDeliverable}</strong>
                    <p>{selectedTeam.objective}</p>
                  </article>

                  <article className={styles.reportCard}>
                    <span className={styles.flowNodeLabel}>{copy.assistantLabel}</span>
                    <strong>{snapshot.assistant.name}</strong>
                    <p>{snapshot.assistant.responsePacket}</p>
                  </article>

                  <article className={`${styles.reportCard} ${styles.reportCardAccent}`}>
                    <span className={styles.flowNodeLabel}>{copy.activeExecution}</span>
                    <strong>{snapshot.autonomy.activeProviderLabel}</strong>
                    <p>{snapshot.autonomy.latestSummary}</p>
                  </article>
                </div>

                <div className={styles.handoffRail}>
                  {recentHandoffs.map((event) => (
                    <article className={styles.handoffRow} key={`${event.time}-${event.summary}`}>
                      <div className={styles.handoffRoute}>
                        <strong>{event.from}</strong>
                        <ArrowRightLeft size={14} />
                        <strong>{event.to}</strong>
                      </div>
                      <p>{event.summary}</p>
                      <span className={styles.traceMeta}>
                        {formatBoardTimestamp(locale, event.time)} 쨌 {event.status}
                      </span>
                    </article>
                  ))}
                </div>
              </article>

              <article className={styles.tracePanel}>
                <div className={styles.traceHead}>
                  <div>
                    <span className={styles.flowNodeLabel}>{copy.traceLabel}</span>
                    <h3 className={styles.swarmTitle}>{t(locale, "누가 누구와 말하는지", "Who is talking to whom")}</h3>
                    <p className={styles.swarmBody}>
                      {t(locale, "선택한 팀 기준으로 비서, 팀장, 리뷰 흐름을 바로 따라갑니다.", "Follow the assistant, lead, and review flow for the selected team.")}
                    </p>
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
                            {formatBoardTimestamp(locale, event.time)} 쨌 {event.channel}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className={styles.terminalEmpty}>{copy.noTrace}</div>
                )}

                {recentExecutions.length ? (
                  <div className={styles.executionMicroList}>
                    {recentExecutions.map((execution) => (
                      <div className={styles.executionMicroRow} key={execution.id}>
                        <strong>{execution.teamLabel}</strong>
                        <span className={`${styles.statusBadge} ${styles.statusDone}`}>
                          {execution.outcome}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
