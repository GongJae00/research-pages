export const locales = ["ko", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ko";

type NestedRecord = { [key: string]: string | NestedRecord };
type MessageShape<T> = {
  [K in keyof T]: T[K] extends string ? string : MessageShape<T[K]>;
};

const ko = {
  common: {
    appName: "ResearchPages",
    loading: "불러오는 중...",
    save: "저장",
    cancel: "취소",
    edit: "수정",
    delete: "삭제",
    add: "추가",
    search: "검색",
    active: "진행 중",
    inactive: "비활성",
    planned: "예정",
    paused: "보류",
    completed: "종료",
    noData: "표시할 데이터가 없습니다",
    present: "현재",
    rules: "제한 사항",
    openWorkspace: "워크스페이스 열기",
    reviewPlan: "구조 보기",
  },
  meta: {
    title: "ResearchPages",
    description:
      "대학원생, 교수, 연구실을 위한 통합 연구자 운영 플랫폼. 프로필, 소속 이력, 연구비, 문서, 시간표를 하나의 구조로 관리합니다.",
  },
  nav: {
    home: "홈",
    dashboard: "대시보드",
    profile: "프로필",
    affiliations: "소속 이력",
    funding: "연구비",
    documents: "문서",
    timetable: "시간표",
    settings: "설정",
    lab: "연구실",
  },
  header: {
    overview: "개요",
    workflow: "운영 레이어",
    modules: "핵심 모듈",
    outputs: "최종 결과",
    security: "보안 구조",
  },
  home: {
    announcement: "대학 연구자를 위한 개인·연구실 페이지 플랫폼",
    title: "흩어진 연구 행정과 문서를\n하나의 연구 운영 체계로",
    subtitle:
      "ResearchPages는 개인 비공개 공간에서 연구자 정보와 문서를 정리하고, 연구실 협업 공간을 거쳐, 이후 연구자·연구실 홈페이지까지 이어질 수 있도록 설계된 웹 우선 플랫폼입니다.",
    primaryCta: "워크스페이스 열기",
    secondaryCta: "운영 구조 보기",
    workspaceCard: {
      eyebrow: "오늘의 운영 보드",
      title: "개인 기록, 연구실 자산, 공개 홈페이지 재료가 이어지는 워크스페이스",
      body: "한 번 정리한 프로필, 소속, 연구비, 문서, 일정이 다음 제출과 협업, 공개 프로필 생성까지 연결됩니다.",
      badge: "private-by-default",
      stages: {
        personal: "개인 비공개",
        lab: "연구실 협업",
        public: "공개 홈페이지",
      },
    },
    stats: {
      activeAffiliations: "활성 소속",
      activeFunding: "활성 연구비",
      documents: "문서 자산",
      timetable: "학기 블록",
    },
    sections: {
      overview: "왜 필요한가",
      workflow: "운영 레이어",
      operations: "핵심 모듈",
      outputs: "최종 결과",
      companion: "웹과 모바일",
      security: "보안 기준선",
    },
    overview: {
      structure: {
        title: "자유 메모가 아니라 구조화된 연구자 원본",
        body: "이름, 연구자 번호, 소속, 연구비, 문서, 논문 메타데이터를 분리 저장하고 서로 연결합니다.",
      },
      reuse: {
        title: "같은 문장을 다시 찾지 않는 재사용 체계",
        body: "연구계획서, 장학금 답변, 자기소개, 발표 자료, 템플릿을 다음 제출과 발표 준비에 다시 조합합니다.",
      },
      lab: {
        title: "개인 공간에서 연구실 허브와 공개 레이어로 확장",
        body: "처음에는 로그인한 본인만 보는 개인 운영 공간으로 시작하고, 이후 연구실 협업과 공개 홈페이지 구조까지 같은 정보 체계로 이어집니다.",
      },
    },
    layers: {
      title: "ResearchPages는 단순 홈페이지 빌더가 아니라 연구 데이터와 공개 페이지를 연결하는 구조입니다.",
      body: "개인 정보 정리, 연구실 협업, 공개 홈페이지 생성이 서로 끊기지 않도록 같은 데이터 구조 위에서 이어집니다.",
      personal: {
        title: "1. 개인 비공개 운영",
        body: "프로필, 소속, 연구비, 문서, 학기 시간표를 로그인한 본인 기준으로 정리합니다.",
        points: {
          one: "문서와 파일을 private-by-default로 저장",
          two: "장학금, 급여, 과제 조건을 같은 맥락에서 관리",
          three: "이후 CV와 제출 문서에 바로 가져갈 원본 축적",
        },
      },
      lab: {
        title: "2. 연구실 협업 허브",
        body: "초대 기반 팀 공간에서 문서, 논문, 세미나, 연락처, 공동 홈페이지 재료를 역할별로 관리합니다.",
        points: {
          one: "개인 문서를 명시적으로 연구실로 공유",
          two: "팀원, 권한, 공동 일정, 공유 자산을 분리 관리",
          three: "People, News, Seminar, Papers 구조를 내부에서 먼저 축적",
        },
      },
      public: {
        title: "3. 공개 홈페이지 레이어",
        body: "축적된 개인·연구실 정보를 바탕으로 교수 프로필, 연구실 소개, 공개 페이지 생성까지 확장합니다.",
        points: {
          one: "교수/연구자 프로필 페이지 재료 자동 정리",
          two: "연구실 홈페이지의 People, Contact, Papers 구조로 연결",
          three: "향후 LLM과 에이전트가 바로 조립할 수 있는 기반 확보",
        },
      },
    },
    workflowPanel: {
      eyebrow: "반복 운영 루프",
      title: "한 번 정리한 정보가 다음 제출과 협업, 공개 레이어까지 이어집니다.",
      body: "ResearchPages는 입력 화면을 늘리는 것이 아니라, 반복해서 다시 써야 하는 연구 행정 흐름과 공개 페이지 준비를 줄이는 데 초점을 둡니다.",
    },
    workflow: {
      capture: {
        title: "1. 연구자 원본 정보 정리",
        body: "국문·영문 이름, 연구자 식별자, 주 소속, 홈페이지, 연구 분야를 한 원본으로 유지합니다.",
      },
      connect: {
        title: "2. 소속과 연구비 컨텍스트 연결",
        body: "학교, 기업, 과제 소속과 장학금, 급여, 연구비 조건, 관련 문서를 같은 맥락으로 엮습니다.",
      },
      reuse: {
        title: "3. 문서·일정·공개 재료 재사용",
        body: "연구계획서, 지원서 답변, 발표 자료, 학기 시간표를 다음 제출과 연구실 운영, 공개 프로필로 이어갑니다.",
      },
    },
    modulesLead:
      "프로필, 소속, 연구비, 문서, 시간표는 따로 존재하는 메뉴가 아니라 서로 연결된 운영 모듈로 작동해야 합니다.",
    outputs: {
      title: "결국 필요한 것은 정리된 데이터가 아니라 바로 꺼내 쓸 수 있는 결과물입니다.",
      body: "ResearchPages는 저장 자체보다, 다음 제출과 연구실 운영, 공개 홈페이지 제작에 바로 이어질 산출물을 만들기 위한 기반을 목표로 합니다.",
      cv: {
        title: "CV와 연구자 소개문",
        body: "국문·영문 이름, 소속, 연구 분야, 주요 이력과 논문 메타데이터를 한 번 정리해 이후 소개문과 CV 초안으로 바로 가져갑니다.",
      },
      submissions: {
        title: "연구계획서와 지원 패키지",
        body: "연구계획서, 장학금 답변, 자기소개, 제출 문서를 다시 찾지 않고 다음 제출 묶음으로 재조합합니다.",
      },
      facultySite: {
        title: "교수·개인 연구자 프로필 페이지",
        body: "개인 프로필, 경력, 연구 분야, 연락 채널, 대표 문서를 정리해 향후 공개 연구자 페이지 생성으로 확장합니다.",
      },
      labSite: {
        title: "연구실 홈페이지 구조",
        body: "People, News, Seminar, Contact, Papers, Research 구조를 내부 협업 허브와 같은 축으로 유지해 공개 사이트로 이어갑니다.",
      },
    },
    companion: {
      title: "웹 우선, 모바일 연동",
      body: "무거운 문서 조립과 행정 입력은 웹에서 처리하고, 모바일은 조회·업로드·빠른 수정 중심으로 따라갑니다.",
      web: {
        title: "웹 워크스테이션",
        body: "복잡한 입력, 비교, 재조합, 파일 탐색을 위한 메인 환경입니다.",
      },
      mobile: {
        title: "모바일 컴패니언",
        body: "시간표 확인, 자료 업로드, 알림 확인, 빠른 현장 수정에 집중합니다.",
      },
    },
    security: {
      title: "민감한 연구자 정보를 다루기 위한 기본 설계",
      subtitle:
        "완벽한 보안이라는 표현 대신, private-by-default 데이터 모델과 범위 기반 접근 제어를 기본으로 둡니다.",
      private: {
        title: "기본 비공개 저장",
        body: "프로필, 연구비, 문서 파일은 공개 기능을 명시적으로 켜기 전까지 비공개로 유지합니다.",
      },
      access: {
        title: "범위 기반 접근 제어",
        body: "개인 공간과 연구실 공간을 분리하고, 이후 역할별 접근 규칙을 붙일 수 있도록 설계합니다.",
      },
      portability: {
        title: "가벼운 모노레포와 Linux 이식성",
        body: "저사양 PC에서도 시작할 수 있고, 이후 다른 Windows 또는 Linux 개발 환경으로 옮기기 쉬운 구성을 유지합니다.",
      },
    },
    modules: {
      profile: {
        title: "프로필 볼트",
        body: "연구자 기본 정보, 식별자, 공개 프로필의 원본 자산 관리",
      },
      affiliations: {
        title: "소속 타임라인",
        body: "학교, 연구실, 기업, 과제 단위의 역할 변화를 기간별로 추적",
      },
      funding: {
        title: "연구비 컨텍스트",
        body: "장학금, 급여, 프로젝트 지원과 제한 조건을 함께 관리",
      },
      documents: {
        title: "문서 뱅크",
        body: "연구계획서, 지원서 답변, PPT 템플릿, 포트폴리오 재료를 재사용 자산으로 저장",
      },
      timetable: {
        title: "학기 시간표",
        body: "수업, 회의, 연구 블록을 학기 단위로 조회하고 수정",
      },
    },
  },
  dashboard: {
    welcome: "환영합니다",
    subtitle: "연구 운영 정보를 한 화면에서 정리합니다",
    activeAffiliations: "활성 소속",
    activeFunding: "활성 연구비",
    totalDocuments: "등록 문서",
    thisWeekClasses: "학기 일정",
    recentDocuments: "최근 문서",
    upcomingSchedule: "예정 일정",
    fundingOverview: "연구비 현황",
    affiliationSummary: "소속 현황",
    quickStart: "빠른 시작",
    quickStartDesc: "새 문서를 만들거나 프로필 정보를 갱신하세요",
    viewAll: "전체 보기",
    noSchedule: "등록된 일정이 없습니다",
    moduleStatus: "모듈 상태",
    modules: {
      profileVault: "프로필 볼트",
      profileVaultDesc: "연구자 기본 정보, 식별자, 소속 이력을 하나의 원본으로 유지합니다.",
      affiliationTimeline: "소속 타임라인",
      affiliationTimelineDesc: "학교, 연구실, 기업, 과제 단위 역할 변화를 기간별로 추적합니다.",
      fundingContext: "연구비 컨텍스트",
      fundingContextDesc: "장학금, 급여, 연구비 조건을 소속과 연결해 정리합니다.",
      documentBank: "문서 뱅크",
      documentBankDesc: "연구계획서, 자기소개, 지원서 답변, 템플릿을 재사용 자산으로 보관합니다.",
      timetableManager: "시간표",
      timetableManagerDesc: "학기별 수업, 회의, 연구 블록을 한 화면에서 관리합니다.",
    },
  },
  profile: {
    title: "프로필",
    subtitle: "연구자 기본 신원과 식별 정보를 관리합니다",
    displayName: "표시 이름",
    legalName: "법적 이름",
    preferredName: "선호 이름",
    romanizedName: "영문 이름",
    headline: "한 줄 소개",
    primaryEmail: "기본 이메일",
    secondaryEmail: "보조 이메일",
    phone: "전화번호",
    nationalResearcherNumber: "국가연구자번호",
    orcid: "ORCID",
    primaryInstitution: "주 소속 기관",
    primaryDiscipline: "전공 분야",
    keywords: "키워드",
    publicProfile: "공개 프로필",
    publicProfileEnabled: "공개 프로필 활성화",
    personalInfo: "기본 정보",
    contactInfo: "연락처",
    researchIds: "연구자 식별 정보",
    academicInfo: "학술 정보",
  },
  affiliations: {
    title: "소속 이력",
    subtitle: "기관, 연구실, 프로젝트 단위의 역할과 기간을 관리합니다",
    institution: "기관명",
    department: "학과/부서",
    labName: "연구실",
    role: "직위/역할",
    roleTrack: "트랙",
    status: "상태",
    period: "기간",
    startDate: "시작일",
    endDate: "종료일",
    notes: "비고",
    relatedFunding: "연결 연구비",
    organizationType: "기관 유형",
    types: {
      university: "대학교",
      lab: "연구실",
      company: "기업",
      government: "정부 기관",
      research_institute: "연구기관",
      hospital: "병원",
      foundation: "재단",
      other: "기타",
    },
    tracks: {
      student: "학생",
      faculty: "교수",
      postdoc: "박사후연구원",
      researcher: "연구원",
      staff: "직원",
      admin: "행정",
      industry: "산학",
      other: "기타",
    },
    statuses: {
      planned: "예정",
      active: "진행 중",
      paused: "보류",
      completed: "종료",
    },
  },
  funding: {
    title: "연구비",
    subtitle: "장학금, 급여, 과제 지원과 제한 조건을 함께 관리합니다",
    source: "항목명",
    sourceType: "유형",
    provider: "지급처",
    project: "프로젝트",
    amount: "금액",
    currency: "통화",
    cadence: "지급 주기",
    restrictions: "제한 사항",
    linkedAffiliation: "연결 소속",
    compensationKind: "보상 유형",
    types: {
      scholarship: "장학금",
      assistantship: "조교/인건비",
      payroll: "급여",
      internal_grant: "교내 연구비",
      external_grant: "외부 연구비",
      industry: "산학 지원",
      fellowship: "펠로우십",
      other: "기타",
    },
    cadences: {
      one_time: "1회",
      monthly: "월별",
      quarterly: "분기별",
      semester: "학기별",
      annual: "연간",
      custom: "비정기",
    },
    compensation: {
      scholarship: "장학금",
      payroll: "급여",
      grant: "연구비",
      stipend: "수당",
      other: "기타",
    },
  },
  documents: {
    title: "문서",
    subtitle: "연구계획서, 지원서 답변, 소개문, 템플릿 자산을 관리합니다",
    documentType: "문서 유형",
    status: "상태",
    visibility: "공개 범위",
    tags: "태그",
    summary: "요약",
    lastUpdated: "최근 수정",
    types: {
      research_plan: "연구계획서",
      scholarship_answer: "장학금 답변",
      self_introduction: "자기소개서",
      statement: "연구 소개문",
      bio: "바이오",
      cv: "CV",
      proposal: "제안서",
      paper: "논문",
      presentation: "발표 자료",
      portfolio: "포트폴리오",
      template: "템플릿",
      other: "기타",
    },
    statuses: {
      draft: "초안",
      active: "사용 중",
      submitted: "제출 완료",
      archived: "보관",
    },
    visibilities: {
      private: "비공개",
      lab: "연구실",
      public: "공개",
    },
  },
  timetable: {
    title: "시간표",
    subtitle: "학기별 수업, 회의, 연구 일정을 구조적으로 관리합니다",
    term: "학기",
    course: "과목/일정",
    courseCode: "과목 코드",
    day: "요일",
    time: "시간",
    location: "장소",
    kind: "유형",
    noLocation: "장소 미정",
    days: {
      monday: "월요일",
      tuesday: "화요일",
      wednesday: "수요일",
      thursday: "목요일",
      friday: "금요일",
      saturday: "토요일",
      sunday: "일요일",
    },
    daysShort: {
      monday: "월",
      tuesday: "화",
      wednesday: "수",
      thursday: "목",
      friday: "금",
      saturday: "토",
      sunday: "일",
    },
    kinds: {
      class: "수업",
      research: "연구",
      meeting: "회의",
      seminar: "세미나",
      office_hours: "면담",
      teaching: "강의",
      deadline: "마감",
      other: "기타",
    },
  },
} as const;

export type Dictionary = MessageShape<typeof ko>;

const en: Dictionary = {
  common: {
    appName: "ResearchPages",
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    add: "Add",
    search: "Search",
    active: "Active",
    inactive: "Inactive",
    planned: "Planned",
    paused: "Paused",
    completed: "Completed",
    noData: "No data available",
    present: "Present",
    rules: "Restrictions",
    openWorkspace: "Open workspace",
    reviewPlan: "Review structure",
  },
  meta: {
    title: "ResearchPages",
    description:
      "Integrated research operations platform for graduate students, professors, and labs. Manage profile, affiliations, funding, documents, and timetables in one structure.",
  },
  nav: {
    home: "Home",
    dashboard: "Dashboard",
    profile: "Profile",
    affiliations: "Affiliations",
    funding: "Funding",
    documents: "Documents",
    timetable: "Timetable",
    settings: "Settings",
    lab: "Lab",
  },
  header: {
    overview: "Overview",
    workflow: "Operating layers",
    modules: "Modules",
    outputs: "Outputs",
    security: "Security",
  },
  home: {
    announcement: "A page platform for graduate students, faculty, and labs",
    title: "Turn structured researcher data\ninto personal and lab pages",
    subtitle:
      "ResearchPages is a web-first platform designed to organize researcher information and documents in a private personal workspace first, then extend into lab collaboration and eventually public researcher or lab websites.",
    primaryCta: "Open workspace",
    secondaryCta: "Review the operating structure",
    workspaceCard: {
      eyebrow: "Today's operations board",
      title: "One workspace that connects personal records, lab assets, and future public publishing",
      body: "Profiles, affiliations, funding, documents, and schedules should connect to the next submission, collaboration flow, and public profile layer instead of living in separate folders.",
      badge: "private-by-default",
      stages: {
        personal: "Private personal",
        lab: "Lab collaboration",
        public: "Public website",
      },
    },
    stats: {
      activeAffiliations: "Active affiliations",
      activeFunding: "Active funding",
      documents: "Document assets",
      timetable: "Semester blocks",
    },
    sections: {
      overview: "Why this exists",
      workflow: "Operating layers",
      operations: "Core modules",
      outputs: "Outputs",
      companion: "Web and mobile",
      security: "Security baseline",
    },
    overview: {
      structure: {
        title: "Structured researcher source data instead of loose notes",
        body: "Names, researcher identifiers, affiliations, funding, documents, and paper metadata stay separated and linked as source records.",
      },
      reuse: {
        title: "A reuse system that avoids searching for the same sentence again",
        body: "Research plans, scholarship answers, bios, slides, and templates become reusable ingredients for the next submission or presentation.",
      },
      lab: {
        title: "A base that scales from personal work to lab hubs and public publishing",
        body: "Start in a private personal workspace, then extend into lab collaboration and public websites without rebuilding the information structure.",
      },
    },
    layers: {
      title: "ResearchPages is not just a website builder. It connects structured research data to personal and lab pages.",
      body: "Personal management, lab collaboration, and public publishing stay on the same information architecture so work does not need to be reorganized every time the scope grows.",
      personal: {
        title: "1. Private personal operations",
        body: "Organize profile records, affiliations, funding, documents, and semester schedules in a workspace visible only to the signed-in user.",
        points: {
          one: "Store files and document assets as private-by-default",
          two: "Track scholarships, payroll, and project constraints in context",
          three: "Accumulate source data for future CVs and submissions",
        },
      },
      lab: {
        title: "2. Lab collaboration hub",
        body: "Manage invited team members, shared documents, papers, seminars, contact details, and homepage ingredients in a role-aware lab space.",
        points: {
          one: "Share personal documents into the lab deliberately",
          two: "Separate members, permissions, schedules, and shared assets cleanly",
          three: "Build People, News, Seminar, and Papers data inside the workspace first",
        },
      },
      public: {
        title: "3. Public website layer",
        body: "Extend personal and lab information into faculty profiles, lab introductions, and public pages without rebuilding the content from scratch.",
        points: {
          one: "Prepare materials for researcher and faculty profile pages",
          two: "Connect directly into People, Contact, Papers, and Research pages",
          three: "Create a foundation for future LLM- and agent-assisted publishing",
        },
      },
    },
    workflowPanel: {
      eyebrow: "Operating loop",
      title: "Once the source information is organized, it can flow into the next submission, collaboration cycle, and public layer.",
      body: "ResearchPages is designed to reduce repeated administrative work and public page preparation, not simply add more input screens.",
    },
    workflow: {
      capture: {
        title: "1. Capture the researcher source record",
        body: "Keep Korean and English names, researcher identifiers, the primary affiliation, homepage links, and research fields as one source record.",
      },
      connect: {
        title: "2. Connect affiliations and funding context",
        body: "Link university, company, and project affiliations with scholarships, payroll, funding rules, and related documents.",
      },
      reuse: {
        title: "3. Reuse documents, schedules, and publishing materials",
        body: "Carry research plans, application answers, slides, and semester schedules into the next submission, lab operation cycle, and public profile layer.",
      },
    },
    modulesLead:
      "Profiles, affiliations, funding, documents, and timetables should not act like disconnected pages. They need to operate as linked modules inside one system.",
    outputs: {
      title: "The real goal is not stored data. It is deliverables you can use immediately.",
      body: "ResearchPages is built to turn structured source data into the next submission package, collaboration workspace, and public-facing site materials.",
      cv: {
        title: "CVs and researcher bios",
        body: "Organize Korean and English names, affiliations, research fields, experience, and paper metadata once, then reuse them for bios and CV drafts.",
      },
      submissions: {
        title: "Research plans and application packages",
        body: "Reassemble plans, scholarship answers, bios, and submission documents into the next application package without digging through folders.",
      },
      facultySite: {
        title: "Faculty and researcher profile pages",
        body: "Keep personal profile, career history, research areas, contact channels, and representative documents ready for future public profile generation.",
      },
      labSite: {
        title: "Lab website structure",
        body: "Maintain People, News, Seminar, Contact, Papers, and Research on the same structure used by the internal collaboration hub.",
      },
    },
    companion: {
      title: "Web first, mobile connected",
      body: "Heavy document assembly and administrative input stay on the web, while mobile follows with lookup, upload, alerts, and quick edits.",
      web: {
        title: "Web workstation",
        body: "The main environment for dense input, comparison, reuse, and file-heavy workflows.",
      },
      mobile: {
        title: "Mobile companion",
        body: "Focused on timetable checks, uploads, alerts, and fast edits in the field.",
      },
    },
    security: {
      title: "A realistic baseline for handling sensitive researcher data",
      subtitle:
        "Rather than claim perfect security, the product starts with a private-by-default model and scope-based access control.",
      private: {
        title: "Private storage by default",
        body: "Profiles, funding records, and files stay private until a public or shared layer is intentionally enabled.",
      },
      access: {
        title: "Scope-based access control",
        body: "Personal and lab workspaces stay separated so later role-based permissions can be added cleanly.",
      },
      portability: {
        title: "Lean monorepo with Linux portability",
        body: "The stack stays light enough for a low-spec PC now and easier migration to another Windows or Linux machine later.",
      },
    },
    modules: {
      profile: {
        title: "Profile vault",
        body: "Core researcher identity, identifiers, and source assets for future public profiles",
      },
      affiliations: {
        title: "Affiliation timeline",
        body: "Track roles across universities, labs, companies, and projects over time",
      },
      funding: {
        title: "Funding context",
        body: "Manage scholarships, payroll, project support, and restrictions together",
      },
      documents: {
        title: "Document bank",
        body: "Store research plans, application answers, slide templates, and portfolio ingredients as reusable assets",
      },
      timetable: {
        title: "Semester timetable",
        body: "View and edit classes, meetings, and research blocks by term",
      },
    },
  },
  dashboard: {
    welcome: "Welcome",
    subtitle: "Organize your research operations in one view",
    activeAffiliations: "Active affiliations",
    activeFunding: "Active funding",
    totalDocuments: "Documents",
    thisWeekClasses: "Semester schedule",
    recentDocuments: "Recent documents",
    upcomingSchedule: "Upcoming schedule",
    fundingOverview: "Funding overview",
    affiliationSummary: "Affiliation summary",
    quickStart: "Quick start",
    quickStartDesc: "Create a new document or update your profile",
    viewAll: "View all",
    noSchedule: "No schedule entries",
    moduleStatus: "Module status",
    modules: {
      profileVault: "Profile vault",
      profileVaultDesc:
        "Keep researcher identity, identifiers, and affiliation history as one source of truth.",
      affiliationTimeline: "Affiliation timeline",
      affiliationTimelineDesc:
        "Track roles across universities, labs, companies, and projects over time.",
      fundingContext: "Funding context",
      fundingContextDesc:
        "Link scholarships, payroll, and research funding constraints with affiliation context.",
      documentBank: "Document bank",
      documentBankDesc:
        "Store research plans, self-introductions, application answers, and templates as reusable assets.",
      timetableManager: "Timetable",
      timetableManagerDesc: "Manage semester classes, meetings, and research blocks in one screen.",
    },
  },
  profile: {
    title: "Profile",
    subtitle: "Manage core researcher identity and identifier fields",
    displayName: "Display name",
    legalName: "Legal name",
    preferredName: "Preferred name",
    romanizedName: "Romanized name",
    headline: "Headline",
    primaryEmail: "Primary email",
    secondaryEmail: "Secondary email",
    phone: "Phone",
    nationalResearcherNumber: "National researcher ID",
    orcid: "ORCID",
    primaryInstitution: "Primary institution",
    primaryDiscipline: "Discipline",
    keywords: "Keywords",
    publicProfile: "Public profile",
    publicProfileEnabled: "Enable public profile",
    personalInfo: "Personal info",
    contactInfo: "Contact",
    researchIds: "Research identifiers",
    academicInfo: "Academic info",
  },
  affiliations: {
    title: "Affiliations",
    subtitle: "Manage roles and periods across institutions, labs, and projects",
    institution: "Institution",
    department: "Department",
    labName: "Lab",
    role: "Role",
    roleTrack: "Track",
    status: "Status",
    period: "Period",
    startDate: "Start date",
    endDate: "End date",
    notes: "Notes",
    relatedFunding: "Related funding",
    organizationType: "Organization type",
    types: {
      university: "University",
      lab: "Lab",
      company: "Company",
      government: "Government",
      research_institute: "Research institute",
      hospital: "Hospital",
      foundation: "Foundation",
      other: "Other",
    },
    tracks: {
      student: "Student",
      faculty: "Faculty",
      postdoc: "Postdoc",
      researcher: "Researcher",
      staff: "Staff",
      admin: "Admin",
      industry: "Industry",
      other: "Other",
    },
    statuses: {
      planned: "Planned",
      active: "Active",
      paused: "Paused",
      completed: "Completed",
    },
  },
  funding: {
    title: "Funding",
    subtitle: "Manage scholarships, payroll, grants, and restrictions together",
    source: "Item",
    sourceType: "Type",
    provider: "Provider",
    project: "Project",
    amount: "Amount",
    currency: "Currency",
    cadence: "Cadence",
    restrictions: "Restrictions",
    linkedAffiliation: "Linked affiliation",
    compensationKind: "Compensation",
    types: {
      scholarship: "Scholarship",
      assistantship: "Assistantship",
      payroll: "Payroll",
      internal_grant: "Internal grant",
      external_grant: "External grant",
      industry: "Industry support",
      fellowship: "Fellowship",
      other: "Other",
    },
    cadences: {
      one_time: "One-time",
      monthly: "Monthly",
      quarterly: "Quarterly",
      semester: "Per semester",
      annual: "Annual",
      custom: "Custom",
    },
    compensation: {
      scholarship: "Scholarship",
      payroll: "Payroll",
      grant: "Grant",
      stipend: "Stipend",
      other: "Other",
    },
  },
  documents: {
    title: "Documents",
    subtitle: "Manage research plans, application answers, bios, and template assets",
    documentType: "Document type",
    status: "Status",
    visibility: "Visibility",
    tags: "Tags",
    summary: "Summary",
    lastUpdated: "Last updated",
    types: {
      research_plan: "Research plan",
      scholarship_answer: "Scholarship answer",
      self_introduction: "Self-introduction",
      statement: "Statement",
      bio: "Bio",
      cv: "CV",
      proposal: "Proposal",
      paper: "Paper",
      presentation: "Presentation",
      portfolio: "Portfolio",
      template: "Template",
      other: "Other",
    },
    statuses: {
      draft: "Draft",
      active: "Active",
      submitted: "Submitted",
      archived: "Archived",
    },
    visibilities: {
      private: "Private",
      lab: "Lab",
      public: "Public",
    },
  },
  timetable: {
    title: "Timetable",
    subtitle: "Keep semester classes, meetings, and research schedules structured",
    term: "Term",
    course: "Course",
    courseCode: "Course code",
    day: "Day",
    time: "Time",
    location: "Location",
    kind: "Type",
    noLocation: "No location",
    days: {
      monday: "Monday",
      tuesday: "Tuesday",
      wednesday: "Wednesday",
      thursday: "Thursday",
      friday: "Friday",
      saturday: "Saturday",
      sunday: "Sunday",
    },
    daysShort: {
      monday: "Mon",
      tuesday: "Tue",
      wednesday: "Wed",
      thursday: "Thu",
      friday: "Fri",
      saturday: "Sat",
      sunday: "Sun",
    },
    kinds: {
      class: "Class",
      research: "Research",
      meeting: "Meeting",
      seminar: "Seminar",
      office_hours: "Office hours",
      teaching: "Teaching",
      deadline: "Deadline",
      other: "Other",
    },
  },
};

const dictionaries: Record<Locale, Dictionary> = {
  ko,
  en,
};

export async function getDictionary(locale: string): Promise<Dictionary> {
  const key = locales.includes(locale as Locale) ? (locale as Locale) : defaultLocale;
  return dictionaries[key];
}

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function t(dict: Dictionary, path: string): string {
  const parts = path.split(".");
  let node: string | NestedRecord = dict as NestedRecord;

  for (const part of parts) {
    if (typeof node === "string") {
      return path;
    }

    node = node[part];

    if (node === undefined) {
      return path;
    }
  }

  return typeof node === "string" ? node : path;
}
