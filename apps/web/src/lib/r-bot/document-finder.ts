import type { DocumentRecord } from "@research-os/types";

import type { Locale } from "@/lib/i18n";
import { getCategoryLabel, getTypeLabel } from "@/lib/document-taxonomy";

export interface RBotDocumentMatch {
  document: DocumentRecord;
  score: number;
  reasons: string[];
}

const punctuationPattern = /[^\p{L}\p{N}\s]/gu;

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(punctuationPattern, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return [];
  }

  return [...new Set(normalized.split(" ").filter(Boolean))];
}

function includesAny(value: string, hints: string[]) {
  const normalized = normalizeText(value);
  return hints.some((hint) => normalized.includes(normalizeText(hint)));
}

const englishMonthHints = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
} as const;

function extractDateHints(question: string) {
  const normalized = normalizeText(question);
  const years = new Set<string>();
  const months = new Set<string>();

  for (const match of normalized.matchAll(/\b(20\d{2})\b/g)) {
    years.add(match[1]);
  }

  for (const match of normalized.matchAll(/\b(\d{2})\s*년\b/g)) {
    years.add(`20${match[1]}`);
  }

  for (const match of normalized.matchAll(/\b(1[0-2]|0?[1-9])\s*월\b/g)) {
    months.add(match[1].padStart(2, "0"));
  }

  for (const [label, month] of Object.entries(englishMonthHints)) {
    if (normalized.includes(label)) {
      months.add(String(month).padStart(2, "0"));
    }
  }

  return {
    years: [...years],
    months: [...months],
  };
}

function buildReason(
  locale: Locale,
  kind: "title" | "summary" | "tag" | "type" | "recent" | "file" | "date",
  value: string,
) {
  if (locale === "ko") {
    switch (kind) {
      case "title":
        return `제목 일치: ${value}`;
      case "summary":
        return `요약 단서: ${value}`;
      case "tag":
        return `태그 일치: ${value}`;
      case "type":
        return `유형 단서: ${value}`;
      case "recent":
        return "최근 수정 문서";
      case "file":
        return `파일명 단서: ${value}`;
      case "date":
        return `날짜 단서: ${value}`;
    }
  }

  switch (kind) {
    case "title":
      return `Title match: ${value}`;
    case "summary":
      return `Summary mentions: ${value}`;
    case "tag":
      return `Tag match: ${value}`;
    case "type":
      return `Type hint: ${value}`;
    case "recent":
      return "Recently updated";
    case "file":
      return `File name hint: ${value}`;
    case "date":
      return `Date hint: ${value}`;
  }
}

export function hasDocumentDateHint(question: string) {
  const hints = extractDateHints(question);
  return hints.years.length > 0 || hints.months.length > 0;
}

export function findDocumentsForQuestion(question: string, documents: DocumentRecord[], locale: Locale) {
  const trimmedQuestion = question.trim();

  if (!trimmedQuestion) {
    return [];
  }

  const questionTokens = tokenize(trimmedQuestion);
  const wantsRecent = includesAny(trimmedQuestion, ["recent", "latest", "newest", "최근", "최신", "방금", "last"]);
  const dateHints = extractDateHints(trimmedQuestion);

  return documents
    .map((document) => {
      const reasons: string[] = [];
      let score = 0;

      const titleText = normalizeText(document.title);
      const summaryText = normalizeText(document.summary ?? "");
      const fileNameText = normalizeText(document.originalFileName ?? "");
      const typeLabel = getTypeLabel(locale, document.documentType);
      const categoryLabel = getCategoryLabel(locale, document.documentCategory);
      const typeText = normalizeText([document.documentType, typeLabel, categoryLabel].join(" "));
      const matchedTag = document.tags.find((tag) => questionTokens.some((token) => normalizeText(tag).includes(token)));
      const [documentYear = "", documentMonth = ""] = document.updatedOn.split("-");

      if (matchedTag) {
        score += 4;
        reasons.push(buildReason(locale, "tag", matchedTag));
      }

      if (questionTokens.some((token) => token.length >= 2 && titleText.includes(token))) {
        score += 3;
        reasons.push(buildReason(locale, "title", document.title));
      }

      if (questionTokens.some((token) => token.length >= 2 && summaryText.includes(token))) {
        score += 2;
        reasons.push(buildReason(locale, "summary", document.summary ?? document.title));
      }

      if (questionTokens.some((token) => token.length >= 2 && fileNameText.includes(token))) {
        score += 2.5;
        reasons.push(buildReason(locale, "file", document.originalFileName ?? document.title));
      }

      if (questionTokens.some((token) => token.length >= 2 && typeText.includes(token))) {
        score += 2;
        reasons.push(buildReason(locale, "type", `${typeLabel} / ${categoryLabel}`));
      }

      if (dateHints.years.length > 0 && dateHints.years.includes(documentYear)) {
        score += 2;
        reasons.push(buildReason(locale, "date", document.updatedOn));
      }

      if (dateHints.months.length > 0 && dateHints.months.includes(documentMonth)) {
        score += 1.5;
        reasons.push(buildReason(locale, "date", document.updatedOn));
      }

      if (wantsRecent) {
        score += 1;
        reasons.push(buildReason(locale, "recent", document.updatedOn));
      }

      return {
        document,
        score,
        reasons: [...new Set(reasons)].slice(0, 4),
      };
    })
    .filter((match) => wantsRecent || match.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.document.updatedOn.localeCompare(left.document.updatedOn);
    })
    .slice(0, 5);
}
