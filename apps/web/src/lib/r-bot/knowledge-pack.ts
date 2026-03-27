export type RBotLocale = "ko" | "en";

type LocalizedText = Record<RBotLocale, string>;
type LocalizedList = Record<RBotLocale, string[]>;

export interface RBotKnowledgeEntry {
  id: string;
  title: LocalizedText;
  summary: LocalizedText;
  answer: LocalizedText;
  nextSteps: LocalizedList;
  keywords: string[];
  sourceLabel: LocalizedText;
  sourceUrl: string;
  caution?: LocalizedText;
  verifiedOn: string;
}

export interface RBotStarterPrompt {
  id: string;
  label: LocalizedText;
  question: LocalizedText;
}

export function getLocalizedText(value: LocalizedText, locale: RBotLocale) {
  return value[locale];
}

export function getLocalizedList(value: LocalizedList, locale: RBotLocale) {
  return value[locale];
}

export const rBotKnowledgePack: RBotKnowledgeEntry[] = [
  {
    id: "orcid-registration",
    title: {
      ko: "ORCID 등록",
      en: "ORCID registration",
    },
    summary: {
      ko: "ORCID는 연구자 개인을 구분하는 국제 고유 식별자입니다.",
      en: "ORCID is a persistent identifier used to distinguish an individual researcher.",
    },
    answer: {
      ko: "ORCID 공식 안내 기준으로, 연구 커뮤니티 구성원은 무료로 ORCID iD를 직접 등록할 수 있습니다. 등록 뒤에는 같은 ORCID를 CV, 홈페이지, 논문 투고, 연구비 신청에 계속 재사용하는 구조가 좋습니다.",
      en: "According to ORCID's official guidance, people in the research community can register an ORCID iD for themselves free of charge. After registration, it works best as one identifier you keep reusing across your CV, homepage, submissions, and funding workflows.",
    },
    nextSteps: {
      ko: [
        "공식 등록 페이지에서 직접 계정을 만듭니다.",
        "현재 메일과 백업 메일을 함께 등록합니다.",
        "등록 후 ORCID URL을 CV와 프로필에 붙입니다.",
      ],
      en: [
        "Create the account directly on the official registration page.",
        "Add both your current and backup email addresses.",
        "After registration, place the ORCID URL on your CV and profile.",
      ],
    },
    keywords: [
      "orcid",
      "오알시드",
      "researcher id",
      "researcher identifier",
      "persistent id",
      "register orcid",
      "orcid 등록",
      "orcid 발급",
    ],
    sourceLabel: {
      ko: "ORCID 공식 등록 안내",
      en: "Official ORCID registration guide",
    },
    sourceUrl: "https://support.orcid.org/hc/en-us/articles/360006897454-Register-your-ORCID-iD",
    caution: {
      ko: "학교나 학회 제출 양식은 따로 요구사항이 있을 수 있으니, ORCID 자체 등록과 제출 규정은 분리해서 확인하는 편이 안전합니다.",
      en: "Schools and publishers may still have their own submission requirements, so treat ORCID registration and local submission rules as separate checks.",
    },
    verifiedOn: "2026-03-26",
  },
  {
    id: "orcid-basics",
    title: {
      ko: "ORCID가 왜 필요한가",
      en: "Why ORCID matters",
    },
    summary: {
      ko: "이름이 비슷하거나 소속이 바뀌어도 같은 연구자를 연결하는 용도입니다.",
      en: "It helps keep the same researcher identity connected even when names or affiliations change.",
    },
    answer: {
      ko: "ORCID는 연구자 식별용 PID입니다. ORCID 연구자 안내는 이름 변경이나 소속 이동이 있어도 같은 식별자를 계속 쓸 수 있다고 설명합니다. 초보자라면 먼저 ORCID를 만든 뒤, CV와 공개 프로필에 같은 URL을 반복해서 쓰는 습관을 잡는 것이 가장 실용적입니다.",
      en: "ORCID is a researcher PID. ORCID's researcher guide explains that you can keep the same identifier throughout your career even if your name or affiliation changes. For beginners, the practical habit is to create one ORCID first and then reuse the same URL everywhere public.",
    },
    nextSteps: {
      ko: [
        "ORCID URL을 프로필, CV, 자기소개서 기본 정보에 함께 적습니다.",
        "학교 포털이나 연구비 시스템에서 ORCID 입력란이 있으면 같은 값을 씁니다.",
        "공개 범위는 ORCID record 설정에서 조정합니다.",
      ],
      en: [
        "Place the ORCID URL on your profile, CV, and baseline application materials.",
        "Reuse the same value wherever a university or funding form asks for ORCID.",
        "Adjust visibility inside your ORCID record settings.",
      ],
    },
    keywords: [
      "why orcid",
      "what is orcid",
      "orcid meaning",
      "orcid 뭐야",
      "orcid 왜",
      "연구자 식별자",
      "pid",
      "persistent identifier",
    ],
    sourceLabel: {
      ko: "ORCID 연구자 안내",
      en: "ORCID for Researchers",
    },
    sourceUrl: "https://info.orcid.org/researchers/",
    caution: {
      ko: "ORCID는 식별자이지, 학교별 행정 절차를 대신해 주는 시스템은 아닙니다.",
      en: "ORCID is an identifier, not a replacement for school-specific administrative workflows.",
    },
    verifiedOn: "2026-03-26",
  },
  {
    id: "national-researcher-number",
    title: {
      ko: "국가연구자번호 안내",
      en: "National researcher number guidance",
    },
    summary: {
      ko: "IRIS FAQ는 IRIS 로그인 후 국가연구자정보시스템 최초 진입 시 연구자 전환과 연구자번호 생성 절차가 진행된다고 안내합니다.",
      en: "The IRIS FAQ says the first entry into the National Researcher Information System after signing in triggers researcher conversion and number generation.",
    },
    answer: {
      ko: "2026년 3월 26일 기준으로 확인한 IRIS FAQ는, IRIS 로그인 후 `국가연구자정보시스템`을 처음 누를 때 연구자 전환 동의와 함께 연구자번호 생성 절차가 진행된다고 설명합니다. 발급이 끝나면 기본정보 화면에서 연구자번호를 확인할 수 있고, 기존 KRI 또는 NTIS 번호가 있으면 기존 번호가 연결될 수 있습니다.",
      en: "As verified on March 26, 2026, the IRIS FAQ explains that after signing in, the first click into the National Researcher Information System starts researcher conversion and researcher-number generation. Once completed, the number appears in the basic information screen, and older KRI or NTIS numbers may carry over.",
    },
    nextSteps: {
      ko: [
        "IRIS에 회원가입 또는 로그인합니다.",
        "`국가연구자정보시스템`을 처음 눌러 연구자 전환 절차를 진행합니다.",
        "기본정보에서 연구자번호 표시 여부를 확인합니다.",
      ],
      en: [
        "Sign up for or sign in to IRIS.",
        "Open the National Researcher Information System and complete researcher conversion on first access.",
        "Check whether the researcher number appears in the basic information screen.",
      ],
    },
    keywords: [
      "국가연구자번호",
      "researcher number",
      "nri",
      "iris",
      "kri",
      "ntis",
      "연구자번호",
      "연구자 전환",
      "researcher conversion",
    ],
    sourceLabel: {
      ko: "IRIS FAQ",
      en: "IRIS FAQ",
    },
    sourceUrl: "https://www.iris.go.kr/contents/retrieveSinmungoFaq.do",
    caution: {
      ko: "사업 공고나 학교 제출 화면이 구번호, 통합번호, 또는 별도 내부번호를 다르게 적을 수 있으니 실제 제출 시스템 표기도 같이 확인해야 합니다.",
      en: "A funding call or university form may still label an older number, integrated number, or internal number differently, so confirm the wording on the actual submission screen as well.",
    },
    verifiedOn: "2026-03-26",
  },
];

export const rBotStarterPrompts: RBotStarterPrompt[] = [
  {
    id: "prompt-orcid",
    label: {
      ko: "ORCID 등록",
      en: "Register ORCID",
    },
    question: {
      ko: "ORCID가 뭐고 어디서 등록해?",
      en: "What is ORCID and where do I register for it?",
    },
  },
  {
    id: "prompt-number",
    label: {
      ko: "국가연구자번호",
      en: "Researcher number",
    },
    question: {
      ko: "국가연구자번호는 어디서 확인하거나 발급 절차를 시작해?",
      en: "Where do I start the national researcher number process?",
    },
  },
  {
    id: "prompt-rules",
    label: {
      ko: "학교 규정",
      en: "School rules",
    },
    question: {
      ko: "학교별 학사규정은 어디서부터 찾는 게 좋아?",
      en: "Where should I start when looking for school-specific academic rules?",
    },
  },
];
