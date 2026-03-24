"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  AffiliationTimelineEntry,
  DocumentRecord,
  JournalClass,
  ProfileLink,
  ProfileLinkKind,
  PublicationRecord,
  ResearchProfile,
} from "@research-os/types";
import { journalClasses } from "@research-os/types";
import { Camera, Download, ExternalLink, Eye, FileText, PencilLine, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import { useAuth } from "@/components/auth-provider";
import { CompactDocumentRow } from "@/components/compact-document-row";
import { DocumentEvidencePicker } from "@/components/document-evidence-picker";
import {
  readJsonFromStorage,
  writeJsonToStorage,
} from "@/lib/browser-json-store";
import {
  loadBrowserDocuments,
  loadBrowserDocumentsForAccount,
} from "@/lib/document-browser-store";
import { getDocumentFile } from "@/lib/document-file-store";
import { syncDocumentsForAccount } from "@/lib/document-server-store";
import {
  hasEvidenceForAccountKey,
  hasEvidenceForKey,
  readEvidenceForAccountKey,
  readEvidenceForKey,
  writeEvidenceForKey,
} from "@/lib/evidence-links";
import type { Locale } from "@/lib/i18n";
import {
  loadBrowserAffiliationsForAccount,
} from "@/lib/affiliation-browser-store";
import { syncAffiliationsForAccount } from "@/lib/affiliation-server-store";
import {
  buildScopedStorageKey,
  buildScopedStorageKeyForAccount,
  getAccountById,
} from "@/lib/mock-auth-store";
import {
  buildDefaultPublicProfileSlug,
  buildPublicResearcherPath,
  normalizePublicProfileSlug,
} from "@/lib/public-profile";
import {
  loadBrowserProfileForAccount,
  saveBrowserProfile,
  saveBrowserProfileForAccount,
} from "@/lib/profile-browser-store";
import {
  syncProfileForAccount,
  upsertServerProfileForAccount,
} from "@/lib/profile-server-store";
import {
  loadBrowserPublications,
  loadBrowserPublicationsForAccount,
  saveBrowserPublications,
  saveBrowserPublicationsForAccount,
} from "@/lib/publication-browser-store";
import {
  createServerPublicationRecord,
  deleteServerPublicationRecord,
  isServerPublicationId,
  updateServerPublicationRecord,
  syncPublicationsForAccount,
} from "@/lib/publication-server-store";
import {
  replaceProfileEvidenceLinks,
  syncProfileEvidenceForAccount,
} from "@/lib/profile-evidence-server-store";
import {
  buildAffiliationsFromLabs,
  buildLabLinkLookup,
  buildProfileFromAccount,
  buildResearcherSummary,
  findLabLinkInLookup,
  joinUniqueTextParts,
  normalizeComparableText,
  sortAffiliations,
} from "@/lib/researcher-directory";
import { ensureSeededDocumentFiles, getCareerDocumentIds, isCareerDocument } from "@/lib/document-seeds";

interface ProfileWorkspaceProps {
  locale: Locale;
  initialProfile: ResearchProfile;
  initialAffiliations: AffiliationTimelineEntry[];
  initialDocuments: DocumentRecord[];
}

interface EditableProfile {
  koreanName: string;
  englishName: string;
  emails: string[];
  links: EditableProfileLink[];
  nationalResearcherNumber: string;
  orcid: string;
  primaryInstitution: string;
  primaryDiscipline: string;
  keywordsText: string;
  photoDataUrl: string;
  publicProfileEnabled: boolean;
  publicProfileSlug: string;
}

interface EditableProfileLink {
  kind: ProfileLinkKind;
  label: string;
  url: string;
}

interface PublicationPreviewState {
  document: DocumentRecord | null;
  mode: "iframe" | "text" | "empty";
  url?: string;
  text?: string;
  message: string;
}

const profileStorageBaseKey = "researchos:profile-workspace:v2";
const profileEvidenceKey = "profile:core";
const textPreviewExtensions = new Set(["txt", "md", "csv", "tsv"]);

const copy = {
  ko: {
    title: "프로필",
    subtitle: "CV, 소개문, 연구계획서, 공개 홈페이지까지 이어질 기본 정보를 한 곳에 정리합니다.",
    edit: "프로필 편집",
    save: "저장",
    cancel: "취소",
    photo: "프로필 사진",
    photoHint: "프로필 카드와 향후 공개 페이지에 재사용할 기본 이미지",
    photoAlt: "프로필 사진",
    photoUpload: "사진 올리기",
    identity: "기본 이름",
    identityHint: "논문 저자 표기와 홈페이지 표기에 직접 쓰일 이름입니다.",
    basicProfile: "기본 프로필",
    basicProfileDescription: "연락 채널, 홈페이지, 연구자 식별 정보를 압축해서 보여줍니다.",
    contactPanel: "연락 및 홈페이지",
    idPanel: "연구자 식별 정보",
    focusPanel: "연구 분야",
    contacts: "연락 채널",
    ids: "연구자 식별 정보",
    researchFocus: "연구 분야",
    researchFocusDescription: "주 소속, 전공, 키워드를 짧고 명확하게 정리합니다.",
    education: "학력",
    educationDescription: "학위 과정과 재학 이력을 따로 정리합니다.",
    experience: "경력 및 소속",
    experienceDescription: "연구실, 과제, 기관 경험을 시간순으로 정리합니다.",
    publications: "논문",
    publicationsDescription: "게재연월, 학술지, 참여자를 먼저 훑고 필요할 때 상세 메타데이터를 엽니다.",
    relatedDocuments: "관련 문서",
    relatedDocumentsDescription: "외부 공개 없이 개인 확인용으로 연결한 문서입니다.",
    publicationPreview: "논문 미리보기",
    publicationDetailHint: "논문을 선택하면 좌측 미리보기와 우측 상세 정보가 열립니다.",
    publicationPreviewEmpty: "연결된 논문 원문이나 초록 파일이 아직 없습니다.",
    publicationPreviewMissing: "원본 파일을 찾을 수 없습니다.",
    publicationPreviewUnsupported: "이 형식은 여기서 바로 미리보기 어렵습니다.",
    publicationPreviewError: "미리보기를 불러오지 못했습니다.",
    publicationNoSelection: "논문을 선택하세요.",
    publicationDetailTitle: "상세 메타데이터",
    koreanName: "국문 이름",
    englishName: "영문 이름",
    email: "이메일",
    link: "홈페이지",
    addEmail: "이메일 추가",
    addLink: "홈페이지 추가",
    nationalId: "국가연구자번호",
    orcid: "ORCID",
    institution: "주 소속 기관",
    discipline: "전공 또는 연구 분야",
    keywords: "키워드",
    active: "진행 중",
    inactive: "종료",
    present: "현재",
    period: "기간",
    lab: "연구실",
    emptyValue: "아직 입력하지 않았습니다.",
    emptyDocuments: "연결된 관련 문서가 아직 없습니다.",
    educationEmpty: "등록된 학력 정보가 아직 없습니다.",
    experienceEmpty: "등록된 경력 정보가 아직 없습니다.",
    publicationEmpty: "등록된 논문 정보가 아직 없습니다.",
    publicationJournalClass: "학술지 구분",
    publicationJournal: "학술지명",
    publicationPublisher: "발행처",
    publicationDate: "게재연월",
    publicationAuthorRole: "저자 역할",
    publicationTitle: "논문명",
    publicationParticipants: "참여자",
    addPublication: "논문 추가",
    removePublication: "삭제",
    publicationTitlePlaceholder: "논문 제목",
    publicationDatePlaceholder: "예: 2024-03",
    publicationAuthorRolePlaceholder: "저자 역할 선택",
    publicationParticipantsPlaceholder: "예: 홍길동, 이연구, Jane Doe",
    publicationJournalPlaceholder: "학술지 이름",
    publicationPublisherPlaceholder: "발행처",
    publicationMoreDetails: "상세 항목",
    sectionHint: "향후 공개 홈페이지와 에이전트 작업에 재사용될 원본 데이터입니다.",
    keywordsPlaceholder: "예: rPPG, ECG, HCI, LLM",
    linksPlaceholder: "예: https://cvclab.example.com",
    removeEmail: "이메일 삭제",
    removeLink: "홈페이지 삭제",
    updatedOn: "최근 수정",
  },
  en: {
    title: "Profile",
    subtitle: "Keep the base information that will feed CVs, bios, research plans, and future public pages.",
    edit: "Edit profile",
    save: "Save",
    cancel: "Cancel",
    photo: "Profile photo",
    photoHint: "Primary image reused in the profile card and future public pages",
    photoAlt: "Profile photo",
    photoUpload: "Upload photo",
    identity: "Name",
    identityHint: "Used directly in author bios, profile pages, and publication outputs.",
    basicProfile: "Core profile",
    basicProfileDescription: "Compress core contact channels, homepages, and researcher identifiers.",
    contactPanel: "Contact & homepages",
    idPanel: "Research identifiers",
    focusPanel: "Research focus",
    contacts: "Contact channels",
    ids: "Research identifiers",
    researchFocus: "Research focus",
    researchFocusDescription: "Keep the primary affiliation, discipline, and keywords compact.",
    education: "Education",
    educationDescription: "Keep degree programs and student affiliations separate.",
    experience: "Experience",
    experienceDescription: "List lab, project, and institutional experience in time order.",
    publications: "Papers",
    publicationsDescription: "Scan publication month, journal, and participants first, then open detailed IRIS-ready metadata.",
    relatedDocuments: "Related documents",
    relatedDocumentsDescription: "Linked personal documents kept separate from public-facing profile content.",
    publicationPreview: "Paper preview",
    publicationDetailHint: "Select a paper to open the preview on the left and detailed metadata on the right.",
    publicationPreviewEmpty: "No linked paper file or abstract document yet.",
    publicationPreviewMissing: "The source file could not be found.",
    publicationPreviewUnsupported: "This format cannot be previewed inline here.",
    publicationPreviewError: "Could not load the preview.",
    publicationNoSelection: "Select a paper.",
    publicationDetailTitle: "Detailed metadata",
    koreanName: "Korean name",
    englishName: "English name",
    email: "Email",
    link: "Homepage",
    addEmail: "Add email",
    addLink: "Add homepage",
    nationalId: "National researcher ID",
    orcid: "ORCID",
    institution: "Primary institution",
    discipline: "Discipline or research field",
    keywords: "Keywords",
    active: "Active",
    inactive: "Ended",
    present: "Present",
    period: "Period",
    lab: "Lab",
    emptyValue: "Not filled in yet.",
    emptyDocuments: "No related documents linked yet.",
    educationEmpty: "No education records yet.",
    experienceEmpty: "No experience records yet.",
    publicationEmpty: "No paper records yet.",
    publicationJournalClass: "Journal class",
    publicationJournal: "Journal",
    publicationPublisher: "Publisher",
    publicationDate: "Published",
    publicationAuthorRole: "Author role",
    publicationTitle: "Paper title",
    publicationParticipants: "Participants",
    addPublication: "Add paper",
    removePublication: "Remove",
    publicationTitlePlaceholder: "Paper title",
    publicationDatePlaceholder: "e.g. 2024-03",
    publicationAuthorRolePlaceholder: "Choose author role",
    publicationParticipantsPlaceholder: "e.g. John Doe, Jane Doe",
    publicationJournalPlaceholder: "Journal name",
    publicationPublisherPlaceholder: "Publisher",
    publicationMoreDetails: "More details",
    sectionHint: "This becomes the base source for future profile pages and agent workflows.",
    keywordsPlaceholder: "e.g. rPPG, ECG, HCI, LLM",
    linksPlaceholder: "e.g. https://cvclab.example.com",
    removeEmail: "Remove email",
    removeLink: "Remove homepage",
    updatedOn: "Updated",
  },
} as const;

const publicationAuthorRoles = {
  ko: ["제1저자", "공동저자", "교신저자", "단독저자", "참여저자"],
  en: ["First author", "Co-author", "Corresponding author", "Sole author", "Contributing author"],
} as const;

const linkKindLabels: Record<Locale, Record<ProfileLinkKind, string>> = {
  ko: {
    homepage: "홈페이지",
    github: "GitHub",
    google_scholar: "Google Scholar",
    orcid: "ORCID",
    lab: "연구실",
    cv: "CV",
    portfolio: "포트폴리오",
    linkedin: "LinkedIn",
    custom: "기타",
  },
  en: {
    homepage: "Homepage",
    github: "GitHub",
    google_scholar: "Google Scholar",
    orcid: "ORCID",
    lab: "Lab",
    cv: "CV",
    portfolio: "Portfolio",
    linkedin: "LinkedIn",
    custom: "Custom",
  },
};

const careerDocumentTypeOrder = ["cv", "statement", "portfolio"] as const;

const careerDocumentTypeLabels = {
  ko: {
    cv: "CV",
    statement: "SOP",
    portfolio: "Portfolio",
  },
  en: {
    cv: "CV",
    statement: "SOP",
    portfolio: "Portfolio",
  },
} as const;

function normalizeRows(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeEditableLinks(value: unknown): EditableProfileLink[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return {
          kind: "homepage" as const,
          label: "",
          url: item,
        };
      }

      if (!item || typeof item !== "object") {
        return null;
      }

      const candidate = item as Partial<EditableProfileLink>;
      const kind =
        typeof candidate.kind === "string" && candidate.kind in linkKindLabels.en
          ? (candidate.kind as ProfileLinkKind)
          : "custom";
      const url = typeof candidate.url === "string" ? candidate.url : "";

      return {
        kind,
        label: typeof candidate.label === "string" ? candidate.label : "",
        url,
      };
    })
    .filter((item): item is EditableProfileLink => Boolean(item?.url.trim()));
}

function createEmptyEditableLink(kind: ProfileLinkKind = "homepage"): EditableProfileLink {
  return {
    kind,
    label: "",
    url: "",
  };
}

function normalizeStructuredLinks(links: EditableProfileLink[]): ProfileLink[] {
  const seen = new Set<string>();

  return links
    .map((link) => ({
      kind: link.kind,
      label: link.label.trim() || undefined,
      url: normalizeLink(link.url),
    }))
    .filter((link) => link.url.length > 0)
    .filter((link) => {
      const dedupeKey = `${link.kind}:${link.url.toLowerCase()}`;

      if (seen.has(dedupeKey)) {
        return false;
      }

      seen.add(dedupeKey);
      return true;
    });
}

function getProfileLinkLabel(locale: Locale, link: Pick<EditableProfileLink, "kind" | "label">) {
  return link.label.trim() || linkKindLabels[locale][link.kind];
}

function getProfileLinkDisplayUrl(url: string) {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

function normalizePublicationMonth(value?: string) {
  const source = value?.trim();
  if (!source) return undefined;
  const matched = source.match(/(\d{4})[.\-/ ]?(\d{1,2})/);
  if (!matched) return source;
  const [, year, month] = matched;
  return `${year}-${month.padStart(2, "0")}`;
}

function normalizeLink(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function getTodayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function createPublicationId() {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return `pub-${window.crypto.randomUUID()}`;
  }
  return `pub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildEditableProfile(profile: ResearchProfile): EditableProfile {
  return {
    koreanName: profile.koreanName ?? profile.displayName ?? "",
    englishName: profile.englishName ?? profile.romanizedName ?? "",
    emails:
      profile.emails.length > 0
        ? profile.emails
        : [profile.primaryEmail, profile.secondaryEmail].filter(
            (value): value is string => Boolean(value),
          ),
    links: normalizeEditableLinks(profile.links),
    nationalResearcherNumber: profile.nationalResearcherNumber ?? "",
    orcid: profile.orcid ?? "",
    primaryInstitution: profile.primaryInstitution ?? "",
    primaryDiscipline: profile.primaryDiscipline ?? "",
    keywordsText: profile.keywords.join(", "),
    photoDataUrl: profile.photoDataUrl ?? "",
    publicProfileEnabled: profile.publicProfile.enabled,
    publicProfileSlug: profile.publicProfile.slug ?? "",
  };
}

function buildResearchProfileFromEditable(
  baseProfile: ResearchProfile,
  editableProfile: EditableProfile,
): ResearchProfile {
  const normalizedEmails = normalizeRows(editableProfile.emails);
  const normalizedKeywords = normalizeRows(editableProfile.keywordsText.split(","));
  const normalizedLinks = normalizeStructuredLinks(editableProfile.links);
  const requestedPublicSlug = normalizePublicProfileSlug(editableProfile.publicProfileSlug);
  const normalizedPublicSlug =
    requestedPublicSlug ||
    (editableProfile.publicProfileEnabled
      ? buildDefaultPublicProfileSlug({
          englishName: editableProfile.englishName,
          displayName: editableProfile.koreanName || baseProfile.displayName,
          accountId: baseProfile.owner.id,
        })
      : "");

  return {
    ...baseProfile,
    displayName:
      editableProfile.koreanName.trim() ||
      editableProfile.englishName.trim() ||
      baseProfile.displayName,
    koreanName: editableProfile.koreanName.trim() || undefined,
    englishName: editableProfile.englishName.trim() || undefined,
    primaryEmail: normalizedEmails[0] ?? baseProfile.primaryEmail,
    emails: normalizedEmails,
    photoDataUrl: editableProfile.photoDataUrl.trim() || undefined,
    nationalResearcherNumber: editableProfile.nationalResearcherNumber.trim() || undefined,
    orcid: editableProfile.orcid.trim() || undefined,
    primaryInstitution: editableProfile.primaryInstitution.trim() || undefined,
    primaryDiscipline: editableProfile.primaryDiscipline.trim() || undefined,
    keywords: normalizedKeywords,
    links: normalizedLinks,
    publicProfile: {
      enabled: editableProfile.publicProfileEnabled,
      slug: normalizedPublicSlug || undefined,
    },
  };
}

function findPublicationDocument(publication: PublicationRecord, documents: DocumentRecord[]) {
  const titleKey = normalizeComparableText(publication.title);
  const journalKey = normalizeComparableText(publication.journalName);

  return (
    documents.find((document) => {
      const docTitle = normalizeComparableText(document.title);
      const docFile = normalizeComparableText(document.originalFileName);
      return Boolean(titleKey) && (docTitle.includes(titleKey) || docFile.includes(titleKey));
    }) ??
    documents.find((document) => {
      const docSummary = normalizeComparableText(document.summary);
      return Boolean(journalKey) && docSummary.includes(journalKey);
    }) ??
    null
  );
}

function formatPublicationLine(publication: PublicationRecord, fallback: string) {
  return [
    normalizePublicationMonth(publication.publishedOn) ?? fallback,
    publication.journalName ?? fallback,
    publication.participants ?? fallback,
  ].join(" | ");
}

function formatPublicationBibliographyLine(publication: PublicationRecord, fallback: string) {
  return (
    joinUniqueTextParts([
      publication.participants,
      publication.journalName,
      publication.publisher,
    ]) || fallback
  );
}

export function ProfileWorkspace({
  locale,
  initialProfile,
  initialAffiliations,
  initialDocuments,
}: ProfileWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentAccount, refresh } = useAuth();
  const text = copy[locale];
  const isKo = locale === "ko";
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const currentAccountId = currentAccount?.id ?? null;
  const requestedProfileAccountId = searchParams.get("account");
  const requestedLabSlug = searchParams.get("lab");
  const isExternalProfile =
    Boolean(requestedProfileAccountId) && requestedProfileAccountId !== currentAccountId;
  const targetProfileAccountId =
    isExternalProfile && requestedProfileAccountId ? requestedProfileAccountId : currentAccountId;

  const [profileRecord, setProfileRecord] = useState<ResearchProfile>(initialProfile);
  const [savedProfile, setSavedProfile] = useState<EditableProfile>(buildEditableProfile(initialProfile));
  const [draftProfile, setDraftProfile] = useState<EditableProfile>(buildEditableProfile(initialProfile));
  const [documents, setDocuments] = useState<DocumentRecord[]>(initialDocuments);
  const [resolvedAffiliations, setResolvedAffiliations] = useState<AffiliationTimelineEntry[]>(
    initialAffiliations,
  );
  const [linkedDocumentIds, setLinkedDocumentIds] = useState<string[]>([]);
  const [draftLinkedDocumentIds, setDraftLinkedDocumentIds] = useState<string[]>([]);
  const [publications, setPublications] = useState<PublicationRecord[]>([]);
  const [draftPublications, setDraftPublications] = useState<PublicationRecord[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPublicationId, setSelectedPublicationId] = useState<string | null>(null);
  const [publicationPreview, setPublicationPreview] = useState<PublicationPreviewState | null>(null);
  const isReadonlyView = isExternalProfile;
  const onlineLinksLabel = isKo ? "온라인 링크" : "Online links";
  const addLinkLabel = isKo ? "링크 추가" : "Add link";
  const removeLinkLabel = isKo ? "링크 제거" : "Remove link";
  const linkLabelLabel = isKo ? "표시 이름" : "Label";
  const linkLabelPlaceholder = isKo ? "예: GitHub, Personal site" : "e.g. GitHub, Personal site";
  const linkUrlLabel = isKo ? "링크 주소" : "URL";
  const linkUrlPlaceholder = isKo ? "예: https://github.com/..." : "e.g. https://github.com/...";
  const careerDocumentsTitle = isKo ? "커리어 문서" : "Career documents";
  const careerHubTitle = isKo ? "커리어 운영 허브" : "Career hub";
  const careerHubDescription = isKo
    ? "CV, SOP, 포트폴리오와 대표 링크를 평소에 관리해 컨택, 지원, 공개 페이지 작업이 바로 시작되게 합니다."
    : "Maintain CV, SOP, portfolio materials, and representative links over time so outreach, applications, and public pages can start immediately.";
  const careerReadySetTitle = isKo ? "기본 준비 세트" : "Always-ready set";
  const careerReadySetDescription = isKo
    ? "최소한 CV, SOP, Portfolio는 계속 손보는 상태로 유지하는 것이 좋습니다."
    : "Keep at least CV, SOP, and portfolio materials continuously maintained.";
  const careerDocumentsPanelTitle = isKo ? "작업 중인 커리어 문서" : "Active career documents";
  const careerDocumentsPanelDescription = isKo
    ? "지원, 컨택, 공개 페이지에 바로 쓰일 문서 초안을 평소에 계속 업데이트합니다."
    : "Keep the drafts that feed outreach, applications, and public pages continuously updated.";
  const careerDocumentsEmpty = isKo
    ? "아직 연결된 커리어 문서가 없습니다. 문서함에서 CV, SOP, Portfolio 초안을 먼저 정리해두세요."
    : "No career documents are linked yet. Start by keeping CV, SOP, and portfolio drafts in the documents workspace.";
  const careerLinksTitle = isKo ? "대표 링크 묶음" : "Representative links";
  const careerLinksDescription = isKo
    ? "GitHub, 홈페이지, Scholar 같은 링크도 문서와 함께 계속 관리해야 합니다."
    : "Keep GitHub, homepage, scholar, and other representative links maintained together with the document set.";
  const careerOpenDocumentsLabel = isKo ? "문서함 열기" : "Open documents";
  const careerReadyLabel = isKo ? "준비됨" : "Ready";
  const careerMissingLabel = isKo ? "비어 있음" : "Missing";
  const careerLinksEmpty = isKo ? "대표 링크가 아직 없습니다." : "No representative links yet.";

  const publicPageTitle = isKo ? "공개 연구자 페이지" : "Public researcher page";
  const publicPageDescription = isKo
    ? "개인 공개 페이지를 켜고 주소를 관리합니다. 공개 페이지는 이 프로필과 논문, 소속 정보를 기반으로 렌더링됩니다."
    : "Enable a public researcher page and keep the URL under your control. The page renders from this profile, affiliations, and papers.";
  const publicPageStatusLabel = isKo ? "공개 상태" : "Visibility";
  const publicPageEnabledLabel = isKo ? "공개" : "Public";
  const publicPageDisabledLabel = isKo ? "비공개" : "Private";
  const publicPageSlugLabel = isKo ? "페이지 주소" : "Public slug";
  const publicPageSlugHint = isKo
    ? "비워두면 이름을 바탕으로 기본 주소가 자동으로 만들어집니다."
    : "Leave blank to generate a default slug from the researcher name.";
  const publicPageSlugPlaceholder = isKo ? "예: gongjae-jo" : "e.g. gongjae-jo";
  const publicPageOpenLabel = isKo ? "공개 페이지 열기" : "Open public page";

  useEffect(() => {
    try {
      const targetAccountId =
        isExternalProfile && requestedProfileAccountId ? requestedProfileAccountId : currentAccountId;
      const targetAccount =
        isExternalProfile && requestedProfileAccountId
          ? getAccountById(requestedProfileAccountId)
          : currentAccount;
      const fallbackAffiliations =
        isExternalProfile && targetAccountId && targetAccount
          ? buildAffiliationsFromLabs(targetAccountId, requestedLabSlug)
          : initialAffiliations;
      const fallbackProfileRecord =
        targetAccount && targetAccountId
          ? loadBrowserProfileForAccount(
              targetAccountId,
              buildProfileFromAccount(targetAccount, fallbackAffiliations),
            )
          : initialProfile;
      const fallbackProfile = buildEditableProfile(
        targetAccount ? fallbackProfileRecord : initialProfile,
      );
      const parsed = readJsonFromStorage<Partial<EditableProfile> | null>(
        targetAccountId
          ? buildScopedStorageKeyForAccount(profileStorageBaseKey, targetAccountId)
          : buildScopedStorageKey(profileStorageBaseKey),
        null,
      );
      const nextProfile: EditableProfile = {
        ...fallbackProfile,
        ...parsed,
        emails: parsed?.emails ?? fallbackProfile.emails,
        links: normalizeEditableLinks(parsed?.links ?? fallbackProfile.links),
      };
      const loadedPublications = (
        targetAccountId && targetAccount
          ? loadBrowserPublicationsForAccount(targetAccountId)
          : loadBrowserPublications()
      ).map((publication) => ({
        ...publication,
        publishedOn: normalizePublicationMonth(publication.publishedOn),
      }));
      const loadedDocuments =
        targetAccountId && targetAccount
          ? loadBrowserDocumentsForAccount([], targetAccountId)
          : loadBrowserDocuments(initialDocuments);
      const evidenceExists =
        targetAccountId && targetAccount
          ? hasEvidenceForAccountKey(targetAccountId, profileEvidenceKey)
          : hasEvidenceForKey(profileEvidenceKey);
      const storedEvidenceIds =
        targetAccountId && targetAccount
          ? readEvidenceForAccountKey(targetAccountId, profileEvidenceKey)
          : readEvidenceForKey(profileEvidenceKey);
      const defaultCareerDocumentIds = getCareerDocumentIds(loadedDocuments);
      const evidenceIds = evidenceExists ? storedEvidenceIds : defaultCareerDocumentIds;

      if (currentAccountId && !isExternalProfile && !evidenceExists && defaultCareerDocumentIds.length > 0) {
        writeEvidenceForKey(profileEvidenceKey, defaultCareerDocumentIds);
      }

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfileRecord(targetAccount ? fallbackProfileRecord : initialProfile);
      setSavedProfile(nextProfile);
      setDraftProfile(nextProfile);
      setDocuments(loadedDocuments);
      setResolvedAffiliations(
        currentAccountId && !isExternalProfile
          ? loadBrowserAffiliationsForAccount(currentAccountId, initialAffiliations)
          : fallbackAffiliations,
      );
      setLinkedDocumentIds(evidenceIds);
      setDraftLinkedDocumentIds(evidenceIds);
      setPublications(loadedPublications);
      setDraftPublications(loadedPublications);
      setSelectedPublicationId((current) => current ?? loadedPublications[0]?.id ?? null);
      setIsEditing(false);
    } catch {
      const fallbackProfile = buildEditableProfile(initialProfile);
      setProfileRecord(initialProfile);
      setSavedProfile(fallbackProfile);
      setDraftProfile(fallbackProfile);
      setDocuments(loadBrowserDocuments(initialDocuments));
      setResolvedAffiliations(initialAffiliations);
      setLinkedDocumentIds([]);
      setDraftLinkedDocumentIds([]);
      setPublications([]);
      setDraftPublications([]);
      setSelectedPublicationId(null);
      setIsEditing(false);
    }
  }, [
    currentAccount,
    currentAccountId,
    initialAffiliations,
    initialDocuments,
    initialProfile,
    isExternalProfile,
    requestedLabSlug,
    requestedProfileAccountId,
  ]);

  useEffect(() => {
    if (!currentAccountId || isExternalProfile || isEditing) {
      return;
    }

    let cancelled = false;

    void syncProfileForAccount(currentAccountId, initialProfile)
      .then((serverProfile) => {
        if (cancelled || !serverProfile) {
          return;
        }

        const nextProfile = buildEditableProfile(serverProfile);
        setProfileRecord(serverProfile);
        setSavedProfile(nextProfile);
        setDraftProfile(nextProfile);
      })
      .catch(() => {
        // Keep the local cache path alive when the server sync is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [currentAccountId, initialProfile, isEditing, isExternalProfile]);

  useEffect(() => {
    if (!currentAccountId || isExternalProfile) {
      return;
    }

    let cancelled = false;

    void syncAffiliationsForAccount(currentAccountId, initialAffiliations)
      .then((serverAffiliations) => {
        if (!cancelled && serverAffiliations) {
          setResolvedAffiliations(serverAffiliations);
        }
      })
      .catch(() => {
        // Keep the local cache path alive when the server sync is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [currentAccountId, initialAffiliations, isExternalProfile]);

  useEffect(() => {
    if (!targetProfileAccountId) {
      return;
    }

    let cancelled = false;

    void syncDocumentsForAccount(targetProfileAccountId)
      .then((serverDocuments) => {
        if (cancelled || !serverDocuments) {
          return;
        }

        setDocuments(serverDocuments);

        const defaultCareerDocumentIds = getCareerDocumentIds(serverDocuments);

        if (!isExternalProfile) {
          const evidenceExists = hasEvidenceForKey(profileEvidenceKey);
          if (!evidenceExists) {
            writeEvidenceForKey(profileEvidenceKey, defaultCareerDocumentIds);
            setLinkedDocumentIds(defaultCareerDocumentIds);
            setDraftLinkedDocumentIds(defaultCareerDocumentIds);
          }
        }
      })
      .catch(() => {
        // Keep the local cache path alive when the server sync is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [isExternalProfile, targetProfileAccountId]);

  useEffect(() => {
    if (!targetProfileAccountId) {
      return;
    }

    let cancelled = false;

    void syncPublicationsForAccount(targetProfileAccountId)
      .then((serverPublications) => {
        if (cancelled || !serverPublications) {
          return;
        }

        const normalized = serverPublications.map((publication) => ({
          ...publication,
          publishedOn: normalizePublicationMonth(publication.publishedOn),
        }));

        setPublications(normalized);
        setDraftPublications(normalized);
        setSelectedPublicationId((current) => current ?? normalized[0]?.id ?? null);
      })
      .catch(() => {
        // Keep the local cache path alive when the server sync is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [targetProfileAccountId]);

  useEffect(() => {
    if (!targetProfileAccountId) {
      return;
    }

    let cancelled = false;

    void syncProfileEvidenceForAccount(targetProfileAccountId)
      .then((evidenceMap) => {
        if (cancelled || !evidenceMap) {
          return;
        }

        const nextEvidenceIds = evidenceMap[profileEvidenceKey] ?? [];
        setLinkedDocumentIds(nextEvidenceIds);
        setDraftLinkedDocumentIds(nextEvidenceIds);
      })
      .catch(() => {
        // Keep the local cache path alive when the server sync is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [targetProfileAccountId]);

  useEffect(
    () => () => {
      if (publicationPreview?.url) {
        window.URL.revokeObjectURL(publicationPreview.url);
      }
    },
    [publicationPreview],
  );

  useEffect(() => {
    void ensureSeededDocumentFiles(documents);
  }, [documents]);

  const savedKeywordList = useMemo(
    () => normalizeRows(savedProfile.keywordsText.split(",")),
    [savedProfile.keywordsText],
  );
  const savedEmails = useMemo(() => normalizeRows(savedProfile.emails), [savedProfile.emails]);
  const savedLinks = useMemo(
    () => normalizeStructuredLinks(savedProfile.links),
    [savedProfile.links],
  );
  const linkedDocuments = useMemo(
    () => documents.filter((document) => linkedDocumentIds.includes(document.id)),
    [documents, linkedDocumentIds],
  );
  const careerDocuments = useMemo(
    () =>
      (linkedDocuments.length > 0 ? linkedDocuments.filter(isCareerDocument) : documents.filter(isCareerDocument))
        .sort((a, b) => b.updatedOn.localeCompare(a.updatedOn))
        .slice(0, 6),
    [documents, linkedDocuments],
  );
  const viewAffiliations = useMemo(() => {
    if (!isExternalProfile || !requestedProfileAccountId) {
      return resolvedAffiliations;
    }

    return buildAffiliationsFromLabs(requestedProfileAccountId, requestedLabSlug);
  }, [isExternalProfile, requestedLabSlug, requestedProfileAccountId, resolvedAffiliations]);
  const sortedAffiliations = useMemo(
    () => sortAffiliations(viewAffiliations),
    [viewAffiliations],
  );
  const educationAffiliations = useMemo(
    () => sortedAffiliations.filter((affiliation) => affiliation.roleTrack === "student"),
    [sortedAffiliations],
  );
  const experienceAffiliations = useMemo(
    () => sortedAffiliations.filter((affiliation) => affiliation.roleTrack !== "student"),
    [sortedAffiliations],
  );
  const primaryAffiliation = useMemo(
    () => sortedAffiliations.find((affiliation) => affiliation.active) ?? sortedAffiliations[0] ?? null,
    [sortedAffiliations],
  );
  const sortedPublications = useMemo(
    () =>
      [...publications].sort((a, b) =>
        (normalizePublicationMonth(b.publishedOn) ?? "").localeCompare(
          normalizePublicationMonth(a.publishedOn) ?? "",
        ),
      ),
    [publications],
  );
  const resolvedSelectedPublicationId = useMemo(() => {
    if (
      selectedPublicationId &&
      sortedPublications.some((publication) => publication.id === selectedPublicationId)
    ) {
      return selectedPublicationId;
    }

    return sortedPublications[0]?.id ?? null;
  }, [selectedPublicationId, sortedPublications]);
  const selectedPublication = useMemo(
    () =>
      sortedPublications.find((publication) => publication.id === resolvedSelectedPublicationId) ??
      null,
    [resolvedSelectedPublicationId, sortedPublications],
  );
  const initials = useMemo(() => {
    const source = savedProfile.koreanName || savedProfile.englishName || "R";
    return source.slice(0, 1).toUpperCase();
  }, [savedProfile.englishName, savedProfile.koreanName]);
  const primaryAffiliationMeta = useMemo(() => {
    if (!primaryAffiliation) {
      return savedProfile.primaryInstitution || "";
    }

    return joinUniqueTextParts([
      primaryAffiliation.institutionName,
      primaryAffiliation.department,
      primaryAffiliation.labName,
    ]);
  }, [primaryAffiliation, savedProfile.primaryInstitution]);
  const heroEnglishName = useMemo(() => {
    const koreanName = savedProfile.koreanName.trim().toLowerCase();
    const englishName = savedProfile.englishName.trim();

    if (!englishName) {
      return "";
    }

    return koreanName === englishName.toLowerCase() ? "" : englishName;
  }, [savedProfile.englishName, savedProfile.koreanName]);
  const heroPrimaryMeta = useMemo(
    () => primaryAffiliationMeta || savedProfile.primaryInstitution || "",
    [primaryAffiliationMeta, savedProfile.primaryInstitution],
  );
  const heroSecondaryMeta = useMemo(
    () => savedProfile.primaryDiscipline || savedEmails[0] || "",
    [savedEmails, savedProfile.primaryDiscipline],
  );
  const knownLabs = useMemo(() => buildLabLinkLookup(), []);
  const summaryProfile = useMemo<ResearchProfile>(
    () => buildResearchProfileFromEditable(initialProfile, savedProfile),
    [initialProfile, savedProfile],
  );
  const researcherSummary = useMemo(
    () =>
      buildResearcherSummary({
        accountId: requestedProfileAccountId ?? currentAccount?.id,
        profile: summaryProfile,
        affiliations: sortedAffiliations,
        publications: sortedPublications,
        linkedDocuments,
        preferredLabSlug: requestedLabSlug,
        labLookup: knownLabs,
      }),
    [
      currentAccount?.id,
      knownLabs,
      linkedDocuments,
      requestedLabSlug,
      requestedProfileAccountId,
      summaryProfile,
      sortedAffiliations,
      sortedPublications,
    ],
  );
  const primaryLabLink = useMemo(() => {
    if (!primaryAffiliation) {
      return null;
    }

    return findLabLinkInLookup(knownLabs, [
      primaryAffiliation.labName,
      primaryAffiliation.institutionName,
      researcherSummary.primaryLabSlug,
    ]);
  }, [knownLabs, primaryAffiliation, researcherSummary.primaryLabSlug]);
  const profileStats = useMemo(
    () => [
      {
        label: isKo ? "활동 이력" : "Affiliations",
        value: String(researcherSummary.affiliationCount),
        note:
          primaryAffiliation?.startDate ??
          (isKo ? "등록된 이력 없음" : "No timeline yet"),
      },
      {
        label: isKo ? "논문" : "Papers",
        value: String(researcherSummary.publicationCount),
        note:
          sortedPublications[0]?.publishedOn
            ? `${isKo ? "최근" : "Latest"} ${normalizePublicationMonth(sortedPublications[0].publishedOn)}`
            : isKo
              ? "등록된 논문 없음"
              : "No papers yet",
      },
      {
        label: isKo ? "커리어 문서" : "Career docs",
        value: String(careerDocuments.length),
        note:
          careerDocuments[0]?.updatedOn
            ? `${isKo ? "최근 수정" : "Updated"} ${careerDocuments[0].updatedOn}`
            : isKo
              ? "커리어 문서 없음"
              : "No career docs",
      },
    ],
    [careerDocuments, isKo, primaryAffiliation?.startDate, researcherSummary, sortedPublications],
  );
  void profileStats;
  const heroKeywordSummary = useMemo(
    () => savedKeywordList.slice(0, 4).join(" · "),
    [savedKeywordList],
  );
  const heroLinks = useMemo(() => savedLinks.slice(0, 3), [savedLinks]);
  const publicProfileHref = useMemo(() => {
    if (!savedProfile.publicProfileEnabled) {
      return null;
    }

    const normalizedSlug =
      normalizePublicProfileSlug(savedProfile.publicProfileSlug) ||
      buildDefaultPublicProfileSlug({
        englishName: savedProfile.englishName,
        displayName: savedProfile.koreanName || profileRecord.displayName,
        accountId: profileRecord.owner.id,
      });

    return normalizedSlug ? buildPublicResearcherPath(locale, normalizedSlug) : null;
  }, [
    locale,
    profileRecord.displayName,
    profileRecord.owner.id,
    savedProfile.englishName,
    savedProfile.koreanName,
    savedProfile.publicProfileEnabled,
    savedProfile.publicProfileSlug,
  ]);
  const careerReadiness = useMemo(
    () =>
      careerDocumentTypeOrder.map((type) => {
        const matched = careerDocuments.find((document) => document.documentType === type);

        return {
          type,
          label: careerDocumentTypeLabels[locale][type],
          document: matched ?? null,
        };
      }),
    [careerDocuments, locale],
  );
  const profileSectionLinks = useMemo(
    () => [
      { href: "#profile-overview", label: text.basicProfile },
      { href: "#profile-career", label: careerHubTitle },
      { href: "#profile-experience", label: text.experience },
      { href: "#profile-papers", label: text.publications },
    ],
    [careerHubTitle, text.basicProfile, text.experience, text.publications],
  );

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;

    async function loadPreview() {
      if (!selectedPublication) {
        setPublicationPreview(null);
        return;
      }

      const matchedDocument = findPublicationDocument(selectedPublication, documents);

      if (!matchedDocument?.fileAssetId) {
        setPublicationPreview({
          document: matchedDocument,
          mode: "empty",
          message: text.publicationPreviewEmpty,
        });
        return;
      }

      try {
        const file = await getDocumentFile(matchedDocument.fileAssetId);

        if (!file) {
          setPublicationPreview({
            document: matchedDocument,
            mode: "empty",
            message: text.publicationPreviewMissing,
          });
          return;
        }

        const extension = (matchedDocument.fileExtension ?? "").toLowerCase();

        if (extension === "pdf" || matchedDocument.mimeType === "application/pdf") {
          createdUrl = window.URL.createObjectURL(file);

          if (!cancelled) {
            setPublicationPreview({
              document: matchedDocument,
              mode: "iframe",
              url: createdUrl,
              message: "",
            });
          }

          return;
        }

        if (textPreviewExtensions.has(extension) || matchedDocument.mimeType?.startsWith("text/")) {
          const textContent = await file.text();

          if (!cancelled) {
            setPublicationPreview({
              document: matchedDocument,
              mode: "text",
              text: textContent.slice(0, 30000),
              message: "",
            });
          }

          return;
        }

        setPublicationPreview({
          document: matchedDocument,
          mode: "empty",
          message: text.publicationPreviewUnsupported,
        });
      } catch {
        if (!cancelled) {
          setPublicationPreview({
            document: matchedDocument,
            mode: "empty",
            message: text.publicationPreviewError,
          });
        }
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;
      if (createdUrl) {
        window.URL.revokeObjectURL(createdUrl);
      }
    };
  }, [documents, selectedPublication, text]);

  const updateDraft = <K extends keyof EditableProfile>(key: K, value: EditableProfile[K]) => {
    setDraftProfile((current) => ({ ...current, [key]: value }));
  };

  const updateEmailItem = (index: number, value: string) => {
    setDraftProfile((current) => ({
      ...current,
      emails: current.emails.map((item, itemIndex) => (itemIndex === index ? value : item)),
    }));
  };

  const addEmailItem = () => {
    setDraftProfile((current) => ({ ...current, emails: [...current.emails, ""] }));
  };

  const removeEmailItem = (index: number) => {
    setDraftProfile((current) => ({
      ...current,
      emails: current.emails.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const updateLinkItem = (index: number, patch: Partial<EditableProfileLink>) => {
    setDraftProfile((current) => ({
      ...current,
      links: current.links.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    }));
  };

  const addLinkItem = () => {
    setDraftProfile((current) => ({
      ...current,
      links: [...current.links, createEmptyEditableLink()],
    }));
  };

  const removeLinkItem = (index: number) => {
    setDraftProfile((current) => ({
      ...current,
      links: current.links.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleOpenEdit = () => {
    if (isReadonlyView) return;

    setDraftProfile(savedProfile);
    setDraftLinkedDocumentIds(linkedDocumentIds);
    setDraftPublications(publications);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setDraftProfile(savedProfile);
    setDraftLinkedDocumentIds(linkedDocumentIds);
    setDraftPublications(publications);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (isReadonlyView) return;

    const requestedPublicSlug = normalizePublicProfileSlug(draftProfile.publicProfileSlug);
    const normalizedPublicSlug =
      requestedPublicSlug ||
      (draftProfile.publicProfileEnabled
        ? buildDefaultPublicProfileSlug({
            englishName: draftProfile.englishName,
            displayName: draftProfile.koreanName || profileRecord.displayName,
            accountId: profileRecord.owner.id,
          })
        : "");
    const normalizedProfile: EditableProfile = {
      ...draftProfile,
      emails: normalizeRows(draftProfile.emails),
      links: normalizeStructuredLinks(draftProfile.links).map((link) => ({
        kind: link.kind,
        label: link.label ?? "",
        url: link.url,
      })),
      keywordsText: normalizeRows(draftProfile.keywordsText.split(",")).join(", "),
      publicProfileSlug: normalizedPublicSlug,
    };
    const persistedProfileRecord = buildResearchProfileFromEditable(profileRecord, normalizedProfile);
    const validPublications = draftPublications
      .filter((publication) => publication.title.trim().length > 0)
      .map((publication) => ({
        ...publication,
        publishedOn: normalizePublicationMonth(publication.publishedOn),
        updatedOn: getTodayIso(),
      }));

    const nextLinkedDocumentIds = [...draftLinkedDocumentIds];

    try {
      const persistedPublications: PublicationRecord[] = [];

      for (const publication of validPublications) {
        const ownerAccountId = publication.owner.id;
        const persistedPublication = isServerPublicationId(publication.id)
          ? await updateServerPublicationRecord(publication, ownerAccountId)
          : await createServerPublicationRecord(publication, ownerAccountId);
        persistedPublications.push({
          ...persistedPublication,
          publishedOn: normalizePublicationMonth(persistedPublication.publishedOn),
        });
      }

      const removedPublications = publications.filter(
        (publication) => !validPublications.some((item) => item.id === publication.id),
      );

      for (const publication of removedPublications) {
        if (isServerPublicationId(publication.id)) {
          await deleteServerPublicationRecord(publication.id);
        }
      }

      if (currentAccountId) {
        await replaceProfileEvidenceLinks(currentAccountId, profileEvidenceKey, nextLinkedDocumentIds);
      } else {
        writeEvidenceForKey(profileEvidenceKey, nextLinkedDocumentIds);
      }

      if (currentAccountId) {
        await upsertServerProfileForAccount(currentAccountId, persistedProfileRecord);
      }

      setSavedProfile(normalizedProfile);
      setProfileRecord(persistedProfileRecord);
      setLinkedDocumentIds(nextLinkedDocumentIds);
      setPublications(persistedPublications);
      writeJsonToStorage(
        currentAccountId
          ? buildScopedStorageKeyForAccount(profileStorageBaseKey, currentAccountId)
          : buildScopedStorageKey(profileStorageBaseKey),
        normalizedProfile,
      );
      if (currentAccountId) {
        saveBrowserProfileForAccount(currentAccountId, persistedProfileRecord);
      } else {
        saveBrowserProfile(persistedProfileRecord);
      }
      if (currentAccountId) {
        saveBrowserPublicationsForAccount(currentAccountId, persistedPublications);
      } else {
        saveBrowserPublications(persistedPublications);
      }
      setSelectedPublicationId((current) => current ?? persistedPublications[0]?.id ?? null);
      setIsEditing(false);
      await refresh();
    } catch {
      // Keep the editor open so the user can retry.
    }
  };

  const handleAddPublication = () => {
    const nextPublication: PublicationRecord = {
      id: createPublicationId(),
      owner: { type: "user", id: currentAccountId ?? "anonymous" },
      title: "",
      updatedOn: getTodayIso(),
    };

    setDraftPublications((current) => [...current, nextPublication]);
  };

  const handleUpdatePublication = (
    id: string,
    patch: Partial<Omit<PublicationRecord, "id" | "owner">>,
  ) => {
    setDraftPublications((current) =>
      current.map((publication) =>
        publication.id === id
          ? {
              ...publication,
              ...patch,
              publishedOn:
                patch.publishedOn === undefined
                  ? publication.publishedOn
                  : normalizePublicationMonth(patch.publishedOn),
              updatedOn: getTodayIso(),
            }
          : publication,
      ),
    );
  };

  const handleRemovePublication = (id: string) => {
    setDraftPublications((current) => current.filter((publication) => publication.id !== id));
    setSelectedPublicationId((current) => (current === id ? null : current));
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      updateDraft("photoDataUrl", typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsDataURL(file);
  };

  const openLabWorkspace = (slug: string, section = "people") => {
    router.push(`/${locale}/lab?lab=${slug}&section=${section}`);
  };

  const openDocumentsWorkspace = () => {
    router.push(`/${locale}/documents`);
  };

  const openRelatedDocument = async (document: DocumentRecord) => {
    if (!document.fileAssetId) {
      return;
    }

    const file = await getDocumentFile(document.fileAssetId);

    if (!file) {
      return;
    }

    const url = window.URL.createObjectURL(file);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.click();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
  };

  const downloadRelatedDocument = async (document: DocumentRecord) => {
    if (!document.fileAssetId) {
      return;
    }

    const file = await getDocumentFile(document.fileAssetId);

    if (!file) {
      return;
    }

    const url = window.URL.createObjectURL(file);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = document.originalFileName || `${document.title}.${document.fileExtension || "file"}`;
    anchor.click();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
  };

  const renderAffiliationList = (items: AffiliationTimelineEntry[], emptyLabel: string) => {
    if (items.length === 0) {
      return <p className="profile-empty-copy">{emptyLabel}</p>;
    }

    return (
      <div className="profile-history-list">
        {items.map((affiliation) => {
          const labLink =
            knownLabs.get(normalizeComparableText(affiliation.labName)) ??
            knownLabs.get(normalizeComparableText(affiliation.institutionName)) ??
            null;
          const distinctLabName =
            affiliation.labName &&
            normalizeComparableText(affiliation.labName) !==
              normalizeComparableText(affiliation.institutionName)
              ? affiliation.labName
              : null;

          return (
            <article className="profile-history-item profile-history-item-compact" key={affiliation.id}>
              <div className="profile-history-period">
                <strong>{affiliation.startDate}</strong>
                <span>{affiliation.endDate ?? text.present}</span>
              </div>
              <div className="profile-history-body">
                <div className="profile-history-top">
                  <div>
                  <strong>{affiliation.roleTitle}</strong>
                  <p>
                    {joinUniqueTextParts([
                      affiliation.institutionName,
                      affiliation.department,
                      affiliation.labName,
                    ])}
                  </p>
                </div>
                <div className="profile-history-side">
                  {labLink ? (
                    <button
                      type="button"
                      className="profile-inline-nav-btn"
                      onClick={() => openLabWorkspace(labLink.slug)}
                    >
                      <span>{isKo ? "연구실 열기" : "Open lab"}</span>
                      <ExternalLink size={13} />
                    </button>
                  ) : null}
                  <span className={`pill ${affiliation.active ? "pill-green" : "pill-gray"}`}>
                    {affiliation.active ? text.active : text.inactive}
                  </span>
                </div>
              </div>

                {distinctLabName ? (
                  <div className="profile-history-meta">
                    <span>
                      <strong>{text.lab}</strong>
                      {distinctLabName}
                    </span>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    );
  };

  const renderCompactAffiliationList = (
    items: AffiliationTimelineEntry[],
    emptyLabel: string,
  ) => {
    if (items.length === 0) {
      return <span className="profile-empty-copy">{emptyLabel}</span>;
    }

    return (
      <div className="profile-compact-affiliation-list">
        {items.map((affiliation) => (
          <div className="profile-compact-affiliation-item" key={affiliation.id}>
            <strong>{affiliation.roleTitle}</strong>
            <span>
              {joinUniqueTextParts([
                affiliation.institutionName,
                affiliation.department,
                affiliation.labName,
                `${affiliation.startDate} - ${affiliation.endDate ?? text.present}`,
              ])}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="page-standard workspace-page-shell profile-page-shell">
      {isEditing ? (
        <section className="card workspace-intro-card workspace-intro-card-compact profile-editor-intro-card">
          <div className="workspace-intro-top">
            <div className="workspace-intro-copy">
              <strong>{text.title}</strong>
            </div>
            <div className="profile-header-actions">
              <button type="button" className="secondary-cta" onClick={handleCancelEdit}>
                <X size={16} />
                {text.cancel}
              </button>
              <button type="button" className="primary-cta" onClick={handleSaveEdit}>
                <Save size={16} />
                {text.save}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {isEditing ? (
        <section className="card profile-editor-card profile-master-card">
          <div className="profile-editor-layout">
            <div className="profile-editor-photo">
              <div className="profile-photo-frame profile-photo-frame-edit">
                {draftProfile.photoDataUrl ? (
                  <Image
                    src={draftProfile.photoDataUrl}
                    alt={text.photoAlt}
                    width={320}
                    height={320}
                    className="profile-photo-image"
                    unoptimized
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>

              <div className="profile-editor-photo-copy">
                <strong>{text.photo}</strong>
                <p>{text.photoHint}</p>
              </div>

              <button
                type="button"
                className="secondary-cta"
                onClick={() => photoInputRef.current?.click()}
              >
                <Camera size={16} />
                {text.photoUpload}
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="document-file-input"
                onChange={handlePhotoChange}
              />
            </div>

            <div className="profile-editor-fields">
              <div className="profile-editor-section">
                <div className="profile-editor-section-head">
                  <strong>{text.identity}</strong>
                  <p>{text.identityHint}</p>
                </div>
                <div className="profile-form-grid profile-form-grid-wide">
                  <label className="editor-field">
                    <span>{text.koreanName}</span>
                    <input
                      value={draftProfile.koreanName}
                      onChange={(event) => updateDraft("koreanName", event.target.value)}
                    />
                  </label>
                  <label className="editor-field">
                    <span>{text.englishName}</span>
                    <input
                      value={draftProfile.englishName}
                      onChange={(event) => updateDraft("englishName", event.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className="profile-editor-section">
                <div className="profile-editor-section-head">
                  <strong>{text.researchFocus}</strong>
                  <p>{text.researchFocusDescription}</p>
                </div>
                <div className="profile-form-grid profile-form-grid-wide">
                  <label className="editor-field">
                    <span>{text.institution}</span>
                    <input
                      value={draftProfile.primaryInstitution}
                      onChange={(event) => updateDraft("primaryInstitution", event.target.value)}
                    />
                  </label>
                  <label className="editor-field">
                    <span>{text.discipline}</span>
                    <input
                      value={draftProfile.primaryDiscipline}
                      onChange={(event) => updateDraft("primaryDiscipline", event.target.value)}
                    />
                  </label>
                  <label className="editor-field editor-field-full">
                    <span>{text.keywords}</span>
                    <input
                      value={draftProfile.keywordsText}
                      placeholder={text.keywordsPlaceholder}
                      onChange={(event) => updateDraft("keywordsText", event.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className="profile-editor-section">
                <div className="profile-editor-section-head">
                  <strong>{text.contacts}</strong>
                </div>
                <div className="profile-form-grid">
                  <div className="profile-array-section editor-field-full">
                    <div className="profile-array-header">
                      <span>{text.email}</span>
                      <button
                        type="button"
                        className="secondary-cta profile-inline-btn"
                        onClick={addEmailItem}
                      >
                        <Plus size={14} />
                        {text.addEmail}
                      </button>
                    </div>
                    <div className="profile-array-list">
                        {draftProfile.emails.map((email, index) => (
                          <div className="profile-array-row" key={`email-${index}`}>
                            <input
                              value={email}
                              onChange={(event) => updateEmailItem(index, event.target.value)}
                            />
                            <button
                              type="button"
                              className="profile-inline-icon-btn"
                              onClick={() => removeEmailItem(index)}
                              aria-label={text.removeEmail}
                            >
                              <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="profile-array-section editor-field-full">
                    <div className="profile-array-header">
                      <span>{onlineLinksLabel}</span>
                      <button
                        type="button"
                        className="secondary-cta profile-inline-btn"
                        onClick={addLinkItem}
                      >
                        <Plus size={14} />
                        {addLinkLabel}
                      </button>
                    </div>
                    <div className="profile-array-list">
                      {draftProfile.links.map((link, index) => (
                        <div className="profile-link-edit-row" key={`link-${index}`}>
                          <select
                            value={link.kind}
                            onChange={(event) =>
                              updateLinkItem(index, {
                                kind: event.target.value as ProfileLinkKind,
                              })
                            }
                          >
                            {Object.entries(linkKindLabels[locale]).map(([kind, label]) => (
                              <option key={kind} value={kind}>
                                {label}
                              </option>
                            ))}
                          </select>
                          <input
                            value={link.label}
                            placeholder={linkLabelPlaceholder}
                            aria-label={linkLabelLabel}
                            onChange={(event) => updateLinkItem(index, { label: event.target.value })}
                          />
                          <input
                            value={link.url}
                            placeholder={linkUrlPlaceholder}
                            aria-label={linkUrlLabel}
                            onChange={(event) => updateLinkItem(index, { url: event.target.value })}
                          />
                          <button
                            type="button"
                            className="profile-inline-icon-btn"
                            onClick={() => removeLinkItem(index)}
                            aria-label={removeLinkLabel}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="profile-editor-section">
                <div className="profile-editor-section-head">
                  <strong>{publicPageTitle}</strong>
                  <p>{publicPageDescription}</p>
                </div>
                <div className="profile-form-grid profile-form-grid-wide">
                  <label className="editor-field">
                    <span>{publicPageStatusLabel}</span>
                    <select
                      value={draftProfile.publicProfileEnabled ? "enabled" : "disabled"}
                      onChange={(event) =>
                        updateDraft("publicProfileEnabled", event.target.value === "enabled")
                      }
                    >
                      <option value="disabled">{publicPageDisabledLabel}</option>
                      <option value="enabled">{publicPageEnabledLabel}</option>
                    </select>
                  </label>
                  <label className="editor-field">
                    <span>{publicPageSlugLabel}</span>
                    <input
                      value={draftProfile.publicProfileSlug}
                      placeholder={publicPageSlugPlaceholder}
                      onChange={(event) => updateDraft("publicProfileSlug", event.target.value)}
                    />
                  </label>
                  <p className="profile-editor-note editor-field-full">{publicPageSlugHint}</p>
                </div>
              </div>

              <div className="profile-editor-section">
                <div className="profile-editor-section-head">
                  <strong>{text.ids}</strong>
                </div>
                <div className="profile-form-grid profile-form-grid-wide">
                  <label className="editor-field">
                    <span>{text.nationalId}</span>
                    <input
                      value={draftProfile.nationalResearcherNumber}
                      onChange={(event) =>
                        updateDraft("nationalResearcherNumber", event.target.value)
                      }
                    />
                  </label>
                  <label className="editor-field">
                    <span>{text.orcid}</span>
                    <input
                      value={draftProfile.orcid}
                      onChange={(event) => updateDraft("orcid", event.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className="profile-editor-section">
                <div className="profile-editor-section-head">
                  <strong>{text.publications}</strong>
                  <p>{text.publicationsDescription}</p>
                </div>
                <div className="profile-publication-edit-list">
                  {draftPublications.map((publication) => (
                    <div className="profile-publication-edit-item" key={publication.id}>
                      <div className="profile-form-grid profile-form-grid-wide profile-publication-edit-grid">
                        <label className="editor-field">
                          <span>{text.publicationDate}</span>
                          <input
                            value={normalizePublicationMonth(publication.publishedOn) ?? ""}
                            placeholder={text.publicationDatePlaceholder}
                            onChange={(event) =>
                              handleUpdatePublication(publication.id, {
                                publishedOn: event.target.value || undefined,
                              })
                            }
                          />
                        </label>
                        <label className="editor-field">
                          <span>{text.publicationJournal}</span>
                          <input
                            value={publication.journalName ?? ""}
                            placeholder={text.publicationJournalPlaceholder}
                            onChange={(event) =>
                              handleUpdatePublication(publication.id, {
                                journalName: event.target.value || undefined,
                              })
                            }
                          />
                        </label>
                        <label className="editor-field">
                          <span>{text.publicationParticipants}</span>
                          <input
                            value={publication.participants ?? ""}
                            placeholder={text.publicationParticipantsPlaceholder}
                            onChange={(event) =>
                              handleUpdatePublication(publication.id, {
                                participants: event.target.value || undefined,
                              })
                            }
                          />
                        </label>
                        <label className="editor-field editor-field-full">
                          <span>{text.publicationTitle}</span>
                          <input
                            value={publication.title}
                            placeholder={text.publicationTitlePlaceholder}
                            onChange={(event) =>
                              handleUpdatePublication(publication.id, { title: event.target.value })
                            }
                          />
                        </label>
                        <label className="editor-field">
                          <span>{text.publicationAuthorRole}</span>
                          <select
                            value={publication.authorRole ?? ""}
                            onChange={(event) =>
                              handleUpdatePublication(publication.id, {
                                authorRole: event.target.value || undefined,
                              })
                            }
                          >
                            <option value="">{text.publicationAuthorRolePlaceholder}</option>
                            {publicationAuthorRoles[locale].map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <details className="profile-publication-edit-details">
                        <summary>{text.publicationMoreDetails}</summary>
                        <div className="profile-form-grid profile-form-grid-wide">
                          <label className="editor-field">
                            <span>{text.publicationJournalClass}</span>
                            <select
                              value={publication.journalClass ?? ""}
                              onChange={(event) =>
                                handleUpdatePublication(publication.id, {
                                  journalClass: event.target.value
                                    ? (event.target.value as JournalClass)
                                    : undefined,
                                })
                              }
                            >
                              <option value="">-</option>
                              {journalClasses.map((cls) => (
                                <option key={cls} value={cls}>
                                  {cls}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="editor-field">
                            <span>{text.publicationPublisher}</span>
                            <input
                              value={publication.publisher ?? ""}
                              placeholder={text.publicationPublisherPlaceholder}
                              onChange={(event) =>
                                handleUpdatePublication(publication.id, {
                                  publisher: event.target.value || undefined,
                                })
                              }
                            />
                          </label>
                          <label className="editor-field editor-field-full">
                            <span>DOI</span>
                            <input
                              value={publication.doi ?? ""}
                              placeholder="10.xxxx/xxxxx"
                              onChange={(event) =>
                                handleUpdatePublication(publication.id, {
                                  doi: event.target.value || undefined,
                                })
                              }
                            />
                          </label>
                        </div>
                      </details>

                      <button
                        type="button"
                        className="profile-inline-icon-btn profile-publication-remove-btn"
                        onClick={() => handleRemovePublication(publication.id)}
                        aria-label={text.removePublication}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="secondary-cta profile-inline-btn"
                  onClick={handleAddPublication}
                >
                  <Plus size={14} />
                  {text.addPublication}
                </button>
              </div>

              <div className="profile-editor-section">
                <div className="profile-editor-section-head">
                  <h3>{careerHubTitle}</h3>
                  <p>{careerHubDescription}</p>
                </div>
                <DocumentEvidencePicker
                  evidenceKey={profileEvidenceKey}
                  documents={documents}
                  locale={locale}
                  title={careerDocumentsTitle}
                  selectedIds={draftLinkedDocumentIds}
                  onChange={setDraftLinkedDocumentIds}
                  persist={false}
                />
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div className="profile-view-stack profile-homepage-flow">
          <section className="card document-intro-card document-intro-card-compact profile-hero-card profile-homepage-hero profile-master-card">
            <div className="profile-hero-grid document-intro-top profile-homepage-hero-top">
              <div className="profile-hero-main">
                <div className="profile-photo-frame profile-photo-frame-view profile-photo-frame-compact">
                  {savedProfile.photoDataUrl ? (
                    <Image
                      src={savedProfile.photoDataUrl}
                      alt={text.photoAlt}
                      width={320}
                      height={320}
                      className="profile-photo-image"
                      unoptimized
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>

                <div className="profile-hero-copy">
                  <div className="profile-identity-stack">
                    <strong className="profile-unified-name">
                      {savedProfile.koreanName || savedProfile.englishName || text.emptyValue}
                    </strong>
                    {heroEnglishName ? (
                      <span className="profile-unified-subname">{heroEnglishName}</span>
                    ) : null}
                  </div>
                  {primaryAffiliation ? (
                    <span className="profile-hero-role-badge">{primaryAffiliation.roleTitle}</span>
                  ) : null}
                  {heroPrimaryMeta ? <p className="profile-hero-meta">{heroPrimaryMeta}</p> : null}
                  {heroSecondaryMeta ? (
                    <p className="profile-hero-submeta">{heroSecondaryMeta}</p>
                  ) : null}
                  {heroKeywordSummary ? (
                    <p className="profile-hero-keywords">{heroKeywordSummary}</p>
                  ) : null}
                  {heroLinks.length > 0 ? (
                    <div className="profile-hero-link-row">
                      {heroLinks.map((link) => (
                        <a
                          key={`${link.kind}-${link.url}`}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="profile-hero-link-chip"
                        >
                          <span>{getProfileLinkLabel(locale, { kind: link.kind, label: link.label ?? "" })}</span>
                          <ExternalLink size={13} />
                        </a>
                      ))}
                    </div>
                  ) : null}
                  {publicProfileHref ? (
                    <a
                      href={publicProfileHref}
                      target="_blank"
                      rel="noreferrer"
                      className="profile-inline-nav-btn"
                    >
                      <span>{publicPageOpenLabel}</span>
                      <ExternalLink size={13} />
                    </a>
                  ) : null}
                  {primaryLabLink ? (
                    <button
                      type="button"
                      className="profile-inline-nav-btn"
                      onClick={() => openLabWorkspace(primaryLabLink.slug)}
                    >
                      <span>{isKo ? "연구실 페이지 열기" : "Open lab page"}</span>
                      <ExternalLink size={13} />
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="profile-hero-actions">
                {isReadonlyView ? (
                  <span className="pill pill-gray">
                    {locale === "ko" ? "읽기 전용" : "Read only"}
                  </span>
                ) : (
                  <button type="button" className="primary-cta" onClick={handleOpenEdit}>
                    <PencilLine size={16} />
                    {text.edit}
                  </button>
                )}
              </div>

            </div>
          </section>

          <div
            className="document-filter-row profile-homepage-nav-row"
            aria-label={isKo ? "프로필 섹션" : "Profile sections"}
          >
            {profileSectionLinks.map((item) => (
              <a
                className="document-filter-chip profile-homepage-nav-link"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </a>
            ))}
          </div>

          <section
            className="card document-library-section profile-section-shell profile-homepage-section profile-master-card"
            id="profile-overview"
          >
            <div className="profile-section-rail document-section-header">
              <div className="profile-section-heading">
                <h3>{text.basicProfile}</h3>
                <p>{text.basicProfileDescription}</p>
              </div>
            </div>
            <div className="profile-section-content">
              <dl className="profile-core-table">
                <div className="profile-core-row">
                  <dt>{text.contactPanel}</dt>
                  <dd>
                    {savedEmails.length > 0 || savedLinks.length > 0 ? (
                      <div className="profile-career-status-list">
                        <div className="profile-career-status-row">
                          <div className="profile-career-status-main">
                            <strong>{text.contacts}</strong>
                            {savedEmails.length > 0 ? (
                              <div className="profile-inline-list">
                                {savedEmails.map((email) => (
                                  <a key={email} href={`mailto:${email}`} className="profile-inline-link">
                                    {email}
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <span>{text.emptyValue}</span>
                            )}
                          </div>
                        </div>
                        <div className="profile-career-status-row">
                          <div className="profile-career-status-main">
                            <strong>{onlineLinksLabel}</strong>
                            {savedLinks.length > 0 ? (
                              <div className="profile-link-stack">
                                {savedLinks.map((link) => (
                                  <a
                                    key={`${link.kind}-${link.url}`}
                                    href={link.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="profile-link-row"
                                  >
                                    <strong>{getProfileLinkLabel(locale, { kind: link.kind, label: link.label ?? "" })}</strong>
                                    <span>{getProfileLinkDisplayUrl(link.url)}</span>
                                    <ExternalLink size={13} />
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <span>{text.emptyValue}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      text.emptyValue
                    )}
                  </dd>
                </div>
                <div className="profile-core-row">
                  <dt>{text.idPanel}</dt>
                  <dd>
                    {savedProfile.nationalResearcherNumber || savedProfile.orcid ? (
                      <div className="profile-career-status-list">
                        <div className="profile-career-status-row">
                          <div className="profile-career-status-main">
                            <strong>{text.nationalId}</strong>
                            <span>{savedProfile.nationalResearcherNumber || text.emptyValue}</span>
                          </div>
                        </div>
                        <div className="profile-career-status-row">
                          <div className="profile-career-status-main">
                            <strong>{text.orcid}</strong>
                            <span>{savedProfile.orcid || text.emptyValue}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      text.emptyValue
                    )}
                  </dd>
                </div>
                <div className="profile-core-row">
                  <dt>{text.focusPanel}</dt>
                  <dd>
                    {savedProfile.primaryInstitution || savedProfile.primaryDiscipline || savedKeywordList.length > 0 ? (
                      <div className="profile-career-status-list">
                        <div className="profile-career-status-row">
                          <div className="profile-career-status-main">
                            <strong>{text.institution}</strong>
                            <span>{savedProfile.primaryInstitution || text.emptyValue}</span>
                          </div>
                        </div>
                        <div className="profile-career-status-row">
                          <div className="profile-career-status-main">
                            <strong>{text.discipline}</strong>
                            <span>{savedProfile.primaryDiscipline || text.emptyValue}</span>
                          </div>
                        </div>
                        <div className="profile-career-status-row">
                          <div className="profile-career-status-main">
                            <strong>{text.keywords}</strong>
                            {savedKeywordList.length > 0 ? (
                              <div className="profile-inline-list profile-inline-list-muted">
                                {savedKeywordList.map((keyword) => (
                                  <span className="profile-inline-text" key={keyword}>
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span>{text.emptyValue}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      text.emptyValue
                    )}
                  </dd>
                </div>
                <div className="profile-core-row">
                  <dt>{text.education}</dt>
                  <dd>{renderCompactAffiliationList(educationAffiliations, text.educationEmpty)}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section
            className="card document-library-section profile-section-shell profile-homepage-section profile-master-card"
            id="profile-experience"
          >
            <div className="profile-section-rail document-section-header">
              <div className="profile-section-heading">
                <h3>{text.experience}</h3>
                <p>{text.experienceDescription}</p>
              </div>
              <span className="profile-section-count">{experienceAffiliations.length}</span>
            </div>
            <div className="profile-section-content">
              {renderAffiliationList(experienceAffiliations, text.experienceEmpty)}
            </div>
          </section>

          <section
            className="card document-library-section profile-section-shell profile-homepage-section profile-master-card"
            id="profile-papers"
          >
            <div className="profile-section-rail document-section-header">
              <div className="profile-section-heading">
                <h3>{text.publications}</h3>
                <p>{text.publicationsDescription}</p>
              </div>
              <span className="profile-section-count">{sortedPublications.length}</span>
            </div>
            <div className="profile-section-content">
              <div className="profile-paper-layout">
              <div className="profile-paper-list">
                {sortedPublications.length === 0 ? (
                  <div className="profile-paper-empty">
                    <p>{text.publicationEmpty}</p>
                  </div>
                ) : (
                  sortedPublications.map((publication) => (
                    <button
                      type="button"
                      key={publication.id}
                      className={`profile-paper-row${resolvedSelectedPublicationId === publication.id ? " profile-paper-row-active" : ""}`}
                      onClick={() => setSelectedPublicationId(publication.id)}
                      onDoubleClick={() => setSelectedPublicationId(publication.id)}
                    >
                      <span className="profile-paper-row-period">
                        {normalizePublicationMonth(publication.publishedOn) ?? text.emptyValue}
                      </span>
                      <span className="profile-paper-line-title">
                        <strong>{publication.title}</strong>
                        <span className="profile-paper-line-meta">
                          {formatPublicationBibliographyLine(publication, text.emptyValue)}
                        </span>
                      </span>
                      <span className="profile-paper-row-tags">
                        {publication.authorRole ? (
                          <span className="pill pill-gray">{publication.authorRole}</span>
                        ) : null}
                        {publication.journalClass ? (
                          <span className="pill pill-blue">{publication.journalClass}</span>
                        ) : null}
                      </span>
                    </button>
                  ))
                )}
              </div>

              <aside className="profile-paper-detail-card">
                {selectedPublication ? (
                  <div className="profile-paper-detail-layout">
                    <div className="profile-paper-preview">
                      <div className="profile-paper-preview-head">
                        <strong>{text.publicationPreview}</strong>
                        <span>
                          {publicationPreview?.document?.title ??
                            (locale === "ko" ? "연결된 파일 없음" : "No linked file")}
                        </span>
                      </div>
                      <div className="profile-paper-preview-surface">
                        {publicationPreview?.mode === "iframe" && publicationPreview.url ? (
                          <iframe
                            title={selectedPublication.title}
                            src={publicationPreview.url}
                            className="profile-paper-preview-frame"
                          />
                        ) : null}
                        {publicationPreview?.mode === "text" ? (
                          <pre className="profile-paper-preview-text">{publicationPreview.text}</pre>
                        ) : null}
                        {publicationPreview?.mode === "empty" || !publicationPreview ? (
                          <div className="profile-paper-preview-empty">
                            {publicationPreview?.message ?? text.publicationPreviewEmpty}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="profile-paper-detail-body">
                      <div className="profile-paper-detail-head">
                        <strong>{selectedPublication.title}</strong>
                        <p>{formatPublicationLine(selectedPublication, text.emptyValue)}</p>
                      </div>
                      <div className="profile-section-heading profile-paper-detail-heading">
                        <h3>{text.publicationDetailTitle}</h3>
                        <p>{text.publicationDetailHint}</p>
                      </div>
                      <dl className="profile-info-table">
                        <div className="profile-info-row">
                          <dt>{text.publicationDate}</dt>
                          <dd>{normalizePublicationMonth(selectedPublication.publishedOn) ?? text.emptyValue}</dd>
                        </div>
                        <div className="profile-info-row">
                          <dt>{text.publicationJournal}</dt>
                          <dd>{selectedPublication.journalName ?? text.emptyValue}</dd>
                        </div>
                        <div className="profile-info-row">
                          <dt>{text.publicationParticipants}</dt>
                          <dd>{selectedPublication.participants ?? text.emptyValue}</dd>
                        </div>
                        <div className="profile-info-row">
                          <dt>{text.publicationAuthorRole}</dt>
                          <dd>{selectedPublication.authorRole ?? text.emptyValue}</dd>
                        </div>
                        <div className="profile-info-row">
                          <dt>{text.publicationJournalClass}</dt>
                          <dd>{selectedPublication.journalClass ?? text.emptyValue}</dd>
                        </div>
                        <div className="profile-info-row">
                          <dt>{text.publicationPublisher}</dt>
                          <dd>{selectedPublication.publisher ?? text.emptyValue}</dd>
                        </div>
                        <div className="profile-info-row">
                          <dt>DOI</dt>
                          <dd>{selectedPublication.doi ?? text.emptyValue}</dd>
                        </div>
                        <div className="profile-info-row">
                          <dt>{text.updatedOn}</dt>
                          <dd>{selectedPublication.updatedOn}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                ) : (
                  <div className="profile-paper-detail-empty">
                    <strong>{text.publicationNoSelection}</strong>
                    <p>{text.publicationDetailHint}</p>
                  </div>
                )}
              </aside>
              </div>
            </div>
          </section>

          <section
            className="card document-library-section profile-section-shell profile-homepage-section profile-master-card"
            id="profile-career"
          >
            <div className="profile-section-rail document-section-header">
              <div className="profile-section-heading">
                <h3>{careerHubTitle}</h3>
                <p>{careerHubDescription}</p>
              </div>
              <div className="profile-career-header-actions">
                {!isReadonlyView ? (
                  <button
                    type="button"
                    className="secondary-cta profile-inline-btn"
                    onClick={openDocumentsWorkspace}
                  >
                    <FileText size={14} />
                    {careerOpenDocumentsLabel}
                  </button>
                ) : null}
              </div>
            </div>
            <div className="profile-section-content">
              <div className="profile-career-grid">
                <div className="profile-career-main">
                  <div className="profile-career-doc-shell">
                    <div className="profile-career-doc-head">
                      <div className="profile-career-side-head">
                        <strong>{careerDocumentsPanelTitle}</strong>
                        <p>{careerDocumentsPanelDescription}</p>
                      </div>
                    </div>

                    {careerDocuments.length === 0 ? (
                      <div className="profile-career-empty-card">
                        <p>{careerDocumentsEmpty}</p>
                      </div>
                    ) : (
                      <div className="profile-related-list">
                        {careerDocuments.map((document) => (
                          <CompactDocumentRow
                            key={document.id}
                            document={document}
                            className="profile-related-document-row"
                            onOpen={() => void openRelatedDocument(document)}
                            meta={
                              <>
                                <span>{isKo ? "수정" : "Updated"}</span>
                                <strong>{document.updatedOn}</strong>
                              </>
                            }
                            actions={
                              <>
                                <button
                                  type="button"
                                  className="profile-inline-icon-btn"
                                  onClick={() => void openRelatedDocument(document)}
                                  aria-label={isKo ? "문서 열기" : "Open document"}
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="profile-inline-icon-btn"
                                  onClick={() => void downloadRelatedDocument(document)}
                                  aria-label={isKo ? "문서 다운로드" : "Download document"}
                                >
                                  <Download size={14} />
                                </button>
                              </>
                            }
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <aside className="profile-career-side">
                  <div className="profile-career-side-card">
                    <div className="profile-career-side-head">
                      <strong>{careerReadySetTitle}</strong>
                      <p>{careerReadySetDescription}</p>
                    </div>
                    <div className="profile-career-status-list">
                      {careerReadiness.map((item) => (
                        <div className="profile-career-status-row" key={item.type}>
                          <div className="profile-career-status-main">
                            <strong>{item.label}</strong>
                            <span>
                              {item.document?.title ??
                                (isKo
                                  ? "아직 연결된 문서가 없습니다."
                                  : "No linked document yet.")}
                            </span>
                          </div>
                          <span className={`pill ${item.document ? "pill-green" : "pill-gray"}`}>
                            {item.document ? careerReadyLabel : careerMissingLabel}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="profile-career-side-card">
                    <div className="profile-career-side-head">
                      <strong>{careerLinksTitle}</strong>
                      <p>{careerLinksDescription}</p>
                    </div>
                    {savedLinks.length > 0 ? (
                      <div className="profile-link-stack">
                        {savedLinks.map((link) => (
                          <a
                            key={`${link.kind}-${link.url}`}
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="profile-link-row profile-career-link-row"
                          >
                            <strong>
                              {getProfileLinkLabel(locale, {
                                kind: link.kind,
                                label: link.label ?? "",
                              })}
                            </strong>
                            <span>{getProfileLinkDisplayUrl(link.url)}</span>
                            <ExternalLink size={13} />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="profile-empty-copy">{careerLinksEmpty}</p>
                    )}
                  </div>
                </aside>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
