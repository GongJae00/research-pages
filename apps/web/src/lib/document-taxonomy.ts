import { documentCategories, documentTypes, type DocumentRecord } from "@research-os/types";

import type { Locale } from "./i18n";

export type DocumentCategory = (typeof documentCategories)[number];
export type DocumentType = (typeof documentTypes)[number];

export const categoryTypeMap: Record<DocumentCategory, DocumentType[]> = {
  research: ["research_plan", "proposal", "paper", "abstract", "research_note"],
  application_admin: [
    "admission_application",
    "scholarship_application",
    "scholarship_answer",
    "self_introduction",
    "recommendation_letter",
    "administrative_form",
    "statement",
  ],
  certificate: [
    "certificate_enrollment",
    "certificate_transcript",
    "certificate_expected_graduation",
    "tuition_payment_confirmation",
    "acceptance_notice",
    "certificate_other",
  ],
  course_material: ["lecture_material", "course_assignment", "syllabus", "teaching_material"],
  presentation_meeting: [
    "presentation",
    "poster",
    "seminar_material",
    "meeting_material",
    "speech_script",
  ],
  template_form: ["template", "form_template"],
  data_analysis: ["dataset", "spreadsheet", "analysis_report"],
  reference_archive: ["cv", "bio", "portfolio", "policy", "guide", "other"],
};

const categoryLabels = {
  research: { ko: "연구 문서", en: "Research" },
  application_admin: { ko: "지원·행정", en: "Application & admin" },
  certificate: { ko: "증빙·증명", en: "Certificates" },
  course_material: { ko: "강의·수업", en: "Course materials" },
  presentation_meeting: { ko: "발표·회의", en: "Presentation & meeting" },
  template_form: { ko: "템플릿·양식", en: "Templates & forms" },
  data_analysis: { ko: "데이터·분석", en: "Data & analysis" },
  reference_archive: { ko: "참고·보관", en: "Reference archive" },
} as const satisfies Record<DocumentCategory, Record<Locale, string>>;

const categoryDescriptions = {
  research: {
    ko: "연구계획서, 제안서, 논문, 초록, 연구노트",
    en: "Research plans, proposals, papers, abstracts, notes",
  },
  application_admin: {
    ko: "입학원서, 장학신청, 자기소개서, 제출서류",
    en: "Admissions, scholarships, self-introduction, admin forms",
  },
  certificate: {
    ko: "재학증명, 성적증명, 졸업예정, 납부확인, 합격통지",
    en: "Enrollment, transcripts, graduation, payment, acceptance",
  },
  course_material: {
    ko: "강의자료, 과제, 강의계획, 조교 자료",
    en: "Lecture materials, assignments, syllabus, teaching files",
  },
  presentation_meeting: {
    ko: "발표자료, 포스터, 세미나, 회의자료",
    en: "Slides, posters, seminar files, meeting materials",
  },
  template_form: {
    ko: "기본 템플릿, 제출 양식, 연구실 공용 서식",
    en: "Base templates, forms, reusable lab layouts",
  },
  data_analysis: {
    ko: "CSV, XLSX, 분석결과, 데이터 정리본",
    en: "CSV, XLSX, analysis outputs, cleaned data",
  },
  reference_archive: {
    ko: "CV, Bio, 포트폴리오, 규정, 안내문, 보관 파일",
    en: "CV, bio, portfolio, policies, guides, archive files",
  },
} as const satisfies Record<DocumentCategory, Record<Locale, string>>;

const typeLabels = {
  research_plan: { ko: "연구계획서", en: "Research plan" },
  abstract: { ko: "초록", en: "Abstract" },
  research_note: { ko: "연구노트", en: "Research note" },
  scholarship_answer: { ko: "장학금 답변", en: "Scholarship answer" },
  scholarship_application: { ko: "장학금 신청서", en: "Scholarship application" },
  admission_application: { ko: "입학원서", en: "Admission application" },
  self_introduction: { ko: "자기소개서", en: "Self-introduction" },
  statement: { ko: "진술서", en: "Statement" },
  recommendation_letter: { ko: "추천서", en: "Recommendation letter" },
  administrative_form: { ko: "행정 제출서류", en: "Administrative form" },
  bio: { ko: "Bio", en: "Bio" },
  cv: { ko: "CV", en: "CV" },
  proposal: { ko: "제안서", en: "Proposal" },
  paper: { ko: "논문", en: "Paper" },
  poster: { ko: "포스터", en: "Poster" },
  seminar_material: { ko: "세미나 자료", en: "Seminar material" },
  meeting_material: { ko: "회의 자료", en: "Meeting material" },
  speech_script: { ko: "발표 원고", en: "Speech script" },
  presentation: { ko: "발표 자료", en: "Presentation" },
  lecture_material: { ko: "강의 자료", en: "Lecture material" },
  course_assignment: { ko: "과제", en: "Course assignment" },
  syllabus: { ko: "강의계획", en: "Syllabus" },
  teaching_material: { ko: "조교·강의 운영 자료", en: "Teaching material" },
  certificate_enrollment: { ko: "재학증명서", en: "Enrollment certificate" },
  certificate_transcript: { ko: "성적·석차 증명", en: "Transcript / rank certificate" },
  certificate_expected_graduation: { ko: "졸업예정증명서", en: "Expected graduation certificate" },
  tuition_payment_confirmation: { ko: "등록금납부확인서", en: "Tuition payment confirmation" },
  acceptance_notice: { ko: "합격통지서", en: "Acceptance notice" },
  certificate_other: { ko: "기타 증명서", en: "Other certificate" },
  form_template: { ko: "제출 양식", en: "Form template" },
  dataset: { ko: "원본 데이터", en: "Dataset" },
  spreadsheet: { ko: "스프레드시트", en: "Spreadsheet" },
  analysis_report: { ko: "분석 결과", en: "Analysis report" },
  policy: { ko: "규정", en: "Policy" },
  guide: { ko: "안내문", en: "Guide" },
  portfolio: { ko: "포트폴리오", en: "Portfolio" },
  template: { ko: "템플릿", en: "Template" },
  other: { ko: "기타", en: "Other" },
} as const satisfies Record<DocumentType, Record<Locale, string>>;

const statusLabels = {
  draft: { ko: "초안", en: "Draft" },
  active: { ko: "보관 중", en: "Stored" },
  submitted: { ko: "제출본", en: "Submitted" },
  archived: { ko: "보관 완료", en: "Archived" },
} as const satisfies Record<DocumentRecord["status"], Record<Locale, string>>;

export function getCategoryLabel(locale: Locale, category: DocumentCategory) {
  return categoryLabels[category][locale];
}

export function getCategoryDescription(locale: Locale, category: DocumentCategory) {
  return categoryDescriptions[category][locale];
}

export function getTypeLabel(locale: Locale, type: DocumentType) {
  return typeLabels[type][locale];
}

export function getStatusLabel(locale: Locale, status: DocumentRecord["status"]) {
  return statusLabels[status][locale];
}

export function getCategoryTone(category: DocumentCategory) {
  return {
    research: "pill-blue",
    application_admin: "pill-amber",
    certificate: "pill-gray",
    course_material: "pill-green",
    presentation_meeting: "pill-purple",
    template_form: "pill-gray",
    data_analysis: "pill-green",
    reference_archive: "pill-gray",
  }[category];
}

export function inferCategoryFromType(type: DocumentType): DocumentCategory {
  const matchedCategory = documentCategories.find((category) => categoryTypeMap[category].includes(type));
  return matchedCategory ?? "reference_archive";
}

export function inferClassification(fileName: string) {
  const normalized = fileName.toLowerCase();
  const extension = fileName.split(".").at(-1)?.toLowerCase() ?? "";

  if (normalized.includes("등록금") || normalized.includes("납부") || normalized.includes("tuition")) {
    return { documentCategory: "certificate" as const, documentType: "tuition_payment_confirmation" as const };
  }
  if (normalized.includes("합격") || normalized.includes("accept")) {
    return { documentCategory: "certificate" as const, documentType: "acceptance_notice" as const };
  }
  if (normalized.includes("졸업예정")) {
    return { documentCategory: "certificate" as const, documentType: "certificate_expected_graduation" as const };
  }
  if (normalized.includes("재학") || normalized.includes("성적") || normalized.includes("석차") || normalized.includes("transcript")) {
    return { documentCategory: "certificate" as const, documentType: "certificate_transcript" as const };
  }
  if (normalized.includes("장학") && normalized.includes("신청")) {
    return { documentCategory: "application_admin" as const, documentType: "scholarship_application" as const };
  }
  if (normalized.includes("장학") || normalized.includes("motivation")) {
    return { documentCategory: "application_admin" as const, documentType: "scholarship_answer" as const };
  }
  if (normalized.includes("입학원서") || normalized.includes("admission")) {
    return { documentCategory: "application_admin" as const, documentType: "admission_application" as const };
  }
  if (normalized.includes("자기소개") || normalized.includes("self")) {
    return { documentCategory: "application_admin" as const, documentType: "self_introduction" as const };
  }
  if (normalized.includes("추천서")) {
    return { documentCategory: "application_admin" as const, documentType: "recommendation_letter" as const };
  }
  if (normalized.includes("연구계획") || normalized.includes("research plan")) {
    return { documentCategory: "research" as const, documentType: "research_plan" as const };
  }
  if (normalized.includes("제안서") || normalized.includes("proposal")) {
    return { documentCategory: "research" as const, documentType: "proposal" as const };
  }
  if (normalized.includes("논문") || normalized.includes("manuscript") || normalized.includes("paper")) {
    return { documentCategory: "research" as const, documentType: "paper" as const };
  }
  if (normalized.includes("초록") || normalized.includes("abstract")) {
    return { documentCategory: "research" as const, documentType: "abstract" as const };
  }
  if (normalized.includes("노트")) {
    return { documentCategory: "research" as const, documentType: "research_note" as const };
  }
  if (normalized.includes("강의") || normalized.includes("lecture")) {
    return { documentCategory: "course_material" as const, documentType: "lecture_material" as const };
  }
  if (normalized.includes("과제") || normalized.includes("assignment")) {
    return { documentCategory: "course_material" as const, documentType: "course_assignment" as const };
  }
  if (normalized.includes("syllabus") || normalized.includes("강의계획")) {
    return { documentCategory: "course_material" as const, documentType: "syllabus" as const };
  }
  if (normalized.includes("포스터") || normalized.includes("poster")) {
    return { documentCategory: "presentation_meeting" as const, documentType: "poster" as const };
  }
  if (normalized.includes("세미나") || normalized.includes("seminar")) {
    return { documentCategory: "presentation_meeting" as const, documentType: "seminar_material" as const };
  }
  if (normalized.includes("회의") || normalized.includes("meeting")) {
    return { documentCategory: "presentation_meeting" as const, documentType: "meeting_material" as const };
  }
  if (normalized.includes("발표") || normalized.includes("ppt") || normalized.includes("slide") || normalized.includes("deck") || extension === "ppt" || extension === "pptx") {
    return { documentCategory: "presentation_meeting" as const, documentType: "presentation" as const };
  }
  if (normalized.includes("template")) {
    return { documentCategory: "template_form" as const, documentType: "template" as const };
  }
  if (normalized.includes("양식") || normalized.includes("form")) {
    return { documentCategory: "template_form" as const, documentType: "form_template" as const };
  }
  if (extension === "csv" || extension === "tsv") {
    return { documentCategory: "data_analysis" as const, documentType: "dataset" as const };
  }
  if (extension === "xls" || extension === "xlsx") {
    return { documentCategory: "data_analysis" as const, documentType: "spreadsheet" as const };
  }
  if (normalized.includes("analysis") || normalized.includes("분석")) {
    return { documentCategory: "data_analysis" as const, documentType: "analysis_report" as const };
  }
  if (normalized.includes("cv") || normalized.includes("resume")) {
    return { documentCategory: "reference_archive" as const, documentType: "cv" as const };
  }
  if (normalized.includes("bio")) {
    return { documentCategory: "reference_archive" as const, documentType: "bio" as const };
  }
  if (normalized.includes("portfolio")) {
    return { documentCategory: "reference_archive" as const, documentType: "portfolio" as const };
  }
  if (normalized.includes("규정") || normalized.includes("policy")) {
    return { documentCategory: "reference_archive" as const, documentType: "policy" as const };
  }
  if (normalized.includes("안내") || normalized.includes("guide")) {
    return { documentCategory: "reference_archive" as const, documentType: "guide" as const };
  }

  return { documentCategory: "reference_archive" as const, documentType: "other" as const };
}
