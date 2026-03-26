"use client";

import type { AffiliationTimelineEntry, DocumentRecord } from "@research-os/types";
import {
  appointmentStatuses,
  organizationTypes,
  roleTracks,
} from "@research-os/types";
import { PencilLine, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { DocumentEvidencePicker } from "@/components/document-evidence-picker";
import { loadBrowserAffiliationsForAccount } from "@/lib/affiliation-browser-store";
import {
  replaceAffiliationsForAccount,
  syncAffiliationsForAccount,
} from "@/lib/affiliation-server-store";
import { loadBrowserDocuments } from "@/lib/document-browser-store";
import { syncDocumentsForAccount } from "@/lib/document-server-store";
import type { Locale } from "@/lib/i18n";

interface AffiliationWorkspaceProps {
  locale: Locale;
  affiliations: AffiliationTimelineEntry[];
  documents: DocumentRecord[];
  embedded?: boolean;
}

const copy = {
  ko: {
    title: "소속 이력",
    subtitle: "학교, 연구실, 기관, 프로젝트 단위의 소속과 역할을 계속 업데이트합니다.",
    institution: "기관",
    department: "부서",
    lab: "연구실",
    period: "기간",
    notes: "비고",
    present: "현재",
    active: "진행 중",
    inactive: "종료",
    evidence: "관련 문서",
    edit: "소속 편집",
    save: "저장",
    cancel: "취소",
    add: "항목 추가",
    empty: "등록된 소속 이력이 아직 없습니다.",
    emptyEditing: "아직 항목이 없습니다. 학교, 연구실, 기관 소속부터 추가해보세요.",
    item: "소속 항목",
    organizationType: "기관 유형",
    roleTrack: "역할 트랙",
    appointmentStatus: "상태",
    startDate: "시작일",
    endDate: "종료일",
    roleTitle: "역할명",
    remove: "삭제",
    organizationLabels: {
      university: "대학교",
      lab: "연구실",
      company: "기업",
      government: "정부",
      research_institute: "연구소",
      hospital: "병원",
      foundation: "재단",
      other: "기타",
    },
    roleTrackLabels: {
      student: "학생",
      faculty: "교수",
      postdoc: "포닥",
      researcher: "연구원",
      staff: "스태프",
      admin: "행정",
      industry: "산학",
      other: "기타",
    },
    appointmentLabels: {
      planned: "예정",
      active: "진행 중",
      paused: "보류",
      completed: "종료",
    },
  },
  en: {
    title: "Affiliations",
    subtitle: "Keep university, lab, institution, and project roles updated over time.",
    institution: "Institution",
    department: "Department",
    lab: "Lab",
    period: "Period",
    notes: "Notes",
    present: "Present",
    active: "Active",
    inactive: "Inactive",
    evidence: "Related documents",
    edit: "Edit affiliations",
    save: "Save",
    cancel: "Cancel",
    add: "Add item",
    empty: "No affiliations yet.",
    emptyEditing: "No affiliation items yet. Start with university, lab, or institutional roles.",
    item: "Affiliation item",
    organizationType: "Organization type",
    roleTrack: "Role track",
    appointmentStatus: "Status",
    startDate: "Start date",
    endDate: "End date",
    roleTitle: "Role title",
    remove: "Remove",
    timelineSnapshot: "Timeline snapshot",
    nextUpdate: "Next update",
    currentRole: "Current role",
    pastRole: "Past role",
    plannedRole: "Planned role",
    pausedRole: "Paused role",
    organizationLabels: {
      university: "University",
      lab: "Lab",
      company: "Company",
      government: "Government",
      research_institute: "Research institute",
      hospital: "Hospital",
      foundation: "Foundation",
      other: "Other",
    },
    roleTrackLabels: {
      student: "Student",
      faculty: "Faculty",
      postdoc: "Postdoc",
      researcher: "Researcher",
      staff: "Staff",
      admin: "Admin",
      industry: "Industry",
      other: "Other",
    },
    appointmentLabels: {
      planned: "Planned",
      active: "Active",
      paused: "Paused",
      completed: "Completed",
    },
  },
} as const;

function createRecordId(prefix: string) {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyAffiliation(accountId: string | null): AffiliationTimelineEntry {
  return {
    id: createRecordId("aff"),
    owner: { type: "user", id: accountId ?? "anonymous" },
    institutionName: "",
    organizationType: "university",
    roleTitle: "",
    roleTrack: "student",
    appointmentStatus: "active",
    startDate: "",
    active: true,
    relatedFundingIds: [],
  };
}

function normalizeAffiliation(entry: AffiliationTimelineEntry): AffiliationTimelineEntry {
  return {
    ...entry,
    institutionName: entry.institutionName.trim(),
    department: entry.department?.trim() || undefined,
    labName: entry.labName?.trim() || undefined,
    roleTitle: entry.roleTitle.trim(),
    startDate: entry.startDate,
    endDate: entry.endDate?.trim() || undefined,
    notes: entry.notes?.trim() || undefined,
  };
}

function compareDateStrings(left?: string, right?: string) {
  if (left && right) {
    return right.localeCompare(left);
  }

  if (left) {
    return -1;
  }

  if (right) {
    return 1;
  }

  return 0;
}

function sortAffiliations(items: AffiliationTimelineEntry[]) {
  return [...items].sort((left, right) => {
    if (left.active !== right.active) {
      return left.active ? -1 : 1;
    }

    const endDateOrder = compareDateStrings(left.endDate, right.endDate);
    if (endDateOrder !== 0) {
      return endDateOrder;
    }

    const startDateOrder = compareDateStrings(left.startDate, right.startDate);
    if (startDateOrder !== 0) {
      return startDateOrder;
    }

    return left.institutionName.localeCompare(right.institutionName);
  });
}

function joinAffiliationSummary(entry: AffiliationTimelineEntry) {
  return [entry.institutionName, entry.department, entry.labName]
    .filter((part, index, parts): part is string => {
      if (!part) {
        return false;
      }

      return parts.findIndex((candidate) => candidate === part) === index;
    })
    .join(" / ");
}

function getAffiliationStatusClass(entry: AffiliationTimelineEntry) {
  if (entry.active) {
    return "pill-green";
  }

  if (entry.appointmentStatus === "planned" || entry.appointmentStatus === "paused") {
    return "pill-amber";
  }

  return "pill-gray";
}

function getAffiliationOverview(items: AffiliationTimelineEntry[], locale: Locale) {
  if (items.length === 0) {
    return locale === "ko"
      ? "소속을 추가하면 현재 역할과 지난 역할을 한 화면에서 바로 확인할 수 있습니다."
      : "Add an affiliation so current and past roles are easy to review in one place.";
  }

  const currentCount = items.filter((item) => item.active).length;
  const pastCount = items.length - currentCount;

  if (currentCount > 0) {
    if (locale === "ko") {
      return `현재 소속 ${currentCount}건과 종료된 소속 ${pastCount}건이 정리되어 있습니다. 상태나 날짜가 바뀌면 이 목록에서 바로 수정하세요.`;
    }

    return `${currentCount} current affiliation and ${pastCount} past entr${
      pastCount === 1 ? "y" : "ies"
    } on record. Edit this list when a role changes status or dates.`;
  }

  if (locale === "ko") {
    return `종료된 소속 ${pastCount}건이 정리되어 있습니다. 다시 활성화되는 역할이 있으면 이 목록에서 갱신하세요.`;
  }

  return `${pastCount} past entr${
    pastCount === 1 ? "y is" : "ies are"
  } on record. Update one when a role becomes active again.`;
}

function getTimelineSummary(
  entry: AffiliationTimelineEntry,
  locale: Locale,
) {
  if (entry.active) {
    return locale === "ko" ? `${entry.startDate}부터 현재까지` : `Current since ${entry.startDate}`;
  }

  if (entry.appointmentStatus === "planned") {
    return locale === "ko"
      ? `${entry.startDate} 시작 예정`
      : `Planned to start ${entry.startDate}`;
  }

  if (entry.appointmentStatus === "paused") {
    return locale === "ko"
      ? `${entry.startDate} 시작 후 보류`
      : `Paused after starting ${entry.startDate}`;
  }

  if (entry.endDate) {
    return `${entry.startDate} - ${entry.endDate}`;
  }

  return locale === "ko"
    ? `${entry.startDate} 시작, 종료일 입력 필요`
    : `Started ${entry.startDate}; add an end date`;
}

function getTimelineEndLabel(
  entry: AffiliationTimelineEntry,
  locale: Locale,
  text: (typeof copy)[Locale],
) {
  if (entry.active) {
    return text.present;
  }

  if (entry.endDate) {
    return entry.endDate;
  }

  if (entry.appointmentStatus === "planned" || entry.appointmentStatus === "paused") {
    return text.appointmentLabels[entry.appointmentStatus];
  }

  return locale === "ko" ? "종료일 필요" : "End date needed";
}

function getAffiliationStateLabel(
  entry: AffiliationTimelineEntry,
  locale: Locale,
) {
  if (entry.active) {
    return locale === "ko" ? "\ud604\uc7ac \uc18c\uc18d" : "Current role";
  }

  if (entry.appointmentStatus === "planned") {
    return locale === "ko" ? "\uc608\uc815 \uc18c\uc18d" : "Planned role";
  }

  if (entry.appointmentStatus === "paused") {
    return locale === "ko" ? "\ubcf4\ub958 \uc18c\uc18d" : "Paused role";
  }

  return locale === "ko" ? "\uc885\ub8cc \uc18c\uc18d" : "Past role";
}

function getLegacyAffiliationScanSummary(
  entry: AffiliationTimelineEntry,
  locale: Locale,
) {
  return `${getAffiliationStateLabel(entry, locale)} · ${getTimelineSummary(
    entry,
    locale,
  )}`;
}

function getAffiliationScanSummary(
  entry: AffiliationTimelineEntry,
  locale: Locale,
) {
  return getLegacyAffiliationScanSummary(entry, locale).replace(
    ` ${String.fromCharCode(51724)} `,
    " / ",
  );
}

function getAffiliationOnePassSummary(
  entry: AffiliationTimelineEntry,
  locale: Locale,
) {
  return [
    getAffiliationStateLabel(entry, locale),
    getTimelineSummary(entry, locale),
    `${getNextUpdateLabel(locale)}: ${getPrimaryEditActionLabel(entry, locale)}`,
  ].join(" / ");
}

function getCurrentTimelineLabel(locale: Locale) {
  return locale === "ko"
    ? "\ud604\uc7ac \uc18c\uc18d \uc139\uc158 \ud45c\uc2dc"
    : "Show with current affiliations";
}

function getCurrentTimelineValue(active: boolean, locale: Locale) {
  if (active) {
    return locale === "ko" ? "\uc608" : "Yes";
  }

  return locale === "ko" ? "\uc544\ub2c8\uc624" : "No";
}

function getCurrentTimelineHint(
  entry: AffiliationTimelineEntry,
  locale: Locale,
) {
  if (entry.active && entry.appointmentStatus !== "active") {
    return locale === "ko"
      ? "\ud604\uc7ac \uc18c\uc18d\uc5d0 \ub0a8\uae38 \uac83\uc774\uba74 \uc774 \uac12\uc740 \uc720\uc9c0\ud558\uace0, \uc0c1\ud0dc\ub97c \uc9c4\ud589 \uc911\uc73c\ub85c \ub9de\ucdb0\uc8fc\uc138\uc694."
      : "Leave this on if the role is still current, then align the status to Active.";
  }

  if (!entry.active && entry.appointmentStatus === "active") {
    return locale === "ko"
      ? "\uc0c1\ud0dc\ub294 \uc9c4\ud589 \uc911\uc774\ubbc0\ub85c \uc5ec\uc804\ud788 \ud604\uc7ac \uc18c\uc18d\uc774\uba74 \ub2e4\uc2dc \ucf1c\uc8fc\uc138\uc694."
      : "Status says Active. Turn this back on if the role still belongs with Current affiliations.";
  }

  if (entry.active) {
    return locale === "ko"
      ? "\uc774 \ud56d\ubaa9\uc774 \ud604\uc7ac \uc18c\uc18d \uc139\uc158\uc5d0 \ub0a8\uc544\uc57c \ud55c\ub2e4\uba74 \ucf1c \ub450\uc138\uc694."
      : "Keep this on when the role should stay in Current affiliations.";
  }

  if (entry.appointmentStatus === "planned" || entry.appointmentStatus === "paused") {
    return locale === "ko"
      ? "\uc608\uc815 \ub610\ub294 \ubcf4\ub958 \uc18c\uc18d\uc740 \ub044\uace0 \ub450\uc5b4 \ub2e4\uc74c \ud655\uc778 \uc139\uc158\uc5d0 \ub0a8\uac8c \ud558\uc138\uc694."
      : "Leave this off so planned or paused roles stay in Needs follow-up.";
  }

  return locale === "ko"
    ? "\uc885\ub8cc\ub41c \uc5ed\ud560\uc740 \ub044\uace0 \ub450\uc5b4 \ubcf4\uad00 \uc774\ub825\uc5d0 \ub0a8\uac8c \ud558\uc138\uc694."
    : "Leave this off so closed roles stay in Archived timeline.";
}

function getAppointmentStatusFieldHint(
  entry: AffiliationTimelineEntry,
  locale: Locale,
) {
  if (entry.active && entry.appointmentStatus !== "active") {
    return locale === "ko"
      ? "\ud604\uc7ac \uc18c\uc18d \uc139\uc158\uc5d0 \ubcf4\uc774\ubbc0\ub85c \uc0c1\ud0dc\ub3c4 \uc9c4\ud589 \uc911\uc73c\ub85c \ub9de\ucdb0\uc57c \ud0c0\uc784\ub77c\uc778\uc774 \ud55c \ubc88\uc5d0 \uc77d\ud799\ub2c8\ub2e4."
      : "Set this to Active when the role should keep showing with Current affiliations.";
  }

  if (!entry.active && entry.appointmentStatus === "active") {
    return locale === "ko"
      ? "\ud604\uc7ac \uc18c\uc18d\uc774 \uc544\ub2c8\ub77c\uba74 \uba3c\uc800 \uc0c1\ud0dc\ub97c \ubc14\uafd4 \uc774 \ud56d\ubaa9\uc758 \uc704\uce58\ub97c \uc815\ub9ac\ud558\uc138\uc694."
      : "Change this status first unless the role should move back into Current affiliations.";
  }

  return null;
}

function getEndDateFieldHint(
  entry: AffiliationTimelineEntry,
  locale: Locale,
) {
  if (entry.active && entry.endDate) {
    return locale === "ko"
      ? "\ud604\uc7ac \uc18c\uc18d\uc774\uba74 \uc885\ub8cc \ub0a0\uc9dc\ub97c \ube44\uc6b0\uace0, \ub05d\ub09c \uc5ed\ud560\uc774\uba74 \uc0c1\ud0dc\ub97c \uc644\ub8cc\ub85c \ubc14\uafc0\uc138\uc694."
      : "Clear the end date while this role stays current, or close the role first.";
  }

  if (!entry.active && entry.appointmentStatus === "completed" && !entry.endDate) {
    return locale === "ko"
      ? "\ubcf4\uad00 \uc774\ub825\ub85c \ub0a8\uae38 \uc644\ub8cc \uc18c\uc18d\uc740 \ub9c8\uc9c0\ub9c9 \ub0a0\uc9dc\ub97c \uc785\ub825\ud574 \ud0c0\uc784\ub77c\uc778\uc744 \ub2eb\uc544\uc8fc\uc138\uc694."
      : "Add the last day so this archived role closes cleanly in the timeline.";
  }

  if (entry.appointmentStatus === "planned" && entry.endDate) {
    return locale === "ko"
      ? "\uc608\uc815 \uc18c\uc18d\uc740 \uc2e4\uc81c\ub85c \ub05d\ub098\uae30 \uc804\uae4c\uc9c0 \uc885\ub8cc \ub0a0\uc9dc\ub97c \ube44\uc6cc \ub450\ub294 \ud3b8\uc774 \uc120\uba85\ud569\ub2c8\ub2e4."
      : "Leave this empty until the planned role actually ends.";
  }

  return null;
}

function getAffiliationEditReadiness(
  entry: AffiliationTimelineEntry,
  locale: Locale,
  text: (typeof copy)[Locale],
) {
  const missingFields = [
    !entry.institutionName.trim() ? text.institution : null,
    !entry.roleTitle.trim() ? text.roleTitle : null,
    !entry.startDate ? text.startDate : null,
  ].filter((value): value is Exclude<typeof value, null> => value !== null);

  if (missingFields.length === 0) {
    return locale === "ko" ? "\uc800\uc7a5 \uc900\ube44 \uc644\ub8cc" : "Ready to save.";
  }

  return locale === "ko"
    ? `\uc800\uc7a5 \uc804 ${missingFields.join(", ")} \uc785\ub825 \ud544\uc694`
    : `Add ${missingFields.join(", ")} before saving.`;
}

function getPrimaryNextActionSummary(
  entry: AffiliationTimelineEntry,
  locale: Locale,
) {
  if (entry.active && entry.appointmentStatus !== "active") {
    return locale === "ko"
      ? "\ud604\uc7ac \uc5ec\ubd80\ub97c \uc720\uc9c0\ud560 \uac83\uc774\uba74 \uc0c1\ud0dc\ub97c \uc9c4\ud589 \uc911\uc73c\ub85c \ub9de\ucd94\uace0, \uc544\ub2c8\uba74 \ud604\uc7ac \uc5ec\ubd80\ub97c \uaebc \ud0c0\uc784\ub77c\uc778 \uc704\uce58\ub97c \uc815\ub9ac\ud558\uc138\uc694."
      : "If this should stay current, switch the status to active. Otherwise move it out of Current affiliations first.";
  }

  if (!entry.active && entry.appointmentStatus === "active") {
    return locale === "ko"
      ? "\ud604\uc7ac \uc5ec\ubd80\ub97c \ub2e4\uc2dc \ucf1c\uac70\ub098 \uc0c1\ud0dc\ub97c \ubc14\uafd4 \uc774 \ud56d\ubaa9\uc758 \ud0c0\uc784\ub77c\uc778 \uc704\uce58\ub97c \uba3c\uc800 \uc815\ud558\uc138\uc694."
      : "Show this with Current affiliations again, or move the status out of active before editing anything else.";
  }

  if (entry.active && entry.endDate) {
    return locale === "ko"
      ? "\ud604\uc7ac \uc18c\uc18d\uc774\uba74 \uc885\ub8cc \ub0a0\uc9dc\ub97c \ube44\uc6b0\uace0, \ub05d\ub09c \uc5ed\ud560\uc774\uba74 \uc644\ub8cc \uc0c1\ud0dc\ub85c \ubc14\uafc0\uc138\uc694."
      : "Clear the end date for a current role, or mark it completed if the role has already closed.";
  }

  if (!entry.active && entry.appointmentStatus === "completed" && !entry.endDate) {
    return locale === "ko"
      ? "\uc644\ub8cc\ub41c \uc18c\uc18d\uc774\uba74 \ub9c8\uc9c0\ub9c9 \ub0a0\uc9dc\ub97c \ucd94\uac00\ud574 \ud0c0\uc784\ub77c\uc778\uc744 \ub2eb\uc544\uc8fc\uc138\uc694."
      : "Add the final end date so this completed role closes cleanly in the timeline.";
  }

  if (entry.appointmentStatus === "planned" && entry.endDate) {
    return locale === "ko"
      ? "\uc608\uc815 \uc18c\uc18d\uc5d0 \uc885\ub8cc \ub0a0\uc9dc\uac00 \uc788\uc73c\uba74 \ud63c\ub3d9\uc744 \uc8fc\ubbc0\ub85c, \uc2e4\uc81c\ub85c \ub2eb\ud78c \uac83\uc774 \uc544\ub2c8\uba74 \ub0a0\uc9dc\ub97c \ube44\uc6b0\uc138\uc694."
      : "Remove the end date unless this planned role has actually closed.";
  }

  return getNextActionSummary(entry, locale);
}

function getPrimaryEditActionLabel(
  entry: AffiliationTimelineEntry,
  locale: Locale,
) {
  if (needsTimelineCorrection(entry)) {
    return getTimelineCorrectionActionLabel(entry, locale);
  }

  return getEditActionLabel(entry, locale);
}

function getPrimaryEditButtonLabel(
  entry: AffiliationTimelineEntry,
  locale: Locale,
) {
  if (entry.active && entry.appointmentStatus !== "active") {
    return locale === "ko" ? "\uc0c1\ud0dc \uc218\uc815" : "Edit status";
  }

  if (!entry.active && entry.appointmentStatus === "active") {
    return locale === "ko"
      ? "\ud0c0\uc784\ub77c\uc778 \uc704\uce58 \uc218\uc815"
      : "Edit timeline placement";
  }

  if (entry.active && entry.endDate) {
    return locale === "ko" ? "\uc885\ub8cc\uc77c \uc218\uc815" : "Edit end date";
  }

  if (!entry.active && entry.appointmentStatus === "completed" && !entry.endDate) {
    return locale === "ko" ? "\uc885\ub8cc\uc77c \ucd94\uac00" : "Add end date";
  }

  if (entry.appointmentStatus === "planned" && entry.endDate) {
    return locale === "ko" ? "\ub0a0\uc9dc \ub2e4\uc2dc \ud655\uc778" : "Review dates";
  }

  if (entry.active) {
    return locale === "ko"
      ? "\uc0c1\ud0dc\u00b7\ub0a0\uc9dc \uc218\uc815"
      : "Edit status and dates";
  }

  if (entry.appointmentStatus === "planned" || entry.appointmentStatus === "paused") {
    return locale === "ko" ? "\ub2e4\uc74c \uc0c1\ud0dc \uac80\ud1a0" : "Review next status";
  }

  return locale === "ko" ? "\ubcf4\uad00 \uae30\ub85d \uc218\uc815" : "Edit archived record";
}

function getTimelineCorrectionActionLabel(
  entry: AffiliationTimelineEntry,
  locale: Locale,
) {
  if (entry.active && entry.appointmentStatus !== "active") {
    return locale === "ko" ? "\uc0c1\ud0dc \ub9de\ucd94\uae30" : "Match status";
  }

  if (!entry.active && entry.appointmentStatus === "active") {
    return locale === "ko" ? "\ud604\uc7ac \uc5ec\ubd80 \uc815\ud558\uae30" : "Set current or close";
  }

  if (entry.active && entry.endDate) {
    return locale === "ko" ? "\uc885\ub8cc\uc77c \ube44\uc6b0\uae30" : "Clear end date";
  }

  if (!entry.active && entry.appointmentStatus === "completed" && !entry.endDate) {
    return locale === "ko" ? "\uc885\ub8cc\uc77c \ucd94\uac00" : "Add end date";
  }

  return locale === "ko" ? "\ub0a0\uc9dc \ub2e4\uc2dc \ud655\uc778" : "Recheck dates";
}

function getTimelineCorrectionBadgeLabel(
  entry: AffiliationTimelineEntry,
  locale: Locale,
) {
  if (entry.active && entry.appointmentStatus !== "active") {
    return locale === "ko" ? "\uc0c1\ud0dc \ubd88\uc77c\uce58" : "Status mismatch";
  }

  if (!entry.active && entry.appointmentStatus === "active") {
    return locale === "ko" ? "\ud604\uc7ac \uc5ec\ubd80 \ud655\uc778" : "Current state check";
  }

  if (entry.active && entry.endDate) {
    return locale === "ko" ? "\uc885\ub8cc\uc77c \ucda9\ub3cc" : "End date conflict";
  }

  if (!entry.active && entry.appointmentStatus === "completed" && !entry.endDate) {
    return locale === "ko" ? "\uc885\ub8cc\uc77c \ud544\uc694" : "End date needed";
  }

  return locale === "ko" ? "\uc608\uc815 \ub0a0\uc9dc \ud655\uc778" : "Planned date check";
}

function getNextActionSummary(entry: AffiliationTimelineEntry, locale: Locale) {
  if (entry.active) {
    return locale === "ko"
      ? "역할이 끝나면 종료일을 넣고 완료 상태로 바꾸세요."
      : "When this role ends, add the end date and mark it completed.";
  }

  if (entry.appointmentStatus === "planned") {
    return locale === "ko"
      ? "시작하면 현재 소속으로 바꾸고 날짜를 다시 확인하세요."
      : "When this starts, switch it to current and confirm the dates.";
  }

  if (entry.appointmentStatus === "paused") {
    return locale === "ko"
      ? "재개할지 종료할지 정한 뒤 날짜와 상태를 맞추세요."
      : "Choose resume or completed, then align the dates and status.";
  }

  return locale === "ko"
    ? "종료 기록이 틀린 경우에만 날짜, 메모, 증빙을 보정하세요."
    : "Only reopen this if the closed dates, notes, or evidence need correction.";
}

function getTimelineSnapshotLabel(locale: Locale) {
  return locale === "ko" ? "\ud0c0\uc784\ub77c\uc778 \uc694\uc57d" : "Timeline snapshot";
}

function getNextUpdateLabel(locale: Locale) {
  return locale === "ko" ? "\ub2e4\uc74c \uc218\uc815 \uc791\uc5c5" : "Next edit";
}

function getTimelineCheckLabel(locale: Locale) {
  return locale === "ko" ? "\ud0c0\uc784\ub77c\uc778 \uc810\uac80" : "Timeline check";
}

function getSaveReadinessLabel(locale: Locale) {
  return locale === "ko" ? "\uc800\uc7a5 \uc900\ube44" : "Save readiness";
}

function getEditFocusLabel(locale: Locale) {
  return locale === "ko" ? "\uc774\ubc88 \uc218\uc815 \ud3ec\uc778\ud2b8" : "Edit focus";
}

function getEditingNowLabel(locale: Locale) {
  return locale === "ko" ? "\uc9c0\uae08 \uc218\uc815 \uc911" : "Editing now";
}

function getEditFocusHint(entry: AffiliationTimelineEntry, locale: Locale) {
  if (entry.active) {
    return locale === "ko"
      ? "\uba3c\uc800 \uc0c1\ud0dc\uc640 \ub0a0\uc9dc\ub97c \uac31\uc2e0\ud558\uace0, \uae30\uad00 \uc815\ubcf4\ub294 \ubc14\ub010 \uacbd\uc6b0\uc5d0\ub9cc \uc870\uc815\ud558\uc138\uc694."
      : "Update status and dates first, then adjust institution details only if this role changed.";
  }

  if (entry.appointmentStatus === "planned" || entry.appointmentStatus === "paused") {
    return locale === "ko"
      ? "\uc7ac\uac1c \uc5ec\ubd80\uc640 \uc608\uc815 \ub0a0\uc9dc\ub97c \uba3c\uc800 \ud655\uc778\ud558\uace0 \ud0c0\uc784\ub77c\uc778\uc744 \uac31\uc2e0\ud558\uc138\uc694."
      : "Confirm whether this role should resume, stay queued, or move to completed before editing details.";
  }

  return locale === "ko"
    ? "\uc885\ub8cc \ub0a0\uc9dc\uc640 \uae30\ub85d \uc815\ud655\uc131\uc744 \uba3c\uc800 \ud655\uc778\ud558\uace0 \ud544\uc694\ud55c \uba54\ubaa8\ub9cc \ubcf4\uc644\ud558\uc138\uc694."
    : "Check the closed timeline first, then clean up institution details or notes only if the record is inaccurate.";
}

function getCurrentSectionLabel(locale: Locale, count: number) {
  return locale === "ko"
    ? `\ud604\uc7ac \uc18c\uc18d ${count}\uac74`
    : `Current affiliations (${count})`;
}

function getCurrentSectionHint(locale: Locale, count: number) {
  return locale === "ko"
    ? count > 0
      ? "\uc5ed\ud560\uc774 \ubc14\ub00c\uac70\ub098 \uc885\ub8cc\ub418\uba74 \uc774 \uc139\uc158\uc5d0\uc11c \uba3c\uc800 \uc0c1\ud0dc\uc640 \ub0a0\uc9dc\ub97c \uac31\uc2e0\ud558\uc138\uc694."
      : "\ud604\uc7ac \uc9c4\ud589 \uc911\uc778 \uc18c\uc18d\uc774 \uc5c6\uc2b5\ub2c8\ub2e4."
    : count > 0
      ? "Review these first when a role changes status, dates, or institution details."
      : "No active affiliations are on record right now.";
}

function getCurrentEditSectionHint(locale: Locale, count: number) {
  return locale === "ko"
    ? count > 0
      ? "\ud604\uc7ac \uc9c4\ud589 \uc911\uc778 \uc18c\uc18d\ubd80\ud130 \ub0a0\uc9dc, \uc0c1\ud0dc, \uae30\uad00 \uc815\ubcf4\ub97c \uac31\uc2e0\ud558\uc138\uc694."
      : "\uc218\uc815\ud560 \ud604\uc7ac \uc18c\uc18d\uc774 \uc5c6\uc2b5\ub2c8\ub2e4."
    : count > 0
      ? "Start here when an active role changes dates, status, or institution details."
      : "No active affiliation items need edits right now.";
}

function getQueuedSectionLabel(locale: Locale, count: number) {
  return locale === "ko"
    ? `\ub2e4\uc74c \ud655\uc778 \uc18c\uc18d ${count}\uac74`
    : `Needs follow-up (${count})`;
}

function getQueuedSectionHint(locale: Locale, count: number) {
  return locale === "ko"
    ? count > 0
      ? "\ubcf4\ub958\ub418\uac70\ub098 \uc608\uc815\ub41c \uc18c\uc18d\uc744 \uba3c\uc800 \ubcf4\uace0 \uc7ac\uac1c, \uc720\uc9c0, \uc885\ub8cc \uc5ec\ubd80\ub97c \uc815\ud558\uc138\uc694."
      : "\ub2e4\uc74c \uc5c5\ub370\uc774\ud2b8\uac00 \ud544\uc694\ud55c \ubcf4\ub958 \ub610\ub294 \uc608\uc815 \uc18c\uc18d\uc774 \uc5c6\uc2b5\ub2c8\ub2e4."
    : count > 0
      ? "Review planned and paused roles here first so it is clear whether they should resume, stay queued, or close."
      : "No planned or paused roles need follow-up right now.";
}

function getArchivedSectionLabel(locale: Locale, count: number) {
  return locale === "ko"
    ? `\ubcf4\uad00 \uc774\ub825 ${count}\uac74`
    : `Archived timeline (${count})`;
}

function getArchivedSectionHint(locale: Locale, count: number) {
  return locale === "ko"
    ? count > 0
      ? "\uc644\ub8cc\ub41c \uc18c\uc18d\uc740 \ucc38\uace0\uc6a9\uc73c\ub85c \ubcf4\uad00\ud558\uace0, \ub0a0\uc9dc\ub098 \uba54\ubaa8\uac00 \ud2c0\ub9b4 \ub54c\ub9cc \uc218\uc815\ud558\uc138\uc694."
      : "\ubcf4\uad00 \uc911\uc778 \uc644\ub8cc \uc774\ub825\uc774 \uc5c6\uc2b5\ub2c8\ub2e4."
    : count > 0
      ? "Completed roles stay here for reference, so you only reopen them when dates, notes, or institution details are inaccurate."
      : "No completed timeline entries are archived yet.";
}

function getQueuedEditSectionHint(locale: Locale, count: number) {
  return locale === "ko"
    ? count > 0
      ? "\uc7ac\uac1c \uc5ec\ubd80\uc640 \uc0c1\ud0dc \uacb0\uc815\uc774 \uba3c\uc800\uc778 \ud56d\ubaa9\ub4e4\uc785\ub2c8\ub2e4."
      : "\uc218\uc815\ud560 \ubcf4\ub958 \ub610\ub294 \uc608\uc815 \uc18c\uc18d\uc774 \uc5c6\uc2b5\ub2c8\ub2e4."
    : count > 0
      ? "Use this section for entries that still need a resume, pause, or completion decision."
      : "No planned or paused items need edits right now.";
}

function getArchivedEditSectionHint(locale: Locale, count: number) {
  return locale === "ko"
    ? count > 0
      ? "\uc885\ub8cc\ub41c \ud56d\ubaa9\uc740 \ud0c0\uc784\ub77c\uc778 \uc815\ud655\uc131\uc744 \ub2e4\ub4ec\uc744 \ub54c\ub9cc \uc218\uc815\ud558\uc138\uc694."
      : "\uc218\uc815\ud560 \ubcf4\uad00 \uc774\ub825\uc774 \uc5c6\uc2b5\ub2c8\ub2e4."
    : count > 0
      ? "Keep archived edits focused on correcting closed dates, notes, or institution details."
      : "No archived timeline items need edits right now.";
}

function getTimelineCorrectionSectionHint(
  locale: Locale,
  correctionCount: number,
) {
  if (correctionCount === 0) {
    return "";
  }

  if (locale === "ko") {
    return correctionCount === 1
      ? "\uc774 \uc139\uc158\uc5d0 \ud0c0\uc784\ub77c\uc778\uc744 \uba3c\uc800 \ub9de\ucdb0\uc57c \ud558\ub294 \ud56d\ubaa9 1\uac74\uc774 \uc788\uc2b5\ub2c8\ub2e4."
      : `\uc774 \uc139\uc158\uc5d0 \ud0c0\uc784\ub77c\uc778\uc744 \uba3c\uc800 \ub9de\ucdb0\uc57c \ud558\ub294 \ud56d\ubaa9 ${correctionCount}\uac74\uc774 \uc788\uc2b5\ub2c8\ub2e4.`;
  }

  return correctionCount === 1
    ? "1 entry in this section needs timeline fixes first."
    : `${correctionCount} entries in this section need timeline fixes first.`;
}

function getTimelinePlacementLabel(locale: Locale) {
  return locale === "ko" ? "\ud0c0\uc784\ub77c\uc778 \uc704\uce58" : "Timeline placement";
}

function getAffiliationSectionName(
  section: AffiliationSectionKey,
  locale: Locale,
) {
  if (section === "current") {
    return locale === "ko" ? "\ud604\uc7ac \uc18c\uc18d" : "Current affiliations";
  }

  if (section === "queued") {
    return locale === "ko" ? "\ub2e4\uc74c \ud655\uc778" : "Needs follow-up";
  }

  return locale === "ko" ? "\ubcf4\uad00 \uc774\ub825" : "Archived timeline";
}

function getTimelinePlacementSummary(
  entry: AffiliationTimelineEntry,
  locale: Locale,
) {
  const section = getAffiliationSectionKey(entry);
  const sectionName = getAffiliationSectionName(section, locale);

  if (section === "current") {
    return locale === "ko"
      ? `${sectionName} \uc139\uc158\uc5d0 \ubcf4\uc785\ub2c8\ub2e4. \ud604\uc7ac \ud65c\uc131 \uc18c\uc18d\uc73c\ub85c \ucde8\uae09\ub429\ub2c8\ub2e4.`
      : `${sectionName}. This entry stays with active roles.`;
  }

  if (section === "queued") {
    return locale === "ko"
      ? `${sectionName} \uc139\uc158\uc5d0 \ubcf4\uc785\ub2c8\ub2e4. \uc7ac\uac1c, \uc720\uc9c0, \uc644\ub8cc \uacb0\uc815\uc774 \ub0a8\uc544 \uc788\ub294 \ud56d\ubaa9\uc785\ub2c8\ub2e4.`
      : `${sectionName}. Review here until the role resumes or closes.`;
  }

  return locale === "ko"
    ? `${sectionName} \uc139\uc158\uc5d0 \ubcf4\uc785\ub2c8\ub2e4. \ub2eb\ud78c \uc774\ub825\ub85c \ubcf4\uad00\ub429\ub2c8\ub2e4.`
    : `${sectionName}. Keep closed roles here unless the record needs correction.`;
}

function getTimelinePlacementScanSummary(
  entry: AffiliationTimelineEntry,
  locale: Locale,
) {
  const section = getAffiliationSectionKey(entry);

  if (section === "current") {
    return locale === "ko"
      ? "\ud604\uc7ac \uc18c\uc18d \uc139\uc158\uc5d0 \ubc30\uce58\ub418\uc5b4 \uc0c1\ud0dc \ubcc0\uacbd\uc744 \uba3c\uc800 \ud655\uc778\ud569\ub2c8\ub2e4."
      : "Shown with current affiliations so status changes are easy to review first.";
  }

  if (section === "queued") {
    return locale === "ko"
      ? "\ub2e4\uc74c \ud655\uc778 \uc139\uc158\uc5d0 \ubc30\uce58\ub418\uc5b4 \uc7ac\uac1c \uc5ec\ubd80\ub97c \uacb0\uc815\ud569\ub2c8\ub2e4."
      : "Shown in needs follow-up until you decide whether it resumes or closes.";
  }

  return locale === "ko"
    ? "\ubcf4\uad00 \uc774\ub825 \uc139\uc158\uc5d0 \ubc30\uce58\ub418\uc5b4 \uae30\ub85d \ubcf4\uc815 \uc2dc\uc5d0\ub9cc \ub2e4\uc2dc \uc5fd\ub2c8\ub2e4."
    : "Shown in the archived timeline and only reopened for record corrections.";
}

function getTimelineCheckSummary(
  entry: AffiliationTimelineEntry,
  locale: Locale,
  text: (typeof copy)[Locale],
) {
  const statusLabel = text.appointmentLabels[entry.appointmentStatus];

  if (entry.active && entry.appointmentStatus !== "active") {
    return locale === "ko"
      ? `\ud604\uc7ac \uc18c\uc18d\uc73c\ub85c \ud45c\uc2dc\ub418\uc9c0\ub9cc \uc0c1\ud0dc\ub294 ${statusLabel}\uc785\ub2c8\ub2e4. \ud604\uc7ac \uc5ec\ubd80\uc640 \uc0c1\ud0dc\ub97c \uac19\uc774 \ub9de\ucd94\uc138\uc694.`
      : `This still scans as current, but status is ${statusLabel.toLowerCase()}. Match active state and status so the timeline reads clearly.`;
  }

  if (!entry.active && entry.appointmentStatus === "active") {
    return locale === "ko"
      ? "\uc0c1\ud0dc\ub294 \uc9c4\ud589 \uc911\uc778\ub370 \ud604\uc7ac \uc5ec\ubd80\ub294 \uaebc\uc838 \uc788\uc2b5\ub2c8\ub2e4. \uc774 \ud56d\ubaa9\uc774 \uc5b4\ub290 \uc139\uc158\uc5d0 \uac08\uc9c0 \uba3c\uc800 \uc815\ud558\uc138\uc694."
      : "Status says active, but this is not shown with Current affiliations. Decide whether it belongs with current roles or a closed section first.";
  }

  if (entry.active && entry.endDate) {
    return locale === "ko"
      ? "\ud604\uc7ac \uc18c\uc18d\uc740 \ubcf4\ud1b5 \uc885\ub8cc \ub0a0\uc9dc\ub97c \ube44\uc6cc\ub461\ub2c8\ub2e4. \uc5ed\ud560\uc774 \ub05d\ub0ac\ub2e4\uba74 \uc885\ub8cc \uc0c1\ud0dc\ub85c \ub9de\ucd94\uc138\uc694."
      : "Current roles usually leave the end date empty. Clear it or move the role to a closed status.";
  }

  if (!entry.active && entry.appointmentStatus === "completed" && !entry.endDate) {
    return locale === "ko"
      ? "\uc885\ub8cc \uc18c\uc18d\uc740 \ub05d\ub09c \ub0a0\uc9dc\uac00 \uc788\uc5b4\uc57c \ud0c0\uc784\ub77c\uc778\uc744 \ube60\ub974\uac8c \uc77d\uc744 \uc218 \uc788\uc2b5\ub2c8\ub2e4."
      : "Completed roles scan better with a final end date.";
  }

  if (entry.appointmentStatus === "planned" && entry.endDate) {
    return locale === "ko"
      ? "\uc608\uc815 \uc18c\uc18d\uc5d0 \uc885\ub8cc \ub0a0\uc9dc\uac00 \uc788\uc2b5\ub2c8\ub2e4. \uc2e4\uc81c\ub85c \ub2eb\ud78c \uc774\ub825\uc774 \uc544\ub2c8\ub77c\uba74 \ub0a0\uc9dc\ub97c \ub2e4\uc2dc \ud655\uc778\ud558\uc138\uc694."
      : "Planned roles usually should not have an end date yet. Recheck the dates if this role has not closed.";
  }

  return locale === "ko"
    ? "\ud0c0\uc784\ub77c\uc778 \uc815\ub82c \uc644\ub8cc. \uc0c1\ud0dc\ub098 \ub0a0\uc9dc\uac00 \ubc14\ub00c \ub54c\ub9cc \uc218\uc815\ud558\uc138\uc694."
    : "Timeline aligned. Edit this only when the status or dates change.";
}

function needsTimelineCorrection(entry: AffiliationTimelineEntry) {
  return (
    (entry.active && entry.appointmentStatus !== "active") ||
    (!entry.active && entry.appointmentStatus === "active") ||
    (entry.active && Boolean(entry.endDate)) ||
    (!entry.active && entry.appointmentStatus === "completed" && !entry.endDate) ||
    (entry.appointmentStatus === "planned" && Boolean(entry.endDate))
  );
}

function getAffiliationActionBadge(
  entry: AffiliationTimelineEntry,
  locale: Locale,
) {
  if (needsTimelineCorrection(entry)) {
    return {
      className: "pill-amber",
      label: getTimelineCorrectionBadgeLabel(entry, locale),
    };
  }

  if (entry.active) {
    return {
      className: "pill-green",
      label: locale === "ko" ? "\ubcc0\uacbd \uc2dc \uac31\uc2e0" : "Update on role change",
    };
  }

  if (entry.appointmentStatus === "planned" || entry.appointmentStatus === "paused") {
    return {
      className: "pill-amber",
      label: locale === "ko" ? "\ub2e4\uc74c \uc0c1\ud0dc \uacb0\uc815" : "Decide next status",
    };
  }

  return {
    className: "pill-gray",
    label: locale === "ko" ? "\ud544\uc694 \uc2dc\ub9cc \ubcf4\uc815" : "Reference only",
  };
}

function getEditActionLabel(entry: AffiliationTimelineEntry, locale: Locale) {
  if (entry.active) {
    return locale === "ko"
      ? "\uc0c1\ud0dc\u00b7\ub0a0\uc9dc \uc218\uc815"
      : "Update status and dates";
  }

  if (entry.appointmentStatus === "planned" || entry.appointmentStatus === "paused") {
    return locale === "ko" ? "\ub2e4\uc74c \uc0c1\ud0dc \uacb0\uc815" : "Decide next status";
  }

  return locale === "ko" ? "\ubcf4\uad00 \uae30\ub85d \ubcf4\uc815" : "Correct archived record";
}

function getTimelineEditorSectionLabel(locale: Locale) {
  return locale === "ko" ? "\ud0c0\uc784\ub77c\uc778 \uba3c\uc800" : "Timeline first";
}

function getTimelineEditorSectionHint(
  entry: AffiliationTimelineEntry,
  locale: Locale,
) {
  if (entry.active) {
    return locale === "ko"
      ? "\uc774 \uc18c\uc18d\uc774 \uc5b4\ub514\uc5d0 \ub180\uc9c0 \uba3c\uc800 \uace0\uc815\ud558\uc138\uc694. \uc0c1\ud0dc, \ud0c0\uc784\ub77c\uc778 \ud604\uc7ac \uc5ec\ubd80, \uc2dc\uc791\u00b7\uc885\ub8cc \ub0a0\uc9dc\uac00 \ubcf4\uae30 \uc21c\uc11c\ub97c \uacb0\uc815\ud569\ub2c8\ub2e4."
      : "Set the timeline placement first. Status, whether it shows with Current affiliations, and start or end dates decide where this entry appears.";
  }

  if (entry.appointmentStatus === "planned" || entry.appointmentStatus === "paused") {
    return locale === "ko"
      ? "\uc7ac\uac1c, \uc720\uc9c0, \uc885\ub8cc \uc911 \uc5b4\ub5a4 \uc0c1\ud0dc\uc778\uc9c0 \uba3c\uc800 \uc815\ud558\uace0 \ub0a0\uc9dc\ub97c \ub9de\ucdb0 \ud0c0\uc784\ub77c\uc778 \uc704\uce58\ub97c \uc815\ub9ac\ud558\uc138\uc694."
      : "Decide whether this role should resume, stay queued, or close, then align the dates before editing details.";
  }

  return locale === "ko"
    ? "\ub2eb\ud78c \uc774\ub825\uc740 \uc885\ub8cc \ub0a0\uc9dc\uc640 \uc0c1\ud0dc\uac00 \uba3c\uc800\uc785\ub2c8\ub2e4. \ud0c0\uc784\ub77c\uc778\uc744 \ub9de\ucd98 \ub4a4 \uc138\ubd80 \uc815\ubcf4\ub97c \uc815\ub9ac\ud558\uc138\uc694."
    : "Closed roles should confirm their final status and dates first, then clean up the remaining details.";
}

function getDetailsEditorSectionLabel(locale: Locale) {
  return locale === "ko" ? "\uae30\uad00 \uc815\ubcf4 \uc815\ub9ac" : "Institution details";
}

function getDetailsEditorSectionHint(locale: Locale) {
  return locale === "ko"
    ? "\ud0c0\uc784\ub77c\uc778\uc744 \ub9de\ucd98 \ub4a4 \uae30\uad00, \uc5ed\ud560, \ud559\uacfc, \uc5f0\uad6c\uc2e4, \uba54\ubaa8\ub97c \uc815\ub9ac\ud558\uc138\uc694."
    : "Once the timeline is correct, verify institution, role, department, lab, and notes together.";
}

function getPriorityEntryLabel(
  locale: Locale,
  section: AffiliationSectionKey = "current",
) {
  if (section === "queued") {
    return locale === "ko" ? "\ub2e4\uc74c \ud655\uc778 \ud56d\ubaa9" : "Next follow-up";
  }

  return locale === "ko" ? "\uc6b0\uc120 \ud655\uc778 \ud56d\ubaa9" : "Priority entry";
}

function getAffiliationDisplayLabel(
  entry: AffiliationTimelineEntry,
  text: (typeof copy)[Locale],
) {
  const primaryLabel = entry.roleTitle.trim() || entry.institutionName.trim();

  return primaryLabel.length > 0 ? primaryLabel : text.item;
}

function getEditableAffiliationHeading(
  entry: AffiliationTimelineEntry,
  index: number,
  locale: Locale,
  text: (typeof copy)[Locale],
) {
  const primaryLabel = getAffiliationDisplayLabel(entry, text);

  if (primaryLabel !== text.item) {
    return primaryLabel;
  }

  return locale === "ko" ? `${text.item} ${index + 1}` : `${text.item} ${index + 1}`;
}

type AffiliationSectionKey = "current" | "queued" | "archived";

const defaultAffiliationSectionOrder: AffiliationSectionKey[] = [
  "current",
  "queued",
  "archived",
];

function getAffiliationSectionKey(
  entry: AffiliationTimelineEntry,
): AffiliationSectionKey {
  if (entry.active) {
    return "current";
  }

  if (entry.appointmentStatus === "planned" || entry.appointmentStatus === "paused") {
    return "queued";
  }

  return "archived";
}

function getAffiliationSectionOrder(
  entry: AffiliationTimelineEntry | null,
) {
  if (!entry) {
    return defaultAffiliationSectionOrder;
  }

  const prioritizedSection = getAffiliationSectionKey(entry);

  return [
    prioritizedSection,
    ...defaultAffiliationSectionOrder.filter((section) => section !== prioritizedSection),
  ];
}

function getAffiliationSections(items: AffiliationTimelineEntry[]) {
  return {
    current: items.filter((item) => item.active),
    queued: items.filter(
      (item) =>
        !item.active &&
        (item.appointmentStatus === "planned" || item.appointmentStatus === "paused"),
    ),
    archived: items.filter(
      (item) =>
        !item.active &&
        item.appointmentStatus !== "planned" &&
        item.appointmentStatus !== "paused",
    ),
  };
}

function getAffiliationStats(items: AffiliationTimelineEntry[], locale: Locale) {
  const currentCount = items.filter((item) => item.active).length;
  const queuedCount = items.filter(
    (item) => item.appointmentStatus === "planned" || item.appointmentStatus === "paused",
  ).length;
  const archivedCount = items.filter(
    (item) => !item.active && item.appointmentStatus === "completed",
  ).length;

  return [
    {
      label: locale === "ko" ? "\ud604\uc7ac \uc18c\uc18d" : "Current roles",
      value: currentCount,
      detail:
        locale === "ko"
          ? "\uc9c0\uae08 \uc9c4\ud589 \uc911\uc778 \uc5ed\ud560"
          : "Roles to review first when dates or status change",
    },
    {
      label: locale === "ko" ? "\ubcf4\ub958 \ubc0f \uc608\uc815" : "Planned or paused",
      value: queuedCount,
      detail:
        locale === "ko"
          ? "\ub2e4\uc74c \uc5c5\ub370\uc774\ud2b8 \ud6c4\ubcf4"
          : "Entries that may need a restart or status update",
    },
    {
      label: locale === "ko" ? "\uc885\ub8cc \uae30\ub85d" : "Archived roles",
      value: archivedCount,
      detail:
        locale === "ko"
          ? "\uc885\ub8cc\ub41c \ud0c0\uc784\ub77c\uc778"
          : "Completed timeline entries kept for reference",
    },
  ];
}

function prioritizeAffiliation(
  items: AffiliationTimelineEntry[],
  prioritizedId: string | null,
) {
  if (!prioritizedId) {
    return items;
  }

  const prioritizedIndex = items.findIndex((item) => item.id === prioritizedId);
  if (prioritizedIndex <= 0) {
    return items;
  }

  return [
    items[prioritizedIndex],
    ...items.slice(0, prioritizedIndex),
    ...items.slice(prioritizedIndex + 1),
  ];
}

function prioritizeSectionItems(
  items: AffiliationTimelineEntry[],
  prioritizedId: string | null,
) {
  const prioritizedEntry =
    prioritizedId === null ? null : items.find((item) => item.id === prioritizedId) ?? null;
  const remainingItems =
    prioritizedEntry === null
      ? items
      : items.filter((item) => item.id !== prioritizedEntry.id);

  return [
    ...(prioritizedEntry === null ? [] : [prioritizedEntry]),
    ...remainingItems.filter((item) => needsTimelineCorrection(item)),
    ...remainingItems.filter((item) => !needsTimelineCorrection(item)),
  ];
}

function getNextAffiliationFocusId(items: AffiliationTimelineEntry[]) {
  const orderedItems = sortAffiliations(items);

  return (
    orderedItems.find((item) => needsTimelineCorrection(item))?.id ??
    orderedItems[0]?.id ??
    null
  );
}

export function AffiliationWorkspace({
  locale,
  affiliations,
  documents,
  embedded = false,
}: AffiliationWorkspaceProps) {
  const { currentAccount } = useAuth();
  const text = copy[locale];
  const [resolvedDocuments, setResolvedDocuments] = useState<DocumentRecord[]>(documents);
  const [resolvedAffiliations, setResolvedAffiliations] =
    useState<AffiliationTimelineEntry[]>(affiliations);
  const [draftAffiliations, setDraftAffiliations] =
    useState<AffiliationTimelineEntry[]>(affiliations);
  const [isEditing, setIsEditing] = useState(false);
  const editableCardRefs = useRef<Record<string, HTMLElement | null>>({});
  const [focusedAffiliationId, setFocusedAffiliationId] = useState<string | null>(null);
  const [editingAffiliationId, setEditingAffiliationId] = useState<string | null>(null);
  const orderedResolvedAffiliations = sortAffiliations(resolvedAffiliations);
  const orderedDraftAffiliations = prioritizeAffiliation(
    sortAffiliations(draftAffiliations),
    focusedAffiliationId,
  );
  const affiliationOverview = getAffiliationOverview(orderedResolvedAffiliations, locale);
  const affiliationStats = getAffiliationStats(orderedResolvedAffiliations, locale);
  const {
    current: currentAffiliations,
    queued: queuedAffiliations,
    archived: archivedAffiliations,
  } = (() => {
    const sections = getAffiliationSections(orderedResolvedAffiliations);

    return {
      current: prioritizeSectionItems(sections.current, null),
      queued: prioritizeSectionItems(sections.queued, null),
      archived: prioritizeSectionItems(sections.archived, null),
    };
  })();
  const currentCorrections = currentAffiliations.filter((item) =>
    needsTimelineCorrection(item),
  ).length;
  const currentPriorityAffiliation =
    currentAffiliations.find((item) => needsTimelineCorrection(item)) ?? currentAffiliations[0];
  const queuedCorrections = queuedAffiliations.filter((item) =>
    needsTimelineCorrection(item),
  ).length;
  const queuedPriorityAffiliation =
    queuedAffiliations.find((item) => needsTimelineCorrection(item)) ?? queuedAffiliations[0];
  const archivedCorrections = archivedAffiliations.filter((item) =>
    needsTimelineCorrection(item),
  ).length;
  const archivedPriorityAffiliation =
    archivedAffiliations.find((item) => needsTimelineCorrection(item)) ??
    archivedAffiliations[0];
  const {
    current: currentDraftAffiliations,
    queued: queuedDraftAffiliations,
    archived: archivedDraftAffiliations,
  } =
    (() => {
      const sections = getAffiliationSections(orderedDraftAffiliations);

      return {
        current: prioritizeSectionItems(sections.current, focusedAffiliationId),
        queued: prioritizeSectionItems(sections.queued, focusedAffiliationId),
        archived: prioritizeSectionItems(sections.archived, focusedAffiliationId),
      };
    })();
  const currentDraftCorrections = currentDraftAffiliations.filter((item) =>
    needsTimelineCorrection(item),
  ).length;
  const currentDraftPriorityAffiliation =
    currentDraftAffiliations.find((item) => needsTimelineCorrection(item)) ??
    currentDraftAffiliations[0];
  const queuedDraftCorrections = queuedDraftAffiliations.filter((item) =>
    needsTimelineCorrection(item),
  ).length;
  const queuedDraftPriorityAffiliation =
    queuedDraftAffiliations.find((item) => needsTimelineCorrection(item)) ??
    queuedDraftAffiliations[0];
  const archivedDraftCorrections = archivedDraftAffiliations.filter((item) =>
    needsTimelineCorrection(item),
  ).length;
  const archivedDraftPriorityAffiliation =
    archivedDraftAffiliations.find((item) => needsTimelineCorrection(item)) ??
    archivedDraftAffiliations[0];
  const focusedDraftAffiliation = focusedAffiliationId
    ? orderedDraftAffiliations.find((item) => item.id === focusedAffiliationId) ?? null
    : null;
  const activeDraftAffiliationId = editingAffiliationId ?? focusedAffiliationId;
  const activeDraftAffiliation = activeDraftAffiliationId
    ? orderedDraftAffiliations.find((item) => item.id === activeDraftAffiliationId) ?? null
    : null;
  const editSectionOrder = getAffiliationSectionOrder(focusedDraftAffiliation);

  const setActiveAffiliation = (id: string | null) => {
    setFocusedAffiliationId(id);
    setEditingAffiliationId(id);
  };

  useEffect(() => {
    setResolvedDocuments(loadBrowserDocuments(documents));
  }, [documents]);

  useEffect(() => {
    if (!currentAccount?.id) {
      setResolvedAffiliations(affiliations);
      return;
    }

    setResolvedAffiliations(loadBrowserAffiliationsForAccount(currentAccount.id, affiliations));
  }, [affiliations, currentAccount?.id]);

  useEffect(() => {
    if (!isEditing) {
      setDraftAffiliations(resolvedAffiliations);
      setFocusedAffiliationId(null);
      setEditingAffiliationId(null);
    }
  }, [isEditing, resolvedAffiliations]);

  useEffect(() => {
    if (!currentAccount?.id) {
      return;
    }

    let cancelled = false;

    void syncDocumentsForAccount(currentAccount.id)
      .then((serverDocuments) => {
        if (!cancelled && serverDocuments) {
          setResolvedDocuments(serverDocuments);
        }
      })
      .catch(() => {
        // Keep the local cache path alive when the server sync is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [currentAccount?.id]);

  useEffect(() => {
    if (!currentAccount?.id) {
      return;
    }

    let cancelled = false;

    void syncAffiliationsForAccount(currentAccount.id, affiliations)
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
  }, [affiliations, currentAccount?.id]);

  useEffect(() => {
    if (!isEditing || !activeDraftAffiliationId) {
      return;
    }

    const targetCard = editableCardRefs.current[activeDraftAffiliationId];
    if (!targetCard) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      targetCard.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [activeDraftAffiliationId, isEditing]);

  const handleOpenEdit = () => {
    setDraftAffiliations(resolvedAffiliations);
    const nextAffiliationId = getNextAffiliationFocusId(resolvedAffiliations);
    setActiveAffiliation(nextAffiliationId);
    setIsEditing(true);
  };

  const handleEditAffiliation = (id: string) => {
    setDraftAffiliations(resolvedAffiliations);
    setActiveAffiliation(id);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setDraftAffiliations(resolvedAffiliations);
    setActiveAffiliation(null);
    setIsEditing(false);
  };

  const handleAddAffiliation = () => {
    const nextAffiliation = createEmptyAffiliation(currentAccount?.id ?? null);
    setDraftAffiliations((current) => [...current, nextAffiliation]);
    setActiveAffiliation(nextAffiliation.id);
  };

  const handleUpdateAffiliation = (
    id: string,
    patch: Partial<AffiliationTimelineEntry>,
  ) => {
    setDraftAffiliations((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const handleRemoveAffiliation = (id: string) => {
    const nextAffiliations = draftAffiliations.filter((item) => item.id !== id);
    const nextAffiliationId = getNextAffiliationFocusId(nextAffiliations);

    setDraftAffiliations(nextAffiliations);
    if (focusedAffiliationId === id || editingAffiliationId === id) {
      setActiveAffiliation(nextAffiliationId);
    }
  };

  const handleSaveAffiliations = async () => {
    if (!currentAccount?.id) {
      return;
    }

    const nextAffiliations = draftAffiliations
      .map(normalizeAffiliation)
      .filter(
        (item) =>
          item.institutionName.length > 0 && item.roleTitle.length > 0 && item.startDate.length > 0,
      );

    try {
      const persistedAffiliations = await replaceAffiliationsForAccount(
        currentAccount.id,
        nextAffiliations,
      );
      setResolvedAffiliations(persistedAffiliations);
      setDraftAffiliations(persistedAffiliations);
      setFocusedAffiliationId(null);
      setEditingAffiliationId(null);
      setIsEditing(false);
    } catch {
      // Keep the editor open so the user can retry.
    }
  };

  const renderSectionPrioritySummary = (
    section: AffiliationSectionKey,
    affiliation: AffiliationTimelineEntry | undefined,
    enableDirectEdit = false,
  ) => {
    if (!affiliation) {
      return null;
    }

    return (
      <>
        <dl className="field-list">
          <div className="field-row">
            <dt>{getPriorityEntryLabel(locale, section)}</dt>
            <dd>
              {getAffiliationDisplayLabel(affiliation, text)} /{" "}
              {joinAffiliationSummary(affiliation) || text.institution}
            </dd>
          </div>
          <div className="field-row">
            <dt>{getTimelineSnapshotLabel(locale)}</dt>
            <dd>{getAffiliationScanSummary(affiliation, locale)}</dd>
          </div>
          <div className="field-row">
            <dt>{getNextUpdateLabel(locale)}</dt>
            <dd>{getPrimaryNextActionSummary(affiliation, locale)}</dd>
          </div>
        </dl>
        {enableDirectEdit ? (
          <div className="editor-actions">
            <button
              type="button"
              className="secondary-cta profile-inline-btn"
              onClick={() => handleEditAffiliation(affiliation.id)}
            >
              <PencilLine size={15} />
              {getPrimaryEditButtonLabel(affiliation, locale)}
            </button>
          </div>
        ) : null}
      </>
    );
  };

  const renderReadOnlyAffiliationCard = (affiliation: AffiliationTimelineEntry) => {
    const actionBadge = getAffiliationActionBadge(affiliation, locale);

    return (
      <section className="card profile-detail-card" key={affiliation.id}>
        <div className="card-header">
          <div>
            <h3>{affiliation.roleTitle}</h3>
            <p className="card-support-text">{getAffiliationOnePassSummary(affiliation, locale)}</p>
            <dl className="field-list">
              <div className="field-row">
                <dt>{text.institution}</dt>
                <dd>{joinAffiliationSummary(affiliation) || text.institution}</dd>
              </div>
              <div className="field-row">
                <dt>{getTimelineSnapshotLabel(locale)}</dt>
                <dd>{getAffiliationScanSummary(affiliation, locale)}</dd>
              </div>
              <div className="field-row">
                <dt>{getNextUpdateLabel(locale)}</dt>
                <dd>{getPrimaryNextActionSummary(affiliation, locale)}</dd>
              </div>
              <div className="field-row">
                <dt>{getEditFocusLabel(locale)}</dt>
                <dd>{getEditFocusHint(affiliation, locale)}</dd>
              </div>
              <div className="field-row">
                <dt>{getTimelineCheckLabel(locale)}</dt>
                <dd>{getTimelineCheckSummary(affiliation, locale, text)}</dd>
              </div>
            </dl>
          </div>
          <div className="profile-history-side">
            <span className={`pill ${getAffiliationStatusClass(affiliation)}`}>
              {getAffiliationStateLabel(affiliation, locale)}
            </span>
            <span className={`pill ${actionBadge.className}`}>{actionBadge.label}</span>
            <button
              type="button"
              className="profile-inline-btn"
              onClick={() => handleEditAffiliation(affiliation.id)}
              aria-label={getPrimaryEditButtonLabel(affiliation, locale)}
            >
              <PencilLine size={15} />
              {getPrimaryEditButtonLabel(affiliation, locale)}
            </button>
          </div>
        </div>

        <div className="card-body">
          <div className="profile-history-item profile-history-item-compact">
            <div className="profile-history-period">
              <strong>{affiliation.startDate}</strong>
              <span>{getTimelineEndLabel(affiliation, locale, text)}</span>
            </div>
            <div className="profile-history-body">
              <dl className="field-list">
                <div className="field-row">
                  <dt>{text.appointmentStatus}</dt>
                  <dd>{text.appointmentLabels[affiliation.appointmentStatus]}</dd>
                </div>
                <div className="field-row">
                  <dt>{getCurrentTimelineLabel(locale)}</dt>
                  <dd>{getCurrentTimelineValue(affiliation.active, locale)}</dd>
                </div>
                <div className="field-row">
                  <dt>{getTimelinePlacementLabel(locale)}</dt>
                  <dd>{getTimelinePlacementScanSummary(affiliation, locale)}</dd>
                </div>
              </dl>
              {(affiliation.department || affiliation.labName) && (
                <div className="profile-history-meta">
                  {affiliation.department ? (
                    <span>
                      <strong>{text.department}</strong>
                      {affiliation.department}
                    </span>
                  ) : null}
                  {affiliation.labName ? (
                    <span>
                      <strong>{text.lab}</strong>
                      {affiliation.labName}
                    </span>
                  ) : null}
                </div>
              )}
              {affiliation.notes ? (
                <dl className="field-list">
                  <div className="field-row">
                    <dt>{text.notes}</dt>
                    <dd>{affiliation.notes}</dd>
                  </div>
                </dl>
              ) : null}
            </div>
          </div>

          <DocumentEvidencePicker
            evidenceKey={`affiliation:${affiliation.id}`}
            documents={resolvedDocuments}
            locale={locale}
            title={text.evidence}
          />
        </div>
      </section>
    );
  };

  const renderEditableAffiliationCard = (
    affiliation: AffiliationTimelineEntry,
    index: number,
  ) => {
    const isEditingNow = activeDraftAffiliationId === affiliation.id;
    const actionBadge = getAffiliationActionBadge(affiliation, locale);
    const appointmentStatusHint = getAppointmentStatusFieldHint(affiliation, locale);
    const endDateHint = getEndDateFieldHint(affiliation, locale);

    return (
      <section
        className="card profile-edit-card"
        key={affiliation.id}
        ref={(node) => {
          editableCardRefs.current[affiliation.id] = node;
        }}
        onFocusCapture={() => {
          if (focusedAffiliationId !== affiliation.id || editingAffiliationId !== affiliation.id) {
            setActiveAffiliation(affiliation.id);
          }
        }}
      >
      <div className="card-header">
        <div>
          <h3>{getEditableAffiliationHeading(affiliation, index, locale, text)}</h3>
          {isEditingNow ? (
            <p className="card-support-text">
              <strong>{getEditingNowLabel(locale)}</strong>
            </p>
          ) : null}
          <p className="card-support-text">{getAffiliationOnePassSummary(affiliation, locale)}</p>
          <p className="card-support-text">
            {joinAffiliationSummary(affiliation) || text.institution}
          </p>
          <dl className="field-list">
            <div className="field-row">
              <dt>{text.institution}</dt>
              <dd>{joinAffiliationSummary(affiliation) || text.institution}</dd>
            </div>
            <div className="field-row">
              <dt>{getTimelineSnapshotLabel(locale)}</dt>
              <dd>{getAffiliationScanSummary(affiliation, locale)}</dd>
            </div>
            <div className="field-row">
              <dt>{getNextUpdateLabel(locale)}</dt>
              <dd>{getPrimaryNextActionSummary(affiliation, locale)}</dd>
            </div>
            <div className="field-row">
              <dt>{getTimelinePlacementLabel(locale)}</dt>
              <dd>{getTimelinePlacementSummary(affiliation, locale)}</dd>
            </div>
            <div className="field-row">
              <dt>{getEditFocusLabel(locale)}</dt>
              <dd>{getEditFocusHint(affiliation, locale)}</dd>
            </div>
            <div className="field-row">
              <dt>{getCurrentTimelineLabel(locale)}</dt>
              <dd>{getCurrentTimelineValue(affiliation.active, locale)}</dd>
            </div>
            <div className="field-row">
              <dt>{getTimelineCheckLabel(locale)}</dt>
              <dd>{getTimelineCheckSummary(affiliation, locale, text)}</dd>
            </div>
            <div className="field-row">
              <dt>{getSaveReadinessLabel(locale)}</dt>
              <dd>{getAffiliationEditReadiness(affiliation, locale, text)}</dd>
            </div>
          </dl>
        </div>
        <div className="profile-history-side">
          {isEditingNow ? (
            <span className="pill pill-blue">{getEditingNowLabel(locale)}</span>
          ) : (
            <button
              type="button"
              className="secondary-cta profile-inline-btn"
              onClick={() => setActiveAffiliation(affiliation.id)}
            >
              <PencilLine size={15} />
              {getPrimaryEditButtonLabel(affiliation, locale)}
            </button>
          )}
          <span className={`pill ${getAffiliationStatusClass(affiliation)}`}>
            {getAffiliationStateLabel(affiliation, locale)}
          </span>
          <span className={`pill ${actionBadge.className}`}>{actionBadge.label}</span>
          <button
            type="button"
            className="profile-inline-btn"
            onClick={() => handleRemoveAffiliation(affiliation.id)}
          >
            <Trash2 size={15} />
            {text.remove}
          </button>
        </div>
      </div>
      <div className="card-body">
        <div>
          <h4>{getTimelineEditorSectionLabel(locale)}</h4>
          <p className="card-support-text">
            {getTimelineEditorSectionHint(affiliation, locale)}
          </p>
        </div>
        <div className="profile-form-grid">
          <label className="editor-field">
            <span>{text.appointmentStatus}</span>
            <select
              value={affiliation.appointmentStatus}
              onChange={(event) =>
                handleUpdateAffiliation(affiliation.id, {
                  appointmentStatus:
                    event.target.value as AffiliationTimelineEntry["appointmentStatus"],
                })
              }
            >
              {appointmentStatuses.map((value) => (
                <option key={value} value={value}>
                  {text.appointmentLabels[value]}
                </option>
                ))}
            </select>
            {appointmentStatusHint ? (
              <p className="card-support-text">{appointmentStatusHint}</p>
            ) : null}
          </label>
          <label className="editor-field">
            <span>{getCurrentTimelineLabel(locale)}</span>
            <select
              value={affiliation.active ? "active" : "inactive"}
              onChange={(event) =>
                handleUpdateAffiliation(affiliation.id, {
                  active: event.target.value === "active",
                })
              }
            >
              <option value="active">{getCurrentTimelineValue(true, locale)}</option>
              <option value="inactive">{getCurrentTimelineValue(false, locale)}</option>
            </select>
            <p className="card-support-text">{getCurrentTimelineHint(affiliation, locale)}</p>
          </label>
          <label className="editor-field">
            <span>{text.startDate}</span>
            <input
              type="date"
              value={affiliation.startDate}
              onChange={(event) =>
                handleUpdateAffiliation(affiliation.id, {
                  startDate: event.target.value,
                })
              }
            />
          </label>
          <label className="editor-field">
            <span>{text.endDate}</span>
            <input
              type="date"
              value={affiliation.endDate ?? ""}
              onChange={(event) =>
                handleUpdateAffiliation(affiliation.id, {
                  endDate: event.target.value,
                })
              }
            />
            {endDateHint ? <p className="card-support-text">{endDateHint}</p> : null}
          </label>
        </div>

        <div>
          <h4>{getDetailsEditorSectionLabel(locale)}</h4>
          <p className="card-support-text">{getDetailsEditorSectionHint(locale)}</p>
        </div>
        <div className="profile-form-grid">
          <label className="editor-field">
            <span>{text.institution}</span>
            <input
              value={affiliation.institutionName}
              onChange={(event) =>
                handleUpdateAffiliation(affiliation.id, {
                  institutionName: event.target.value,
                })
              }
            />
          </label>
          <label className="editor-field">
            <span>{text.roleTitle}</span>
            <input
              value={affiliation.roleTitle}
              onChange={(event) =>
                handleUpdateAffiliation(affiliation.id, {
                  roleTitle: event.target.value,
                })
              }
            />
          </label>
          <label className="editor-field">
            <span>{text.department}</span>
            <input
              value={affiliation.department ?? ""}
              onChange={(event) =>
                handleUpdateAffiliation(affiliation.id, {
                  department: event.target.value,
                })
              }
            />
          </label>
          <label className="editor-field">
            <span>{text.lab}</span>
            <input
              value={affiliation.labName ?? ""}
              onChange={(event) =>
                handleUpdateAffiliation(affiliation.id, {
                  labName: event.target.value,
                })
              }
            />
          </label>
          <label className="editor-field">
            <span>{text.organizationType}</span>
            <select
              value={affiliation.organizationType}
              onChange={(event) =>
                handleUpdateAffiliation(affiliation.id, {
                  organizationType: event.target.value as AffiliationTimelineEntry["organizationType"],
                })
              }
            >
              {organizationTypes.map((value) => (
                <option key={value} value={value}>
                  {text.organizationLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="editor-field">
            <span>{text.roleTrack}</span>
            <select
              value={affiliation.roleTrack}
              onChange={(event) =>
                handleUpdateAffiliation(affiliation.id, {
                  roleTrack: event.target.value as AffiliationTimelineEntry["roleTrack"],
                })
              }
            >
              {roleTracks.map((value) => (
                <option key={value} value={value}>
                  {text.roleTrackLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="editor-field editor-field-full">
            <span>{text.notes}</span>
            <textarea
              value={affiliation.notes ?? ""}
              onChange={(event) =>
                handleUpdateAffiliation(affiliation.id, {
                  notes: event.target.value,
                })
              }
            />
          </label>
        </div>
      </div>
    </section>
    );
  };

  return (
    <div className="page-standard workspace-page-shell affiliation-workspace">
      {embedded ? null : (
        <section className="card workspace-intro-card workspace-intro-card-compact">
          <div className="workspace-intro-top">
            <div className="workspace-intro-copy">
              <strong>{text.title}</strong>
              <p className="card-support-text">{text.subtitle}</p>
              <p className="card-support-text">{affiliationOverview}</p>
              {isEditing && activeDraftAffiliation ? (
                <dl className="field-list">
                  <div className="field-row">
                    <dt>{getEditingNowLabel(locale)}</dt>
                    <dd>
                      {getEditableAffiliationHeading(
                        activeDraftAffiliation,
                        0,
                        locale,
                        text,
                      )}{" "}
                      /{" "}
                      {joinAffiliationSummary(activeDraftAffiliation) || text.institution}
                    </dd>
                  </div>
                  <div className="field-row">
                    <dt>{getTimelineSnapshotLabel(locale)}</dt>
                    <dd>{getAffiliationScanSummary(activeDraftAffiliation, locale)}</dd>
                  </div>
                  <div className="field-row">
                    <dt>{getNextUpdateLabel(locale)}</dt>
                    <dd>{getPrimaryNextActionSummary(activeDraftAffiliation, locale)}</dd>
                  </div>
                  <div className="field-row">
                    <dt>{getTimelinePlacementLabel(locale)}</dt>
                    <dd>{getTimelinePlacementSummary(activeDraftAffiliation, locale)}</dd>
                  </div>
                  <div className="field-row">
                    <dt>{getTimelineCheckLabel(locale)}</dt>
                    <dd>{getTimelineCheckSummary(activeDraftAffiliation, locale, text)}</dd>
                  </div>
                  <div className="field-row">
                    <dt>{getEditFocusLabel(locale)}</dt>
                    <dd>{getEditFocusHint(activeDraftAffiliation, locale)}</dd>
                  </div>
                </dl>
              ) : null}
            </div>
            <div className="editor-actions">
              {isEditing ? (
                <>
                  <button type="button" className="secondary-cta" onClick={handleCancelEdit}>
                    <X size={16} />
                    {text.cancel}
                  </button>
                  <button type="button" className="primary-cta" onClick={handleSaveAffiliations}>
                    <Save size={16} />
                    {text.save}
                  </button>
                </>
              ) : (
                <button type="button" className="primary-cta" onClick={handleOpenEdit}>
                  <PencilLine size={16} />
                  {text.edit}
                </button>
              )}
            </div>
          </div>
          <div className="document-intro-stats" aria-label={getTimelineSnapshotLabel(locale)}>
            {affiliationStats.map((stat) => (
              <div className="document-intro-stat" key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
                <p className="card-support-text">{stat.detail}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {isEditing ? (
        <>
          <div className="detail-cards">
            {orderedDraftAffiliations.length === 0 ? (
              <section className="card profile-detail-card">
                <div className="card-body">
                  <p className="card-support-text">{text.emptyEditing}</p>
                </div>
              </section>
            ) : null}

            {editSectionOrder.map((section) => {
              if (section === "current" && currentDraftAffiliations.length > 0) {
                return (
                  <section className="card profile-detail-card" key={section}>
                    <div className="card-header">
                      <div>
                        <h3>{getCurrentSectionLabel(locale, currentDraftAffiliations.length)}</h3>
                        <p className="card-support-text">
                          {[
                            getCurrentEditSectionHint(locale, currentDraftAffiliations.length),
                            getTimelineCorrectionSectionHint(locale, currentDraftCorrections),
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        </p>
                        {renderSectionPrioritySummary(
                          "current",
                          currentDraftPriorityAffiliation,
                        )}
                      </div>
                    </div>
                    <div className="card-body detail-cards">
                      {currentDraftAffiliations.map((affiliation, index) =>
                        renderEditableAffiliationCard(affiliation, index),
                      )}
                    </div>
                  </section>
                );
              }

              if (section === "queued" && queuedDraftAffiliations.length > 0) {
                return (
                  <section className="card profile-detail-card" key={section}>
                    <div className="card-header">
                      <div>
                        <h3>{getQueuedSectionLabel(locale, queuedDraftAffiliations.length)}</h3>
                        <p className="card-support-text">
                          {[
                            getQueuedEditSectionHint(locale, queuedDraftAffiliations.length),
                            getTimelineCorrectionSectionHint(locale, queuedDraftCorrections),
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        </p>
                        {renderSectionPrioritySummary(
                          "queued",
                          queuedDraftPriorityAffiliation,
                        )}
                      </div>
                    </div>
                    <div className="card-body detail-cards">
                      {queuedDraftAffiliations.map((affiliation, index) =>
                        renderEditableAffiliationCard(
                          affiliation,
                          currentDraftAffiliations.length + index,
                        ),
                      )}
                    </div>
                  </section>
                );
              }

              if (section === "archived" && archivedDraftAffiliations.length > 0) {
                return (
                  <section className="card profile-detail-card" key={section}>
                    <div className="card-header">
                      <div>
                        <h3>{getArchivedSectionLabel(locale, archivedDraftAffiliations.length)}</h3>
                        <p className="card-support-text">
                          {[
                            getArchivedEditSectionHint(locale, archivedDraftAffiliations.length),
                            getTimelineCorrectionSectionHint(locale, archivedDraftCorrections),
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        </p>
                        {renderSectionPrioritySummary(
                          "archived",
                          archivedDraftPriorityAffiliation,
                        )}
                      </div>
                    </div>
                    <div className="card-body detail-cards">
                      {archivedDraftAffiliations.map((affiliation, index) =>
                        renderEditableAffiliationCard(
                          affiliation,
                          currentDraftAffiliations.length + queuedDraftAffiliations.length + index,
                        ),
                      )}
                    </div>
                  </section>
                );
              }

              return null;
            })}

            {false ? orderedDraftAffiliations.map((affiliation, index) => (
              <section className="card profile-edit-card" key={affiliation.id}>
                <div className="card-header">
                  <div>
                    <h3>
                      {text.item} {index + 1}
                    </h3>
                    <p className="card-support-text">
                      {[
                        affiliation.roleTitle || affiliation.institutionName || text.institution,
                        affiliation.startDate
                          ? getTimelineSummary(affiliation, locale)
                          : text.startDate,
                        affiliation.active
                          ? locale === "ko"
                            ? "현재 진행 중"
                            : "Current role"
                          : text.appointmentLabels[affiliation.appointmentStatus],
                      ].join(" / ")}
                    </p>
                    <p className="card-support-text">
                      {joinAffiliationSummary(affiliation) || text.institution}
                    </p>
                    <p className="card-support-text">
                      {getAffiliationEditReadiness(affiliation, locale, text)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="profile-inline-btn"
                    onClick={() => handleRemoveAffiliation(affiliation.id)}
                  >
                    <Trash2 size={15} />
                    {text.remove}
                  </button>
                </div>
                <div className="card-body">
                  <div className="profile-form-grid">
                    <label className="editor-field">
                      <span>{text.institution}</span>
                      <input
                        value={affiliation.institutionName}
                        onChange={(event) =>
                          handleUpdateAffiliation(affiliation.id, {
                            institutionName: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="editor-field">
                      <span>{text.roleTitle}</span>
                      <input
                        value={affiliation.roleTitle}
                        onChange={(event) =>
                          handleUpdateAffiliation(affiliation.id, {
                            roleTitle: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="editor-field">
                      <span>{text.department}</span>
                      <input
                        value={affiliation.department ?? ""}
                        onChange={(event) =>
                          handleUpdateAffiliation(affiliation.id, {
                            department: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="editor-field">
                      <span>{text.lab}</span>
                      <input
                        value={affiliation.labName ?? ""}
                        onChange={(event) =>
                          handleUpdateAffiliation(affiliation.id, {
                            labName: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="editor-field">
                      <span>{text.organizationType}</span>
                      <select
                        value={affiliation.organizationType}
                        onChange={(event) =>
                          handleUpdateAffiliation(affiliation.id, {
                            organizationType: event.target.value as AffiliationTimelineEntry["organizationType"],
                          })
                        }
                      >
                        {organizationTypes.map((value) => (
                          <option key={value} value={value}>
                            {text.organizationLabels[value]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="editor-field">
                      <span>{text.roleTrack}</span>
                      <select
                        value={affiliation.roleTrack}
                        onChange={(event) =>
                          handleUpdateAffiliation(affiliation.id, {
                            roleTrack: event.target.value as AffiliationTimelineEntry["roleTrack"],
                          })
                        }
                      >
                        {roleTracks.map((value) => (
                          <option key={value} value={value}>
                            {text.roleTrackLabels[value]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="editor-field">
                      <span>{text.appointmentStatus}</span>
                      <select
                        value={affiliation.appointmentStatus}
                        onChange={(event) =>
                          handleUpdateAffiliation(affiliation.id, {
                            appointmentStatus:
                              event.target.value as AffiliationTimelineEntry["appointmentStatus"],
                          })
                        }
                      >
                        {appointmentStatuses.map((value) => (
                          <option key={value} value={value}>
                            {text.appointmentLabels[value]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="editor-field">
                      <span>{text.startDate}</span>
                      <input
                        type="date"
                        value={affiliation.startDate}
                        onChange={(event) =>
                          handleUpdateAffiliation(affiliation.id, {
                            startDate: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="editor-field">
                      <span>{text.endDate}</span>
                      <input
                        type="date"
                        value={affiliation.endDate ?? ""}
                        onChange={(event) =>
                          handleUpdateAffiliation(affiliation.id, {
                            endDate: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="editor-field">
                      <span>{text.active}</span>
                      <select
                        value={affiliation.active ? "active" : "inactive"}
                        onChange={(event) =>
                          handleUpdateAffiliation(affiliation.id, {
                            active: event.target.value === "active",
                          })
                        }
                      >
                        <option value="active">{text.active}</option>
                        <option value="inactive">{text.inactive}</option>
                      </select>
                    </label>
                    <label className="editor-field editor-field-full">
                      <span>{text.notes}</span>
                      <textarea
                        value={affiliation.notes ?? ""}
                        onChange={(event) =>
                          handleUpdateAffiliation(affiliation.id, {
                            notes: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                </div>
              </section>
            )) : null}
          </div>

          <div className="editor-actions">
            <button type="button" className="secondary-cta" onClick={handleAddAffiliation}>
              <Plus size={16} />
              {text.add}
            </button>
          </div>
        </>
      ) : (
        <div className="detail-cards">
          {orderedResolvedAffiliations.length === 0 ? (
            <section className="card profile-detail-card">
              <div className="card-body">
                <p className="card-support-text">{text.empty}</p>
              </div>
            </section>
          ) : null}

          {currentAffiliations.length > 0 ? (
            <section className="card profile-detail-card">
              <div className="card-header">
                <div>
                  <h3>{getCurrentSectionLabel(locale, currentAffiliations.length)}</h3>
                  <p className="card-support-text">
                    {[
                      getCurrentSectionHint(locale, currentAffiliations.length),
                      getTimelineCorrectionSectionHint(locale, currentCorrections),
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                  {renderSectionPrioritySummary("current", currentPriorityAffiliation, true)}
                </div>
              </div>
              <div className="card-body detail-cards">
                {currentAffiliations.map(renderReadOnlyAffiliationCard)}
              </div>
            </section>
          ) : null}

          {queuedAffiliations.length > 0 ? (
            <section className="card profile-detail-card">
              <div className="card-header">
                <div>
                  <h3>{getQueuedSectionLabel(locale, queuedAffiliations.length)}</h3>
                  <p className="card-support-text">
                    {[
                      getQueuedSectionHint(locale, queuedAffiliations.length),
                      getTimelineCorrectionSectionHint(locale, queuedCorrections),
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                  {renderSectionPrioritySummary("queued", queuedPriorityAffiliation, true)}
                </div>
              </div>
              <div className="card-body detail-cards">
                {queuedAffiliations.map(renderReadOnlyAffiliationCard)}
              </div>
            </section>
          ) : null}

          {archivedAffiliations.length > 0 ? (
            <section className="card profile-detail-card">
              <div className="card-header">
                <div>
                  <h3>{getArchivedSectionLabel(locale, archivedAffiliations.length)}</h3>
                  <p className="card-support-text">
                    {[
                      getArchivedSectionHint(locale, archivedAffiliations.length),
                      getTimelineCorrectionSectionHint(locale, archivedCorrections),
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                  {renderSectionPrioritySummary("archived", archivedPriorityAffiliation, true)}
                </div>
              </div>
              <div className="card-body detail-cards">
                {archivedAffiliations.map(renderReadOnlyAffiliationCard)}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
