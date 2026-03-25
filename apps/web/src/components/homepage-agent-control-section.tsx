"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Cable,
  Check,
  Copy,
  Command,
  Network,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Waypoints,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { buildAgentOpsSetupManifest } from "@/lib/agent-ops-setup";
import type { AgentOperationsSnapshot, ProviderStatus } from "@/lib/agent-operations-snapshot";
import { formatAgentOpsTimestamp } from "@/lib/agent-ops-time";

import styles from "./homepage-agent-control-section.module.css";

interface HomepageAgentControlSectionProps {
  initialSnapshot: AgentOperationsSnapshot;
  locale: string;
  opsEnabled: boolean;
}

const providerOrder = ["codex", "claude", "gemini"] as const;

function isKoreanLocale(locale: string) {
  return locale === "ko";
}

function formatBoardTimestamp(locale: string, value: string) {
  return formatAgentOpsTimestamp(locale, value);
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

function getProviderStatusClass(status: ProviderStatus) {
  switch (status) {
    case "connected":
      return styles.statusConnected;
    case "ready":
      return styles.statusReady;
    case "attention":
      return styles.statusAttention;
  }
}

function getNextSetupActionLabel(locale: string, status: ProviderStatus) {
  if (isKoreanLocale(locale)) {
    return status === "connected" ? "팀 배정" : "CLI 연결";
  }

  return status === "connected" ? "Assign team" : "Connect CLI";
}

function getSetupCommandTitle(locale: string, kind: "connect" | "assign") {
  if (isKoreanLocale(locale)) {
    return kind === "connect" ? "CLI ?곌껐" : "? 諛곗젙";
  }

  return kind === "connect" ? "Connect CLI" : "Assign team";
}

function getSetupFlowLabel(locale: string) {
  if (isKoreanLocale(locale)) {
    return "?ㅼ젙 ?먮쫫";
  }

  return "Setup flow";
}

function getCopy(locale: string, opsEnabled: boolean) {
  if (isKoreanLocale(locale)) {
    return {
      eyebrow: "에이전트 컨트롤 레이어",
      title: "홈페이지에서 바로\n비서와 멀티 에이전트 팀을 세팅합니다",
      body:
        "CLI 세션을 연결하고 팀을 배정하여 즉시 운영을 시작하세요. 연결된 에이전트의 상태와 할당 흐름을 실시간으로 확인할 수 있습니다.",
      assistantLabel: "전담 비서 상태",
      assistantSummary: "현재 운영 약속",
      directiveLabel: "현재 지시",
      providersLabel: "연결 가능한 CLI",
      providersTitle: "터미널 연결과 팀 배정을 홈페이지에서 설명하고 추적",
      providersBody:
        "브라우저가 로컬 터미널을 직접 제어하지는 않지만, 각 개발자는 CLI 세션을 로컬 브리지에 등록하고 이 페이지에서 연결 상태를 확인할 수 있습니다.",
      setupBuilderLabel: "홈페이지 셋업 빌더",
      setupBuilderTitle: "두 명령으로 CLI 연결",
      setupBuilderBody: "CLI와 팀을 고른 뒤 강조된 명령만 로컬 터미널에서 실행하면 됩니다.",
      connectCommand: "연결 명령 복사",
      assignCommand: "재배정 명령 복사",
      copied: "복사됨",
      openBrief: "브리프 열기",
      commandOrder: "2단계 설정",
      activeSetup: "현재 셋업",
      selectedCli: "선택 CLI",
      selectedTeamLabel: "선택 팀",
      statusLabel: "상태",
      nextActionLabel: "다음",
      runCommandLabel: "명령 실행",
      chooseProvider: "CLI 선택",
      chooseTeam: "팀 선택",
      setupCommand: "셋업 명령",
      assignedTeam: "배정 팀",
      heartbeat: "최근 업데이트",
      setupStepsLabel: "셋업 순서",
      setupSteps: [
        "홈페이지에서 붙일 CLI와 팀을 선택합니다.",
        "생성된 connect 또는 assign 명령을 복사합니다.",
        "각 개발자 로컬 터미널에서 명령을 실행합니다.",
        "홈페이지와 내부 관제실에서 연결 상태와 분배 흐름을 확인합니다.",
      ],
      allocationLabel: "분배 흐름",
      allocationTitle: "비서 -> 팀 리드 -> CLI 에이전트 배정",
      allocationBody:
        "비서는 지시를 받고 팀별 레인으로 나누며, 연결된 CLI 에이전트는 각 팀 카드에 소유권과 함께 매핑됩니다.",
      openOps: "내부 관제실 열기",
      opsNote: opsEnabled
        ? "로컬 개발 또는 demo preview에서는 상세 관제실로 바로 들어갈 수 있습니다."
        : "상세 관제실은 내부 preview나 로컬 개발 환경에서만 열립니다.",
      futureLabel: "향후 지식 레이어",
      futureTitle: "학교/랩 맞춤형 LLM 운영면으로 확장",
      futureBody:
        "울산대학교, 울산대학원, 랩 홈페이지 자료, 제출 문서, 내부 운영 규칙을 구조화하면 이후 파인튜닝 또는 지식 기반 LLM이 이 관제 레이어 위에서 더 쉽게 움직일 수 있습니다.",
      futurePoints: [
        "학교/대학원별 정보 팩을 LLM 지식 레이어로 연결",
        "랩 홈페이지 정보와 운영 문서를 같은 구조 안에서 검색 및 재조합",
        "문서 보관함과 public 홈페이지를 에이전트가 같은 맥락으로 다루도록 확장",
      ],
      liveCount: "연결된 에이전트",
      queueMode: "현재 비서 모드",
    };
  }

  return {
    eyebrow: "Agent control layer",
    title: "Set up your assistant\nand multi-agent team from the homepage",
    body:
      "Connect CLI sessions and assign teams to start operations. Monitor agent status and allocation flows in real-time.",
    assistantLabel: "Dedicated assistant",
    assistantSummary: "Current operating promise",
    directiveLabel: "Current directive",
    providersLabel: "CLI connections",
    providersTitle: "Scan bridge status and team assignment at a glance",
    providersBody:
      "Each developer registers a local CLI session with the bridge, and this page keeps connection state and team ownership visible.",
    setupBuilderLabel: "Homepage setup builder",
    setupBuilderTitle: "Choose a CLI, run the next command",
    setupBuilderBody: "Select a CLI and team, then run only the highlighted command in the local terminal.",
    connectCommand: "Copy connect command",
    assignCommand: "Copy assign command",
    copied: "Copied",
    openBrief: "Brief",
    commandOrder: "2-step setup",
    activeSetup: "Active setup",
    selectedCli: "Selected CLI",
    selectedTeamLabel: "Selected team",
    statusLabel: "Status",
    nextActionLabel: "Next",
    runCommandLabel: "Run command",
    chooseProvider: "CLI",
    chooseTeam: "Team",
    setupCommand: "Setup command",
    assignedTeam: "Assigned team",
    heartbeat: "Recent update",
    setupStepsLabel: "Setup steps",
    setupSteps: [
      "Choose the CLI and team you want to attach from the homepage.",
      "Copy the generated connect or assign command.",
      "Run the command in the developer's local terminal.",
      "Confirm the connection state and allocation flow from the homepage or internal ops room.",
    ],
    allocationLabel: "Work allocation",
    allocationTitle: "Assistant -> team lead -> CLI assignment",
    allocationBody:
      "The assistant receives directives, splits them into team lanes, and maps connected CLI agents onto each team card with visible ownership.",
    openOps: "Open internal ops",
    opsNote: opsEnabled
      ? "In local development or demo preview, you can jump straight into the detailed control room."
      : "The detailed ops room is available only in local development or internal preview deployments.",
    futureLabel: "Future knowledge layer",
    futureTitle: "Extend this into school- and lab-tuned LLM operations",
    futureBody:
      "Once university pages, lab sites, submitted documents, and operating rules are structured, a fine-tuned or knowledge-grounded LLM can run on top of the same control layer much more safely.",
    futurePoints: [
      "Connect university- and graduate-school-specific knowledge packs",
      "Search and recombine lab website materials and operating documents inside one structure",
      "Let agents operate across the document bank and public site with one shared context",
    ],
    liveCount: "Connected agents",
    queueMode: "Current assistant mode",
  };
}

export function HomepageAgentControlSection({
  initialSnapshot,
  locale,
  opsEnabled,
}: HomepageAgentControlSectionProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [selectedProviderId, setSelectedProviderId] = useState<(typeof providerOrder)[number]>("codex");
  const [selectedTeamId, setSelectedTeamId] = useState(initialSnapshot.selectedTeamId);
  const [copiedCommand, setCopiedCommand] = useState<"connect" | "assign" | null>(null);
  const copy = getCopy(locale, opsEnabled);

  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      try {
        const response = await fetch(`/api/ops-state?locale=${locale}`, { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const nextSnapshot = (await response.json()) as AgentOperationsSnapshot;
        if (mounted) {
          setSnapshot(nextSnapshot);
        }
      } catch {
        // Keep the latest homepage preview state when polling fails.
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

  const connectedCount = useMemo(
    () => snapshot.providerConnections.filter((entry) => entry.status === "connected").length,
    [snapshot.providerConnections],
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

  const selectedProvider =
    snapshot.providerConnections.find((entry) => entry.providerId === selectedProviderId) ??
    snapshot.providerConnections[0];
  const selectedTeam =
    snapshot.teams.find((entry) => entry.id === selectedTeamId) ?? snapshot.teams[0];
  const nextCommandKind: "connect" | "assign" =
    selectedProvider?.status === "connected" ? "assign" : "connect";
  const setupManifest = useMemo(() => {
    if (!selectedProvider || !selectedTeam) {
      return null;
    }

    return buildAgentOpsSetupManifest(
      snapshot,
      locale,
      selectedProvider.providerId,
      selectedTeam.id,
    );
  }, [locale, selectedProvider, selectedTeam, snapshot]);
  const setupBriefHref =
    selectedProvider && selectedTeam
      ? `/api/ops-setup?locale=${locale}&provider=${selectedProvider.providerId}&team=${selectedTeam.id}&format=txt`
      : null;
  const setupCommandCards = setupManifest
    ? [
        {
          kind: "connect" as const,
          step: "01",
          title: getSetupCommandTitle(locale, "connect"),
          command: setupManifest.commands.connect,
          buttonLabel: copy.connectCommand,
        },
        {
          kind: "assign" as const,
          step: "02",
          title: getSetupCommandTitle(locale, "assign"),
          command: setupManifest.commands.assign,
          buttonLabel: copy.assignCommand,
        },
      ]
    : [];
  const orderedSetupCommandCards = setupCommandCards.slice().sort((left, right) => {
    if (left.kind === nextCommandKind) {
      return -1;
    }

    if (right.kind === nextCommandKind) {
      return 1;
    }

    return left.step.localeCompare(right.step);
  });
  const nextSetupCommand = setupCommandCards.find((item) => item.kind === nextCommandKind) ?? null;
  const setupFlowLabel = getSetupFlowLabel(locale);
  const copyCommand = async (kind: "connect" | "assign") => {
    const value =
      kind === "connect" ? setupManifest?.commands.connect ?? "" : setupManifest?.commands.assign ?? "";

    try {
      await navigator.clipboard.writeText(value);
      setCopiedCommand(kind);
      window.setTimeout(() => setCopiedCommand((current) => (current === kind ? null : current)), 1800);
    } catch {
      // Ignore clipboard failures in unsupported contexts.
    }
  };

  return (
    <div className={styles.shell}>
      <div className={styles.header}>
        <div className={styles.lead}>
          <span className={styles.eyebrow}>{copy.eyebrow}</span>
          <h2 className={styles.title}>{copy.title}</h2>
        </div>

        <div className={styles.summaryGrid}>
          <article className={styles.summaryCard}>
            <span className={styles.metaLabel}>{copy.liveCount}</span>
            <strong>{String(connectedCount).padStart(2, "0")}</strong>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.metaLabel}>{copy.queueMode}</span>
            <strong>{snapshot.assistant.modes.find((item) => item.id === snapshot.activeMode)?.label}</strong>
          </article>
        </div>
      </div>

      <div className={styles.heroGrid}>
        <article className={styles.heroCard}>
          <div className={styles.cardHead}>
            <div>
              <span className={styles.metaLabel}>{copy.assistantLabel}</span>
              <h3>{snapshot.assistant.name}</h3>
            </div>
            <Bot size={20} />
          </div>

          <div className={styles.heroInfoStrip}>
            <div className={styles.infoStripItem}>
              <span className={styles.metaLabel}>{copy.assistantSummary}</span>
              <strong>{snapshot.assistant.promise}</strong>
            </div>

            <div className={styles.infoStripItem}>
              <span className={styles.metaLabel}>{copy.directiveLabel}</span>
              <strong>{snapshot.currentDirective.title}</strong>
              <span className={styles.inlineMeta}>
                {formatBoardTimestamp(locale, snapshot.currentDirective.issuedAt)}
              </span>
            </div>
          </div>

          <div className={styles.actionRow}>
            {opsEnabled ? (
              <Link href={`/${locale}/ops`} className={styles.primaryLink}>
                {copy.openOps}
                <ArrowRight size={16} />
              </Link>
            ) : null}
            <span className={styles.inlineMeta}>{copy.opsNote}</span>
          </div>
        </article>

        <article className={styles.providerPanel}>
          <article className={styles.setupBuilderCard}>
            <div className={styles.setupHeader}>
              <div className={styles.setupTitleBlock}>
                <span className={styles.setupEyebrow}>{copy.setupBuilderLabel}</span>
                <h4>{copy.setupBuilderTitle}</h4>
                <div
                  className={styles.setupScanBar}
                  aria-label={copy.setupStepsLabel}
                  title={setupFlowLabel}
                >
                  <span className={styles.setupScanItem}>
                    <span className={styles.commandStep}>01</span>
                    <span className={styles.setupScanLabel}>{copy.selectedCli}</span>
                    <strong>{selectedProvider?.label ?? "-"}</strong>
                  </span>
                  <span className={styles.setupScanArrow} aria-hidden="true">
                    <ArrowRight size={14} />
                  </span>
                  <span className={styles.setupScanItem}>
                    <span className={styles.commandStep}>02</span>
                    <span className={styles.setupScanLabel}>{copy.selectedTeamLabel}</span>
                    <strong>{selectedTeam?.name ?? "-"}</strong>
                  </span>
                  <span className={styles.setupScanArrow} aria-hidden="true">
                    <ArrowRight size={14} />
                  </span>
                  <span className={`${styles.setupScanItem} ${styles.setupScanItemAccent}`}>
                    <span className={styles.commandStep}>03</span>
                    <span className={styles.setupScanLabel}>{copy.runCommandLabel}</span>
                    <strong>{nextSetupCommand?.title ?? copy.setupCommand}</strong>
                  </span>
                </div>
              </div>
              <div className={styles.setupHeaderActions}>
                <div className={styles.panelHeadIcon}>
                  <TerminalSquare size={20} />
                </div>
                {setupBriefHref ? (
                  <Link href={setupBriefHref} className={styles.secondaryLink} target="_blank">
                    {copy.openBrief}
                    <ArrowRight size={16} />
                  </Link>
                ) : null}
              </div>
            </div>
            <div className={styles.setupPickerGrid}>
              <div className={styles.setupPicker} aria-label={copy.chooseProvider}>
                <span className={styles.setupPickerLabel}>{copy.chooseProvider}</span>
                <div className={styles.optionRow}>
                  {providerOrder.map((providerId) => {
                    const provider = snapshot.providerConnections.find((entry) => entry.providerId === providerId);
                    if (!provider) {
                      return null;
                    }

                    return (
                      <button
                        key={provider.providerId}
                        type="button"
                        className={`${styles.optionButton}${
                          selectedProviderId === provider.providerId ? ` ${styles.optionButtonActive}` : ""
                        }`}
                        onClick={() => setSelectedProviderId(provider.providerId)}
                      >
                        <span className={styles.optionButtonText}>{provider.label}</span>
                        <span
                          className={`${styles.inlineStatusBadge} ${getProviderStatusClass(provider.status)}`}
                        >
                          {getProviderStatusLabel(locale, provider.status)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={styles.setupPicker} aria-label={copy.chooseTeam}>
                <span className={styles.setupPickerLabel}>{copy.chooseTeam}</span>
                <div className={styles.optionRow}>
                  {snapshot.teams.map((team) => (
                    <button
                      key={team.id}
                      type="button"
                      className={`${styles.optionButton}${
                        selectedTeamId === team.id ? ` ${styles.optionButtonActive}` : ""
                      }`}
                      onClick={() => setSelectedTeamId(team.id)}
                    >
                      {team.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {nextSetupCommand ? (
              <div className={styles.nextCommandStrip}>
                <div className={styles.nextCommandLead}>
                  <span className={styles.metaLabel}>{copy.nextActionLabel}</span>
                  <strong>{nextSetupCommand.title}</strong>
                  <span className={styles.inlineMeta}>
                    {nextSetupCommand.kind === "connect"
                      ? selectedProvider?.label ?? "-"
                      : selectedTeam?.name ?? "-"}
                  </span>
                </div>
                <div className={styles.nextCommandMain}>
                  <span className={styles.commandStep}>{nextSetupCommand.step}</span>
                  <code>{nextSetupCommand.command}</code>
                  <button
                    type="button"
                    className={`${styles.copyButton} ${styles.copyIconButton}`}
                    onClick={() => void copyCommand(nextSetupCommand.kind)}
                    aria-label={nextSetupCommand.buttonLabel}
                    title={nextSetupCommand.buttonLabel}
                  >
                    {copiedCommand === nextSetupCommand.kind ? <Check size={14} /> : <Copy size={14} />}
                    <span className={styles.copyButtonText}>
                      {copiedCommand === nextSetupCommand.kind ? copy.copied : nextSetupCommand.buttonLabel}
                    </span>
                  </button>
                </div>
              </div>
            ) : null}

            <details className={styles.setupCommandsDisclosure}>
              <summary className={styles.setupCommandsSummary}>
                <div className={styles.setupCommandsSummaryCopy}>
                  <span className={styles.metaLabel}>{copy.commandOrder}</span>
                  <strong>
                    {nextSetupCommand
                      ? `${nextSetupCommand.step}. ${nextSetupCommand.title}`
                      : copy.setupCommand}
                  </strong>
                </div>
                <span className={styles.setupCommandsHint}>
                  {isKoreanLocale(locale) ? "?紐⑤뱺 紐낅졊 蹂닿린" : "View both commands"}
                </span>
              </summary>

              <div className={styles.setupCommands} aria-label={copy.setupStepsLabel}>
                {orderedSetupCommandCards.map((item) => (
                  <div
                    className={`${styles.copyCard} ${
                      item.kind === nextCommandKind ? styles.copyCardPrimary : styles.copyCardMuted
                    }`}
                    key={item.kind}
                  >
                    <div className={styles.copyMetaRow}>
                      <div className={styles.copyTitleGroup}>
                        <span className={styles.commandStep}>{item.step}</span>
                        <div className={styles.commandTitleBlock}>
                          <strong className={styles.commandTitle}>{item.title}</strong>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`${styles.copyButton} ${styles.copyIconButton}`}
                        onClick={() => void copyCommand(item.kind)}
                        aria-label={item.buttonLabel}
                        title={item.buttonLabel}
                      >
                        {copiedCommand === item.kind ? <Check size={14} /> : <Copy size={14} />}
                        <span className={styles.copyButtonText}>
                          {copiedCommand === item.kind ? copy.copied : item.buttonLabel}
                        </span>
                      </button>
                    </div>
                    <div className={styles.commandRow}>
                      <code>{item.command}</code>
                      <span
                        className={`${styles.commandTarget} ${
                          item.kind === nextCommandKind ? styles.commandTargetActive : ""
                        }`}
                      >
                        {item.kind === "connect" ? selectedProvider?.label ?? "-" : selectedTeam?.name ?? "-"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </details>

            {setupManifest ? (
              <details className={styles.setupNotesDisclosure}>
                <summary className={styles.setupNotesSummary}>
                  <div className={styles.setupNotesSummaryCopy}>
                    <span className={styles.metaLabel}>
                      {isKoreanLocale(locale) ? "설정 체크" : "Setup checks"}
                    </span>
                    <strong>
                      {isKoreanLocale(locale)
                        ? "사전 조건, 운영 약속, 성공 신호"
                        : "Prerequisites, working agreement, and success signals"}
                    </strong>
                  </div>
                  <span className={styles.setupNotesHint}>
                    {isKoreanLocale(locale) ? "펼치기" : "Expand"}
                  </span>
                </summary>

                <div className={styles.setupNotesGrid}>
                  <div className={styles.noteCard}>
                    <span className={styles.metaLabel}>
                      {isKoreanLocale(locale) ? "사전 조건" : "Prerequisites"}
                    </span>
                    <div className={styles.noteList}>
                      {setupManifest.prerequisites.map((item) => (
                        <p className={styles.noteItem} key={item}>
                          {item}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className={styles.noteCard}>
                    <span className={styles.metaLabel}>
                      {isKoreanLocale(locale) ? "운영 약속" : "Working agreement"}
                    </span>
                    <div className={styles.noteList}>
                      {setupManifest.workingAgreement.map((item) => (
                        <p className={styles.noteItem} key={item}>
                          {item}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className={styles.noteCard}>
                    <span className={styles.metaLabel}>
                      {isKoreanLocale(locale) ? "성공 신호" : "Success signals"}
                    </span>
                    <div className={styles.noteList}>
                      {setupManifest.successSignals.map((item) => (
                        <p className={styles.noteItem} key={item}>
                          {item}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </details>
            ) : null}
          </article>

          <div className={styles.providerGrid}>
            {snapshot.providerConnections.map((provider) => (
              <article className={styles.providerCard} key={provider.providerId}>
                <div className={styles.providerHead}>
                  <div className={styles.providerIdentity}>
                    <strong>{provider.label}</strong>
                    <span>{provider.cliName}</span>
                  </div>
                  <span className={`${styles.statusBadge} ${getProviderStatusClass(provider.status)}`}>
                    {getProviderStatusLabel(locale, provider.status)}
                  </span>
                </div>

                <div className={styles.providerMetaInline}>
                  <span className={styles.providerMetaItem}>
                    <span className={styles.metaLabel}>{copy.assignedTeam}</span>
                    <strong>{provider.assignedTeamLabel}</strong>
                  </span>
                  <span className={styles.providerMetaItem}>
                    <span className={styles.metaLabel}>{copy.heartbeat}</span>
                    <strong>{formatBoardTimestamp(locale, provider.lastHeartbeat)}</strong>
                  </span>
                  <span className={styles.providerMetaItem}>
                    <span className={styles.metaLabel}>{copy.nextActionLabel}</span>
                    <strong>{getNextSetupActionLabel(locale, provider.status)}</strong>
                  </span>
                </div>
              </article>
            ))}
          </div>
        </article>
      </div>

      <div className={styles.bottomGrid}>
        <article className={styles.flowPanel}>
          <div className={styles.panelHead}>
            <div>
              <span className={styles.metaLabel}>{copy.allocationLabel}</span>
              <h3>{copy.allocationTitle}</h3>
            </div>
            <Waypoints size={20} />
          </div>
          <p className={styles.panelBody}>{copy.allocationBody}</p>

          <div className={styles.teamFlowGrid}>
            {snapshot.teams.map((team) => {
              const attachedProviders = providersByTeam.get(team.id) ?? [];

              return (
                <article className={styles.teamFlowCard} key={team.id}>
                  <div className={styles.cardHead}>
                    <div>
                      <strong>{team.name}</strong>
                      <span>{team.lane}</span>
                    </div>
                    <Network size={18} />
                  </div>
                  <p>{team.currentDeliverable}</p>
                  <div className={styles.badgeRow}>
                    {attachedProviders.length ? (
                      attachedProviders.map((provider) => (
                        <span className={styles.providerMiniBadge} key={`${team.id}-${provider.providerId}`}>
                          <Cable size={13} />
                          {provider.label}
                        </span>
                      ))
                    ) : (
                      <span className={styles.emptyBadge}>
                        {isKoreanLocale(locale) ? "대기 중인 연결 슬롯" : "Awaiting agent attachment"}
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </article>

        <article className={styles.futurePanel}>
          <div className={styles.panelHead}>
            <div>
              <span className={styles.metaLabel}>{copy.futureLabel}</span>
              <h3>{copy.futureTitle}</h3>
            </div>
            <Sparkles size={20} />
          </div>
          <p className={styles.panelBody}>{copy.futureBody}</p>

          <div className={styles.futureList}>
            {copy.futurePoints.map((item, index) => {
              const Icon = [ShieldCheck, Command, Sparkles][index] ?? ShieldCheck;

              return (
                <div className={styles.futureRow} key={item}>
                  <div className={styles.futureIcon}>
                    <Icon size={16} />
                  </div>
                  <p>{item}</p>
                </div>
              );
            })}
          </div>
        </article>
      </div>
    </div>
  );
}
