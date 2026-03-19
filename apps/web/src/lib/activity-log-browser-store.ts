"use client";

import {
  activityLogListSchema,
  activityLogSchema,
  type ActivityLog,
} from "@research-os/types";

import {
  readJsonFromStorage,
  writeJsonToStorage,
} from "@/lib/browser-json-store";

export const activityLogStorageKey = "researchos:activity-logs:v1";

type StoredActivityLogMap = Record<string, ActivityLog[]>;

interface AppendBrowserActivityLogInput {
  labId: string;
  actorAccountId: string;
  actorName: string;
  action: string;
  resourceType: ActivityLog["resourceType"];
  resourceId: string;
  payload?: Record<string, unknown>;
  createdAt?: string;
}

function readActivityLogStore() {
  const parsed = readJsonFromStorage<Record<string, unknown>>(activityLogStorageKey, {});
  const nextStore: StoredActivityLogMap = {};

  Object.entries(parsed).forEach(([labId, value]) => {
    const validated = activityLogListSchema.safeParse(value);
    if (validated.success) {
      nextStore[labId] = validated.data;
    }
  });

  return nextStore;
}

function writeActivityLogStore(store: StoredActivityLogMap) {
  writeJsonToStorage(activityLogStorageKey, store);
}

export function loadBrowserActivityLogs(labId: string) {
  const store = readActivityLogStore();
  return [...(store[labId] ?? [])].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

export function appendBrowserActivityLog(input: AppendBrowserActivityLogInput) {
  const store = readActivityLogStore();
  const nextLog = activityLogSchema.parse({
    id:
      typeof window !== "undefined" && window.crypto?.randomUUID
        ? `activity-${window.crypto.randomUUID()}`
        : `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    labId: input.labId,
    actorAccountId: input.actorAccountId,
    actorName: input.actorName,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    payload: input.payload ?? {},
    createdAt: input.createdAt ?? new Date().toISOString(),
  });

  const nextLogs = [nextLog, ...(store[input.labId] ?? [])]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 40);

  writeActivityLogStore({
    ...store,
    [input.labId]: nextLogs,
  });

  return nextLog;
}

export function hydrateBrowserActivityLogs(labId: string, logs: ActivityLog[]) {
  const store = readActivityLogStore();
  writeActivityLogStore({
    ...store,
    [labId]: [...logs].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
  });
}
