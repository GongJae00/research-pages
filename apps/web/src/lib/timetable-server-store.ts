"use client";

import { timetableEntrySchema, type TimetableEntry } from "@research-os/types";

import { getCollaborationBackendStatus } from "./collaboration/runtime";
import { writeJsonToStorage } from "./browser-json-store";
import { buildScopedStorageKeyForAccount } from "./mock-auth-store";
import { getSupabaseBrowserClient } from "./supabase/browser-client";

type TimetableRow = {
  id: string;
  schedule_id: string;
  course_title: string;
  course_code: string | null;
  kind: TimetableEntry["kind"];
  location: string | null;
  notes: string | null;
  day_of_week: TimetableEntry["dayOfWeek"];
  start_time: string;
  end_time: string;
  term_id: string | null;
};

const timetableStorageBaseKey = "researchos:timetable-workspace:v4";
const timetableSelect =
  "id, schedule_id, course_title, course_code, kind, location, notes, day_of_week, start_time, end_time, term_id";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hasServerTimetableStore() {
  const backendStatus = getCollaborationBackendStatus();
  return backendStatus.currentMode === "supabase" && backendStatus.supabaseConfigured;
}

function createUuid() {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${Date.now().toString(16).padStart(8, "0")}-0000-4000-8000-${Math.random()
    .toString(16)
    .slice(2, 14)
    .padEnd(12, "0")
    .slice(0, 12)}`;
}

function ensureUuid(value?: string) {
  return value && uuidPattern.test(value) ? value : createUuid();
}

function mapTimetableRow(row: TimetableRow): TimetableEntry {
  return timetableEntrySchema.parse({
    id: row.id,
    scheduleId: row.schedule_id,
    courseTitle: row.course_title,
    courseCode: row.course_code ?? undefined,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
    kind: row.kind,
    location: row.location ?? undefined,
    notes: row.notes ?? undefined,
  });
}

function writeTimetableCache(
  accountId: string,
  entriesByTerm: Record<string, TimetableEntry[]>,
) {
  writeJsonToStorage(buildScopedStorageKeyForAccount(timetableStorageBaseKey, accountId), entriesByTerm);
}

function groupEntriesByTerm(rows: TimetableRow[]) {
  const grouped: Record<string, TimetableEntry[]> = {};

  rows.forEach((row) => {
    const termId = row.term_id ?? "unassigned";
    grouped[termId] ??= [];
    grouped[termId].push(mapTimetableRow(row));
  });

  return grouped;
}

function normalizeEntriesForServer(entries: TimetableEntry[]) {
  const scheduleIdMap = new Map<string, string>();

  return entries.map((entry) => {
    const scheduleKey = entry.scheduleId ?? entry.id;
    const scheduleId = scheduleIdMap.get(scheduleKey) ?? ensureUuid(entry.scheduleId);
    scheduleIdMap.set(scheduleKey, scheduleId);

    return {
      id: ensureUuid(entry.id),
      schedule_id: scheduleId,
      course_title: entry.courseTitle,
      course_code: entry.courseCode ?? null,
      kind: entry.kind,
      location: entry.location ?? null,
      notes: entry.notes ?? null,
      day_of_week: entry.dayOfWeek,
      start_time: entry.startTime,
      end_time: entry.endTime,
    };
  });
}

export async function syncTimetableEntriesForAccount(accountId: string) {
  if (!hasServerTimetableStore()) {
    return null;
  }

  const client = getSupabaseBrowserClient();
  const { data, error } = await client
    .from("timetable_entries")
    .select(timetableSelect)
    .eq("owner_account_id", accountId)
    .order("term_id", { ascending: true })
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    throw error;
  }

  const entriesByTerm = groupEntriesByTerm((data ?? []) as TimetableRow[]);
  writeTimetableCache(accountId, entriesByTerm);
  return entriesByTerm;
}

export async function replaceTimetableEntriesForTerm(
  accountId: string,
  termId: string,
  entries: TimetableEntry[],
) {
  if (!hasServerTimetableStore()) {
    return null;
  }

  const client = getSupabaseBrowserClient();
  const { error: deleteError } = await client
    .from("timetable_entries")
    .delete()
    .eq("owner_account_id", accountId)
    .eq("term_id", termId);

  if (deleteError) {
    throw deleteError;
  }

  if (entries.length > 0) {
    const { error: insertError } = await client.from("timetable_entries").insert(
      normalizeEntriesForServer(entries).map((entry) => ({
        owner_account_id: accountId,
        term_id: termId,
        ...entry,
      })),
    );

    if (insertError) {
      throw insertError;
    }
  }

  return syncTimetableEntriesForAccount(accountId);
}

