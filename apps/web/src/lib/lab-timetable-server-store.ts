"use client";

import { timetableEntrySchema, type TimetableEntry } from "@research-os/types";

import { readFirstJsonFromStorage, writeJsonToStorage } from "./browser-json-store";
import { getCollaborationBackendStatus } from "./collaboration/runtime";
import { buildScopedStorageKey } from "./mock-auth-store";
import { getSupabaseBrowserClient } from "./supabase/browser-client";

type LabTimetableRow = {
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
};

const labTimetableStorageKey = "researchos:lab-timetable:v1";
const labTimetableSelect =
  "id, schedule_id, course_title, course_code, kind, location, notes, day_of_week, start_time, end_time";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hasServerLabTimetableStore() {
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

function mapLabTimetableRow(row: LabTimetableRow): TimetableEntry {
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

function loadLabTimetableCache() {
  return readFirstJsonFromStorage<Record<string, TimetableEntry[]>>(
    [buildScopedStorageKey(labTimetableStorageKey), labTimetableStorageKey],
    {},
  );
}

function writeLabTimetableCache(entriesByLab: Record<string, TimetableEntry[]>) {
  writeJsonToStorage(buildScopedStorageKey(labTimetableStorageKey), entriesByLab);
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

export async function syncLabTimetableEntries(labId: string, fallbackEntries: TimetableEntry[]) {
  const cachedEntries = loadLabTimetableCache();

  if (!hasServerLabTimetableStore()) {
    if (cachedEntries[labId]?.length) {
      return cachedEntries[labId];
    }

    if (fallbackEntries.length > 0) {
      const nextCache = { ...cachedEntries, [labId]: fallbackEntries };
      writeLabTimetableCache(nextCache);
      return fallbackEntries;
    }

    return [];
  }

  const client = getSupabaseBrowserClient();
  const { data, error } = await client
    .from("lab_timetable_entries")
    .select(labTimetableSelect)
    .eq("lab_id", labId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    throw error;
  }

  const nextEntries = ((data ?? []) as LabTimetableRow[]).map(mapLabTimetableRow);
  writeLabTimetableCache({
    ...cachedEntries,
    [labId]: nextEntries,
  });
  return nextEntries;
}

export async function replaceLabTimetableEntries(labId: string, entries: TimetableEntry[]) {
  if (!hasServerLabTimetableStore()) {
    return null;
  }

  const client = getSupabaseBrowserClient();
  const { error: deleteError } = await client
    .from("lab_timetable_entries")
    .delete()
    .eq("lab_id", labId);

  if (deleteError) {
    throw deleteError;
  }

  if (entries.length > 0) {
    const { error: insertError } = await client.from("lab_timetable_entries").insert(
      normalizeEntriesForServer(entries).map((entry) => ({
        lab_id: labId,
        ...entry,
      })),
    );

    if (insertError) {
      throw insertError;
    }
  }

  return syncLabTimetableEntries(labId, []);
}
