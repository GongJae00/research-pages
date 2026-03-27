"use client";

import type { DocumentRecord } from "@research-os/types";
import { Bot, SearchCheck } from "lucide-react";
import { useMemo, useState } from "react";

import type { Locale } from "@/lib/i18n";
import { CompactDocumentRow } from "@/components/compact-document-row";
import { appendRBotFeedback } from "@/lib/r-bot/feedback-store";
import { findDocumentsForQuestion } from "@/lib/r-bot/document-finder";

import styles from "./r-bot-document-finder.module.css";

interface RBotDocumentFinderProps {
  locale: Locale;
  documents: DocumentRecord[];
  onOpenDocument: (document: DocumentRecord) => void;
}

const copy = {
  ko: {
    eyebrow: "R-Bot",
    title: "문서 찾기",
    body: "자연어로 찾고 싶은 문서를 적으면 제목, 요약, 태그, 유형 기준으로 먼저 좁혀 줍니다.",
    badge: "metadata-first",
    fieldLabel: "찾고 싶은 문서를 설명해 주세요",
    placeholder: "예: 최근 장학금 자기소개서 보여줘",
    hint: "현재는 문서 본문 전체가 아니라 메타데이터부터 찾습니다.",
    submit: "문서 찾기",
    results: "추천 결과",
    resultsCount: "건",
    empty: "질문을 제출하면 R-Bot이 지금 저장된 문서 메타데이터 기준으로 후보를 좁혀 줍니다.",
    noResults: "지금 질문과 바로 맞는 문서를 찾지 못했습니다. 문서 제목, 태그, 학교명, 장학금명처럼 더 구체적인 단어를 넣어 보세요.",
    open: "열기",
    prompts: [
      "최근 장학금 문서 보여줘",
      "연세대랑 scholarship이 같이 있는 파일 찾아줘",
      "증명서 관련 문서만 보고 싶어",
    ],
  },
  en: {
    eyebrow: "R-Bot",
    title: "Document finder",
    body: "Describe the document you want and R-Bot narrows candidates using titles, summaries, tags, and document types first.",
    badge: "metadata-first",
    fieldLabel: "Describe the document you want",
    placeholder: "Example: show me the latest scholarship statement",
    hint: "For now, this starts with metadata rather than full document-body retrieval.",
    submit: "Find documents",
    results: "Suggested results",
    resultsCount: "matches",
    empty: "Submit a question and R-Bot will rank likely matches from the current document metadata.",
    noResults: "No direct matches were found for that question. Try adding a more specific title word, tag, school name, or scholarship name.",
    open: "Open",
    prompts: [
      "Show me the latest scholarship document",
      "Find files that mention Yonsei and scholarship",
      "I only want certificate-related documents",
    ],
  },
} as const;

export function RBotDocumentFinder({
  locale,
  documents,
  onOpenDocument,
}: RBotDocumentFinderProps) {
  const text = copy[locale];
  const [question, setQuestion] = useState<string>(text.prompts[0]);
  const [submittedQuestion, setSubmittedQuestion] = useState<string>("");

  const matches = useMemo(
    () => findDocumentsForQuestion(submittedQuestion, documents, locale),
    [documents, locale, submittedQuestion],
  );

  return (
    <section className={`card ${styles.shell}`}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <span className={styles.eyebrow}>{text.eyebrow}</span>
          <h3 className={styles.title}>{text.title}</h3>
          <p className={styles.body}>{text.body}</p>
        </div>
        <span className={styles.badge}>
          <Bot size={14} />
          {text.badge}
        </span>
      </div>

      <div className={styles.promptRow}>
        {text.prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className={styles.promptButton}
            onClick={() => {
              setQuestion(prompt);
              setSubmittedQuestion(prompt);
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          setSubmittedQuestion(question.trim());
        }}
      >
        <label className={styles.fieldLabel}>
          {text.fieldLabel}
          <div className={styles.inputRow}>
            <input
              className={styles.input}
              value={question}
              placeholder={text.placeholder}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <button type="submit" className={styles.submitButton} disabled={question.trim().length === 0}>
              <SearchCheck size={16} />
              &nbsp;{text.submit}
            </button>
          </div>
        </label>
        <span className={styles.hint}>{text.hint}</span>
      </form>

      {!submittedQuestion ? (
        <div className={styles.emptyCard}>{text.empty}</div>
      ) : matches.length === 0 ? (
        <div className={styles.emptyCard}>{text.noResults}</div>
      ) : (
        <div className={styles.results}>
          <div className={styles.resultHeader}>
            <strong>{text.results}</strong>
            <span className={styles.resultCount}>
              {matches.length} {text.resultsCount}
            </span>
          </div>

          {matches.map((match) => (
            <CompactDocumentRow
              key={`${match.document.id}-${submittedQuestion}`}
              document={match.document}
              meta={
                <>
                  <span>{text.open}</span>
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
                  className="document-icon-btn"
                  onClick={() => {
                    appendRBotFeedback({
                      locale,
                      surface: "document-finder",
                      verdict: "opened",
                      question: submittedQuestion,
                      matchedDocumentIds: matches.map((entry) => entry.document.id),
                      selectedDocumentId: match.document.id,
                      note: match.reasons.join(" | "),
                    });
                    onOpenDocument(match.document);
                  }}
                  aria-label={text.open}
                  title={text.open}
                >
                  <SearchCheck size={15} />
                </button>
              }
              onOpen={() => {
                appendRBotFeedback({
                  locale,
                  surface: "document-finder",
                  verdict: "opened",
                  question: submittedQuestion,
                  matchedDocumentIds: matches.map((entry) => entry.document.id),
                  selectedDocumentId: match.document.id,
                  note: match.reasons.join(" | "),
                });
                onOpenDocument(match.document);
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
