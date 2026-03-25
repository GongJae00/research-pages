"use client";

import {
  type ActivityLog,
  documentRecordSchema,
  journalClasses,
  labResearchProjectStatuses,
  type LabResearchProject,
  type DocumentRecord,
  type LabMember,
  type PublicationRecord,
  type ResearcherSummary,
  type TimetableEntry,
} from "@research-os/types";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  Eye,
  FolderArchive,
  LockKeyhole,
  MailPlus,
  PencilLine,
  Plus,
  Save,
  SquarePen,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";

import { useAuth } from "@/components/auth-provider";
import {
  createDocumentAssetId,
  deleteDocumentFile,
  getDocumentFile,
  saveDocumentFile,
} from "@/lib/document-file-store";
import {
  createServerDocumentRecord,
  deleteServerDocumentRecord,
  isServerDocumentId,
  syncDocumentsForAccount,
  updateServerDocumentRecord,
} from "@/lib/document-server-store";
import {
  readFirstJsonFromStorage,
  writeJsonToStorage,
} from "@/lib/browser-json-store";
import { CompactDocumentRow } from "@/components/compact-document-row";
import { DocumentIntakePanel } from "@/components/document-intake-panel";
import { appendActivityLogForLab } from "@/lib/activity-log-server-store";
import {
  loadBrowserDocuments,
  loadBrowserDocumentsForAccount,
} from "@/lib/document-browser-store";
import { loadBrowserLabResearchProjects, saveBrowserLabResearchProjects } from "@/lib/lab-research-browser-store";
import { buildSeedLabResearchProjects } from "@/lib/lab-research-seeds";
import { replaceLabResearchProjects, syncLabResearchProjects } from "@/lib/lab-research-server-store";
import {
  replaceLabTimetableEntries,
  syncLabTimetableEntries,
} from "@/lib/lab-timetable-server-store";
import { readEvidenceForAccountKey } from "@/lib/evidence-links";
import {
  getCategoryLabel,
  getTypeLabel,
  inferClassification,
} from "@/lib/document-taxonomy";
import type { Locale } from "@/lib/i18n";
import {
  buildLabPermissionState,
  type LabEditorSection,
} from "@/lib/lab-permissions";
import { buildScopedStorageKey, getAccountById } from "@/lib/mock-auth-store";
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
  syncPublicationsForAccount,
} from "@/lib/publication-server-store";
import {
  buildAffiliationsFromLabs,
  buildLabLinkLookup,
  buildProfileFromAccount,
  buildResearcherProfileHref,
  buildResearcherSummary,
} from "@/lib/researcher-directory";
import { buildPublicLabPath } from "@/lib/public-lab";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

interface Props {
  locale: Locale;
  initialDocuments: DocumentRecord[];
  initialTimetableEntries: TimetableEntry[];
}

type Section = LabEditorSection;
type Day = TimetableEntry["dayOfWeek"];
type Kind = TimetableEntry["kind"];
type Entry = TimetableEntry & { scheduleId: string };

type Preview = {
  document: DocumentRecord;
  mode: "iframe" | "text" | "unavailable";
  url?: string;
  text?: string;
  message?: string;
};

type Schedule = {
  scheduleId: string;
  title: string;
  courseCode: string;
  kind: Kind;
  location: string;
  notes: string;
  slots: Entry[];
};

type ScheduleDraft = {
  scheduleId?: string;
  title: string;
  courseCode: string;
  kind: Kind;
  location: string;
  notes: string;
  slots: Array<{
    draftId: string;
    entryId?: string;
    dayOfWeek: Day;
    startTime: string;
    endTime: string;
  }>;
};

type InviteFormState = {
  email: string;
  nationalResearcherNumber: string;
  roleTitle: string;
  permissionLevel: "owner" | "admin" | "member";
};

type DisplayMember = Omit<
  Pick<
    LabMember,
    | "id"
    | "accountId"
    | "koreanName"
    | "englishName"
    | "email"
    | "joinedOn"
    | "roleTitle"
    | "sortOrder"
  >,
  "accountId"
> & {
  accountId?: LabMember["accountId"];
  summary?: ResearcherSummary;
};

type ResearchProjectDraft = {
  id?: string;
  title: string;
  summary: string;
  startDate: string;
  endDate: string;
  status: LabResearchProject["status"];
  program: string;
  sponsor: string;
  publicVisible: boolean;
};

type SharedUploadDraft = {
  id: string;
  file: File;
  documentCategory: DocumentRecord["documentCategory"];
  documentType: DocumentRecord["documentType"];
};

const sections: Section[] = [
  "people",
  "research",
  "papers",
  "documents",
  "timetable",
];

const sectionLabels: Record<Locale, Record<Section, string>> = {
  ko: {
    people: "구성원",
    papers: "논문",
    research: "연구",
    documents: "문서",
    timetable: "시간표",
  },
  en: {
    people: "People",
    papers: "Papers",
    research: "Research",
    documents: "Documents",
    timetable: "Timetable",
  },
};

const sectionDescriptions: Record<Locale, Record<Section, string>> = {
  ko: {
    people: "지도교수, 현재 멤버, 동문 구성을 한 번에 확인합니다.",
    research: "진행 중인 연구와 종료된 연구를 상태별로 정리합니다.",
    papers: "연구실이 함께 보는 논문 목록과 반입 대상을 관리합니다.",
    documents: "공유 문서함과 개인 문서 반입 대상을 한 화면에서 다룹니다.",
    timetable: "공동 시간표와 개인 일정 반입 흐름을 함께 확인합니다.",
  },
  en: {
    people: "Review professors, current members, and alumni in one pass.",
    research: "Track ongoing and completed research items by status.",
    papers: "Manage shared papers and personal papers ready to import.",
    documents: "Review shared files and import-ready personal documents together.",
    timetable: "See the shared timetable and personal schedule import flow together.",
  },
};

const docKey = "researchos:documents-workspace:v2";
const personTtKey = "researchos:timetable-workspace:v4";
const labTtKey = "researchos:lab-timetable:v1";
const accept =
  ".pdf,.hwp,.hwpx,.doc,.docx,.csv,.tsv,.xls,.xlsx,.ppt,.pptx,.txt,.md";
const days: Day[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
const kinds: Kind[] = [
  "class",
  "research",
  "meeting",
  "seminar",
  "office_hours",
  "teaching",
  "deadline",
  "other",
];
const textExt = new Set(["txt", "md", "csv", "tsv"]);

const authorRoles = {
  ko: ["제1저자", "공동저자", "교신저자", "단독저자", "참여저자"],
  en: [
    "First author",
    "Co-author",
    "Corresponding author",
    "Sole author",
    "Contributing author",
  ],
} as const;

const kindLabels = {
  ko: {
    class: "수업",
    research: "연구",
    meeting: "회의",
    seminar: "세미나",
    office_hours: "상담",
    teaching: "조교",
    deadline: "마감",
    other: "기타",
  },
  en: {
    class: "Class",
    research: "Research",
    meeting: "Meeting",
    seminar: "Seminar",
    office_hours: "Office hours",
    teaching: "Teaching",
    deadline: "Deadline",
    other: "Other",
  },
} as const;

const dayLabels = {
  ko: {
    short: {
      sunday: "일",
      monday: "월",
      tuesday: "화",
      wednesday: "수",
      thursday: "목",
      friday: "금",
      saturday: "토",
    },
    full: {
      sunday: "일요일",
      monday: "월요일",
      tuesday: "화요일",
      wednesday: "수요일",
      thursday: "목요일",
      friday: "금요일",
      saturday: "토요일",
    },
  },
  en: {
    short: {
      sunday: "Sun",
      monday: "Mon",
      tuesday: "Tue",
      wednesday: "Wed",
      thursday: "Thu",
      friday: "Fri",
      saturday: "Sat",
    },
    full: {
      sunday: "Sunday",
      monday: "Monday",
      tuesday: "Tuesday",
      wednesday: "Wednesday",
      thursday: "Thursday",
      friday: "Friday",
      saturday: "Saturday",
    },
  },
} as const;

const slugify = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const makeId = (prefix: string) =>
  typeof window !== "undefined" && window.crypto?.randomUUID
    ? `${prefix}-${window.crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const ext = (fileName: string) => fileName.split(".").at(-1)?.toLowerCase() ?? "";

function formatFileSize(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const rounded = value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${rounded} ${units[unitIndex]}`;
}

function formatResearchPeriod(
  locale: Locale,
  startDate: string,
  endDate: string | undefined,
  status: LabResearchProject["status"],
) {
  return `${startDate} - ${endDate ?? (locale === "ko" ? "진행중" : "Ongoing")} (${status === "ongoing" ? (locale === "ko" ? "진행중" : "Ongoing") : (locale === "ko" ? "종료" : "Completed")})`;
}

function sortResearchProjects(left: LabResearchProject, right: LabResearchProject) {
  if (left.status !== right.status) {
    return left.status === "ongoing" ? -1 : 1;
  }

  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder;
  }

  if (left.status === "ongoing") {
    return right.startDate.localeCompare(left.startDate);
  }

  return (right.endDate ?? "").localeCompare(left.endDate ?? "");
}

function createEmptyResearchProjectDraft(): ResearchProjectDraft {
  return {
    title: "",
    summary: "",
    startDate: "",
    endDate: "",
    status: "ongoing",
    program: "",
    sponsor: "",
    publicVisible: true,
  };
}

function loadLabResearchProjectsForView(
  labId: string,
  labName: string,
  mode: "mock-browser" | "supabase",
) {
  const cachedProjects = loadBrowserLabResearchProjects(labId);

  if (cachedProjects.length > 0) {
    return [...cachedProjects].sort(sortResearchProjects);
  }

  if (mode !== "supabase") {
    const seededProjects = buildSeedLabResearchProjects(labId, labName).sort(sortResearchProjects);
    saveBrowserLabResearchProjects(labId, seededProjects);
    return seededProjects;
  }

  return [];
}

function isLeadRole(roleTitle: string) {
  const normalized = roleTitle.trim().toLowerCase();
  return (
    normalized.includes("professor") ||
    normalized.includes("principal investigator") ||
    normalized.includes("pi") ||
    normalized.includes("lab lead") ||
    normalized.includes("director") ||
    normalized.includes("교수") ||
    normalized.includes("랩장") ||
    normalized.includes("책임")
  );
}

function compareLabMembers(
  left: Pick<LabMember, "sortOrder" | "joinedOn" | "koreanName" | "englishName">,
  right: Pick<LabMember, "sortOrder" | "joinedOn" | "koreanName" | "englishName">,
) {
  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder;
  }

  if (left.joinedOn !== right.joinedOn) {
    return left.joinedOn.localeCompare(right.joinedOn);
  }

  return (left.koreanName || left.englishName || "").localeCompare(
    right.koreanName || right.englishName || "",
  );
}

function formatActivityTimestamp(locale: Locale, value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getActivityBadgeLabel(locale: Locale, resourceType: ActivityLog["resourceType"]) {
  const labels = {
    ko: {
      lab: "연구실",
      member: "멤버",
      invite: "초대",
      document: "문서",
      paper: "논문",
      research: "연구",
      profile: "프로필",
      schedule: "시간표",
    },
    en: {
      lab: "Lab",
      member: "Member",
      invite: "Invite",
      document: "Document",
      paper: "Paper",
      research: "Research",
      profile: "Profile",
      schedule: "Schedule",
    },
  } as const;

  return labels[locale][resourceType];
}

function describeActivityLog(locale: Locale, log: ActivityLog) {
  const title =
    typeof log.payload.title === "string"
      ? log.payload.title
      : typeof log.payload.memberName === "string"
        ? log.payload.memberName
        : typeof log.payload.email === "string"
          ? log.payload.email
          : log.resourceId;

  switch (log.action) {
    case "lab.created":
      return locale === "ko"
        ? `${log.actorName}님이 연구실을 만들었습니다.`
        : `${log.actorName} created the lab.`;
    case "lab.updated":
      return locale === "ko"
        ? `${log.actorName}님이 연구실 기본 설정을 수정했습니다.`
        : `${log.actorName} updated the lab settings.`;
    case "member.invited":
      return locale === "ko"
        ? `${log.actorName}님이 ${title} 초대를 만들었습니다.`
        : `${log.actorName} created an invite for ${title}.`;
    case "member.reordered":
      return locale === "ko"
        ? `${log.actorName}님이 멤버 노출 순서를 조정했습니다.`
        : `${log.actorName} adjusted the member order.`;
    case "member.updated":
      return locale === "ko"
        ? `${log.actorName}님이 ${title} 정보를 수정했습니다.`
        : `${log.actorName} updated ${title}.`;
    case "lock.enabled":
      return locale === "ko"
        ? `${log.actorName}님이 ${title} 편집 상태를 켰습니다.`
        : `${log.actorName} marked ${title} as being edited.`;
    case "lock.disabled":
      return locale === "ko"
        ? `${log.actorName}님이 ${title} 편집 상태를 해제했습니다.`
        : `${log.actorName} cleared the editing status for ${title}.`;
    case "shared.document.added":
      return locale === "ko"
        ? `${log.actorName}님이 ${title} 문서를 공유 문서함에 올렸습니다.`
        : `${log.actorName} added ${title} to shared documents.`;
    case "shared.document.removed":
      return locale === "ko"
        ? `${log.actorName}님이 ${title} 문서를 공유 문서함에서 내렸습니다.`
        : `${log.actorName} removed ${title} from shared documents.`;
    case "shared.paper.added":
      return locale === "ko"
        ? `${log.actorName}님이 ${title} 논문을 공유 목록에 올렸습니다.`
        : `${log.actorName} added ${title} to shared papers.`;
    case "shared.paper.removed":
      return locale === "ko"
        ? `${log.actorName}님이 ${title} 논문을 공유 목록에서 내렸습니다.`
        : `${log.actorName} removed ${title} from shared papers.`;
    case "research.created":
      return locale === "ko"
        ? `${log.actorName}님이 ${title} 연구 항목을 추가했습니다.`
        : `${log.actorName} added the research item ${title}.`;
    case "research.updated":
      return locale === "ko"
        ? `${log.actorName}님이 ${title} 연구 항목을 수정했습니다.`
        : `${log.actorName} updated the research item ${title}.`;
    case "research.removed":
      return locale === "ko"
        ? `${log.actorName}님이 ${title} 연구 항목을 삭제했습니다.`
        : `${log.actorName} removed the research item ${title}.`;
    case "shared.schedule.added":
      return locale === "ko"
        ? `${log.actorName}님이 ${title} 일정을 공동 시간표에 추가했습니다.`
        : `${log.actorName} added ${title} to the shared timetable.`;
    case "shared.schedule.removed":
      return locale === "ko"
        ? `${log.actorName}님이 ${title} 일정을 공동 시간표에서 제거했습니다.`
        : `${log.actorName} removed ${title} from the shared timetable.`;
    default:
      return locale === "ko"
        ? `${log.actorName}님이 변경을 남겼습니다.`
        : `${log.actorName} left an update.`;
  }
}

const parseTime = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
};

function buildTimeOptions() {
  const values: string[] = [];
  for (let minute = 0; minute < 24 * 60; minute += 30) {
    values.push(
      `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`,
    );
  }
  values.push("24:00");
  return values;
}

const selectWrap = (children: ReactNode) => <div className="planner-select-wrap">{children}</div>;

const kindTone = (kind: Kind) =>
  kind === "research" ? "pill-green" : kind === "seminar" ? "pill-purple" : kind === "deadline" ? "pill-red" : "pill-amber";

const blockTone = (kind: Kind) =>
  kind === "research"
    ? "planner-block-research"
    : kind === "meeting"
      ? "planner-block-meeting"
      : kind === "seminar"
        ? "planner-block-seminar"
        : "planner-block-class";

const emptySchedule = (): ScheduleDraft => ({
  title: "",
  courseCode: "",
  kind: "meeting",
  location: "",
  notes: "",
  slots: [
    {
      draftId: makeId("slot"),
      dayOfWeek: "wednesday",
      startTime: "14:00",
      endTime: "15:00",
    },
  ],
});

function normalize(entries: TimetableEntry[]) {
  const cache = new Map<string, string>();
  return entries.map((entry) => ({
    ...entry,
    scheduleId:
      entry.scheduleId ??
      (() => {
        const key = [
          entry.courseTitle,
          entry.courseCode ?? "",
          entry.kind,
          entry.location ?? "",
          entry.notes ?? "",
        ]
          .join("::")
          .toLowerCase();
        if (!cache.has(key)) {
          cache.set(
            key,
            `schedule-${Math.abs(
              [...key].reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0),
            ).toString(36)}`,
          );
        }
        return cache.get(key)!;
      })(),
  }));
}

function group(entries: Entry[]) {
  const grouped = new Map<string, Schedule>();
  [...entries]
    .sort(
      (left, right) =>
        days.indexOf(left.dayOfWeek) - days.indexOf(right.dayOfWeek) ||
        parseTime(left.startTime) - parseTime(right.startTime),
    )
    .forEach((entry) => {
      const found = grouped.get(entry.scheduleId);
      if (found) {
        found.slots.push(entry);
      } else {
        grouped.set(entry.scheduleId, {
          scheduleId: entry.scheduleId,
          title: entry.courseTitle,
          courseCode: entry.courseCode ?? "",
          kind: entry.kind,
          location: entry.location ?? "",
          notes: entry.notes ?? "",
          slots: [entry],
        });
      }
    });
  return [...grouped.values()];
}

function draftFromLab(lab: {
  name: string;
  slug: string;
  summary?: string | null;
  homepageTitle?: string | null;
  homepageDescription?: string | null;
  publicPageEnabled?: boolean | null;
}) {
  return {
    name: lab.name,
    slug: lab.slug,
    summary: lab.summary ?? "",
    homepageTitle: lab.homepageTitle ?? "",
    homepageDescription: lab.homepageDescription ?? "",
    publicPageEnabled: lab.publicPageEnabled ?? false,
  };
}

export function LabWorkspace({ locale, initialDocuments, initialTimetableEntries }: Props) {
  const isKo = locale === "ko";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    currentAccount,
    labs,
    backendStatus,
    createLab,
    inviteMember,
    listActivityLogs,
    updateLab,
    updateMember,
    toggleLock,
    toggleSharedItem,
    getInviteLink,
  } = useAuth();
  const sharedUploadRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const seededRef = useRef<Set<string>>(new Set());
  const listActivityLogsRef = useRef(listActivityLogs);
  const [documents, setDocuments] = useState<DocumentRecord[]>(() => loadBrowserDocuments(initialDocuments));
  const [sharedUploadDrafts, setSharedUploadDrafts] = useState<SharedUploadDraft[]>([]);
  const [isSharedDragActive, setIsSharedDragActive] = useState(false);
  const [publications, setPublications] = useState<PublicationRecord[]>(() => loadBrowserPublications());
  const [researchProjectStore, setResearchProjectStore] = useState<Record<string, LabResearchProject[]>>(
    () =>
      Object.fromEntries(
        labs.map((lab) => [
          lab.id,
          loadLabResearchProjectsForView(lab.id, lab.name, backendStatus.currentMode),
        ]),
      ),
  );
  const [researchDraft, setResearchDraft] = useState<ResearchProjectDraft | null>(null);
  const [researchEditorMode, setResearchEditorMode] = useState<"idle" | "create" | "edit">("idle");
  const [activityLogStore, setActivityLogStore] = useState<Record<string, ActivityLog[]>>({});
  const [personalEntries] = useState<Entry[]>(() => {
    if (typeof window === "undefined") return normalize(initialTimetableEntries);
    try {
      const parsed = readFirstJsonFromStorage<Record<string, TimetableEntry[]>>(
        [buildScopedStorageKey(personTtKey), personTtKey],
        {},
      );
      const flattened = Object.values(parsed).flat();
      return flattened.length ? normalize(flattened) : normalize(initialTimetableEntries);
    } catch {
      return normalize(initialTimetableEntries);
    }
  });
  const [labEntryStore, setLabEntryStore] = useState<Record<string, Entry[]>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const parsed = readFirstJsonFromStorage<Record<string, TimetableEntry[]>>(
        [buildScopedStorageKey(labTtKey), labTtKey],
        {},
      );
      return Object.keys(parsed).length
        ? Object.fromEntries(
            Object.entries(parsed).map(
              ([labId, entries]) => [labId, normalize(entries ?? [])],
            ),
          )
        : {};
    } catch {
      return {};
    }
  });
  const [isEditing, setIsEditing] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    slug: "",
    summary: "",
    homepageTitle: "",
    homepageDescription: "",
  });
  const [labDraft, setLabDraft] = useState(() =>
    draftFromLab(
      labs[0] ?? {
        name: "",
        slug: "",
        summary: "",
        homepageTitle: "",
        homepageDescription: "",
      },
    ),
  );
  const [inviteForm, setInviteForm] = useState<InviteFormState>({
    email: "",
    nationalResearcherNumber: "",
    roleTitle: isKo ? "연구원" : "Researcher",
    permissionLevel: "member",
  });
  const [publicationDraft, setPublicationDraft] = useState({
    title: "",
    journalClass: "",
    journalName: "",
    publisher: "",
    publishedOn: "",
    authorRole: "",
    participants: "",
  });
  const [previewState, setPreviewState] = useState<Preview | null>(null);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft | null>(null);
  const [editorMode, setEditorMode] = useState<"idle" | "create" | "edit">("idle");
  const [message, setMessage] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const scheduleOptions = useMemo(() => buildTimeOptions(), []);
  const activeLabSlug = searchParams.get("lab");
  const activeSection = sections.includes(searchParams.get("section") as Section)
    ? (searchParams.get("section") as Section)
    : "people";
  const currentAccountId = currentAccount?.id ?? null;
  const activeLab = useMemo(() => {
    const matched = activeLabSlug ? labs.find((lab) => lab.slug === activeLabSlug) : null;
    return matched ?? labs[0] ?? null;
  }, [activeLabSlug, labs]);
  const labLookup = useMemo(() => buildLabLinkLookup(labs), [labs]);

  useEffect(() => {
    listActivityLogsRef.current = listActivityLogs;
  }, [listActivityLogs]);

  useEffect(() => {
    if (!currentAccountId) return;

    let cancelled = false;

    void syncDocumentsForAccount(currentAccountId)
      .then((serverDocuments) => {
        if (cancelled || !serverDocuments) return;
        setDocuments([...serverDocuments].sort((a, b) => b.updatedOn.localeCompare(a.updatedOn)));
      })
      .catch(() => {
        // Keep the local cache path alive when the server sync is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [currentAccountId]);

  useEffect(() => {
    if (!currentAccountId || !activeLab) return;

    let cancelled = false;

    void listActivityLogsRef.current(activeLab.id)
      .then((logs) => {
        if (cancelled) return;
        setActivityLogStore((current) => ({
          ...current,
          [activeLab.id]: logs,
        }));
      })
      .catch(() => {
        // Keep the current list as-is when the activity feed cannot sync.
      });

    return () => {
      cancelled = true;
    };
  }, [activeLab, currentAccountId, labs]);

  useEffect(() => {
    if (!activeLab || backendStatus.currentMode !== "supabase") {
      return;
    }

    const client = getSupabaseBrowserClient();
    const channel = client
      .channel(`lab-activity-${activeLab.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activity_logs",
          filter: `lab_id=eq.${activeLab.id}`,
        },
        () => {
          void listActivityLogsRef.current(activeLab.id).then((logs) => {
            setActivityLogStore((current) => ({
              ...current,
              [activeLab.id]: logs,
            }));
          });
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [activeLab, backendStatus.currentMode]);

  useEffect(() => {
    if (!currentAccountId) return;

    let cancelled = false;

    void syncPublicationsForAccount(currentAccountId)
      .then((serverPublications) => {
        if (cancelled || !serverPublications) return;
        setPublications(serverPublications);
      })
      .catch(() => {
        // Keep the local cache path alive when the server sync is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [currentAccountId]);

  useEffect(() => {
    if (!activeLab) {
      return;
    }

    let cancelled = false;

    void syncLabResearchProjects(
      activeLab.id,
      buildSeedLabResearchProjects(activeLab.id, activeLab.name),
    )
      .then((serverProjects) => {
        if (cancelled || !serverProjects) return;
        setResearchProjectStore((current) => ({
          ...current,
          [activeLab.id]: [...serverProjects].sort(sortResearchProjects),
        }));
      })
      .catch(() => {
        // Keep the local cache path alive when the server sync is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [activeLab]);

  useEffect(() => {
    if (!activeLab || backendStatus.currentMode !== "supabase") {
      return;
    }

    const client = getSupabaseBrowserClient();
    const channel = client
      .channel(`lab-research-${activeLab.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lab_research_projects",
          filter: `lab_id=eq.${activeLab.id}`,
        },
        () => {
          void syncLabResearchProjects(
            activeLab.id,
            buildSeedLabResearchProjects(activeLab.id, activeLab.name),
          ).then((projects) => {
            if (!projects) return;
            setResearchProjectStore((current) => ({
              ...current,
              [activeLab.id]: [...projects].sort(sortResearchProjects),
            }));
          });
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [activeLab, backendStatus.currentMode]);

  useEffect(() => {
    if (!activeLab) {
      return;
    }

    let cancelled = false;

    void syncLabTimetableEntries(
      activeLab.id,
      backendStatus.currentMode === "supabase" ? [] : personalEntries.slice(0, 4),
    )
      .then((serverEntries) => {
        if (cancelled || !serverEntries) return;
        setLabEntryStore((current) => ({
          ...current,
          [activeLab.id]: normalize(serverEntries),
        }));
      })
      .catch(() => {
        // Keep the local cache path alive when the server sync is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [activeLab, backendStatus.currentMode, personalEntries]);

  useEffect(() => {
    if (!activeLab || backendStatus.currentMode !== "supabase") {
      return;
    }

    const client = getSupabaseBrowserClient();
    const channel = client
      .channel(`lab-timetable-${activeLab.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lab_timetable_entries",
          filter: `lab_id=eq.${activeLab.id}`,
        },
        () => {
          void syncLabTimetableEntries(activeLab.id, []).then((entries) => {
            if (!entries) return;
            setLabEntryStore((current) => ({
              ...current,
              [activeLab.id]: normalize(entries),
            }));
          });
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [activeLab, backendStatus.currentMode]);

  useEffect(() => {
    if (backendStatus.currentMode === "supabase") return;
    if (!activeLab || seededRef.current.has(activeLab.id)) return;
    const seedingMember =
      currentAccount?.id
        ? activeLab.members.find((member) => member.accountId === currentAccount.id)
        : null;
    if (!seedingMember?.canManageDocuments) return;
    seededRef.current.add(activeLab.id);
    documents.slice(0, 2).forEach((document) => {
      if (!activeLab.sharedDocumentIds.includes(document.id)) {
        void toggleSharedItem(activeLab.id, "sharedDocumentIds", document.id, document.title);
      }
    });
    publications.slice(0, 2).forEach((publication) => {
      if (!activeLab.sharedPaperIds.includes(publication.id)) {
        void toggleSharedItem(activeLab.id, "sharedPaperIds", publication.id, publication.title);
      }
    });
  }, [activeLab, backendStatus.currentMode, currentAccount?.id, documents, publications, toggleSharedItem]);

  useEffect(
    () => () => {
      if (previewState?.url) window.URL.revokeObjectURL(previewState.url);
    },
    [previewState],
  );

  const {
    currentMember,
    canManageProfile,
    canManageDocuments,
    canManageMembers,
    canOpenEditorForSection,
  } = useMemo(
    () => buildLabPermissionState(activeLab, currentAccount?.id),
    [activeLab, currentAccount?.id],
  );
  const canEditCurrentSection = canOpenEditorForSection(activeSection);
  const canEditPeopleSection = isEditing && canManageMembers;
  const canEditResearchSection = isEditing && canManageProfile;
  const canEditDocumentSection = isEditing && canManageDocuments;
  const orderedLabMembers = useMemo(
    () => (activeLab ? [...activeLab.members].sort(compareLabMembers) : []),
    [activeLab],
  );
  const sharedDocuments = activeLab
    ? documents.filter((document) => activeLab.sharedDocumentIds.includes(document.id))
    : [];
  const availableDocuments = activeLab
    ? [...documents.filter((document) => !activeLab.sharedDocumentIds.includes(document.id))].sort(
        (a, b) => b.updatedOn.localeCompare(a.updatedOn),
      )
    : [];
  const recentActivityLogs = activeLab ? activityLogStore[activeLab.id] ?? [] : [];
  const sharedPublications = activeLab
    ? [...publications.filter((publication) => activeLab.sharedPaperIds.includes(publication.id))].sort(
        (a, b) => (b.publishedOn ?? "").localeCompare(a.publishedOn ?? ""),
      )
    : [];
  const availablePublications = activeLab
    ? [...publications.filter((publication) => !activeLab.sharedPaperIds.includes(publication.id))].sort(
        (a, b) => (b.publishedOn ?? "").localeCompare(a.publishedOn ?? ""),
      )
    : [];
  const draftPublicLabHref = useMemo(() => {
    const nextSlug = slugify(labDraft.slug || labDraft.name);
    return labDraft.publicPageEnabled && nextSlug
      ? buildPublicLabPath(locale, nextSlug)
      : null;
  }, [labDraft.name, labDraft.publicPageEnabled, labDraft.slug, locale]);
  const publicLabHref =
    activeLab && activeLab.publicPageEnabled
      ? buildPublicLabPath(locale, activeLab.slug)
      : null;
  const labEntries = activeLab
    ? labEntryStore[activeLab.id] ??
      (backendStatus.currentMode === "supabase" ? [] : personalEntries.slice(0, 4))
    : [];
  const groupedLab = group(labEntries);
  const importablePersonalSchedules = group(personalEntries).filter(
    (schedule) => !groupedLab.some((item) => item.scheduleId === schedule.scheduleId),
  );
  const selectedSchedule =
    groupedLab.find((item) => item.scheduleId === selectedScheduleId) ?? null;
  const peopleCards = useMemo(() => {
    if (!activeLab) {
      return [];
    }

    const actualMembers = orderedLabMembers.map((member) => {
      const account = getAccountById(member.accountId);

      if (!account) {
        return member as DisplayMember;
      }

      const affiliations = buildAffiliationsFromLabs(member.accountId, activeLab.slug, labs);
      const profile = buildProfileFromAccount(account, affiliations);
      const publications = loadBrowserPublicationsForAccount(member.accountId);
      const documents = loadBrowserDocumentsForAccount([], member.accountId);
      const linkedDocumentIds = readEvidenceForAccountKey(member.accountId, "profile:core");
      const linkedDocuments = documents.filter((document) => linkedDocumentIds.includes(document.id));
      const summary = buildResearcherSummary({
        accountId: member.accountId,
        profile,
        affiliations,
        publications,
        linkedDocuments,
        preferredLabSlug: activeLab.slug,
        labLookup,
      });

      return {
        ...member,
        summary,
      } satisfies DisplayMember;
    });

    return [...actualMembers].sort(compareLabMembers);
  }, [activeLab, labLookup, labs, orderedLabMembers]);
  const professorRoster =
    peopleCards.length === 0
      ? []
      : (() => {
          const leads = peopleCards.filter((member) =>
            isLeadRole(member.summary?.primaryRoleTitle ?? member.roleTitle),
          );
          return leads.length ? leads : peopleCards.slice(0, 1);
        })();
  const memberRoster = peopleCards.filter(
    (member) => !professorRoster.some((professor) => professor.id === member.id),
  );
  const alumniRoster: DisplayMember[] = [];
  const researchProjects = activeLab
    ? researchProjectStore[activeLab.id] ??
      loadLabResearchProjectsForView(activeLab.id, activeLab.name, backendStatus.currentMode)
    : [];
  const orderedResearchProjects = [...researchProjects].sort(sortResearchProjects);
  const ongoingResearchCount = orderedResearchProjects.filter((project) => project.status === "ongoing").length;
  const completedResearchCount = orderedResearchProjects.length - ongoingResearchCount;
  const publicResearchCount = orderedResearchProjects.filter((project) => project.publicVisible).length;
  const activeLocks = activeLab?.editLocks.filter((lock) => lock.active) ?? [];

  const entriesByDay = new Map<Day, Entry[]>(days.map((day) => [day, []]));
  labEntries.forEach((entry) => entriesByDay.get(entry.dayOfWeek)?.push(entry));

  const route = (labSlug?: string, section?: Section) => {
    const next = new URLSearchParams(searchParams.toString());
    if (labSlug) next.set("lab", labSlug);
    else next.delete("lab");
    if (section) next.set("section", section);
    else next.delete("section");
    router.replace(next.toString() ? `${pathname}?${next.toString()}` : pathname, {
      scroll: false,
    });
  };

  const openMemberProfile = (member: DisplayMember) => {
    if (!member.accountId || !activeLab) return;

    router.push(buildResearcherProfileHref(locale, member.accountId, activeLab.slug));
  };

  const moveMemberOrder = async (memberId: string, direction: -1 | 1) => {
    if (!activeLab || !currentMember?.canManageMembers) {
      return;
    }

    const currentIndex = orderedLabMembers.findIndex((member) => member.id === memberId);
    const swapIndex = currentIndex + direction;

    if (currentIndex < 0 || swapIndex < 0 || swapIndex >= orderedLabMembers.length) {
      return;
    }

    const current = orderedLabMembers[currentIndex];
    const target = orderedLabMembers[swapIndex];

    await updateMember(activeLab.id, current.id, { sortOrder: target.sortOrder });
    await updateMember(activeLab.id, target.id, { sortOrder: current.sortOrder });
  };

  const closeEditing = () => {
    setIsEditing(false);
    setEditorMode("idle");
    setResearchEditorMode("idle");
    setResearchDraft(null);
    setScheduleDraft(null);
    setValidationMessage("");
    setMessage("");
    setSharedUploadDrafts([]);
    setIsSharedDragActive(false);
  };

  const setActiveLabId: (labId: string) => void = (labId) => {
    const nextLab = labs.find((lab) => lab.id === labId);
    if (!nextLab) return;
    setLabDraft(draftFromLab(nextLab));
    setIsEditing(false);
    setEditorMode("idle");
    setResearchEditorMode("idle");
    setResearchDraft(null);
    setScheduleDraft(null);
    setSelectedScheduleId(null);
    setValidationMessage("");
    setMessage("");
    setSharedUploadDrafts([]);
    setIsSharedDragActive(false);
  };

  const resetSectionState = () => {
    setIsEditing(false);
    setEditorMode("idle");
    setResearchEditorMode("idle");
    setResearchDraft(null);
    setScheduleDraft(null);
    setValidationMessage("");
    setMessage("");
    setSharedUploadDrafts([]);
    setIsSharedDragActive(false);
  };

  useEffect(() => {
    if (!isEditing || canEditCurrentSection) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsEditing(false);
      setEditorMode("idle");
      setResearchEditorMode("idle");
      setResearchDraft(null);
      setScheduleDraft(null);
      setValidationMessage("");
      setMessage("");
      setSharedUploadDrafts([]);
      setIsSharedDragActive(false);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [canEditCurrentSection, isEditing]);

  const persistDocs = (next: DocumentRecord[]) => {
    const sorted = [...next].sort((a, b) => b.updatedOn.localeCompare(a.updatedOn));
    setDocuments(sorted);
    writeJsonToStorage(buildScopedStorageKey(docKey), sorted);
  };

  const buildDocumentFileAssetId = (fileName: string, accountId: string) =>
    backendStatus.currentMode === "supabase"
      ? createDocumentAssetId(accountId, fileName)
      : makeId("file");

  const persistPubs = (next: PublicationRecord[]) => {
    setPublications(next);
    if (currentAccountId) {
      saveBrowserPublicationsForAccount(currentAccountId, next);
      return;
    }

    saveBrowserPublications(next);
  };

  const persistLabEntries = async (next: Entry[]) => {
    if (!activeLab || !canManageDocuments) return;
    const nextStore = { ...labEntryStore, [activeLab.id]: next };
    setLabEntryStore(nextStore);
    writeJsonToStorage(buildScopedStorageKey(labTtKey), nextStore);

    try {
      const syncedEntries = await replaceLabTimetableEntries(activeLab.id, next);
      if (!syncedEntries) {
        return;
      }

      setLabEntryStore((current) => ({
        ...current,
        [activeLab.id]: normalize(syncedEntries),
      }));
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Failed.");
    }
  };

  const persistResearchProjects = async (next: LabResearchProject[]) => {
    if (!activeLab || !canManageProfile) return;

    const normalized = [...next]
      .map((project, index) => ({
        ...project,
        owner: { type: "lab", id: activeLab.id } as const,
        sortOrder: index,
      }))
      .sort(sortResearchProjects);

    const persisted = await replaceLabResearchProjects(activeLab.id, normalized);
    setResearchProjectStore((current) => ({
      ...current,
      [activeLab.id]: [...persisted].sort(sortResearchProjects),
    }));
  };

  const startCreateResearchProject = () => {
    if (!canManageProfile) return;
    setResearchEditorMode("create");
    setResearchDraft(createEmptyResearchProjectDraft());
    setValidationMessage("");
    setMessage("");
  };

  const startEditResearchProject = (project: LabResearchProject) => {
    if (!canManageProfile) return;
    setResearchEditorMode("edit");
    setResearchDraft({
      id: project.id,
      title: project.title,
      summary: project.summary ?? "",
      startDate: project.startDate,
      endDate: project.endDate ?? "",
      status: project.status,
      program: project.program,
      sponsor: project.sponsor,
      publicVisible: project.publicVisible,
    });
    setValidationMessage("");
    setMessage("");
  };

  const saveResearchProject = async () => {
    if (!activeLab || !researchDraft || !canManageProfile) {
      return;
    }

    if (!researchDraft.title.trim() || !researchDraft.startDate || !researchDraft.program.trim() || !researchDraft.sponsor.trim()) {
      setValidationMessage(
        isKo
          ? "연구 제목, 시작일, 과제명, 사업/출처를 먼저 채워주세요."
          : "Fill in the title, start date, program, and sponsor first.",
      );
      return;
    }

    if (researchDraft.status === "completed" && !researchDraft.endDate) {
      setValidationMessage(
        isKo
          ? "종료된 연구는 종료일을 함께 적어주세요."
          : "Completed research needs an end date.",
      );
      return;
    }

    const nextProject: LabResearchProject = {
      id: researchDraft.id ?? makeId("research"),
      owner: { type: "lab", id: activeLab.id },
      title: researchDraft.title.trim(),
      summary: researchDraft.summary.trim() || undefined,
      startDate: researchDraft.startDate,
      endDate: researchDraft.endDate || undefined,
      status: researchDraft.status,
      program: researchDraft.program.trim(),
      sponsor: researchDraft.sponsor.trim(),
      sortOrder:
        orderedResearchProjects.find((project) => project.id === researchDraft.id)?.sortOrder ??
        orderedResearchProjects.length,
      publicVisible: researchDraft.publicVisible,
    };

    const nextProjects = researchEditorMode === "edit"
      ? orderedResearchProjects.map((project) => (project.id === nextProject.id ? nextProject : project))
      : [...orderedResearchProjects, nextProject];

    try {
      await persistResearchProjects(nextProjects);
      if (currentAccount) {
        await appendActivityLogForLab({
          labId: activeLab.id,
          actorAccountId: currentAccount.id,
          actorName: currentAccount.koreanName || currentAccount.englishName || "Researcher",
          action: researchEditorMode === "edit" ? "research.updated" : "research.created",
          resourceType: "research",
          resourceId: nextProject.id,
          payload: {
            title: nextProject.title,
            status: nextProject.status,
            publicVisible: nextProject.publicVisible,
          },
        });
      }
      setResearchEditorMode("idle");
      setResearchDraft(null);
      setValidationMessage("");
      setMessage(isKo ? "연구 목록이 저장되었습니다." : "Research projects saved.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Failed.");
    }
  };

  const removeResearchProject = async (projectId: string) => {
    if (!activeLab || !canManageProfile) {
      return;
    }

    try {
      const removedProject = orderedResearchProjects.find((project) => project.id === projectId);
      await persistResearchProjects(
        orderedResearchProjects.filter((project) => project.id !== projectId),
      );
      if (currentAccount && removedProject) {
        await appendActivityLogForLab({
          labId: activeLab.id,
          actorAccountId: currentAccount.id,
          actorName: currentAccount.koreanName || currentAccount.englishName || "Researcher",
          action: "research.removed",
          resourceType: "research",
          resourceId: removedProject.id,
          payload: {
            title: removedProject.title,
          },
        });
      }
      if (researchDraft?.id === projectId) {
        setResearchEditorMode("idle");
        setResearchDraft(null);
      }
      setValidationMessage("");
      setMessage(isKo ? "연구 항목을 삭제했습니다." : "Research project removed.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Failed.");
    }
  };

  const previewDoc = async (document: DocumentRecord) => {
    if (!document.fileAssetId) {
      setPreviewState({
        document,
        mode: "unavailable",
        message: isKo ? "원본 파일이 없습니다." : "No source file.",
      });
      return;
    }

    try {
      const file = await getDocumentFile(document.fileAssetId);
      if (!file) {
        setPreviewState({
          document,
          mode: "unavailable",
          message: isKo ? "원본 파일이 없습니다." : "No source file.",
        });
        return;
      }
      if (textExt.has((document.fileExtension ?? "").toLowerCase()) || document.mimeType?.startsWith("text/")) {
        setPreviewState({ document, mode: "text", text: (await file.text()).slice(0, 40000) });
        return;
      }
      if ((document.fileExtension ?? "").toLowerCase() === "pdf" || document.mimeType === "application/pdf") {
        setPreviewState({
          document,
          mode: "iframe",
          url: window.URL.createObjectURL(file),
        });
        return;
      }
      setPreviewState({
        document,
        mode: "unavailable",
        message: isKo ? "브라우저 미리보기가 어려운 형식입니다." : "Preview unavailable for this format.",
      });
    } catch {
      setPreviewState({
        document,
        mode: "unavailable",
        message: isKo ? "미리보기를 불러오지 못했습니다." : "Could not load preview.",
      });
    }
  };

  const closePreview = () => {
    setPreviewState((current) => {
      if (current?.url) window.URL.revokeObjectURL(current.url);
      return null;
    });
  };

  const downloadDoc = async (document: DocumentRecord) => {
    if (!document.fileAssetId) return;
    const file = await getDocumentFile(document.fileAssetId);
    if (!file) return;
    const url = window.URL.createObjectURL(file);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = document.originalFileName || document.title;
    window.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  const createLabNow = async () => {
    try {
      const next = await createLab({
        ...createForm,
        slug: createForm.slug || slugify(createForm.name),
      });
      setLabDraft(draftFromLab(next));
      closeEditing();
      route(next.slug, "people");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Failed.");
    }
  };

  const saveLabNow = async () => {
    if (!activeLab || !canManageProfile) return;
    try {
      const nextSlug = slugify(labDraft.slug || labDraft.name);
      await updateLab(activeLab.id, { ...labDraft, slug: nextSlug });
      setIsEditing(false);
      setMessage(isKo ? "저장되었습니다." : "Saved.");
      route(nextSlug, activeSection);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Failed.");
    }
  };

  const inviteNow = async () => {
    if (!activeLab || !currentMember || !canManageMembers) return;
    try {
      await inviteMember({
        labId: activeLab.id,
        invitedByMemberId: currentMember.id,
        ...inviteForm,
      });
      setInviteForm({
        email: "",
        nationalResearcherNumber: "",
        roleTitle: isKo ? "연구원" : "Researcher",
        permissionLevel: "member",
      });
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Failed.");
    }
  };

  const requestReplace = (id: string) => {
    if (!canManageDocuments) return;
    setReplaceTargetId(id);
    replaceInputRef.current?.click();
  };

  const replaceDoc = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!canManageDocuments) {
      event.target.value = "";
      return;
    }
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !replaceTargetId) return;
    const target = documents.find((item) => item.id === replaceTargetId);
    setReplaceTargetId(null);
    if (!target) return;
    const assetId =
      backendStatus.currentMode === "supabase" || !target.fileAssetId
        ? buildDocumentFileAssetId(file.name, target.owner.id)
        : target.fileAssetId;
    const shouldCleanupNewAsset = assetId !== target.fileAssetId;

    try {
      await saveDocumentFile(assetId, file);

      const nextRecord: DocumentRecord = {
        ...target,
        originalFileName: file.name,
        fileExtension: ext(file.name),
        mimeType: file.type || undefined,
        fileSizeBytes: file.size,
        fileAssetId: assetId,
        updatedOn: today(),
      };
      const persistedRecord = isServerDocumentId(target.id)
        ? await updateServerDocumentRecord(nextRecord, target.owner.id)
        : await createServerDocumentRecord(nextRecord, target.owner.id);

      persistDocs(
        documents.map((item) => (item.id === target.id ? persistedRecord : item)),
      );

      if (shouldCleanupNewAsset && target.fileAssetId) {
        void deleteDocumentFile(target.fileAssetId).catch(() => undefined);
      }
    } catch {
      try {
        if (shouldCleanupNewAsset) {
          await deleteDocumentFile(assetId);
        }
      } catch {}

      setMessage(isKo ? "문서를 교체하지 못했습니다." : "Could not replace the document.");
    }
  };

  const deleteDoc = async (document: DocumentRecord) => {
    if (!canManageDocuments) return;
    if (!activeLab || !window.confirm(isKo ? "이 문서를 삭제할까요?" : "Delete this document?")) return;
    try {
      if (isServerDocumentId(document.id)) {
        await deleteServerDocumentRecord(document.id);
      }
      if (document.fileAssetId) await deleteDocumentFile(document.fileAssetId);
    } catch {}
    if (activeLab.sharedDocumentIds.includes(document.id)) {
      await toggleSharedItem(activeLab.id, "sharedDocumentIds", document.id, document.title);
    }
    persistDocs(documents.filter((item) => item.id !== document.id));
  };

  const addSharedFiles = (files: File[]) => {
    if (!files.length) return;
    setSharedUploadDrafts((current) => [
      ...files.map((file) => {
        const inferred = inferClassification(file.name);
        return {
          id: makeId("shared-draft"),
          file,
          documentCategory: inferred.documentCategory,
          documentType: inferred.documentType,
        };
      }),
      ...current,
    ]);
  };

  const handleSharedFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    addSharedFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  };

  const handleSharedDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsSharedDragActive(false);
    addSharedFiles(Array.from(event.dataTransfer.files ?? []));
  };

  const removeSharedDraft = (draftId: string) => {
    setSharedUploadDrafts((current) => current.filter((draft) => draft.id !== draftId));
  };

  const buildSharedDocumentRecord = async (draft: SharedUploadDraft) => {
    if (!activeLab || !currentAccount || !canManageDocuments) return null;
    const fileAssetId = buildDocumentFileAssetId(draft.file.name, currentAccount.id);
    const nextRecord = documentRecordSchema.parse({
      id: makeId("doc"),
      owner: { type: "user", id: currentAccount.id },
      title: draft.file.name,
      documentCategory: draft.documentCategory,
      documentType: draft.documentType,
      sourceKind: "file",
      status: "active",
      visibility: "private",
      originalFileName: draft.file.name,
      mimeType: draft.file.type || undefined,
      fileExtension: ext(draft.file.name),
      fileSizeBytes: draft.file.size,
      fileAssetId,
      tags: [ext(draft.file.name)].filter(Boolean),
      relatedFundingIds: [],
      relatedAffiliationIds: [],
      updatedOn: today(),
    });

    try {
      await saveDocumentFile(fileAssetId, draft.file);
      return await createServerDocumentRecord(nextRecord, currentAccount.id);
    } catch (caught) {
      try {
        await deleteDocumentFile(fileAssetId);
      } catch {
        // Best-effort cleanup only.
      }

      throw caught;
    }
  };

  const saveSharedDraft = async (draftId: string) => {
    if (!canManageDocuments) return;
    const draft = sharedUploadDrafts.find((item) => item.id === draftId);
    if (!draft || !activeLab) return;

    try {
      const created = await buildSharedDocumentRecord(draft);
      if (!created) return;

      persistDocs([created, ...documents]);
      await toggleSharedItem(activeLab.id, "sharedDocumentIds", created.id, created.title);
      removeSharedDraft(draftId);
    } catch {
      setMessage(isKo ? "공유 문서를 저장하지 못했습니다." : "Could not save the shared document.");
    }
  };

  const saveAllSharedDrafts = async () => {
    if (!activeLab || !sharedUploadDrafts.length || !canManageDocuments) return;

    const created: DocumentRecord[] = [];
    try {
      for (const draft of sharedUploadDrafts) {
        const item = await buildSharedDocumentRecord(draft);
        if (item) created.push(item);
      }

      if (!created.length) return;

      persistDocs([...created, ...documents]);
      for (const item of created) {
        await toggleSharedItem(activeLab.id, "sharedDocumentIds", item.id, item.title);
      }
      setSharedUploadDrafts([]);
    } catch {
      setMessage(isKo ? "공유 문서를 저장하지 못했습니다." : "Could not save the shared document.");
    }
  };

  const addPublication = async () => {
    if (!activeLab || !currentAccount || !publicationDraft.title.trim() || !canManageDocuments) return;
    const next: PublicationRecord = {
      id: makeId("pub"),
      owner: { type: "user", id: currentAccount.id },
      title: publicationDraft.title.trim(),
      journalClass: publicationDraft.journalClass ? (publicationDraft.journalClass as PublicationRecord["journalClass"]) : undefined,
      journalName: publicationDraft.journalName.trim() || undefined,
      publisher: publicationDraft.publisher.trim() || undefined,
      publishedOn: publicationDraft.publishedOn.trim() || undefined,
      authorRole: publicationDraft.authorRole.trim() || undefined,
      participants: publicationDraft.participants.trim() || undefined,
      updatedOn: today(),
    };
    try {
      const persisted = await createServerPublicationRecord(next, currentAccount.id);
      persistPubs([persisted, ...publications]);
      await toggleSharedItem(activeLab.id, "sharedPaperIds", persisted.id, persisted.title);
      setPublicationDraft({
        title: "",
        journalClass: "",
        journalName: "",
        publisher: "",
        publishedOn: "",
        authorRole: "",
        participants: "",
      });
    } catch {
      setMessage(isKo ? "논문을 저장하지 못했습니다." : "Could not save the paper.");
    }
  };

  const deletePublication = async (id: string) => {
    if (!activeLab || !canManageDocuments) return;

    try {
      if (activeLab.sharedPaperIds.includes(id)) {
        const target = publications.find((item) => item.id === id);
        await toggleSharedItem(activeLab.id, "sharedPaperIds", id, target?.title);
      }
      if (isServerPublicationId(id)) {
        await deleteServerPublicationRecord(id);
      }
      persistPubs(publications.filter((item) => item.id !== id));
    } catch {
      setMessage(isKo ? "논문을 삭제하지 못했습니다." : "Could not delete the paper.");
    }
  };

  const saveSchedule = () => {
    if (!scheduleDraft || !canManageDocuments) return;
    const title = scheduleDraft.title.trim();
    const slots = scheduleDraft.slots.filter((slot) => parseTime(slot.endTime) > parseTime(slot.startTime));
    if (!title || !slots.length) {
      setValidationMessage(isKo ? "일정명과 시간 블록을 확인해 주세요." : "Check the title and time blocks.");
      return;
    }
    const scheduleId = scheduleDraft.scheduleId ?? makeId("schedule");
    const base = labEntries.filter((entry) => entry.scheduleId !== scheduleId);
    const rebuilt: Entry[] = slots.map((slot) => ({
      id: slot.entryId ?? makeId("slot"),
      scheduleId,
      courseTitle: title,
      courseCode: scheduleDraft.courseCode.trim() || undefined,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      kind: scheduleDraft.kind,
      location: scheduleDraft.location.trim() || undefined,
      notes: scheduleDraft.notes.trim() || undefined,
    }));
    persistLabEntries([...base, ...rebuilt]);
    setSelectedScheduleId(scheduleId);
    setEditorMode("idle");
    setScheduleDraft(null);
  };

  const docRow = (document: DocumentRecord) => {
    return (
      <CompactDocumentRow
        key={document.id}
        document={document}
        className="lab-document-row"
        meta={
          <>
            <span>{isKo ? "최종 수정" : "Updated"}</span>
            <strong>{document.updatedOn}</strong>
          </>
        }
        onOpen={() => void previewDoc(document)}
        actions={
          <>
            <button
              type="button"
              className="document-icon-btn"
              title={isKo ? "미리보기" : "Preview"}
              onClick={() => void previewDoc(document)}
            >
              <Eye size={15} />
            </button>
            <button
              type="button"
              className="document-icon-btn"
              title={isKo ? "다운로드" : "Download"}
              onClick={() => void downloadDoc(document)}
            >
              <Download size={15} />
            </button>
            {canEditDocumentSection ? (
              <>
                <button
                  type="button"
                  className="document-icon-btn"
                  title={isKo ? "파일 교체" : "Replace"}
                  onClick={() => requestReplace(document.id)}
                >
                  <PencilLine size={15} />
                </button>
                <button
                  type="button"
                  className="document-icon-btn"
                  title={isKo ? "수정 중 표시" : "Mark editing"}
                  onClick={() => activeLab && toggleLock(activeLab.id, "document", document.title)}
                >
                  <LockKeyhole size={15} />
                </button>
                <button
                  type="button"
                  className="document-icon-btn"
                  title={isKo ? "공유 해제" : "Remove"}
                  onClick={() =>
                    activeLab &&
                    toggleSharedItem(activeLab.id, "sharedDocumentIds", document.id, document.title)
                  }
                >
                  <X size={15} />
                </button>
                <button
                  type="button"
                  className="document-icon-btn document-icon-btn-danger"
                  title={isKo ? "삭제" : "Delete"}
                  onClick={() => void deleteDoc(document)}
                >
                  <Trash2 size={15} />
                </button>
              </>
            ) : null}
          </>
        }
      />
    );
  };

  const importRow = (document: DocumentRecord) => {
    return (
      <CompactDocumentRow
        key={document.id}
        document={document}
        className="lab-document-row"
        meta={
          <>
            <span>{isKo ? "최종 수정" : "Updated"}</span>
            <strong>{document.updatedOn}</strong>
          </>
        }
        onOpen={() => void previewDoc(document)}
        actions={
          <>
            <button
              type="button"
              className="document-icon-btn"
              title={isKo ? "미리보기" : "Preview"}
              onClick={() => void previewDoc(document)}
            >
              <Eye size={15} />
            </button>
            <button
              type="button"
              className="document-icon-btn"
              title={isKo ? "가져오기" : "Import"}
              onClick={() =>
                activeLab &&
                toggleSharedItem(activeLab.id, "sharedDocumentIds", document.id, document.title)
              }
            >
              <Plus size={15} />
            </button>
          </>
        }
      />
    );
  };

  const renderImportFeedItem = (
    key: string,
    title: string,
    description: string,
    onImport: () => void,
  ) => (
    <article className="lab-feed-item lab-feed-item-action" key={key}>
      <div>
        <strong>{title}</strong>
        <p>{description || "—"}</p>
      </div>
      <button type="button" className="secondary-cta" onClick={onImport}>
        <Plus size={14} />
        {isKo ? "가져오기" : "Import"}
      </button>
    </article>
  );

  const renderActivityItem = (log: ActivityLog) => (
    <article className="lab-activity-item" key={log.id}>
      <div className="lab-activity-main">
        <div className="lab-activity-top">
          <span className="pill pill-gray">{getActivityBadgeLabel(locale, log.resourceType)}</span>
          <span className="lab-activity-time">{formatActivityTimestamp(locale, log.createdAt)}</span>
        </div>
        <strong>{describeActivityLog(locale, log)}</strong>
      </div>
    </article>
  );

  if (!labs.length) {
    return (
      <div className="lab-workspace">
        <section className="card lab-create-card">
          <div className="lab-create-layout">
            <div className="lab-create-intro">
              <div className="lab-create-copy">
                <span className="lab-section-eyebrow">{isKo ? "연구실 만들기" : "Create lab"}</span>
                <h3>{isKo ? "연구실 허브와 홈페이지의 기본 구조를 먼저 만듭니다." : "Set the base structure for the hub and future lab website."}</h3>
              </div>
            </div>
            <div className="lab-create-form">
              <div className="lab-form-section">
                <div className="lab-form-grid">
                  <label className="editor-field"><span>{isKo ? "연구실 이름" : "Lab name"}</span><input value={createForm.name} onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value, slug: current.slug || slugify(event.target.value) }))} /></label>
                  <label className="editor-field"><span>{isKo ? "공개 주소" : "Public slug"}</span><input value={createForm.slug} onChange={(event) => setCreateForm((current) => ({ ...current, slug: slugify(event.target.value) }))} /></label>
                  <label className="editor-field editor-field-full"><span>{isKo ? "연구실 소개" : "Summary"}</span><textarea rows={4} value={createForm.summary} onChange={(event) => setCreateForm((current) => ({ ...current, summary: event.target.value }))} /></label>
                  <label className="editor-field"><span>{isKo ? "홈페이지 제목" : "Homepage title"}</span><input value={createForm.homepageTitle} onChange={(event) => setCreateForm((current) => ({ ...current, homepageTitle: event.target.value }))} /></label>
                  <label className="editor-field"><span>{isKo ? "홈페이지 소개" : "Homepage description"}</span><textarea rows={3} value={createForm.homepageDescription} onChange={(event) => setCreateForm((current) => ({ ...current, homepageDescription: event.target.value }))} /></label>
                </div>
              </div>
              <div className="lab-form-actions">
                {message ? <p className="auth-error">{message}</p> : null}
                <button type="button" className="primary-cta lab-create-cta" onClick={createLabNow}><Plus size={16} />{isKo ? "연구실 생성" : "Create lab"}</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!activeLab) {
    return (
      <section className="card lab-empty-state">
        <Users size={18} />
        <p>{isKo ? "참여 중인 연구실이 없습니다." : "No joined lab yet."}</p>
      </section>
    );
  }

  const renderPersonCard = (member: DisplayMember) => {
    const isLinkedProfile = Boolean(member.accountId);
    const cardClassName = `lab-person-card${isLinkedProfile ? " lab-person-card-link" : ""}`;
    const displayInstitution = member.summary?.primaryInstitution;
    const displayRole = member.summary?.primaryRoleTitle ?? member.roleTitle;
    const secondaryLabel =
      member.englishName || displayInstitution || member.roleTitle;
    const cardBody = (
      <>
        <div className="lab-person-avatar-shell">
          <div className="lab-person-avatar">
            {(member.koreanName || member.englishName || "L").slice(0, 1)}
          </div>
        </div>
        <div className="lab-person-copy">
          <div className="lab-person-names">
            <strong>{member.koreanName}</strong>
            <span>{secondaryLabel}</span>
          </div>
          <div className="lab-person-meta">
            <span>{displayRole}</span>
            {displayInstitution ? <span>{displayInstitution}</span> : null}
            <span>{member.email}</span>
          </div>
        </div>
      </>
    );

    if (!isLinkedProfile) {
      return (
        <article className={cardClassName} key={member.id}>
          {cardBody}
        </article>
      );
    }

    return (
      <button
        type="button"
        className={cardClassName}
        key={member.id}
        onClick={() => openMemberProfile(member)}
      >
        {cardBody}
      </button>
    );
  };

  const labSettingsSection = isEditing && canManageProfile ? (
    <section className="card lab-settings-card">
      <div className="card-header">
        <div>
          <h3>{isKo ? "연구실 편집" : "Edit lab"}</h3>
          <p className="card-support-text">
            {isKo
              ? "연구실 이름, 공개 주소, 소개 문구를 한곳에서 정리합니다."
              : "Keep the lab name, public slug, and summary aligned in one place."}
          </p>
        </div>
      </div>
      <div className="lab-editor-stack">
        <div className="lab-form-grid">
          <label className="editor-field">
            <span>{isKo ? "연구실 이름" : "Lab name"}</span>
            <input
              value={labDraft.name}
              onChange={(event) => setLabDraft((current) => ({ ...current, name: event.target.value }))}
            />
          </label>
          <label className="editor-field">
            <span>{isKo ? "공개 주소" : "Public slug"}</span>
            <input
              value={labDraft.slug}
              onChange={(event) =>
                setLabDraft((current) => ({ ...current, slug: slugify(event.target.value) }))
              }
            />
          </label>
          <label className="editor-field editor-field-full">
            <span>{isKo ? "연구실 소개" : "Summary"}</span>
            <textarea
              rows={4}
              value={labDraft.summary}
              onChange={(event) => setLabDraft((current) => ({ ...current, summary: event.target.value }))}
            />
          </label>
          <label className="editor-field">
            <span>{isKo ? "홈페이지 제목" : "Homepage title"}</span>
            <input
              value={labDraft.homepageTitle}
              onChange={(event) =>
                setLabDraft((current) => ({ ...current, homepageTitle: event.target.value }))
              }
            />
          </label>
          <label className="editor-field">
            <span>{isKo ? "홈페이지 소개" : "Homepage description"}</span>
            <textarea
              rows={3}
              value={labDraft.homepageDescription}
              onChange={(event) =>
                setLabDraft((current) => ({
                  ...current,
                  homepageDescription: event.target.value,
                }))
              }
            />
          </label>
          <label className="editor-field">
            <span>{isKo ? "공개 상태" : "Visibility"}</span>
            {selectWrap(
              <select
                value={labDraft.publicPageEnabled ? "public" : "private"}
                onChange={(event) =>
                  setLabDraft((current) => ({
                    ...current,
                    publicPageEnabled: event.target.value === "public",
                  }))
                }
              >
                <option value="private">{isKo ? "비공개" : "Private"}</option>
                <option value="public">{isKo ? "공개" : "Public"}</option>
              </select>,
            )}
          </label>
          <div className="editor-field editor-field-full">
            <span>{isKo ? "공개 페이지 경로" : "Public page path"}</span>
            <div className="lab-public-route-note">
              <strong>
                {draftPublicLabHref ??
                  (isKo
                    ? "공개를 켜고 저장하면 외부에서 연구실 페이지를 열 수 있습니다."
                    : "Enable public mode and save to open a shareable lab page.")}
              </strong>
              <p className="profile-editor-note">
                {draftPublicLabHref
                  ? isKo
                    ? "저장 후 이 경로에서 연구실 소개, People, 공개 논문이 읽기 전용으로 열립니다."
                    : "After saving, this path opens the public lab summary, people, and shared papers in read-only mode."
                  : isKo
                    ? "저장 전까지 공개 연구실 페이지는 열리지 않습니다."
                    : "The lab page stays unavailable until you save."}
              </p>
            </div>
          </div>
        </div>
        <div className="lab-inline-actions">
          {message ? <p className="auth-error">{message}</p> : null}
          <div className="lab-inline-actions-end">
            {publicLabHref ? (
              <button
                type="button"
                className="secondary-cta"
                onClick={() => router.push(publicLabHref)}
              >
                <Eye size={16} />
                {isKo ? "공개 페이지 열기" : "Open public page"}
              </button>
            ) : null}
            <button type="button" className="primary-cta" onClick={saveLabNow}>
              <Save size={16} />
              {isKo ? "저장" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </section>
  ) : null;

  const peopleSection = (
    <div className="lab-section-grid">
      <section className="card document-library-section lab-homepage-section">
        <div className="card-header">
          <div>
            <h3>{isKo ? "연구실 구성" : "People roster"}</h3>
            <p className="card-support-text">
              {isKo
                ? "지도교수, 현재 멤버, 동문 순서로 연구실 구성을 빠르게 훑어볼 수 있습니다."
                : "Scan the lab structure in one pass with professor, current members, and alumni grouped separately."}
            </p>
          </div>
        </div>
        <div className="lab-publication-pill-row" aria-label={isKo ? "연구실 구성 요약" : "Lab roster summary"}>
          <span className="pill pill-gray">
            {isKo ? `지도교수 ${professorRoster.length}` : `Professor ${professorRoster.length}`}
          </span>
          <span className="pill pill-gray">
            {isKo ? `멤버 ${memberRoster.length}` : `Members ${memberRoster.length}`}
          </span>
          <span className="pill pill-gray">
            {isKo ? `동문 ${alumniRoster.length}` : `Alumni ${alumniRoster.length}`}
          </span>
        </div>
        <div className="lab-people-stack">
          <div className="lab-people-group">
            <div className="lab-people-group-head">
              <div className="lab-people-group-title">
                <h4>{isKo ? "지도교수" : "Professor"}</h4>
                <p className="card-support-text">
                  {isKo ? "연구실을 대표하는 책임 연구자입니다." : "Lead investigator for this private lab workspace."}
                </p>
              </div>
              <span className="pill pill-gray">{professorRoster.length}</span>
            </div>
            <div className="lab-people-grid">
              {professorRoster.length ? (
                professorRoster.map(renderPersonCard)
              ) : (
                <div className="lab-empty-card">
                  {isKo ? "대표 연구자 정보가 아직 없습니다." : "No lead profile listed yet."}
                </div>
              )}
            </div>
          </div>
          <div className="lab-people-group">
            <div className="lab-people-group-head">
              <div className="lab-people-group-title">
                <h4>{isKo ? "현재 멤버" : "Current members"}</h4>
                <p className="card-support-text">
                  {isKo ? "현재 함께 일하는 연구실 구성원입니다." : "Researchers currently active in this lab."}
                </p>
              </div>
              <span className="pill pill-gray">{memberRoster.length}</span>
            </div>
            <div className="lab-people-grid">
              {memberRoster.length ? (
                memberRoster.map(renderPersonCard)
              ) : (
                <div className="lab-empty-card">
                  {isKo ? "표시할 멤버가 아직 없습니다." : "No members to display yet."}
                </div>
              )}
            </div>
          </div>
          <div className="lab-people-group">
            <div className="lab-people-group-head">
              <div className="lab-people-group-title">
                <h4>{isKo ? "동문" : "Alumni"}</h4>
                <p className="card-support-text">
                  {isKo ? "연구실 이력을 남겨두는 졸업 및 이전 멤버입니다." : "Former members retained for lab history and reference."}
                </p>
              </div>
              <span className="pill pill-gray">{alumniRoster.length}</span>
            </div>
            <div className="lab-people-grid">
              {alumniRoster.length ? (
                alumniRoster.map(renderPersonCard)
              ) : (
                <div className="lab-empty-card">
                  {isKo ? "등록된 동문이 아직 없습니다." : "No alumni listed yet."}
                </div>
              )}
            </div>
          </div>
        </div>
        </section>
        <section className="card document-library-section lab-homepage-section">
          <div className="card-header">
            <div>
              <h3>{isKo ? "최근 활동" : "Recent activity"}</h3>
              <p className="card-support-text">
                {isKo
                  ? "초대, 멤버 정리, 문서 공유, 편집 상태 변경 같은 협업 기록을 시간순으로 확인합니다."
                  : "Review invites, member updates, shared resources, and edit-state changes in one place."}
              </p>
            </div>
          </div>
          <div className="lab-activity-list">
            {recentActivityLogs.length ? (
              recentActivityLogs.map(renderActivityItem)
            ) : (
              <div className="lab-empty-card">
                {isKo ? "아직 기록된 활동이 없습니다." : "No activity has been recorded yet."}
              </div>
            )}
          </div>
        </section>
        {canEditPeopleSection ? (
          <section className="card document-library-section lab-homepage-section">
          <div className="card-header">
            <div>
              <h3>{isKo ? "멤버 관리" : "Member management"}</h3>
              <p className="card-support-text">
                {isKo
                  ? "초대, 역할명 수정, 공개 순서 변경은 편집 모드에서만 엽니다."
                  : "Invites, role labels, and public display order open only in edit mode."}
              </p>
            </div>
          </div>
          <div className="lab-editor-stack">
            <div className="lab-form-grid">
              <label className="editor-field">
                <span>{isKo ? "메인 이메일" : "Primary email"}</span>
                <input
                  value={inviteForm.email}
                  onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))}
                />
              </label>
              <label className="editor-field">
                <span>{isKo ? "국가연구자번호" : "National researcher ID"}</span>
                <input
                  value={inviteForm.nationalResearcherNumber}
                  onChange={(event) =>
                    setInviteForm((current) => ({
                      ...current,
                      nationalResearcherNumber: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="editor-field">
                <span>{isKo ? "역할명" : "Role title"}</span>
                <input
                  value={inviteForm.roleTitle}
                  onChange={(event) => setInviteForm((current) => ({ ...current, roleTitle: event.target.value }))}
                />
              </label>
            </div>
            <div className="lab-inline-actions">
              {message ? <p className="auth-error">{message}</p> : null}
              <button type="button" className="primary-cta" onClick={inviteNow}>
                <MailPlus size={16} />
                {isKo ? "초대 만들기" : "Create invite"}
              </button>
            </div>
            <div className="lab-member-admin-list">
              {orderedLabMembers.map((member, index) => (
                <article className="lab-member-admin-row" key={member.id}>
                  <div className="lab-member-admin-copy">
                    <strong>{member.koreanName}</strong>
                    <p>
                      {member.email} / {member.roleTitle}
                    </p>
                  </div>
                  <div className="lab-member-admin-controls">
                    <label className="editor-field">
                      <span>{isKo ? "역할명" : "Role title"}</span>
                      <input
                        value={member.roleTitle}
                        disabled={!currentMember?.canManageMembers}
                        onChange={(event) =>
                          updateMember(activeLab.id, member.id, {
                            roleTitle: event.target.value,
                          })
                        }
                      />
                    </label>
                    <div className="lab-member-admin-order">
                      <span>{isKo ? `순서 ${index + 1}` : `Order ${index + 1}`}</span>
                      <div className="lab-member-admin-order-buttons">
                        <button
                          type="button"
                          className="secondary-cta lab-member-order-btn"
                          disabled={!currentMember?.canManageMembers || index === 0}
                          onClick={() => void moveMemberOrder(member.id, -1)}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          className="secondary-cta lab-member-order-btn"
                          disabled={
                            !currentMember?.canManageMembers || index === orderedLabMembers.length - 1
                          }
                          onClick={() => void moveMemberOrder(member.id, 1)}
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {activeLab.invites.length ? (
              <div className="lab-invite-list">
                {activeLab.invites.map((invite) => (
                  <article className="lab-invite-item" key={invite.id}>
                    <div>
                      <strong>{invite.email}</strong>
                      <p>
                        {invite.roleTitle} / {invite.status}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="secondary-cta"
                      onClick={async () => {
                        const url = getInviteLink(activeLab, invite.token, locale);
                        await navigator.clipboard.writeText(url);
                      }}
                    >
                      <Copy size={15} />
                      {isKo ? "초대 링크 복사" : "Copy invite link"}
                    </button>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );

  const researchSection = (
    <div className="lab-section-grid lab-homepage-columns">
      <section className="card document-library-section lab-homepage-section">
        <div className="card-header">
          <div>
            <h3>Research</h3>
            <p className="card-support-text">
              {isKo
                ? "진행 중인 연구를 상단에 두고, 종료된 연구는 아래에 배치해 연구 흐름을 시간순으로 정리합니다."
                : "Keep ongoing research at the top, then place completed work below in chronological order."}
            </p>
          </div>
          {canEditPeopleSection ? (
            <button type="button" className="primary-cta" onClick={startCreateResearchProject}>
              <Plus size={15} />
              {isKo ? "연구 추가" : "Add project"}
            </button>
          ) : null}
        </div>
        <div className="lab-publication-list lab-research-list">
          {orderedResearchProjects.length ? (
            orderedResearchProjects.map((project) => (
              <article className="lab-publication-row lab-research-row" key={project.id}>
                <div className="lab-research-period">
                  <span className={`pill ${project.status === "ongoing" ? "pill-green" : "pill-gray"}`}>
                    {project.status === "ongoing"
                      ? isKo
                        ? "진행중"
                        : "Ongoing"
                      : isKo
                        ? "종료"
                        : "Completed"}
                  </span>
                  <strong>
                    {formatResearchPeriod(locale, project.startDate, project.endDate, project.status)}
                  </strong>
                </div>
                <div className="lab-publication-main">
                  <div className="lab-publication-head">
                    <strong>{project.title}</strong>
                    <div className="lab-publication-pill-row">
                      <span className={`pill ${project.publicVisible ? "pill-blue" : "pill-gray"}`}>
                        {project.publicVisible
                          ? isKo
                            ? "공개"
                            : "Public"
                          : isKo
                            ? "비공개"
                            : "Private"}
                      </span>
                    </div>
                  </div>
                  {project.summary ? <p className="card-support-text">{project.summary}</p> : null}
                  <div className="lab-publication-meta">
                    <span>
                      {isKo ? "시작" : "Start"}: {project.startDate}
                    </span>
                    <span>
                      {isKo ? "종료" : "End"}: {project.endDate ?? (isKo ? "현재" : "Present")}
                    </span>
                    <span>{isKo ? "과제명" : "Program"}: {project.program}</span>
                    <span>{isKo ? "사업/출처" : "Sponsor"}: {project.sponsor}</span>
                  </div>
          {canEditResearchSection ? (
                    <div className="lab-research-actions">
                      <button
                        type="button"
                        className="secondary-cta"
                        onClick={() => startEditResearchProject(project)}
                      >
                        <PencilLine size={14} />
                        {isKo ? "수정" : "Edit"}
                      </button>
                      <button
                        type="button"
                        className="secondary-cta"
                        onClick={() => void removeResearchProject(project.id)}
                      >
                        <Trash2 size={14} />
                        {isKo ? "삭제" : "Delete"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <div className="lab-empty-card">
              {isKo
                ? "아직 연구 프로젝트가 없습니다. 진행 중인 연구와 종료된 연구를 시간순으로 쌓아두세요."
                : "No research projects yet. Keep active and completed work here in time order."}
            </div>
          )}
        </div>
      </section>
      <section className="card document-library-section lab-homepage-section lab-homepage-section-side">
        <div className="card-header">
          <div>
            <h3>
              {researchDraft
                ? researchEditorMode === "edit"
                  ? isKo
                    ? "연구 수정"
                    : "Edit project"
                  : isKo
                    ? "연구 추가"
                    : "Add project"
                : isKo
                  ? "연구 작업공간"
                  : "Research workspace"}
            </h3>
            <p className="card-support-text">
              {researchDraft
                ? isKo
                  ? "공개 페이지에 나갈 연구 제목, 기간, 과제명, 사업/출처를 한 번에 정리합니다."
                  : "Keep the title, timeline, program, and sponsor aligned before publishing."
                : isKo
                  ? "진행 중 연구를 위에 두고, 공개 여부도 프로젝트별로 정리합니다."
                  : "Keep active work first and control public visibility per project."}
            </p>
          </div>
        </div>
        {researchDraft ? (
          <div className="lab-editor-stack">
            <div className="lab-form-grid">
              <label className="editor-field editor-field-full">
                <span>{isKo ? "연구 제목" : "Project title"}</span>
                <input
                  value={researchDraft.title}
                  onChange={(event) =>
                    setResearchDraft((current) =>
                      current ? { ...current, title: event.target.value } : current,
                    )
                  }
                />
              </label>
              <label className="editor-field editor-field-full">
                <span>{isKo ? "연구 설명" : "Summary"}</span>
                <textarea
                  rows={4}
                  value={researchDraft.summary}
                  onChange={(event) =>
                    setResearchDraft((current) =>
                      current ? { ...current, summary: event.target.value } : current,
                    )
                  }
                />
              </label>
              <label className="editor-field">
                <span>{isKo ? "진행 상태" : "Status"}</span>
                {selectWrap(
                  <select
                    value={researchDraft.status}
                    onChange={(event) =>
                      setResearchDraft((current) =>
                        current
                          ? {
                              ...current,
                              status: event.target.value as LabResearchProject["status"],
                              endDate:
                                event.target.value === "ongoing" ? "" : current.endDate,
                            }
                          : current,
                      )
                    }
                  >
                    {labResearchProjectStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status === "ongoing"
                          ? isKo
                            ? "진행중"
                            : "Ongoing"
                          : isKo
                            ? "종료"
                            : "Completed"}
                      </option>
                    ))}
                  </select>,
                )}
              </label>
              <label className="editor-field">
                <span>{isKo ? "공개 여부" : "Public visibility"}</span>
                {selectWrap(
                  <select
                    value={researchDraft.publicVisible ? "public" : "private"}
                    onChange={(event) =>
                      setResearchDraft((current) =>
                        current
                          ? { ...current, publicVisible: event.target.value === "public" }
                          : current,
                      )
                    }
                  >
                    <option value="public">{isKo ? "공개" : "Public"}</option>
                    <option value="private">{isKo ? "비공개" : "Private"}</option>
                  </select>,
                )}
              </label>
              <label className="editor-field">
                <span>{isKo ? "시작일" : "Start date"}</span>
                <input
                  type="date"
                  value={researchDraft.startDate}
                  onChange={(event) =>
                    setResearchDraft((current) =>
                      current ? { ...current, startDate: event.target.value } : current,
                    )
                  }
                />
              </label>
              <label className="editor-field">
                <span>{isKo ? "종료일" : "End date"}</span>
                <input
                  type="date"
                  value={researchDraft.endDate}
                  disabled={researchDraft.status === "ongoing"}
                  onChange={(event) =>
                    setResearchDraft((current) =>
                      current ? { ...current, endDate: event.target.value } : current,
                    )
                  }
                />
              </label>
              <label className="editor-field">
                <span>{isKo ? "과제명" : "Program"}</span>
                <input
                  value={researchDraft.program}
                  onChange={(event) =>
                    setResearchDraft((current) =>
                      current ? { ...current, program: event.target.value } : current,
                    )
                  }
                />
              </label>
              <label className="editor-field">
                <span>{isKo ? "사업/출처" : "Sponsor"}</span>
                <input
                  value={researchDraft.sponsor}
                  onChange={(event) =>
                    setResearchDraft((current) =>
                      current ? { ...current, sponsor: event.target.value } : current,
                    )
                  }
                />
              </label>
            </div>
            {validationMessage ? <p className="planner-validation-message">{validationMessage}</p> : null}
            <div className="lab-inline-actions">
              {message ? <p className="auth-error">{message}</p> : null}
              <div className="lab-inline-actions-end">
                <button
                  type="button"
                  className="secondary-cta"
                  onClick={() => {
                    setResearchEditorMode("idle");
                    setResearchDraft(null);
                    setValidationMessage("");
                  }}
                >
                  <X size={14} />
                  {isKo ? "닫기" : "Close"}
                </button>
                <button type="button" className="primary-cta" onClick={() => void saveResearchProject()}>
                  <Save size={15} />
                  {isKo ? "저장" : "Save"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="lab-note-body">
            <strong>{activeLab.homepageTitle ?? activeLab.name}</strong>
            <div className="lab-note-summary-row">
              <span className="lab-note-summary-chip">
                {isKo ? `진행중 ${ongoingResearchCount}` : `${ongoingResearchCount} ongoing`}
              </span>
              <span className="lab-note-summary-chip">
                {isKo ? `종료 ${completedResearchCount}` : `${completedResearchCount} completed`}
              </span>
              <span className="lab-note-summary-chip">
                {isKo ? `공개 ${publicResearchCount}` : `${publicResearchCount} public`}
              </span>
            </div>
            {canEditResearchSection ? (
              <button type="button" className="primary-cta" onClick={startCreateResearchProject}>
                <Plus size={15} />
                {isKo ? "연구 추가" : "Add project"}
              </button>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
  const documentsSection = (
    <div className="lab-section-grid">
      <section className="card document-library-section lab-homepage-section">
        <div className="card-header">
          <div>
            <h3>{isKo ? "공유 문서함" : "Shared documents"}</h3>
            <p className="card-support-text">{isKo ? "내 공간과 같은 문법으로 미리보기, 다운로드, 교체, 삭제를 다룹니다." : "Use the same preview, download, replace, and delete grammar as the personal repository."}</p>
          </div>
        </div>
        <div className="lab-resource-stack">{sharedDocuments.length ? sharedDocuments.map((document) => docRow(document)) : <div className="lab-empty-card">{isKo ? "공유된 문서가 아직 없습니다." : "No shared documents yet."}</div>}</div>
      </section>
            {canEditResearchSection ? (
        <DocumentIntakePanel
          title={isKo ? "문서 추가" : "Add documents"}
          description={isKo ? "내 공간 문서함과 같은 드롭존과 대기열로 공유 문서 업로드를 정리합니다." : "Use the same drop zone and queue pattern as the personal repository before saving to the shared lab library."}
          selectLabel={isKo ? "파일 선택" : "Choose files"}
          dropTitle={isKo ? "파일을 끌어놓거나 선택해서 추가" : "Drop files here or choose them"}
          dropDescription={isKo ? "먼저 대기열에 담은 뒤 저장하면 연구실 공유 문서함으로 반영됩니다." : "Files enter the queue first, then become shared lab documents when saved."}
          inputRef={sharedUploadRef}
          accept={accept}
          isDragActive={isSharedDragActive}
          onInputChange={handleSharedFileInput}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsSharedDragActive(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsSharedDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsSharedDragActive(false);
          }}
          onDrop={handleSharedDrop}
          className="lab-document-intake-card"
        >
          <div className="document-intake-section">
            <div className="document-section-header">
              <div>
                <h3>{isKo ? "업로드 대기열" : "Upload queue"}</h3>
                <p className="page-subtitle">{isKo ? "저장 전 공유 문서로 들어갈 파일입니다." : "These files will become shared documents when saved."}</p>
              </div>

              {sharedUploadDrafts.length > 0 ? (
                <div className="document-section-actions">
                  <button type="button" className="secondary-cta" onClick={() => setSharedUploadDrafts([])}>
                    <X size={16} />
                    {isKo ? "비우기" : "Clear"}
                  </button>
                  <button type="button" className="primary-cta" onClick={() => void saveAllSharedDrafts()}>
                    <FolderArchive size={16} />
                    {isKo ? "모두 저장" : "Save all"}
                  </button>
                </div>
              ) : null}
            </div>

            {sharedUploadDrafts.length ? (
              <div className="document-staging-list">
                {sharedUploadDrafts.map((draft) => (
                  <article className="document-staging-row" key={draft.id}>
                    <div className="document-staging-main">
                      <strong>{draft.file.name}</strong>
                      <span>
                        {getCategoryLabel(locale, draft.documentCategory)} / {getTypeLabel(locale, draft.documentType)} / {formatFileSize(draft.file.size)}
                      </span>
                    </div>
                    <div className="document-staging-actions">
                      <button type="button" className="secondary-cta" onClick={() => void saveSharedDraft(draft.id)}>
                        <Save size={14} />
                        {isKo ? "저장" : "Save"}
                      </button>
                      <button type="button" className="secondary-cta" onClick={() => removeSharedDraft(draft.id)}>
                        <Trash2 size={14} />
                        {isKo ? "제외" : "Remove"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="lab-empty-card">{isKo ? "대기 중인 파일이 없습니다." : "There are no files waiting to be saved."}</div>
            )}
          </div>

          <div className="document-intake-section">
            <div className="document-section-header">
              <div>
                <h3>{isKo ? "내 공간에서 가져오기" : "Import from personal documents"}</h3>
                <p className="page-subtitle">{isKo ? "아직 공유되지 않은 개인 문서를 같은 행 형식으로 가져옵니다." : "Bring in personal documents that are not shared yet using the same compact row pattern."}</p>
              </div>
            </div>

            {availableDocuments.length ? (
              <div className="document-line-list">
                {availableDocuments.map((document) => importRow(document))}
              </div>
            ) : (
              <div className="lab-empty-card">{isKo ? "가져올 개인 문서가 없습니다." : "No personal documents left to import."}</div>
            )}
          </div>
        </DocumentIntakePanel>
      ) : (
        <section className="card document-library-section lab-homepage-section">
          <div className="card-header">
            <div>
              <h3>{isKo ? "편집 상태" : "Edit status"}</h3>
              <p className="card-support-text">{isKo ? "수정 중 표시가 켜진 항목을 확인합니다." : "See which items are marked as editing."}</p>
            </div>
          </div>
          <div className="lab-lock-list">{activeLocks.length ? activeLocks.map((lock) => <article className="lab-lock-item" key={lock.id}><div><strong>{lock.resourceTitle}</strong><p>{lock.resourceType} / {lock.holderName}</p></div><span className="pill pill-amber">{isKo ? "수정 중" : "Editing"}</span></article>) : <div className="lab-empty-card">{isKo ? "현재 수정 중인 항목이 없습니다." : "No active edit locks."}</div>}</div>
        </section>
      )}
    </div>
  );

  const papersSection = (
    <div className="lab-section-grid lab-homepage-columns">
      <section className="card document-library-section lab-homepage-section">
        <div className="card-header">
          <div>
            <h3>{isKo ? "논문" : "Papers"}</h3>
            <p className="card-support-text">
              {isKo
                ? "프로필 양식과 비슷하게 연구실 논문을 관리합니다."
                : "Manage lab papers with the same structure used in the profile."}
            </p>
          </div>
        </div>
        <div className="lab-publication-list">
          {sharedPublications.length ? (
            sharedPublications.map((publication) => (
              <article className="lab-publication-row" key={publication.id}>
                <div className="lab-publication-main">
                  <div className="lab-publication-head">
                    <strong>{publication.title}</strong>
                    <div className="lab-publication-pill-row">
                      {publication.journalClass ? (
                        <span className="pill pill-gray">{publication.journalClass}</span>
                      ) : null}
                      {publication.authorRole ? (
                        <span className="pill pill-blue">{publication.authorRole}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="lab-publication-meta">
                    <span>{publication.journalName || "—"}</span>
                    <span>{publication.publisher || "—"}</span>
                    <span>{publication.publishedOn || "—"}</span>
                    <span>{publication.participants || "—"}</span>
                  </div>
                </div>
       {canEditDocumentSection ? (
                  <div className="lab-resource-actions">
                    <button
                      type="button"
                      className="document-icon-btn"
                      onClick={() => activeLab && toggleLock(activeLab.id, "paper", publication.title)}
                      title={isKo ? "수정 중 표시" : "Mark editing"}
                    >
                      <LockKeyhole size={15} />
                    </button>
                    <button
                      type="button"
                      className="document-icon-btn"
                      onClick={() =>
                        activeLab &&
                        toggleSharedItem(activeLab.id, "sharedPaperIds", publication.id, publication.title)
                      }
                      title={isKo ? "공유 해제" : "Remove"}
                    >
                      <X size={15} />
                    </button>
                    <button
                      type="button"
                      className="document-icon-btn document-icon-btn-danger"
                      onClick={() => deletePublication(publication.id)}
                      title={isKo ? "삭제" : "Delete"}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <div className="lab-empty-card">{isKo ? "등록된 논문이 없습니다." : "No papers yet."}</div>
          )}
        </div>
      </section>
      <section className="card document-library-section lab-homepage-section lab-homepage-section-side">
        <div className="card-header">
          <div>
            <h3>{canEditDocumentSection ? (isKo ? "논문 추가" : "Add paper") : (isKo ? "공유 자산" : "Shared assets")}</h3>
            <p className="card-support-text">
              {canEditDocumentSection
                ? isKo
                  ? "직접 추가하거나 내 공간의 논문을 가져올 수 있습니다."
                  : "Add directly or import from the personal profile."
                : isKo
                  ? "논문 탭과 같이 움직이는 공유 문서 흐름을 함께 확인합니다."
                  : "Review the shared document flow that moves alongside the lab papers."}
            </p>
          </div>
        </div>
        {canEditDocumentSection ? (
          <div className="lab-editor-stack">
            <div className="lab-form-grid">
              <label className="editor-field editor-field-full">
                <span>{isKo ? "논문명" : "Paper title"}</span>
                <input
                  value={publicationDraft.title}
                  onChange={(event) =>
                    setPublicationDraft((current) => ({ ...current, title: event.target.value }))
                  }
                />
              </label>
              <label className="editor-field">
                <span>{isKo ? "게재년월" : "Published"}</span>
                <input
                  value={publicationDraft.publishedOn}
                  onChange={(event) =>
                    setPublicationDraft((current) => ({
                      ...current,
                      publishedOn: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="editor-field">
                <span>{isKo ? "저자 역할" : "Author role"}</span>
                <select
                  value={publicationDraft.authorRole}
                  onChange={(event) =>
                    setPublicationDraft((current) => ({ ...current, authorRole: event.target.value }))
                  }
                >
                  <option value="">{isKo ? "저자 역할 선택" : "Choose role"}</option>
                  {authorRoles[locale].map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <label className="editor-field">
                <span>{isKo ? "학술지 구분" : "Journal class"}</span>
                <select
                  value={publicationDraft.journalClass}
                  onChange={(event) =>
                    setPublicationDraft((current) => ({
                      ...current,
                      journalClass: event.target.value,
                    }))
                  }
                >
                  <option value="">—</option>
                  {journalClasses.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="editor-field">
                <span>{isKo ? "학술지명" : "Journal"}</span>
                <input
                  value={publicationDraft.journalName}
                  onChange={(event) =>
                    setPublicationDraft((current) => ({
                      ...current,
                      journalName: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="editor-field">
                <span>{isKo ? "발행처" : "Publisher"}</span>
                <input
                  value={publicationDraft.publisher}
                  onChange={(event) =>
                    setPublicationDraft((current) => ({
                      ...current,
                      publisher: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="editor-field editor-field-full">
                <span>{isKo ? "참여자" : "Participants"}</span>
                <input
                  value={publicationDraft.participants}
                  onChange={(event) =>
                    setPublicationDraft((current) => ({
                      ...current,
                      participants: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <button type="button" className="primary-cta" onClick={addPublication}>
              <Save size={16} />
              {isKo ? "논문 저장" : "Save paper"}
            </button>
            <div className="lab-feed-list">
              {availablePublications.length ? (
                availablePublications.map((publication) =>
                  renderImportFeedItem(
                    publication.id,
                    publication.title,
                    `${publication.authorRole || publication.journalName || "—"} / ${publication.publishedOn || "—"}`,
                    () => {
                      if (!activeLab) return;
                      void toggleSharedItem(
                        activeLab.id,
                        "sharedPaperIds",
                        publication.id,
                        publication.title,
                      );
                    },
                  ),
                )
              ) : (
                <div className="lab-empty-card">
                  {isKo ? "가져올 개인 논문이 없습니다." : "No personal papers left to import."}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="lab-feed-list">
            {sharedDocuments.length ? (
              sharedDocuments.slice(0, 4).map((document) => (
                <article className="lab-feed-item" key={document.id}>
                  <div>
                    <strong>{document.title}</strong>
                    <p>{document.summary || document.originalFileName || "—"}</p>
                  </div>
                  <span>{document.updatedOn}</span>
                </article>
              ))
            ) : (
              <div className="lab-empty-card">
                {isKo ? "같이 보는 공유 문서가 아직 없습니다." : "No shared assets yet."}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );

  const timetableSection = (
    <div className="lab-section-grid">
      <section className="card document-library-section lab-homepage-section">
        <div className="card-header"><div><h3>{isKo ? "공동 시간표" : "Shared timetable"}</h3><p className="card-support-text">{isKo ? "개인 공간과 비슷한 주간 보드로 연구실 일정을 관리합니다." : "Manage lab schedules with the same weekly board used in the personal workspace."}</p></div>{canEditDocumentSection ? <button type="button" className="primary-cta" onClick={() => { setEditorMode("create"); setScheduleDraft(emptySchedule()); setValidationMessage(""); }}><Plus size={15} />{isKo ? "일정 추가" : "Add schedule"}</button> : null}</div>
        <div className="timetable-studio"><section className="timetable-board-card timetable-studio-board"><div className="timetable-board-shell"><div className="timetable-day-header-row"><div className="timetable-axis-spacer" />{days.map((day) => <div className="timetable-day-header" key={day}>{dayLabels[locale].short[day]}</div>)}</div><div className="timetable-board-body"><div className="timetable-time-axis" aria-hidden="true">{Array.from({ length: 15 }, (_, index) => 8 + index).map((hour) => <span className="timetable-time-label" key={hour} style={{ top: `${((hour - 8) / 14) * 100}%` }}>{String(hour).padStart(2, "0")}</span>)}</div><div className="timetable-day-columns">{days.map((day) => <div className="timetable-day-column" key={day}>{(entriesByDay.get(day) ?? []).map((entry) => { const start = Math.max(parseTime(entry.startTime), 8 * 60); const end = Math.min(parseTime(entry.endTime), 22 * 60); const top = ((start - 8 * 60) / (14 * 60)) * 100; const height = Math.max(((end - start) / (14 * 60)) * 100, 5); return <button type="button" key={entry.id} className={`planner-entry-block ${entry.scheduleId === selectedScheduleId ? "planner-entry-selected " : ""}${blockTone(entry.kind)}`} style={{ top: `${top}%`, height: `${height}%` }} onClick={() => { setSelectedScheduleId(entry.scheduleId); setEditorMode("idle"); setScheduleDraft(null); }}><span className="planner-entry-title">{entry.courseTitle}</span><span className="planner-entry-time">{entry.startTime} - {entry.endTime}</span>{entry.location ? <span className="planner-entry-location">{entry.location}</span> : null}</button>; })}</div>)}</div></div>{!labEntries.length ? <p className="timetable-board-empty">{isKo ? "공동 시간표가 비어 있습니다." : "The shared timetable is empty."}</p> : null}</div></section><aside className="timetable-side-panel"><section className="card timetable-side-section"><div className="card-header"><div><h3>{isKo ? "일정 묶음" : "Schedule groups"}</h3><p className="card-support-text">{isKo ? "같은 일정의 여러 블록을 하나로 묶어 보여줍니다." : "Repeated slots stay under one schedule group."}</p></div></div><div className="timetable-schedule-list">{groupedLab.length ? groupedLab.map((schedule) => <button type="button" key={schedule.scheduleId} className={`timetable-schedule-item${schedule.scheduleId === selectedScheduleId ? " timetable-schedule-item-active" : ""}`} onClick={() => { setSelectedScheduleId(schedule.scheduleId); setEditorMode("idle"); setScheduleDraft(null); }}><div className="timetable-schedule-item-top"><div><strong>{schedule.title}</strong><p>{schedule.courseCode || (isKo ? "코드 없음" : "No code")}</p></div><span className={`pill ${kindTone(schedule.kind)}`}>{kindLabels[locale][schedule.kind]}</span></div><div className="timetable-schedule-summary-list">{schedule.slots.map((slot) => <span className="timetable-schedule-summary-chip" key={slot.id}>{dayLabels[locale].short[slot.dayOfWeek]} {slot.startTime}-{slot.endTime}</span>)}</div></button>) : <p className="timetable-list-empty">{isKo ? "등록된 일정이 없습니다." : "No schedules yet."}</p>}</div></section><section className="card timetable-workspace-card">{scheduleDraft ? <><div className="card-header timetable-workspace-head"><div><h3>{editorMode === "edit" ? (isKo ? "일정 수정" : "Edit schedule") : (isKo ? "일정 추가" : "Add schedule")}</h3><p className="card-support-text">{isKo ? "같은 일정 아래 여러 시간 블록을 둘 수 있습니다." : "The same schedule can contain multiple time blocks."}</p></div><button type="button" className="secondary-cta" onClick={() => { setEditorMode("idle"); setScheduleDraft(null); }}><X size={14} />{isKo ? "닫기" : "Close"}</button></div><div className="timetable-workspace-body timetable-editor-panel"><div className="planner-form-grid"><label className="planner-field planner-field-span-2"><span className="planner-field-label">{isKo ? "일정명" : "Title"}</span><input className="planner-input" value={scheduleDraft.title} onChange={(event) => setScheduleDraft((current) => current ? { ...current, title: event.target.value } : current)} /></label><label className="planner-field"><span className="planner-field-label">{isKo ? "코드" : "Code"}</span><input className="planner-input" value={scheduleDraft.courseCode} onChange={(event) => setScheduleDraft((current) => current ? { ...current, courseCode: event.target.value } : current)} /></label><label className="planner-field"><span className="planner-field-label">{isKo ? "유형" : "Type"}</span>{selectWrap(<select className="planner-select" value={scheduleDraft.kind} onChange={(event) => setScheduleDraft((current) => current ? { ...current, kind: event.target.value as Kind } : current)}>{kinds.map((kind) => <option key={kind} value={kind}>{kindLabels[locale][kind]}</option>)}</select>)}</label><label className="planner-field planner-field-span-2"><span className="planner-field-label">{isKo ? "장소" : "Location"}</span><input className="planner-input" value={scheduleDraft.location} onChange={(event) => setScheduleDraft((current) => current ? { ...current, location: event.target.value } : current)} /></label></div><div className="timetable-slot-editor-section"><div className="timetable-slot-editor-header"><div><h4>{isKo ? "시간 블록" : "Time blocks"}</h4></div><button type="button" className="secondary-cta" onClick={() => setScheduleDraft((current) => current ? { ...current, slots: [...current.slots, { draftId: makeId("slot"), dayOfWeek: "monday", startTime: "09:00", endTime: "10:00" }] } : current)}><Plus size={14} />{isKo ? "블록 추가" : "Add block"}</button></div><div className="timetable-slot-editor-list">{scheduleDraft.slots.map((slot, index) => <div className="timetable-slot-editor-card" key={slot.draftId}><div className="timetable-slot-editor-card-head"><strong>{isKo ? `블록 ${index + 1}` : `Block ${index + 1}`}</strong>{scheduleDraft.slots.length > 1 ? <button type="button" className="secondary-cta timetable-slot-remove-btn" onClick={() => setScheduleDraft((current) => current ? { ...current, slots: current.slots.filter((item) => item.draftId !== slot.draftId) } : current)}><Trash2 size={14} />{isKo ? "삭제" : "Remove"}</button> : null}</div><div className="planner-form-grid planner-form-grid-compact"><label className="planner-field"><span className="planner-field-label">{isKo ? "요일" : "Day"}</span>{selectWrap(<select className="planner-select" value={slot.dayOfWeek} onChange={(event) => setScheduleDraft((current) => current ? { ...current, slots: current.slots.map((item) => item.draftId === slot.draftId ? { ...item, dayOfWeek: event.target.value as Day } : item) } : current)}>{days.map((day) => <option key={day} value={day}>{dayLabels[locale].full[day]}</option>)}</select>)}</label><label className="planner-field"><span className="planner-field-label">{isKo ? "시작" : "Start"}</span>{selectWrap(<select className="planner-select" value={slot.startTime} onChange={(event) => setScheduleDraft((current) => current ? { ...current, slots: current.slots.map((item) => item.draftId === slot.draftId ? { ...item, startTime: event.target.value } : item) } : current)}>{scheduleOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>)}</label><label className="planner-field"><span className="planner-field-label">{isKo ? "종료" : "End"}</span>{selectWrap(<select className="planner-select" value={slot.endTime} onChange={(event) => setScheduleDraft((current) => current ? { ...current, slots: current.slots.map((item) => item.draftId === slot.draftId ? { ...item, endTime: event.target.value } : item) } : current)}>{scheduleOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>)}</label></div></div>)}</div></div>{validationMessage ? <p className="planner-validation-message">{validationMessage}</p> : null}<div className="timetable-editor-actions"><button type="button" className="primary-cta" onClick={saveSchedule}><SquarePen size={15} />{isKo ? "저장" : "Save"}</button><button type="button" className="secondary-cta" onClick={() => { setEditorMode("idle"); setScheduleDraft(null); }}>{isKo ? "취소" : "Cancel"}</button></div></div></> : selectedSchedule ? <><div className="card-header timetable-workspace-head"><div><h3>{selectedSchedule.title}</h3><p className="card-support-text">{selectedSchedule.courseCode || (isKo ? "코드 없음" : "No code")}</p></div>{canEditDocumentSection ? <div className="timetable-workspace-actions"><button type="button" className="secondary-cta" onClick={() => { setEditorMode("edit"); setScheduleDraft({ scheduleId: selectedSchedule.scheduleId, title: selectedSchedule.title, courseCode: selectedSchedule.courseCode, kind: selectedSchedule.kind, location: selectedSchedule.location, notes: selectedSchedule.notes, slots: selectedSchedule.slots.map((slot) => ({ draftId: makeId("slot"), entryId: slot.id, dayOfWeek: slot.dayOfWeek, startTime: slot.startTime, endTime: slot.endTime })) }); }}><PencilLine size={14} />{isKo ? "수정" : "Edit"}</button><button type="button" className="secondary-cta" onClick={() => { persistLabEntries(labEntries.filter((entry) => entry.scheduleId !== selectedSchedule.scheduleId)); setSelectedScheduleId(null); }}><Trash2 size={14} />{isKo ? "삭제" : "Delete"}</button></div> : null}</div><div className="timetable-workspace-body"><div className="timetable-slot-summary-list">{selectedSchedule.slots.map((slot) => <div className="timetable-slot-summary-item" key={slot.id}><div className="timetable-slot-summary-main"><strong>{dayLabels[locale].full[slot.dayOfWeek]}</strong><span>{slot.startTime} - {slot.endTime}</span></div><div className="timetable-slot-summary-side"><span>{selectedSchedule.location || (isKo ? "장소 미정" : "Location not set")}</span></div></div>)}</div></div></> : <div className="timetable-workspace-empty"><h3>{isKo ? "공동 시간표" : "Shared timetable"}</h3><p>{isKo ? "일정을 선택하거나 편집 모드에서 새 일정을 추가하세요." : "Select a schedule or add one in edit mode."}</p>{canEditDocumentSection ? <button type="button" className="primary-cta" onClick={() => { setEditorMode("create"); setScheduleDraft(emptySchedule()); }}><Plus size={15} />{isKo ? "일정 추가" : "Add schedule"}</button> : null}</div>}</section></aside></div>
      </section>
      {canEditDocumentSection ? <section className="card document-library-section lab-homepage-section"><div className="card-header"><div><h3>{isKo ? "내 시간표에서 가져오기" : "Import from my timetable"}</h3><p className="card-support-text">{isKo ? "개인 공간 일정을 연구실 공동 시간표로 복사합니다." : "Copy schedules from the personal workspace into the lab timetable."}</p></div></div><div className="lab-feed-list">{importablePersonalSchedules.length ? importablePersonalSchedules.map((schedule) => renderImportFeedItem(schedule.scheduleId, schedule.title, schedule.slots.map((slot) => `${dayLabels[locale].short[slot.dayOfWeek]} ${slot.startTime}-${slot.endTime}`).join(" / "), () => persistLabEntries([...labEntries, ...schedule.slots]))) : <div className="lab-empty-card">{isKo ? "가져올 개인 일정이 없습니다." : "No personal schedules left to import."}</div>}</div></section> : null}
    </div>
  );

  const sectionContent = activeSection === "people" ? (
    peopleSection
  ) : activeSection === "research" ? (
    researchSection
  ) : activeSection === "papers" ? (
    papersSection
  ) : activeSection === "documents" ? (
    documentsSection
  ) : (
    timetableSection
  );
  const heroEditLabel = isKo ? "연구실 편집" : "Edit lab";
  const activeSectionLabel = sectionLabels[locale][activeSection];
  const activeSectionDescription = sectionDescriptions[locale][activeSection];

  return (
    <div className="lab-workspace">
      <div className="page-standard workspace-page-shell lab-hub-shell lab-homepage-shell">
        <section className="card document-intro-card document-intro-card-compact lab-hub-hero lab-hub-hero-refined lab-homepage-hero">
          <div className="lab-hub-hero-head">
            <div className="lab-hub-hero-copy">
              <h2>{activeLab.name}</h2>
              <p className="card-support-text">
                {isKo
                  ? "비공개 연구실 워크스페이스에서 구성원, 연구, 논문, 문서, 공동 시간표를 관리합니다."
                  : "Manage people, research, papers, documents, and the shared timetable from this private lab workspace."}
              </p>
            </div>
            <div className="lab-hero-actions">
              {publicLabHref ? (
                <button
                  type="button"
                  className="secondary-cta"
                  onClick={() => router.push(publicLabHref)}
                >
                  <Eye size={16} />
                  {isKo ? "공개 페이지 열기" : "Open public page"}
                </button>
              ) : null}
              {canEditCurrentSection ? (
                <button
                  type="button"
                  className={isEditing ? "secondary-cta" : "primary-cta"}
                  onClick={() => {
                    setIsEditing((current) => !current);
                    setMessage("");
                  }}
                >
                  <PencilLine size={16} />
                  {isEditing ? (isKo ? "편집 닫기" : "Close editor") : heroEditLabel}
                </button>
              ) : null}
            </div>
          </div>
        </section>
        <section className="card document-library-section lab-navigation-card lab-homepage-navigation">
          {labs.length > 1 ? (
            <div className="lab-navigation-head document-section-header">
              <div className="lab-switcher document-filter-row">
                {labs.map((lab) => (
                  <button
                    key={lab.id}
                    type="button"
                    className={`lab-switcher-chip document-filter-chip profile-homepage-nav-link${lab.id === activeLab.id ? " lab-switcher-chip-active document-filter-chip-active" : ""}`}
                    onClick={() => {
                      setActiveLabId(lab.id);
                      route(lab.slug, activeSection);
                    }}
                  >
                    {lab.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="lab-subnav document-filter-row profile-homepage-nav-row">
            {sections.map((section) => (
              <button
                key={section}
                type="button"
                className={`lab-subnav-btn document-filter-chip profile-homepage-nav-link${activeSection === section ? " lab-subnav-btn-active document-filter-chip-active" : ""}`}
                onClick={() => {
                  resetSectionState();
                  route(activeLab.slug, section);
                }}
              >
                {sectionLabels[locale][section]}
              </button>
            ))}
          </div>
          <p className="card-support-text">
            {isKo
              ? `현재 섹션: ${activeSectionLabel}. ${activeSectionDescription}`
              : `Current section: ${activeSectionLabel}. ${activeSectionDescription}`}
          </p>
        </section>
        {labSettingsSection}
        {sectionContent}
      </div>
      <input ref={replaceInputRef} type="file" accept={accept} className="document-file-input" onChange={replaceDoc} />
      {previewState ? <div className="document-preview-overlay" role="dialog" aria-modal="true"><div className="document-preview-modal document-preview-modal-wide card"><div className="card-header document-preview-header"><div><h3>{isKo ? "문서 미리보기" : "Document preview"}</h3><p className="card-support-text">{previewState.document.title}</p></div><button type="button" className="secondary-cta" onClick={closePreview}><X size={16} />{isKo ? "닫기" : "Close"}</button></div><div className="document-preview-layout"><div className="document-preview-surface">{previewState.mode === "iframe" && previewState.url ? <iframe title={previewState.document.title} src={previewState.url} className="document-preview-frame" /> : null}{previewState.mode === "text" ? <pre className="document-preview-text">{previewState.text}</pre> : null}{previewState.mode === "unavailable" ? <div className="document-preview-empty"><strong>{previewState.message}</strong></div> : null}</div><aside className="document-preview-sidebar"><div className="document-preview-info"><strong>{isKo ? "문서 정보" : "Document info"}</strong><dl className="document-preview-meta"><div><dt>{isKo ? "원본 파일" : "Source file"}</dt><dd>{previewState.document.originalFileName ?? "—"}</dd></div><div><dt>{isKo ? "분류" : "Category"}</dt><dd>{getCategoryLabel(locale, previewState.document.documentCategory)}</dd></div><div><dt>{isKo ? "세부 유형" : "Detailed type"}</dt><dd>{getTypeLabel(locale, previewState.document.documentType)}</dd></div><div><dt>{isKo ? "최근 수정" : "Updated"}</dt><dd>{previewState.document.updatedOn}</dd></div></dl></div><div className="document-preview-actions"><button type="button" className="secondary-cta document-action-btn" onClick={() => void downloadDoc(previewState.document)}><Download size={15} />{isKo ? "다운로드" : "Download"}</button></div></aside></div></div></div> : null}
    </div>
  );
}

