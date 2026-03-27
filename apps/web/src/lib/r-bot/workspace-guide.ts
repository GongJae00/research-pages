import type { Locale } from "@/lib/i18n";

export interface WorkspaceGuideEntry {
  id: string;
  title: Record<Locale, string>;
  answer: Record<Locale, string>;
  nextSteps: Record<Locale, string[]>;
  href: Record<Locale, string>;
  hrefLabel: Record<Locale, string>;
  keywords: string[];
}

export interface WorkspaceGuideMatch {
  entry: WorkspaceGuideEntry;
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

const workspaceGuide: WorkspaceGuideEntry[] = [
  {
    id: "documents",
    title: {
      ko: "문서함과 초안 관리",
      en: "Document workspace",
    },
    answer: {
      ko: "제안서, 장학금 답변, 증명서, CV 같은 작업 파일은 문서함에서 관리합니다. 제목, 요약, 태그를 붙여두면 R-Bot이 다시 찾기 쉬워집니다.",
      en: "Use the documents workspace for proposals, scholarship answers, certificates, CV files, and other working drafts. Titles, summaries, and tags make R-Bot retrieval much stronger later.",
    },
    nextSteps: {
      ko: [
        "문서함에서 파일을 올리고 제목, 요약, 태그를 구체적으로 적습니다.",
        "제안서나 장학금 문서는 proposal, scholarship 같은 단서를 태그로 남깁니다.",
        "R-Bot에서 찾은 결과는 문서함으로 바로 열어 다시 확인합니다.",
      ],
      en: [
        "Upload the file in the documents workspace and write a specific title, summary, and tags.",
        "For proposals and scholarships, leave clear tags such as proposal or scholarship.",
        "Open the result in the documents screen when R-Bot finds a likely match.",
      ],
    },
    href: {
      ko: "/ko/documents",
      en: "/en/documents",
    },
    hrefLabel: {
      ko: "문서함 열기",
      en: "Open documents",
    },
    keywords: [
      "문서",
      "파일",
      "제안서",
      "증명서",
      "장학금",
      "cv",
      "bio",
      "proposal",
      "document",
      "file",
      "certificate",
      "scholarship",
    ],
  },
  {
    id: "profile",
    title: {
      ko: "프로필과 공개 연구자 페이지",
      en: "Profile workspace",
    },
    answer: {
      ko: "이름, 소속, 연구 분야, ORCID, 홈페이지 링크 같은 기본 정보는 프로필에서 관리합니다. 여기에 정리된 정보가 공개 연구자 페이지와 자기소개 기반이 됩니다.",
      en: "Manage names, affiliations, research areas, ORCID, and homepage links in the profile workspace. That record becomes the base for the public researcher page and repeated self-introduction work.",
    },
    nextSteps: {
      ko: [
        "프로필에서 ORCID, 홈페이지, GitHub 링크를 최신으로 맞춥니다.",
        "연구 분야와 키워드를 비워두지 말고 간결하게 적습니다.",
        "공개 연구자 페이지 확인은 프로필 작업 뒤에 이어서 합니다.",
      ],
      en: [
        "Keep ORCID, homepage, and GitHub links current in the profile workspace.",
        "Do not leave the research field or keywords empty.",
        "Review the public researcher page after updating profile basics.",
      ],
    },
    href: {
      ko: "/ko/profile",
      en: "/en/profile",
    },
    hrefLabel: {
      ko: "프로필 열기",
      en: "Open profile",
    },
    keywords: [
      "프로필",
      "연구자 페이지",
      "홈페이지",
      "orcid",
      "profile",
      "researcher page",
      "homepage",
      "bio",
      "link",
    ],
  },
  {
    id: "funding",
    title: {
      ko: "펀딩과 장학금 기록",
      en: "Funding workspace",
    },
    answer: {
      ko: "장학금, 연구비, 제약 조건, 메모는 펀딩 화면에서 관리합니다. 어떤 문서가 어떤 지원 과제와 연결되는지도 여기 기준으로 정리하는 게 좋습니다.",
      en: "Track scholarships, funding sources, restrictions, and notes in the funding workspace. It is also the right place to keep the relationship between documents and specific support programs understandable.",
    },
    nextSteps: {
      ko: [
        "펀딩명과 금액, 기간, 제약 조건을 먼저 적습니다.",
        "장학금 문서와 관련된 지원명은 제목이나 태그에도 같이 남깁니다.",
        "모호한 약어만 남기지 말고 프로그램명을 풀어서 적습니다.",
      ],
      en: [
        "Write the funding name, amount, date range, and restrictions first.",
        "Mirror the funding program name in document titles or tags.",
        "Avoid leaving only unclear abbreviations.",
      ],
    },
    href: {
      ko: "/ko/funding",
      en: "/en/funding",
    },
    hrefLabel: {
      ko: "펀딩 열기",
      en: "Open funding",
    },
    keywords: [
      "펀딩",
      "장학금",
      "연구비",
      "지원금",
      "funding",
      "scholarship",
      "grant",
      "support",
    ],
  },
  {
    id: "timetable",
    title: {
      ko: "시간표와 학기 작업",
      en: "Timetable workspace",
    },
    answer: {
      ko: "수업, 세미나, 학기 일정을 붙여 보는 작업은 시간표 화면에서 합니다. 학기 문서나 강의 자료를 찾을 때도 학기 단서를 같이 남겨두면 R-Bot이 더 잘 찾습니다.",
      en: "Use the timetable workspace for course, seminar, and semester schedule work. Leaving semester hints on related documents also makes later R-Bot retrieval stronger.",
    },
    nextSteps: {
      ko: [
        "강의명, 요일, 시간, 학기를 시간표에 먼저 정리합니다.",
        "강의 자료 문서에는 학기나 과목명을 제목 또는 태그로 남깁니다.",
        "찾을 때는 2025 spring, 1학기 같은 시간 단서를 같이 적습니다.",
      ],
      en: [
        "Track course title, day, time, and term in the timetable workspace.",
        "Put the term or course name into titles or tags on course documents.",
        "When searching later, include time hints such as 2025 spring.",
      ],
    },
    href: {
      ko: "/ko/timetable",
      en: "/en/timetable",
    },
    hrefLabel: {
      ko: "시간표 열기",
      en: "Open timetable",
    },
    keywords: [
      "시간표",
      "수업",
      "학기",
      "강의",
      "timetable",
      "semester",
      "course",
      "class",
      "lecture",
    ],
  },
  {
    id: "lab",
    title: {
      ko: "연구실 공개 페이지와 공유 자산",
      en: "Lab workspace",
    },
    answer: {
      ko: "People, Research, Papers, Documents, Timetable 구조의 연구실 페이지와 공유 자산은 연구실 화면에서 관리합니다. 개인 문서와 연구실 공유 문서는 구분해서 다루는 게 안전합니다.",
      en: "Use the lab workspace for the public lab page and shared assets under People, Research, Papers, Documents, and Timetable. Keep personal documents separated from lab-shared materials.",
    },
    nextSteps: {
      ko: [
        "연구실 소개와 공개 설명은 연구실 화면에서 먼저 정리합니다.",
        "공유할 문서와 개인 전용 문서를 섞지 말고 범위를 구분합니다.",
        "연구실 공개 페이지를 바꾸기 전엔 People과 Papers 구조를 함께 확인합니다.",
      ],
      en: [
        "Refine the lab summary and public description in the lab workspace first.",
        "Keep shared documents separate from personal-only materials.",
        "Review the People and Papers structure before changing the public lab page.",
      ],
    },
    href: {
      ko: "/ko/lab",
      en: "/en/lab",
    },
    hrefLabel: {
      ko: "연구실 열기",
      en: "Open lab",
    },
    keywords: [
      "연구실",
      "랩",
      "people",
      "paper",
      "lab",
      "public lab",
      "member",
      "shared",
    ],
  },
];

function scoreEntry(entry: WorkspaceGuideEntry, question: string, locale: Locale) {
  const normalizedQuestion = normalizeText(question);
  const questionTokens = tokenize(question);
  const entryText = [
    entry.title[locale],
    entry.answer[locale],
    ...entry.nextSteps[locale],
    ...entry.keywords,
  ].join(" ");
  const normalizedEntryText = normalizeText(entryText);
  let score = 0;

  for (const keyword of entry.keywords) {
    const normalizedKeyword = normalizeText(keyword);

    if (!normalizedKeyword) {
      continue;
    }

    if (normalizedQuestion.includes(normalizedKeyword)) {
      score += normalizedKeyword.includes(" ") ? 5 : 3;
    }
  }

  for (const token of questionTokens) {
    if (token.length < 2) {
      continue;
    }

    if (normalizedEntryText.includes(token)) {
      score += 1;
    }
  }

  return score;
}

export function searchWorkspaceGuide(question: string, locale: Locale, limit = 3) {
  return workspaceGuide
    .map((entry) => ({
      entry,
      score: scoreEntry(entry, question, locale),
    }))
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}
