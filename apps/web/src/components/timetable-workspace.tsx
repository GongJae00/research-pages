"use client";

import type { AcademicTerm, DocumentRecord, TimetableEntry } from "@research-os/types";
import { timetableEntrySchema } from "@research-os/types";
import { BookOpenText, CalendarClock, Clock3, MapPin, PencilLine, Plus, SquarePen, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useAuth } from "@/components/auth-provider";
import { DocumentEvidencePicker } from "@/components/document-evidence-picker";
import {
  readFirstJsonFromStorage,
  writeJsonToStorage,
} from "@/lib/browser-json-store";
import { loadBrowserDocuments } from "@/lib/document-browser-store";
import { syncDocumentsForAccount } from "@/lib/document-server-store";
import type { Locale } from "@/lib/i18n";
import { buildScopedStorageKey, getActiveAccountId } from "@/lib/mock-auth-store";
import {
  replaceTimetableEntriesForTerm,
  syncTimetableEntriesForAccount,
} from "@/lib/timetable-server-store";

interface TimetableWorkspaceProps {
  locale: Locale;
  initialEntries: TimetableEntry[];
  initialTerm: Pick<AcademicTerm, "year" | "season">;
  initialDocuments: DocumentRecord[];
}

type DayOfWeek = TimetableEntry["dayOfWeek"];
type TimetableKind = TimetableEntry["kind"];
type TermOption = Pick<AcademicTerm, "year" | "season">;
type NormalizedEntry = TimetableEntry & { scheduleId: string };

interface ScheduleGroup {
  scheduleId: string;
  title: string;
  courseCode: string;
  kind: TimetableKind;
  location: string;
  notes: string;
  slots: NormalizedEntry[];
}

interface ScheduleSlotDraft {
  draftId: string;
  entryId?: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

interface ScheduleDraft {
  scheduleId?: string;
  title: string;
  courseCode: string;
  kind: TimetableKind;
  location: string;
  notes: string;
  slots: ScheduleSlotDraft[];
}

const timetableStorageBaseKey = "researchos:timetable-workspace:v4";
const boardStartHour = 8;
const boardEndHour = 22;
const seasonOrder: AcademicTerm["season"][] = ["spring", "summer", "fall", "winter"];
const sundayFirstDays: DayOfWeek[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const scheduleKinds: TimetableKind[] = ["class", "research", "meeting", "seminar", "office_hours", "teaching", "deadline", "other"];

const text = {
  ko: {
    boardTitle: "주간 시간표",
    boardSubtitle: "일요일부터 토요일까지 주간 흐름을 한 화면에서 관리합니다.",
    focusTitle: "일정 작업공간",
    focusSubtitle: "오른쪽에서 일정 묶음, 메모, 관련 문서를 이어서 관리합니다.",
    listTitle: "일정 묶음",
    listSubtitle: "같은 일정은 여러 블록이 있어도 하나의 일정으로 묶습니다.",
    emptyList: "이 학기에 등록된 일정이 아직 없습니다.",
    emptyFocus: "시간표 블록이나 일정 묶음을 눌러 작업공간을 열어보세요.",
    emptyTerm: "선택한 학기에 등록된 일정이 없습니다.",
    add: "일정 추가",
    edit: "일정 수정",
    delete: "일정 삭제",
    close: "편집 닫기",
    currentTerm: "현재 학기",
    term: "학기",
    range: "기간",
    schedules: "등록 일정",
    blocks: "시간 블록",
    title: "일정명",
    code: "코드",
    type: "유형",
    location: "장소",
    notes: "설명",
    related: "관련 문서",
    titlePlaceholder: "예: 대규모언어모델, 연구실 세미나",
    codePlaceholder: "예: CSE601",
    locationPlaceholder: "예: 7-103, 공학관 301, 온라인",
    notesPlaceholder: "준비물, 반복 메모, 과제 안내 등 이 일정에 대한 메모를 적습니다.",
    slotTitle: "시간 블록",
    slotSubtitle: "같은 일정 아래 요일과 시간대를 여러 개 둘 수 있습니다.",
    addSlot: "블록 추가",
    removeSlot: "블록 삭제",
    save: "저장",
    cancel: "취소",
    noNotes: "메모가 아직 없습니다.",
    noLocation: "장소 미정",
    noCode: "코드 없음",
    invalid: "일정명과 시간 블록을 확인해 주세요. 종료 시간은 시작 시간보다 뒤여야 합니다.",
    summaryTitle: "주간 배치",
    summarySubtitle: "이 일정은 아래 시간 블록으로 배치됩니다.",
    day: "요일",
    start: "시작",
    end: "종료",
    block: "블록",
  },
  en: {
    boardTitle: "Weekly timetable",
    boardSubtitle: "Manage the weekly flow from Sunday through Saturday in one view.",
    focusTitle: "Schedule workspace",
    focusSubtitle: "Manage each schedule group, notes, and related documents on the right.",
    listTitle: "Schedule groups",
    listSubtitle: "Repeated weekly slots stay under one schedule item.",
    emptyList: "There are no schedules in this term yet.",
    emptyFocus: "Select a timetable block or a schedule group to open its workspace.",
    emptyTerm: "There are no schedules in the selected term.",
    add: "Add schedule",
    edit: "Edit schedule",
    delete: "Delete schedule",
    close: "Close editor",
    currentTerm: "Current term",
    term: "Term",
    range: "Range",
    schedules: "Schedules",
    blocks: "Blocks",
    title: "Schedule title",
    code: "Code",
    type: "Type",
    location: "Location",
    notes: "Notes",
    related: "Related documents",
    titlePlaceholder: "Example: Large Language Models, Lab Seminar",
    codePlaceholder: "Example: CSE601",
    locationPlaceholder: "Example: Room 7-103, Engineering Hall 301, Online",
    notesPlaceholder: "Add prep notes, recurring reminders, or assignment context for this schedule.",
    slotTitle: "Time blocks",
    slotSubtitle: "You can attach multiple day and time blocks under the same schedule.",
    addSlot: "Add block",
    removeSlot: "Remove block",
    save: "Save",
    cancel: "Cancel",
    noNotes: "No notes yet.",
    noLocation: "Location not set",
    noCode: "No code",
    invalid: "Check the schedule title and time blocks. Each end time must be later than the start time.",
    summaryTitle: "Weekly placement",
    summarySubtitle: "This schedule appears in the week as follows.",
    day: "Day",
    start: "Start",
    end: "End",
    block: "Block",
  },
} as const;

const dayLabels = {
  ko: {
    short: { sunday: "일", monday: "월", tuesday: "화", wednesday: "수", thursday: "목", friday: "금", saturday: "토" },
    full: { sunday: "일요일", monday: "월요일", tuesday: "화요일", wednesday: "수요일", thursday: "목요일", friday: "금요일", saturday: "토요일" },
  },
  en: {
    short: { sunday: "Sun", monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat" },
    full: { sunday: "Sunday", monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday" },
  },
} as const;

const kindLabels = {
  ko: { class: "수업", research: "연구", meeting: "회의", seminar: "세미나", office_hours: "상담", teaching: "조교", deadline: "마감", other: "기타" },
  en: { class: "Class", research: "Research", meeting: "Meeting", seminar: "Seminar", office_hours: "Office hours", teaching: "Teaching", deadline: "Deadline", other: "Other" },
} as const;

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

function parseTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

function buildTimeOptions() {
  const items: string[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += 30) {
    const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
    const remain = (minutes % 60).toString().padStart(2, "0");
    items.push(`${hours}:${remain}`);
  }
  items.push("24:00");
  return items;
}

function getTermKey(term: TermOption) {
  return `${term.year}-${term.season}`;
}

function getCurrentTerm(date = new Date()): TermOption {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "numeric" }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value ?? "0");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "0");
  if (month >= 3 && month <= 6) return { year, season: "spring" };
  if (month >= 7 && month <= 8) return { year, season: "summer" };
  if (month >= 9 && month <= 12) return { year, season: "fall" };
  return { year, season: "winter" };
}

function buildTermOptions(startYear: number, endYear: number) {
  const items: TermOption[] = [];
  for (let year = startYear; year <= endYear; year += 1) {
    for (const season of seasonOrder) items.push({ year, season });
  }
  return items;
}

function getTermLabel(term: TermOption, locale: Locale) {
  const season = locale === "ko"
    ? { spring: "1학기", summer: "여름방학", fall: "2학기", winter: "겨울방학" }[term.season]
    : { spring: "Spring Semester", summer: "Summer Break", fall: "Fall Semester", winter: "Winter Break" }[term.season];
  return `${term.year} ${season}`;
}

function getTermRange(term: TermOption, locale: Locale) {
  return {
    spring: locale === "ko" ? "3월 - 6월" : "March - June",
    summer: locale === "ko" ? "7월 - 8월" : "July - August",
    fall: locale === "ko" ? "9월 - 12월" : "September - December",
    winter: locale === "ko" ? "1월 - 2월" : "January - February",
  }[term.season];
}

function getKindPillClass(kind: TimetableKind) {
  if (kind === "class") return "pill-amber";
  if (kind === "research") return "pill-green";
  if (kind === "meeting") return "pill-amber";
  if (kind === "seminar") return "pill-purple";
  if (kind === "teaching") return "pill-blue";
  if (kind === "deadline") return "pill-red";
  return "pill-gray";
}

function getBoardBlockClass(kind: TimetableKind) {
  if (kind === "class") return "planner-block-class";
  if (kind === "research") return "planner-block-research";
  if (kind === "meeting") return "planner-block-meeting";
  if (kind === "seminar") return "planner-block-seminar";
  if (kind === "office_hours") return "planner-block-office";
  if (kind === "teaching") return "planner-block-teaching";
  if (kind === "deadline") return "planner-block-deadline";
  return "planner-block-other";
}

function getLegacyScheduleId(entry: TimetableEntry, cache: Map<string, string>) {
  const key = [
    entry.courseTitle.trim().toLowerCase(),
    entry.courseCode?.trim().toLowerCase() ?? "",
    entry.kind,
    entry.location?.trim().toLowerCase() ?? "",
    entry.notes?.trim().toLowerCase() ?? "",
  ].join("::");

  if (!cache.has(key)) {
    let hash = 0;
    for (let index = 0; index < key.length; index += 1) {
      hash = (hash << 5) - hash + key.charCodeAt(index);
      hash |= 0;
    }
    cache.set(key, `schedule-${Math.abs(hash).toString(36)}`);
  }

  return cache.get(key) ?? `schedule-${entry.id}`;
}

function normalizeEntries(entries: TimetableEntry[]) {
  const cache = new Map<string, string>();
  return entries.map((entry) => ({
    ...entry,
    scheduleId: entry.scheduleId ?? getLegacyScheduleId(entry, cache),
  }));
}

function sortEntries(entries: NormalizedEntry[]) {
  return [...entries].sort((left, right) => {
    const dayGap = sundayFirstDays.indexOf(left.dayOfWeek) - sundayFirstDays.indexOf(right.dayOfWeek);
    if (dayGap !== 0) return dayGap;
    const timeGap = parseTime(left.startTime) - parseTime(right.startTime);
    if (timeGap !== 0) return timeGap;
    return left.courseTitle.localeCompare(right.courseTitle);
  });
}

function groupSchedules(entries: NormalizedEntry[]) {
  const grouped = new Map<string, ScheduleGroup>();
  for (const entry of sortEntries(entries)) {
    const found = grouped.get(entry.scheduleId);
    if (found) {
      found.slots.push(entry);
      continue;
    }
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
  return [...grouped.values()];
}

function buildEmptyDraft(): ScheduleDraft {
  return {
    title: "",
    courseCode: "",
    kind: "class",
    location: "",
    notes: "",
    slots: [{ draftId: createId("slot-draft"), dayOfWeek: "monday", startTime: "09:00", endTime: "10:00" }],
  };
}

function buildDraftFromSchedule(schedule: ScheduleGroup): ScheduleDraft {
  return {
    scheduleId: schedule.scheduleId,
    title: schedule.title,
    courseCode: schedule.courseCode,
    kind: schedule.kind,
    location: schedule.location,
    notes: schedule.notes,
    slots: schedule.slots.map((slot) => ({
      draftId: createId("slot-draft"),
      entryId: slot.id,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
    })),
  };
}

function loadStore(initialTermKey: string, initialEntries: TimetableEntry[]) {
  const fallbackEntries = getActiveAccountId() ? [] : sortEntries(normalizeEntries(initialEntries));
  const fallback = { [initialTermKey]: fallbackEntries } as Record<string, NormalizedEntry[]>;
  if (typeof window === "undefined") return fallback;
  try {
    const parsed = readFirstJsonFromStorage<Record<string, unknown>>(
      [buildScopedStorageKey(timetableStorageBaseKey), timetableStorageBaseKey],
      {},
    );
    if (!Object.keys(parsed).length) return fallback;
    const restored: Record<string, NormalizedEntry[]> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!Array.isArray(value)) continue;
      restored[key] = sortEntries(
        normalizeEntries(
          value
            .map((item) => timetableEntrySchema.safeParse(item))
            .filter((result) => result.success)
            .map((result) => result.data),
        ),
      );
    }
    if (!restored[initialTermKey]) restored[initialTermKey] = fallback[initialTermKey];
    return restored;
  } catch {
    return fallback;
  }
}

function SelectWrap({ children }: { children: ReactNode }) {
  return <div className="planner-select-wrap">{children}</div>;
}

export function TimetableWorkspace({ locale, initialEntries, initialTerm, initialDocuments }: TimetableWorkspaceProps) {
  const { currentAccount, backendStatus } = useAuth();
  const ui = text[locale];
  const timeOptions = useMemo(() => buildTimeOptions(), []);
  const currentTerm = getCurrentTerm();
  const termOptions = useMemo(() => buildTermOptions(2026, Math.max(2026, currentTerm.year, initialTerm.year)), [currentTerm.year, initialTerm.year]);
  const initialTermKey = getTermKey(initialTerm);
  const currentAccountId = currentAccount?.id ?? null;
  const storageKey = buildScopedStorageKey(timetableStorageBaseKey);
  const [entriesByTerm, setEntriesByTerm] = useState<Record<string, NormalizedEntry[]>>({ [initialTermKey]: sortEntries(normalizeEntries(initialEntries)) });
  const [activeTermKey, setActiveTermKey] = useState(initialTermKey);
  const [documents, setDocuments] = useState<DocumentRecord[]>(initialDocuments);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<"idle" | "create" | "edit">("idle");
  const [editorDraft, setEditorDraft] = useState<ScheduleDraft | null>(null);
  const [validationMessage, setValidationMessage] = useState("");
  const workspaceCardRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setEntriesByTerm(loadStore(initialTermKey, initialEntries));
  }, [initialEntries, initialTermKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const watchedKeys = new Set([storageKey, timetableStorageBaseKey]);
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && !watchedKeys.has(event.key)) {
        return;
      }

      setEntriesByTerm(loadStore(initialTermKey, initialEntries));
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [initialEntries, initialTermKey, storageKey]);

  useEffect(() => {
    setDocuments(loadBrowserDocuments(initialDocuments));
  }, [initialDocuments]);

  useEffect(() => {
    if (!currentAccountId) {
      return;
    }

    let cancelled = false;

    void syncDocumentsForAccount(currentAccountId)
      .then((serverDocuments) => {
        if (!cancelled && serverDocuments) {
          setDocuments(serverDocuments);
        }
      })
      .catch(() => {
        // Keep the local cache path alive when the server sync is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [currentAccountId]);

  useEffect(() => {
    if (!currentAccountId) {
      return;
    }

    let cancelled = false;

    void syncTimetableEntriesForAccount(currentAccountId)
      .then((serverEntriesByTerm) => {
        if (!cancelled && serverEntriesByTerm) {
          setEntriesByTerm(serverEntriesByTerm as Record<string, NormalizedEntry[]>);
        }
      })
      .catch(() => {
        // Keep the local cache path alive when the server sync is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [currentAccountId]);

  const activeTerm = termOptions.find((term) => getTermKey(term) === activeTermKey) ?? initialTerm;
  const activeEntries = useMemo(() => entriesByTerm[activeTermKey] ?? [], [activeTermKey, entriesByTerm]);
  const groupedSchedules = useMemo(() => groupSchedules(activeEntries), [activeEntries]);
  const selectedSchedule = groupedSchedules.find((schedule) => schedule.scheduleId === selectedScheduleId) ?? null;

  useEffect(() => {
    if (editorMode !== "idle") return;
    if (groupedSchedules.length === 0) {
      setSelectedScheduleId(null);
      return;
    }
    if (!selectedScheduleId || !groupedSchedules.some((schedule) => schedule.scheduleId === selectedScheduleId)) {
      setSelectedScheduleId(groupedSchedules[0]?.scheduleId ?? null);
    }
  }, [editorMode, groupedSchedules, selectedScheduleId]);

  useEffect(() => {
    if (editorMode === "idle") {
      return;
    }

    workspaceCardRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [editorMode]);

  const persistStore = (nextValue: Record<string, NormalizedEntry[]>) => {
    writeJsonToStorage(buildScopedStorageKey(timetableStorageBaseKey), nextValue);
    setEntriesByTerm(nextValue);
  };

  const saveActiveEntries = (nextEntries: NormalizedEntry[]) => {
    persistStore({ ...entriesByTerm, [activeTermKey]: sortEntries(nextEntries) });
  };

  const persistActiveEntries = async (nextEntries: NormalizedEntry[]) => {
    const sorted = sortEntries(nextEntries);

    if (backendStatus.currentMode === "supabase" && currentAccountId) {
      const serverEntriesByTerm = await replaceTimetableEntriesForTerm(
        currentAccountId,
        activeTermKey,
        sorted,
      );

      if (serverEntriesByTerm) {
        setEntriesByTerm(serverEntriesByTerm as Record<string, NormalizedEntry[]>);
        return;
      }
    }

    saveActiveEntries(sorted);
  };

  const openCreateEditor = () => {
    setEditorMode("create");
    setEditorDraft(buildEmptyDraft());
    setValidationMessage("");
  };

  const closeEditor = () => {
    setEditorMode("idle");
    setEditorDraft(null);
    setValidationMessage("");
  };

  const openEditEditor = (schedule: ScheduleGroup) => {
    setSelectedScheduleId(schedule.scheduleId);
    setEditorMode("edit");
    setEditorDraft(buildDraftFromSchedule(schedule));
    setValidationMessage("");
  };

  const updateDraftField = <K extends keyof ScheduleDraft>(key: K, value: ScheduleDraft[K]) => {
    setEditorDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const updateDraftSlot = (draftId: string, key: keyof ScheduleSlotDraft, value: ScheduleSlotDraft[keyof ScheduleSlotDraft]) => {
    setEditorDraft((current) =>
      current
        ? {
            ...current,
            slots: current.slots.map((slot) => (slot.draftId === draftId ? { ...slot, [key]: value } : slot)),
          }
        : current,
    );
  };

  const addDraftSlot = () => {
    setEditorDraft((current) =>
      current
        ? {
            ...current,
            slots: [...current.slots, { draftId: createId("slot-draft"), dayOfWeek: "monday", startTime: "09:00", endTime: "10:00" }],
          }
        : current,
    );
  };

  const removeDraftSlot = (draftId: string) => {
    setEditorDraft((current) =>
      current
        ? { ...current, slots: current.slots.filter((slot) => slot.draftId !== draftId) }
        : current,
    );
  };

  const saveDraft = async () => {
    if (!editorDraft) return;
    const title = editorDraft.title.trim();
    const validSlots = editorDraft.slots.filter((slot) => parseTime(slot.endTime) > parseTime(slot.startTime));

    if (!title || validSlots.length === 0) {
      setValidationMessage(ui.invalid);
      return;
    }

    const scheduleId = editorDraft.scheduleId ?? createId("schedule");
    const nextEntries = activeEntries.filter((entry) => entry.scheduleId !== scheduleId);
    const rebuiltEntries: NormalizedEntry[] = validSlots.map((slot) => ({
      id: slot.entryId ?? createId("slot"),
      scheduleId,
      courseTitle: title,
      courseCode: editorDraft.courseCode.trim() || undefined,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      kind: editorDraft.kind,
      location: editorDraft.location.trim() || undefined,
      notes: editorDraft.notes.trim() || undefined,
    }));

    try {
      await persistActiveEntries([...nextEntries, ...rebuiltEntries]);
      setSelectedScheduleId(scheduleId);
      closeEditor();
    } catch {
      setValidationMessage(
        locale === "ko" ? "시간표를 저장하지 못했습니다." : "Could not save the timetable.",
      );
    }
  };

  const deleteSchedule = async (scheduleId: string) => {
    try {
      await persistActiveEntries(activeEntries.filter((entry) => entry.scheduleId !== scheduleId));
      if (selectedScheduleId === scheduleId) setSelectedScheduleId(null);
      if (editorDraft?.scheduleId === scheduleId) closeEditor();
    } catch {
      setValidationMessage(
        locale === "ko" ? "시간표를 삭제하지 못했습니다." : "Could not delete the timetable.",
      );
    }
  };

  const entriesByDay = useMemo(() => {
    const lanes = new Map<DayOfWeek, NormalizedEntry[]>();
    for (const day of sundayFirstDays) lanes.set(day, []);
    for (const entry of activeEntries) {
      if (parseTime(entry.endTime) <= boardStartHour * 60 || parseTime(entry.startTime) >= boardEndHour * 60) continue;
      lanes.get(entry.dayOfWeek)?.push(entry);
    }
    return lanes;
  }, [activeEntries]);

  return (
    <div className="page-standard workspace-page-shell timetable-workspace">
      <div className="timetable-studio">
        <section className="card timetable-board-card timetable-studio-board">
          <div className="card-header timetable-board-top">
            <div className="timetable-board-copy">
              <h3>{ui.boardTitle}</h3>
            </div>

            <div className="timetable-board-controls">
              <label className="planner-field timetable-board-term">
                <span className="planner-field-label">{ui.term}</span>
                <SelectWrap>
                  <select
                    className="planner-select"
                    value={activeTermKey}
                    onChange={(event) => {
                      setActiveTermKey(event.target.value);
                      closeEditor();
                    }}
                  >
                    {termOptions.map((term) => (
                      <option key={getTermKey(term)} value={getTermKey(term)}>
                        {getTermLabel(term, locale)}
                      </option>
                    ))}
                  </select>
                </SelectWrap>
              </label>

              <button
                type="button"
                className="secondary-cta timetable-current-btn"
                onClick={() => {
                  const currentKey = getTermKey(currentTerm);
                  if (!entriesByTerm[currentKey]) persistStore({ ...entriesByTerm, [currentKey]: [] });
                  setActiveTermKey(currentKey);
                  closeEditor();
                }}
              >
                {ui.currentTerm}
              </button>

              <button type="button" className="primary-cta timetable-board-add-btn" onClick={openCreateEditor}>
                <Plus size={15} />
                {ui.add}
              </button>
            </div>
          </div>

          <div className="timetable-board-summary">
            <div className="timetable-side-meta-card">
              <span>{ui.term}</span>
              <strong>{getTermLabel(activeTerm, locale)}</strong>
            </div>
            <div className="timetable-side-meta-card">
              <span>{ui.range}</span>
              <strong>{getTermRange(activeTerm, locale)}</strong>
            </div>
            <div className="timetable-side-meta-card">
              <span>{ui.schedules}</span>
              <strong>{groupedSchedules.length}</strong>
            </div>
          </div>

          <div className="timetable-board-shell">
            <div className="timetable-day-header-row">
              <div className="timetable-axis-spacer" />
              {sundayFirstDays.map((day) => (
                <div className="timetable-day-header" key={day}>
                  {dayLabels[locale].short[day]}
                </div>
              ))}
            </div>

            <div className="timetable-board-body">
              <div className="timetable-time-axis" aria-hidden="true">
                {Array.from({ length: boardEndHour - boardStartHour + 1 }, (_, index) => {
                  const hour = boardStartHour + index;
                  return (
                    <span
                      className="timetable-time-label"
                      key={hour}
                      style={{ top: `${((hour - boardStartHour) / (boardEndHour - boardStartHour)) * 100}%` }}
                    >
                      {hour.toString().padStart(2, "0")}
                    </span>
                  );
                })}
              </div>

              <div className="timetable-day-columns">
                {sundayFirstDays.map((day) => (
                  <div className="timetable-day-column" key={day}>
                    {(entriesByDay.get(day) ?? []).map((entry) => {
                      const visibleStart = boardStartHour * 60;
                      const visibleEnd = boardEndHour * 60;
                      const start = Math.max(parseTime(entry.startTime), visibleStart);
                      const end = Math.min(parseTime(entry.endTime), visibleEnd);
                      const top = ((start - visibleStart) / (visibleEnd - visibleStart)) * 100;
                      const height = Math.max(((end - start) / (visibleEnd - visibleStart)) * 100, 5);
                      const selected = entry.scheduleId === selectedScheduleId;

                      return (
                        <button
                          type="button"
                          key={entry.id}
                          className={`planner-entry-block ${getBoardBlockClass(entry.kind)}${selected ? " planner-entry-selected" : ""}`}
                          style={{ top: `${top}%`, height: `${height}%` }}
                          onClick={() => {
                            setSelectedScheduleId(entry.scheduleId);
                            closeEditor();
                          }}
                        >
                          <span className="planner-entry-title">{entry.courseTitle}</span>
                          <span className="planner-entry-time">{entry.startTime} - {entry.endTime}</span>
                          {entry.location ? <span className="planner-entry-location">{entry.location}</span> : null}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {activeEntries.length === 0 ? <p className="timetable-board-empty">{ui.emptyTerm}</p> : null}
          </div>
        </section>

        <aside className="timetable-side-panel">
          <section ref={workspaceCardRef} className={`card timetable-workspace-card timetable-workspace-card-shell${editorDraft ? " timetable-workspace-card-expanded" : ""}`}>
            {editorDraft ? (
              <>
                <div className="card-header timetable-workspace-head">
                  <div>
                    <h3>{editorMode === "edit" ? ui.edit : ui.add}</h3>
                  </div>
                  <button type="button" className="secondary-cta" onClick={closeEditor}>
                    <X size={14} />
                    {ui.close}
                  </button>
                </div>

                <div className="timetable-workspace-body timetable-editor-panel">
                  <div className="planner-form-grid">
                    <label className="planner-field planner-field-span-2">
                      <span className="planner-field-label">{ui.title}</span>
                      <input className="planner-input" value={editorDraft.title} placeholder={ui.titlePlaceholder} onChange={(event) => updateDraftField("title", event.target.value)} />
                    </label>
                    <label className="planner-field">
                      <span className="planner-field-label">{ui.code}</span>
                      <input className="planner-input" value={editorDraft.courseCode} placeholder={ui.codePlaceholder} onChange={(event) => updateDraftField("courseCode", event.target.value)} />
                    </label>
                    <label className="planner-field">
                      <span className="planner-field-label">{ui.type}</span>
                      <SelectWrap>
                        <select className="planner-select" value={editorDraft.kind} onChange={(event) => updateDraftField("kind", event.target.value as TimetableKind)}>
                          {scheduleKinds.map((kind) => (
                            <option key={kind} value={kind}>{kindLabels[locale][kind]}</option>
                          ))}
                        </select>
                      </SelectWrap>
                    </label>
                    <label className="planner-field planner-field-span-2">
                      <span className="planner-field-label">{ui.location}</span>
                      <input className="planner-input" value={editorDraft.location} placeholder={ui.locationPlaceholder} onChange={(event) => updateDraftField("location", event.target.value)} />
                    </label>
                    <label className="planner-field planner-field-span-2">
                      <span className="planner-field-label">{ui.notes}</span>
                      <textarea className="planner-textarea" value={editorDraft.notes} placeholder={ui.notesPlaceholder} onChange={(event) => updateDraftField("notes", event.target.value)} />
                    </label>
                  </div>

                  <div className="timetable-slot-editor-section">
                    <div className="timetable-slot-editor-header">
                      <div>
                        <h4>{ui.slotTitle}</h4>
                      </div>
                      <button type="button" className="secondary-cta" onClick={addDraftSlot}>
                        <Plus size={14} />
                        {ui.addSlot}
                      </button>
                    </div>

                    <div className="timetable-slot-editor-list">
                      {editorDraft.slots.map((slot, index) => (
                        <div className="timetable-slot-editor-card" key={slot.draftId}>
                          <div className="timetable-slot-editor-card-head">
                            <strong>{ui.block} {index + 1}</strong>
                            {editorDraft.slots.length > 1 ? (
                              <button type="button" className="secondary-cta timetable-slot-remove-btn" onClick={() => removeDraftSlot(slot.draftId)}>
                                <Trash2 size={14} />
                                {ui.removeSlot}
                              </button>
                            ) : null}
                          </div>

                          <div className="planner-form-grid planner-form-grid-compact">
                            <label className="planner-field">
                              <span className="planner-field-label">{ui.day}</span>
                              <SelectWrap>
                                <select className="planner-select" value={slot.dayOfWeek} onChange={(event) => updateDraftSlot(slot.draftId, "dayOfWeek", event.target.value as DayOfWeek)}>
                                  {sundayFirstDays.map((day) => (
                                    <option key={day} value={day}>{dayLabels[locale].full[day]}</option>
                                  ))}
                                </select>
                              </SelectWrap>
                            </label>
                            <label className="planner-field">
                              <span className="planner-field-label">{ui.start}</span>
                              <SelectWrap>
                                <select className="planner-select" value={slot.startTime} onChange={(event) => updateDraftSlot(slot.draftId, "startTime", event.target.value)}>
                                  {timeOptions.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                  ))}
                                </select>
                              </SelectWrap>
                            </label>
                            <label className="planner-field">
                              <span className="planner-field-label">{ui.end}</span>
                              <SelectWrap>
                                <select className="planner-select" value={slot.endTime} onChange={(event) => updateDraftSlot(slot.draftId, "endTime", event.target.value)}>
                                  {timeOptions.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                  ))}
                                </select>
                              </SelectWrap>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {validationMessage ? <p className="planner-validation-message">{validationMessage}</p> : null}

                  <div className="timetable-editor-actions">
                    <button type="button" className="primary-cta" onClick={saveDraft}>
                      <SquarePen size={15} />
                      {ui.save}
                    </button>
                    <button type="button" className="secondary-cta" onClick={closeEditor}>
                      {ui.cancel}
                    </button>
                  </div>
                </div>
              </>
            ) : selectedSchedule ? (
              <>
                <div className="card-header timetable-workspace-head">
                  <div>
                    <h3>{selectedSchedule.title}</h3>
                  </div>
                  <div className="timetable-workspace-actions">
                    <button type="button" className="primary-cta" onClick={openCreateEditor}>
                      <Plus size={14} />
                      {ui.add}
                    </button>
                    <button type="button" className="secondary-cta" onClick={() => openEditEditor(selectedSchedule)}>
                      <PencilLine size={14} />
                      {ui.edit}
                    </button>
                    <button type="button" className="secondary-cta" onClick={() => deleteSchedule(selectedSchedule.scheduleId)}>
                      <Trash2 size={14} />
                      {ui.delete}
                    </button>
                  </div>
                </div>

                <div className="timetable-workspace-body">
                  <div className="timetable-workspace-meta">
                    <div className="timetable-info-chip">
                      <BookOpenText size={15} />
                      <span>{kindLabels[locale][selectedSchedule.kind]}</span>
                    </div>
                    <div className="timetable-info-chip">
                      <CalendarClock size={15} />
                      <span>{selectedSchedule.slots.length} {ui.blocks}</span>
                    </div>
                    <div className="timetable-info-chip">
                      <MapPin size={15} />
                      <span>{selectedSchedule.location || ui.noLocation}</span>
                    </div>
                  </div>

                  <section className="timetable-detail-section">
                    <div className="timetable-detail-head">
                      <h4>{ui.summaryTitle}</h4>
                    </div>
                    <div className="timetable-slot-summary-list">
                      {selectedSchedule.slots.map((slot) => (
                        <div className="timetable-slot-summary-item" key={slot.id}>
                          <div className="timetable-slot-summary-main">
                            <strong>{dayLabels[locale].full[slot.dayOfWeek]}</strong>
                            <span>{slot.startTime} - {slot.endTime}</span>
                          </div>
                          <div className="timetable-slot-summary-side">
                            <Clock3 size={14} />
                            <span>{selectedSchedule.location || ui.noLocation}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="timetable-detail-section">
                    <div className="timetable-detail-head">
                      <h4>{ui.notes}</h4>
                    </div>
                    <p className="timetable-detail-note">{selectedSchedule.notes || ui.noNotes}</p>
                  </section>

                  <section className="timetable-detail-section">
                    <DocumentEvidencePicker evidenceKey={`timetable:${selectedSchedule.scheduleId}`} documents={documents} locale={locale} title={ui.related} />
                  </section>
                </div>
              </>
            ) : (
              <>
                <div className="card-header timetable-workspace-head">
                  <div>
                    <h3>{ui.focusTitle}</h3>
                  </div>
                  <button type="button" className="primary-cta" onClick={openCreateEditor}>
                    <Plus size={14} />
                    {ui.add}
                  </button>
                </div>
                <div className="timetable-workspace-empty timetable-workspace-empty-collapsed">
                  <p>{ui.emptyFocus}</p>
                </div>
              </>
            )}
          </section>

          <section className="card timetable-side-section timetable-schedule-panel">
            <div className="card-header timetable-list-header">
              <div>
                <h3>{ui.listTitle}</h3>
              </div>
            </div>

            <div className="timetable-schedule-list">
              {groupedSchedules.length === 0 ? (
                <p className="timetable-list-empty">{ui.emptyList}</p>
              ) : (
                groupedSchedules.map((schedule) => (
                  <button
                    type="button"
                    key={schedule.scheduleId}
                    className={`timetable-schedule-item${schedule.scheduleId === selectedScheduleId ? " timetable-schedule-item-active" : ""}`}
                    onClick={() => {
                      setSelectedScheduleId(schedule.scheduleId);
                      closeEditor();
                    }}
                  >
                    <div className="timetable-schedule-item-top">
                      <div>
                        <strong>{schedule.title}</strong>
                        <p>{schedule.courseCode || ui.noCode}</p>
                      </div>
                      <span className={`pill ${getKindPillClass(schedule.kind)}`}>{kindLabels[locale][schedule.kind]}</span>
                    </div>

                    <div className="timetable-schedule-summary-list">
                      {schedule.slots.map((slot) => (
                        <span className="timetable-schedule-summary-chip" key={slot.id}>
                          {dayLabels[locale].short[slot.dayOfWeek]} {slot.startTime} - {slot.endTime}
                        </span>
                      ))}
                    </div>

                    <div className="timetable-schedule-item-bottom">
                      <span>{schedule.location || ui.noLocation}</span>
                      <span>{schedule.slots.length} {ui.blocks}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
