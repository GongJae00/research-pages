import {
  getLocalizedList,
  getLocalizedText,
  rBotKnowledgePack,
  type RBotKnowledgeEntry,
  type RBotLocale,
} from "./knowledge-pack";

export interface RBotKnowledgeMatch {
  entry: RBotKnowledgeEntry;
  score: number;
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

function buildEntrySearchText(entry: RBotKnowledgeEntry, locale: RBotLocale) {
  return [
    getLocalizedText(entry.title, locale),
    getLocalizedText(entry.summary, locale),
    getLocalizedText(entry.answer, locale),
    ...getLocalizedList(entry.nextSteps, locale),
    ...entry.keywords,
  ].join(" ");
}

function scoreEntry(entry: RBotKnowledgeEntry, question: string, locale: RBotLocale) {
  const normalizedQuestion = normalizeText(question);
  const questionTokens = tokenize(question);
  const entryText = buildEntrySearchText(entry, locale);
  const normalizedEntryText = normalizeText(entryText);
  const entryTokens = new Set(tokenize(entryText));
  let score = 0;

  for (const keyword of entry.keywords) {
    const normalizedKeyword = normalizeText(keyword);
    if (!normalizedKeyword) {
      continue;
    }

    if (normalizedQuestion.includes(normalizedKeyword)) {
      score += normalizedKeyword.includes(" ") ? 6 : 4;
    }
  }

  for (const token of questionTokens) {
    if (token.length < 2) {
      continue;
    }

    if (entryTokens.has(token)) {
      score += 1.5;
      continue;
    }

    if (normalizedEntryText.includes(token)) {
      score += 0.75;
    }
  }

  return score;
}

export function searchRBotKnowledge(question: string, locale: RBotLocale, limit = 3) {
  return rBotKnowledgePack
    .map((entry) => ({
      entry,
      score: scoreEntry(entry, question, locale),
    }))
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

export function isSchoolRulesQuestion(question: string) {
  const normalized = normalizeText(question);
  const schoolRuleHints = [
    "학사규정",
    "학칙",
    "수강",
    "휴학",
    "복학",
    "졸업",
    "graduate school",
    "academic rule",
    "academic regulation",
    "school rule",
    "university rule",
    "registration rule",
  ];

  return schoolRuleHints.some((keyword) => normalized.includes(normalizeText(keyword)));
}

export function isDocumentSearchQuestion(question: string) {
  const normalized = normalizeText(question);
  const documentHints = [
    "문서",
    "파일",
    "서류",
    "자료",
    "내 문서",
    "찾아줘",
    "찾아",
    "search my",
    "find my",
    "document",
    "file",
    "paper file",
  ];

  return documentHints.some((keyword) => normalized.includes(normalizeText(keyword)));
}
