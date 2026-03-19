"use client";

import { activityLogSchema, type ActivityLog } from "@research-os/types";

import {
  appendBrowserActivityLog,
  hydrateBrowserActivityLogs,
  loadBrowserActivityLogs,
} from "@/lib/activity-log-browser-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

import { getCollaborationBackendStatus } from "./collaboration/runtime";

type ActivityLogRow = {
  id: number;
  lab_id: string;
  actor_account_id: string;
  action: string;
  resource_type: ActivityLog["resourceType"];
  resource_id: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

type ResearchAccountRow = {
  id: string;
  korean_name: string;
  english_name: string | null;
};

function mapActorName(row: ResearchAccountRow | undefined) {
  if (!row) {
    return "Researcher";
  }

  return row.korean_name || row.english_name || "Researcher";
}

interface AppendActivityLogInput {
  labId: string;
  actorAccountId: string;
  actorName: string;
  action: string;
  resourceType: ActivityLog["resourceType"];
  resourceId: string;
  payload?: Record<string, unknown>;
}

export async function listActivityLogsForLab(labId: string) {
  const backendStatus = getCollaborationBackendStatus();

  if (backendStatus.currentMode !== "supabase" || !backendStatus.supabaseConfigured) {
    return loadBrowserActivityLogs(labId);
  }

  const client = getSupabaseBrowserClient();
  const { data, error } = await client
    .from("activity_logs")
    .select("id, lab_id, actor_account_id, action, resource_type, resource_id, payload, created_at")
    .eq("lab_id", labId)
    .order("created_at", { ascending: false })
    .limit(24);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as ActivityLogRow[];
  const actorIds = [
    ...new Set(
      rows
        .filter((row) => typeof row.payload?.actorName !== "string")
        .map((row) => row.actor_account_id),
    ),
  ];
  const accountMap = new Map<string, ResearchAccountRow>();

  if (actorIds.length > 0) {
    const { data: accountRows, error: accountError } = await client
      .from("research_accounts")
      .select("id, korean_name, english_name")
      .in("id", actorIds);

    if (accountError) {
      throw accountError;
    }

    (accountRows as ResearchAccountRow[] | null)?.forEach((row) => {
      accountMap.set(row.id, row);
    });
  }

  const logs = rows.map((row) =>
    activityLogSchema.parse({
      id: String(row.id),
      labId: row.lab_id,
      actorAccountId: row.actor_account_id,
      actorName:
        typeof row.payload?.actorName === "string"
          ? row.payload.actorName
          : mapActorName(accountMap.get(row.actor_account_id)),
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      payload: row.payload ?? {},
      createdAt: row.created_at,
    }),
  );

  hydrateBrowserActivityLogs(labId, logs);
  return logs;
}

export async function appendActivityLogForLab(input: AppendActivityLogInput) {
  const backendStatus = getCollaborationBackendStatus();

  if (backendStatus.currentMode !== "supabase" || !backendStatus.supabaseConfigured) {
    return appendBrowserActivityLog(input);
  }

  const client = getSupabaseBrowserClient();
  const { data, error } = await client
    .from("activity_logs")
    .insert({
      lab_id: input.labId,
      actor_account_id: input.actorAccountId,
      action: input.action,
      resource_type: input.resourceType,
      resource_id: input.resourceId,
      payload: {
        ...(input.payload ?? {}),
        actorName: input.actorName,
      },
    })
    .select("id, lab_id, actor_account_id, action, resource_type, resource_id, payload, created_at")
    .single();

  if (error) {
    throw error;
  }

  const row = data as ActivityLogRow;
  const log = activityLogSchema.parse({
    id: String(row.id),
    labId: row.lab_id,
    actorAccountId: row.actor_account_id,
    actorName: input.actorName,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    payload: row.payload ?? {},
    createdAt: row.created_at,
  });

  const currentLogs = loadBrowserActivityLogs(input.labId);
  hydrateBrowserActivityLogs(input.labId, [log, ...currentLogs].slice(0, 40));
  return log;
}
