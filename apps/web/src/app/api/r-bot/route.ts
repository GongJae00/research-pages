import { NextRequest, NextResponse } from "next/server";

import { getLocalizedList, getLocalizedText, type RBotLocale } from "@/lib/r-bot/knowledge-pack";
import { generateRBotAnswerWithOllama } from "@/lib/r-bot/ollama";
import {
  isDocumentSearchQuestion,
  isSchoolRulesQuestion,
  searchRBotKnowledge,
  type RBotKnowledgeMatch,
} from "@/lib/r-bot/retrieval";
import { getRBotRuntimeStatus } from "@/lib/r-bot/runtime";

interface RBotRequestBody {
  locale?: string;
  question?: string;
}

interface RBotResponseBody {
  answer: string;
  citations: Array<{
    id: string;
    title: string;
    sourceLabel: string;
    sourceUrl: string;
    verifiedOn: string;
  }>;
  nextSteps: string[];
  matchedTopics: string[];
  mode: "local-model" | "source-only";
  disclaimer?: string;
}

function normalizeLocale(locale: string | undefined): RBotLocale {
  return locale === "en" ? "en" : "ko";
}

function getBaseHeaders() {
  return {
    "cache-control": "no-store, max-age=0",
  };
}

function buildCitations(matches: RBotKnowledgeMatch[], locale: RBotLocale) {
  const seenIds = new Set<string>();

  return matches
    .filter((match) => {
      if (seenIds.has(match.entry.id)) {
        return false;
      }

      seenIds.add(match.entry.id);
      return true;
    })
    .slice(0, 2)
    .map((match) => ({
      id: match.entry.id,
      title: getLocalizedText(match.entry.title, locale),
      sourceLabel: getLocalizedText(match.entry.sourceLabel, locale),
      sourceUrl: match.entry.sourceUrl,
      verifiedOn: match.entry.verifiedOn,
    }));
}

function buildNextSteps(matches: RBotKnowledgeMatch[], locale: RBotLocale) {
  const nextSteps = matches.flatMap((match) => getLocalizedList(match.entry.nextSteps, locale));
  return [...new Set(nextSteps)].slice(0, 4);
}

function buildSourceOnlyResponse(locale: RBotLocale, matches: RBotKnowledgeMatch[]): RBotResponseBody | null {
  const top = matches[0]?.entry;

  if (!top) {
    return null;
  }

  const disclaimer = top.caution ? getLocalizedText(top.caution, locale) : undefined;
  const answer = [getLocalizedText(top.answer, locale), disclaimer].filter(Boolean).join("\n\n");

  return {
    answer,
    citations: buildCitations(matches, locale),
    nextSteps: buildNextSteps(matches, locale),
    matchedTopics: matches.map((match) => getLocalizedText(match.entry.title, locale)),
    mode: "source-only",
    disclaimer,
  };
}

function buildSchoolRulesResponse(locale: RBotLocale): RBotResponseBody {
  return locale === "ko"
    ? {
        answer:
          "학교별 학사규정은 대학원/학부, 내국인/국제학생, 그리고 과정별로 달라서 학교명을 같이 받아야 공식 링크를 정확히 연결할 수 있습니다. 지금 공개 R-Bot은 학교별 규정팩을 아직 싣지 않았기 때문에, 우선 학교명과 과정명을 같이 적어 주는 방식이 맞습니다.",
        citations: [],
        nextSteps: [
          "학교명과 과정명을 같이 적습니다. 예: 연세대 일반대학원 석사",
          "대학원 또는 학사 공지의 공식 링크를 먼저 확인합니다.",
          "규정 질문이 세부적이면 학과 행정실 또는 대학원 공지로 교차 확인합니다.",
        ],
        matchedTopics: [],
        mode: "source-only",
        disclaimer: "학교별 규정은 공개 지식팩보다 학교 공식 페이지가 우선입니다.",
      }
    : {
        answer:
          "School-specific academic rules vary by university, program, and student status, so I need the school and program name before I can point to the right official page. The public R-Bot panel does not ship school-specific rule packs yet.",
        citations: [],
        nextSteps: [
          "Include the university and program name in the question.",
          "Check the graduate-school or academic-notice page first.",
          "If the rule affects graduation or registration, cross-check with the department office.",
        ],
        matchedTopics: [],
        mode: "source-only",
        disclaimer: "For school rules, the university's official page should override any generic summary.",
      };
}

function buildDocumentScopeResponse(locale: RBotLocale): RBotResponseBody {
  const documentsPath = locale === "ko" ? "/ko/documents" : "/en/documents";

  return locale === "ko"
    ? {
        answer:
          "공개 홈페이지의 R-Bot은 아직 개인 문서를 검색하지 않습니다. 현재 이 패널은 공식 안내 링크를 정리해 주는 공개 가이드 역할만 하고, 개인 문서 찾기는 로그인된 워크스페이스에서 별도 기능으로 붙는 것이 안전합니다.",
        citations: [],
        nextSteps: [
          `지금은 문서 화면(${documentsPath})에서 제목, 설명, 태그로 직접 찾습니다.`,
          "개인 문서 검색 봇은 로그인 뒤 권한 검사를 통과한 문서만 대상으로 붙이는 것이 맞습니다.",
          "찾고 싶은 문서가 있다면 문서 제목과 요약, 태그를 더 구체적으로 적어 두는 편이 좋습니다.",
        ],
        matchedTopics: [],
        mode: "source-only",
      }
    : {
        answer:
          "The public homepage version of R-Bot does not search private documents yet. This panel is intentionally limited to public, source-backed guidance; private document finding should live inside the signed-in workspace where permissions can be checked safely.",
        citations: [],
        nextSteps: [
          `For now, use the documents screen directly at ${documentsPath}.`,
          "Private document retrieval should only be added after signed-in permission checks are in place.",
          "Make document titles, summaries, and tags more specific so later retrieval works better.",
        ],
        matchedTopics: [],
        mode: "source-only",
      };
}

function buildFallbackResponse(locale: RBotLocale): RBotResponseBody {
  return locale === "ko"
    ? {
        answer:
          "지금 질문은 공개 지식팩과 정확히 연결되지 않았습니다. ORCID, 국가연구자번호, 학교 규정 시작점처럼 공식 링크가 있는 질문부터 처리하는 구조로 시작하는 것이 안전합니다.",
        citations: [],
        nextSteps: [
          "질문에 학교명, 제도명, 문서 종류를 더 구체적으로 적습니다.",
          "예: ORCID 등록, 국가연구자번호, 연세대 대학원 수강신청 규정",
          "공식 링크가 필요한 질문인지, 개인 문서 탐색인지도 같이 적습니다.",
        ],
        matchedTopics: [],
        mode: "source-only",
      }
    : {
        answer:
          "That question does not map cleanly to the current public knowledge pack. The safe starting shape is to answer questions with official links, such as ORCID, national researcher numbers, or the starting point for school rules.",
        citations: [],
        nextSteps: [
          "Add the school, policy name, or document type to the question.",
          "Examples: ORCID registration, national researcher number, Yonsei graduate course rule",
          "Say whether you need an official link or a private document search.",
        ],
        matchedTopics: [],
        mode: "source-only",
      };
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as RBotRequestBody | null;
  const locale = normalizeLocale(body?.locale);
  const question = body?.question?.trim();

  if (!question) {
    return NextResponse.json(
      {
        error: locale === "ko" ? "질문을 입력해 주세요." : "Please enter a question.",
      },
      {
        status: 400,
        headers: getBaseHeaders(),
      },
    );
  }

  if (isDocumentSearchQuestion(question)) {
    return NextResponse.json(buildDocumentScopeResponse(locale), {
      headers: getBaseHeaders(),
    });
  }

  const matches = searchRBotKnowledge(question, locale);

  if (matches.length === 0 && isSchoolRulesQuestion(question)) {
    return NextResponse.json(buildSchoolRulesResponse(locale), {
      headers: getBaseHeaders(),
    });
  }

  const fallbackResponse = buildSourceOnlyResponse(locale, matches) ?? buildFallbackResponse(locale);
  const modelAnswer = matches.length > 0 ? await generateRBotAnswerWithOllama({ locale, question, matches }) : null;

  return NextResponse.json(
    {
      ...fallbackResponse,
      answer: modelAnswer ?? fallbackResponse.answer,
      mode: modelAnswer ? "local-model" : fallbackResponse.mode,
    },
    {
      headers: getBaseHeaders(),
    },
  );
}

export async function GET() {
  const runtimeStatus = await getRBotRuntimeStatus();

  return NextResponse.json(
    {
      provider: runtimeStatus.provider,
      model: runtimeStatus.model,
      baseUrl: runtimeStatus.baseUrl,
      status: runtimeStatus.status,
      reachable: runtimeStatus.reachable,
      modelAvailable: runtimeStatus.modelAvailable,
      installCommand: runtimeStatus.installCommand,
    },
    {
      headers: getBaseHeaders(),
    },
  );
}
