"use client";

import { Bot, SearchCheck, ShieldCheck, ThumbsDown, ThumbsUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { CompactDocumentRow } from "@/components/compact-document-row";
import { useAuth } from "@/components/auth-provider";
import { syncDocumentsForAccount } from "@/lib/document-server-store";
import { appendRBotFeedback } from "@/lib/r-bot/feedback-store";
import {
  findDocumentsForQuestion,
  hasDocumentDateHint,
  type RBotDocumentMatch,
} from "@/lib/r-bot/document-finder";
import { getLocalizedText, rBotStarterPrompts, type RBotLocale } from "@/lib/r-bot/knowledge-pack";
import { isDocumentSearchQuestion } from "@/lib/r-bot/retrieval";
import {
  getWorkspaceDocumentStorageKeys,
  readCachedWorkspaceDocuments,
} from "@/lib/r-bot/workspace-documents";
import { searchWorkspaceGuide, type WorkspaceGuideMatch } from "@/lib/r-bot/workspace-guide";

import styles from "./r-bot-panel.module.css";

interface Citation {
  id: string;
  title: string;
  sourceLabel: string;
  sourceUrl: string;
  verifiedOn: string;
}

interface RBotResponse {
  answer: string;
  citations: Citation[];
  nextSteps: string[];
  matchedTopics: string[];
  mode: "local-model" | "source-only";
  disclaimer?: string;
}

interface RBotRuntimeStatus {
  provider: "ollama";
  model: string;
  baseUrl: string;
  status: "ready" | "pull-required" | "unreachable" | "disabled";
  reachable: boolean;
  modelAvailable: boolean;
  installCommand: string;
}

type RBotPanelResult =
  | (RBotResponse & {
      kind: "public-guide";
    })
  | {
      kind: "document-search";
      answer: string;
      citations: Citation[];
      nextSteps: string[];
      matchedTopics: string[];
      mode: "workspace-search";
      documentMatches: RBotDocumentMatch[];
    }
  | {
      kind: "workspace-guide";
      answer: string;
      citations: Citation[];
      nextSteps: string[];
      matchedTopics: string[];
      mode: "workspace-guide";
      guideMatches: WorkspaceGuideMatch[];
    };

interface RBotPanelProps {
  locale: RBotLocale;
}

const copy = {
  ko: {
    eyebrow: "R-Bot",
    publicTitle: "연구행정 가이드 봇",
    publicBody:
      "공개 화면에서는 ORCID, 국가연구자번호, 학교 규정 시작점처럼 공식 출처가 있는 질문을 먼저 정리합니다.",
    workspaceTitle: "워크스페이스 보조 봇",
    workspaceBody:
      "로그인 상태에서는 개인 문서 후보를 찾고, 프로필·문서함·펀딩·시간표·연구실 작업 위치를 함께 안내합니다.",
    statusPrimary: "Qwen 로컬",
    statusSecondaryPublic: "공개 가이드",
    statusSecondaryWorkspace: "문서 + 워크스페이스",
    fieldLabelPublic: "궁금한 점을 적어 주세요",
    fieldLabelWorkspace: "문서나 작업 위치를 자연어로 적어 주세요",
    fieldPlaceholderPublic: "예: ORCID가 뭐고 어디서 등록해?",
    fieldPlaceholderWorkspace: "예: 25년 3월 동물 관련 제안서 찾아줘",
    hintPublic: "공개형 질문은 공식 출처 링크를 기준으로 답합니다.",
    hintWorkspace:
      "로그인 계정 문서 메타데이터와 워크스페이스 구조를 같이 보고 답합니다. 제목, 요약, 태그가 구체적일수록 더 잘 찾습니다.",
    submit: "R-Bot에게 묻기",
    loading: "정리 중...",
    resultTitle: "답변",
    citations: "출처",
    nextSteps: "다음 단계",
    documentMatches: "찾은 문서",
    routeMatches: "관련 화면",
    emptyTitlePublic: "좁은 질문으로 시작해 보세요",
    emptyBodyPublic:
      "ORCID, 국가연구자번호, 학교 규정 시작점처럼 공식 링크가 필요한 질문부터 바로 답할 수 있습니다.",
    emptyTitleWorkspace: "문서 찾기와 작업 안내를 같이 처리합니다",
    emptyBodyWorkspace:
      "예: 등록금납부확인서 문서 찾아줘, 25년 3월 동물 제안서 찾아줘, CV는 어디서 관리해?",
    error: "질문을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    modeLocal: "로컬 모델",
    modeSource: "출처 기반",
    modeWorkspaceSearch: "문서 검색",
    modeWorkspaceGuide: "워크스페이스 안내",
    runtimeReady: "Qwen 준비됨",
    runtimePullRequired: "Qwen pull 필요",
    runtimeUnreachable: "Ollama 연결 안 됨",
    runtimeDisabled: "Ollama 비활성화",
    runtimeCommand: "설치 명령",
    feedbackLabel: "이 답변이 도움 됐나?",
    feedbackPositive: "도움 됨",
    feedbackNegative: "부족함",
    feedbackSaved: "피드백 저장됨",
    openDocument: "문서함에서 열기",
    openPage: "화면 열기",
    noDocumentMatches:
      "로그인된 문서 저장소에서 질문과 바로 맞는 후보를 찾지 못했습니다. 문서 제목, 요약, 태그, 시기 단서를 더 구체적으로 적어 보세요.",
    documentSearchEmpty:
      "아직 문서 후보가 없습니다. 문서함에 파일을 저장하고 제목, 요약, 태그를 정리해 두면 R-Bot이 더 잘 찾습니다.",
    workspacePrompts: [
      "우리 등록금납부확인서 문서 찾아줘",
      "25년 3월 동물 관련 제안서 찾아줘",
      "CV는 어디서 관리해?",
    ],
  },
  en: {
    eyebrow: "R-Bot",
    publicTitle: "Research admin guide bot",
    publicBody:
      "On public pages, R-Bot starts with questions that should be answered from official sources, such as ORCID, national researcher numbers, and where to start with school rules.",
    workspaceTitle: "Workspace assistant",
    workspaceBody:
      "When you are signed in, R-Bot can look for likely private document matches and explain where profile, documents, funding, timetable, and lab work should happen.",
    statusPrimary: "Qwen local",
    statusSecondaryPublic: "Public guide",
    statusSecondaryWorkspace: "Docs + workspace",
    fieldLabelPublic: "Ask a short question",
    fieldLabelWorkspace: "Describe the document or task you need help with",
    fieldPlaceholderPublic: "Example: What is ORCID and where do I register?",
    fieldPlaceholderWorkspace: "Example: Find the animal-related proposal from March 2025",
    hintPublic: "Public questions are grounded in official source links first.",
    hintWorkspace:
      "Signed-in mode checks your document metadata and workspace structure together. Specific titles, summaries, tags, and time hints improve retrieval.",
    submit: "Ask R-Bot",
    loading: "Working...",
    resultTitle: "Answer",
    citations: "Sources",
    nextSteps: "Next steps",
    documentMatches: "Matched documents",
    routeMatches: "Related pages",
    emptyTitlePublic: "Start with a narrow question",
    emptyBodyPublic:
      "Questions such as ORCID, national researcher numbers, or where to start with school rules are a good fit here.",
    emptyTitleWorkspace: "Use R-Bot for both retrieval and navigation",
    emptyBodyWorkspace:
      "Examples: find my tuition payment confirmation, find the March 2025 animal proposal, where should I manage my CV?",
    error: "The question could not be processed. Please try again in a moment.",
    modeLocal: "Local model",
    modeSource: "Source only",
    modeWorkspaceSearch: "Document search",
    modeWorkspaceGuide: "Workspace guide",
    runtimeReady: "Qwen ready",
    runtimePullRequired: "Qwen pull required",
    runtimeUnreachable: "Ollama unreachable",
    runtimeDisabled: "Ollama disabled",
    runtimeCommand: "Install command",
    feedbackLabel: "Was this useful?",
    feedbackPositive: "Helpful",
    feedbackNegative: "Needs work",
    feedbackSaved: "Feedback saved",
    openDocument: "Open in documents",
    openPage: "Open page",
    noDocumentMatches:
      "No direct matches were found in the signed-in document repository. Add a stronger title word, summary phrase, tag, or time hint.",
    documentSearchEmpty:
      "There are no document candidates yet. Save files in the documents workspace and add specific titles, summaries, and tags.",
    workspacePrompts: [
      "Find my tuition payment confirmation document",
      "Find the animal-related proposal from March 2025",
      "Where should I manage my CV?",
    ],
  },
} as const;

function looksLikeDocumentSearch(question: string) {
  const normalized = question.toLowerCase().normalize("NFKC");
  return (
    isDocumentSearchQuestion(question) ||
    hasDocumentDateHint(question) ||
    [
      "찾아",
      "보여",
      "꺼내",
      "열어",
      "문서",
      "파일",
      "제안서",
      "증명서",
      "장학금",
      "cv",
      "bio",
      "proposal",
      "certificate",
      "statement",
      "document",
      "file",
      "find",
      "show me",
    ].some((hint) => normalized.includes(hint))
  );
}

function looksLikeWorkspaceGuideQuestion(question: string) {
  const normalized = question.toLowerCase().normalize("NFKC");
  return [
    "어디서",
    "어느 화면",
    "어느 페이지",
    "어디에",
    "관리해",
    "관리하지",
    "작업해",
    "설정해",
    "where",
    "which page",
    "which screen",
    "manage",
    "edit",
    "update",
    "workspace",
  ].some((hint) => normalized.includes(hint));
}

function buildDocumentSearchResult(
  locale: RBotLocale,
  question: string,
  matches: RBotDocumentMatch[],
  text: (typeof copy)[RBotLocale],
): RBotPanelResult {
  if (matches.length === 0) {
    return {
      kind: "document-search",
      answer: text.noDocumentMatches,
      citations: [],
      nextSteps:
        locale === "ko"
          ? [
              "문서 제목에 기관명, 장학금명, 과제명 같은 고유 단서를 남깁니다.",
              "요약과 태그에 시기와 용도를 같이 적어 둡니다. 예: 2025-03, animal proposal",
              "문서함에서 열어 실제 파일명을 점검하고 다시 질문해 보세요.",
            ]
          : [
              "Put unique clues such as the institution, scholarship name, or project name into the title.",
              "Leave both timing and purpose in the summary or tags, for example 2025-03 or animal proposal.",
              "Open the documents screen, confirm the real file name, and ask again with a narrower phrase.",
            ],
      matchedTopics: [],
      mode: "workspace-search",
      documentMatches: [],
    };
  }

  const top = matches[0];

  return {
    kind: "document-search",
    answer:
      locale === "ko"
        ? `질문과 가장 가까운 문서 ${matches.length}개를 추렸습니다. 우선순위는 제목, 요약, 태그, 파일명, 문서유형, 날짜 단서를 함께 본 결과입니다. 가장 유력한 후보는 "${top.document.title}"입니다.`
        : `I found ${matches.length} likely document candidates for this request. The ranking uses title, summary, tags, file name, document type, and date clues together. The strongest candidate is "${top.document.title}".`,
    citations: [],
    nextSteps:
      locale === "ko"
        ? [
            "아래 후보를 문서함에서 열어 실제 내용을 확인합니다.",
            "원하는 문서가 아니면 더 구체적인 시기, 기관명, 지원명, 문서유형을 같이 적습니다.",
            "제목이나 태그가 약한 문서는 문서함에서 다시 정리해 두는 편이 좋습니다.",
          ]
        : [
            "Open the candidates below in the documents workspace and confirm the actual file.",
            "If the result is still broad, add a tighter time, institution, program, or document-type hint.",
            "When titles or tags are weak, clean them up in the documents workspace for later retrieval.",
          ],
    matchedTopics: matches.map((match) => match.document.title),
    mode: "workspace-search",
    documentMatches: matches,
  };
}

function buildWorkspaceGuideResult(
  locale: RBotLocale,
  matches: WorkspaceGuideMatch[],
): RBotPanelResult {
  const top = matches[0];

  return {
    kind: "workspace-guide",
    answer: top.entry.answer[locale],
    citations: [],
    nextSteps: [...new Set(matches.flatMap((match) => match.entry.nextSteps[locale]))].slice(0, 4),
    matchedTopics: matches.map((match) => match.entry.title[locale]),
    mode: "workspace-guide",
    guideMatches: matches,
  };
}

export function RBotPanel({ locale }: RBotPanelProps) {
  const text = copy[locale];
  const router = useRouter();
  const { currentAccount } = useAuth();
  const [question, setQuestion] = useState(getLocalizedText(rBotStarterPrompts[0].question, locale));
  const [result, setResult] = useState<RBotPanelResult | null>(null);
  const [runtime, setRuntime] = useState<RBotRuntimeStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedbackSaved, setFeedbackSaved] = useState<"positive" | "negative" | null>(null);
  const [, setDocumentVersion] = useState(0);
  const [isPending, startTransition] = useTransition();

  const isWorkspaceMode = Boolean(currentAccount);
  const workspaceDocuments = readCachedWorkspaceDocuments(currentAccount?.id ?? null);
  const promptOptions = isWorkspaceMode
    ? text.workspacePrompts
    : rBotStarterPrompts.map((prompt) => getLocalizedText(prompt.question, locale));

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/r-bot", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as RBotRuntimeStatus;
        if (!cancelled) {
          setRuntime(payload);
        }
      } catch {
        // Keep the panel usable in source-only mode when runtime status cannot be read.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!currentAccount?.id) {
      return;
    }

    const storageKeys = new Set(getWorkspaceDocumentStorageKeys(currentAccount.id));
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || storageKeys.has(event.key)) {
        setDocumentVersion((current) => current + 1);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [currentAccount?.id]);

  useEffect(() => {
    if (!currentAccount?.id) {
      return;
    }

    let cancelled = false;

    void syncDocumentsForAccount(currentAccount.id)
      .then((serverDocuments) => {
        if (cancelled || !serverDocuments) {
          return;
        }

        setDocumentVersion((current) => current + 1);
      })
      .catch(() => {
        // Keep the cached document path alive when sync is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [currentAccount?.id]);

  const getRuntimeLabel = () => {
    switch (runtime?.status) {
      case "ready":
        return text.runtimeReady;
      case "pull-required":
        return text.runtimePullRequired;
      case "disabled":
        return text.runtimeDisabled;
      default:
        return text.runtimeUnreachable;
    }
  };

  const openDocumentInWorkspace = (documentId: string) => {
    router.push(`/${locale}/documents?rbotDocumentId=${encodeURIComponent(documentId)}&rbotNonce=${Date.now()}`);
  };

  const submitQuestion = (nextQuestion: string) => {
    startTransition(() => {
      void (async () => {
        setError(null);
        setFeedbackSaved(null);
        setQuestion(nextQuestion);

        try {
          const wantsDocumentSearch = isWorkspaceMode && looksLikeDocumentSearch(nextQuestion);
          const wantsWorkspaceGuide = isWorkspaceMode && looksLikeWorkspaceGuideQuestion(nextQuestion);
          const documentMatches = wantsDocumentSearch
            ? findDocumentsForQuestion(nextQuestion, workspaceDocuments, locale)
            : [];
          const workspaceGuideMatches =
            wantsWorkspaceGuide || (isWorkspaceMode && documentMatches.length === 0)
              ? searchWorkspaceGuide(nextQuestion, locale)
              : [];

          if (wantsDocumentSearch) {
            const panelResult: RBotPanelResult =
              workspaceDocuments.length === 0 && documentMatches.length === 0
                ? {
                    kind: "document-search",
                    answer: text.documentSearchEmpty,
                    citations: [],
                    nextSteps:
                      locale === "ko"
                        ? [
                            "문서함에서 파일을 저장하고 제목, 요약, 태그를 남깁니다.",
                            "제안서·장학금·증명서처럼 문서유형을 분명히 적습니다.",
                            "다시 찾을 때는 시기와 주제를 함께 말해 주세요.",
                          ]
                        : [
                            "Save files in the documents workspace and add titles, summaries, and tags.",
                            "Be explicit about the document type such as proposal, scholarship, or certificate.",
                            "When you search again, include both timing and topic hints.",
                          ],
                    matchedTopics: [],
                    mode: "workspace-search",
                    documentMatches: [],
                  }
                : buildDocumentSearchResult(locale, nextQuestion, documentMatches, text);

            setResult(panelResult);
            return;
          }

          if (wantsWorkspaceGuide && workspaceGuideMatches.length > 0) {
            setResult(buildWorkspaceGuideResult(locale, workspaceGuideMatches));
            return;
          }

          const response = await fetch("/api/r-bot", {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({
              locale,
              question: nextQuestion,
            }),
          });

          if (!response.ok) {
            throw new Error("r-bot-request-failed");
          }

          const payload = (await response.json()) as RBotResponse;
          setResult({
            kind: "public-guide",
            ...payload,
          });
        } catch {
          setError(text.error);
        }
      })();
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = question.trim();

    if (!trimmed) {
      return;
    }

    submitQuestion(trimmed);
  };

  const resultModeLabel = (() => {
    switch (result?.mode) {
      case "local-model":
        return text.modeLocal;
      case "source-only":
        return text.modeSource;
      case "workspace-search":
        return text.modeWorkspaceSearch;
      case "workspace-guide":
        return text.modeWorkspaceGuide;
      default:
        return null;
    }
  })();

  return (
    <aside className={`card ${styles.shell}`} id="r-bot">
      <div className={styles.header}>
        <span className={styles.eyebrow}>{text.eyebrow}</span>
        <div className={styles.titleRow}>
          <div className={styles.titleBlock}>
            <h3 className={styles.title}>{isWorkspaceMode ? text.workspaceTitle : text.publicTitle}</h3>
            <p className={styles.body}>{isWorkspaceMode ? text.workspaceBody : text.publicBody}</p>
          </div>
          <div className={styles.statusStack}>
            <span className={styles.statusBadge}>
              <ShieldCheck size={14} />
              &nbsp;{text.statusPrimary}
            </span>
            <span className={styles.statusBadgeMuted}>
              <Bot size={14} />
              &nbsp;
              {runtime
                ? `${getRuntimeLabel()} · ${runtime.model}`
                : isWorkspaceMode
                  ? text.statusSecondaryWorkspace
                  : text.statusSecondaryPublic}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.promptGrid}>
        {promptOptions.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className={styles.promptButton}
            onClick={() => submitQuestion(prompt)}
            disabled={isPending}
          >
            {prompt}
          </button>
        ))}
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.fieldLabel}>
          {isWorkspaceMode ? text.fieldLabelWorkspace : text.fieldLabelPublic}
          <textarea
            className={styles.textarea}
            rows={4}
            value={question}
            placeholder={isWorkspaceMode ? text.fieldPlaceholderWorkspace : text.fieldPlaceholderPublic}
            onChange={(event) => setQuestion(event.target.value)}
          />
        </label>
        <div className={styles.formFooter}>
          <span className={styles.formHint}>{isWorkspaceMode ? text.hintWorkspace : text.hintPublic}</span>
          <button type="submit" className={styles.submitButton} disabled={isPending || question.trim().length === 0}>
            <SearchCheck size={16} />
            &nbsp;{isPending ? text.loading : text.submit}
          </button>
        </div>
      </form>

      {runtime ? (
        <div className={styles.emptyCard}>
          <h4 className={styles.emptyTitle}>{getRuntimeLabel()}</h4>
          <p className={styles.emptyBody}>{runtime.model}</p>
          {runtime.status !== "ready" ? (
            <div className={styles.metaSection}>
              <span className={styles.metaLabel}>{text.runtimeCommand}</span>
              <code className={styles.runtimeCode}>{runtime.installCommand}</code>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className={styles.errorCard}>
          <p className={styles.errorText}>{error}</p>
        </div>
      ) : null}

      {result ? (
        <div className={styles.answerCard}>
          <div className={styles.answerHead}>
            <h4 className={styles.answerTitle}>{text.resultTitle}</h4>
            {resultModeLabel ? <span className={styles.answerMode}>{resultModeLabel}</span> : null}
          </div>

          <p className={styles.answerBody}>{result.answer}</p>

          {"documentMatches" in result ? (
            <div className={styles.metaSection}>
              <span className={styles.metaLabel}>{text.documentMatches}</span>
              {result.documentMatches.length === 0 ? (
                <div className={styles.emptyMuted}>{text.noDocumentMatches}</div>
              ) : (
                <div className={styles.resultStack}>
                  {result.documentMatches.map((match) => (
                    <CompactDocumentRow
                      key={`${match.document.id}-${question}`}
                      document={match.document}
                      meta={
                        <>
                          <span>{text.openDocument}</span>
                          <strong>{match.document.updatedOn}</strong>
                        </>
                      }
                      detail={
                        <div className={styles.reasonList}>
                          {match.reasons.map((reason) => (
                            <span className={styles.reasonChip} key={reason}>
                              {reason}
                            </span>
                          ))}
                        </div>
                      }
                      actions={
                        <button
                          type="button"
                          className={styles.inlineAction}
                          onClick={() => {
                            appendRBotFeedback({
                              locale,
                              surface: "workspace-assistant",
                              verdict: "opened",
                              question,
                              answerMode: result.mode,
                              matchedDocumentIds: result.documentMatches.map((entry) => entry.document.id),
                              selectedDocumentId: match.document.id,
                              note: match.reasons.join(" | "),
                            });
                            openDocumentInWorkspace(match.document.id);
                          }}
                        >
                          {text.openDocument}
                        </button>
                      }
                      onOpen={() => {
                        appendRBotFeedback({
                          locale,
                          surface: "workspace-assistant",
                          verdict: "opened",
                          question,
                          answerMode: result.mode,
                          matchedDocumentIds: result.documentMatches.map((entry) => entry.document.id),
                          selectedDocumentId: match.document.id,
                          note: match.reasons.join(" | "),
                        });
                        openDocumentInWorkspace(match.document.id);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {"guideMatches" in result ? (
            <div className={styles.metaSection}>
              <span className={styles.metaLabel}>{text.routeMatches}</span>
              <div className={styles.routeStack}>
                {result.guideMatches.map((match) => (
                  <button
                    key={match.entry.id}
                    type="button"
                    className={styles.routeCard}
                    onClick={() => router.push(match.entry.href[locale])}
                  >
                    <strong>{match.entry.title[locale]}</strong>
                    <span>{match.entry.href[locale]}</span>
                    <span className={styles.routeAction}>{match.entry.hrefLabel[locale]}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {result.citations.length > 0 ? (
            <div className={styles.metaSection}>
              <span className={styles.metaLabel}>{text.citations}</span>
              <div className={styles.citationList}>
                {result.citations.map((citation) => (
                  <div className={styles.citationItem} key={citation.id}>
                    <a className={styles.citationLink} href={citation.sourceUrl} target="_blank" rel="noreferrer">
                      {citation.title}
                    </a>
                    <div>{citation.sourceLabel}</div>
                    <div className={styles.verifiedOn}>{citation.verifiedOn}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {result.nextSteps.length > 0 ? (
            <div className={styles.metaSection}>
              <span className={styles.metaLabel}>{text.nextSteps}</span>
              <div className={styles.nextList}>
                {result.nextSteps.map((item) => (
                  <div className={styles.nextItem} key={item}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className={styles.feedbackRow}>
            <span className={styles.metaLabel}>{text.feedbackLabel}</span>
            <div className={styles.feedbackActions}>
              <button
                type="button"
                className={styles.feedbackButton}
                onClick={() => {
                  appendRBotFeedback({
                    locale,
                    surface: result.kind === "public-guide" ? "public-guide" : "workspace-assistant",
                    verdict: "positive",
                    question,
                    answerMode: result.mode,
                    answer: result.answer,
                    citationIds: result.citations.map((citation) => citation.id),
                    matchedTopics: result.matchedTopics,
                    matchedDocumentIds:
                      "documentMatches" in result
                        ? result.documentMatches.map((match) => match.document.id)
                        : undefined,
                  });
                  setFeedbackSaved("positive");
                }}
              >
                <ThumbsUp size={14} />
                {text.feedbackPositive}
              </button>
              <button
                type="button"
                className={styles.feedbackButton}
                onClick={() => {
                  appendRBotFeedback({
                    locale,
                    surface: result.kind === "public-guide" ? "public-guide" : "workspace-assistant",
                    verdict: "negative",
                    question,
                    answerMode: result.mode,
                    answer: result.answer,
                    citationIds: result.citations.map((citation) => citation.id),
                    matchedTopics: result.matchedTopics,
                    matchedDocumentIds:
                      "documentMatches" in result
                        ? result.documentMatches.map((match) => match.document.id)
                        : undefined,
                  });
                  setFeedbackSaved("negative");
                }}
              >
                <ThumbsDown size={14} />
                {text.feedbackNegative}
              </button>
            </div>
            {feedbackSaved ? <span className={styles.feedbackSaved}>{text.feedbackSaved}</span> : null}
          </div>
        </div>
      ) : (
        <div className={styles.emptyCard}>
          <h4 className={styles.emptyTitle}>
            {isWorkspaceMode ? text.emptyTitleWorkspace : text.emptyTitlePublic}
          </h4>
          <p className={styles.emptyBody}>
            {isWorkspaceMode ? text.emptyBodyWorkspace : text.emptyBodyPublic}
          </p>
        </div>
      )}
    </aside>
  );
}
