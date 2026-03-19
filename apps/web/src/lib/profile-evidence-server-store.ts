"use client";

import { getCollaborationBackendStatus } from "./collaboration/runtime";
import {
  readEvidenceLinksForAccount,
  writeEvidenceForAccountKey,
  writeEvidenceLinksForAccount,
} from "./evidence-links";
import { getSupabaseBrowserClient } from "./supabase/browser-client";

type EvidenceRow = {
  account_id: string;
  evidence_key: string;
  document_id: string;
  sort_order: number;
};

const syncInflight = new Map<string, Promise<Record<string, string[]> | null>>();

function hasServerEvidenceStore() {
  const backendStatus = getCollaborationBackendStatus();
  return backendStatus.currentMode === "supabase" && backendStatus.supabaseConfigured;
}

function groupEvidenceRows(rows: EvidenceRow[]) {
  const grouped: Record<string, string[]> = {};
  const sorted = [...rows].sort((left, right) => {
    if (left.evidence_key !== right.evidence_key) {
      return left.evidence_key.localeCompare(right.evidence_key);
    }

    return left.sort_order - right.sort_order;
  });

  sorted.forEach((row) => {
    grouped[row.evidence_key] ??= [];
    grouped[row.evidence_key].push(row.document_id);
  });

  return grouped;
}

export async function syncEvidenceLinksForAccount(accountId: string) {
  if (!hasServerEvidenceStore()) {
    return null;
  }

  const inflight = syncInflight.get(accountId);
  if (inflight) {
    return inflight;
  }

  const request = (async () => {
    const client = getSupabaseBrowserClient();
    const { data, error } = await client
      .from("profile_evidence_links")
      .select("account_id, evidence_key, document_id, sort_order")
      .eq("account_id", accountId)
      .order("sort_order", { ascending: true });

    if (error) {
      throw error;
    }

    const grouped = groupEvidenceRows((data ?? []) as EvidenceRow[]);
    writeEvidenceLinksForAccount(accountId, grouped);
    return grouped;
  })();

  syncInflight.set(accountId, request);

  try {
    return await request;
  } finally {
    syncInflight.delete(accountId);
  }
}

export async function replaceEvidenceLinksForAccount(
  accountId: string,
  evidenceKey: string,
  documentIds: string[],
) {
  if (!hasServerEvidenceStore()) {
    writeEvidenceForAccountKey(accountId, evidenceKey, documentIds);
    return;
  }

  const client = getSupabaseBrowserClient();
  const { error: deleteError } = await client
    .from("profile_evidence_links")
    .delete()
    .eq("account_id", accountId)
    .eq("evidence_key", evidenceKey);

  if (deleteError) {
    throw deleteError;
  }

  if (documentIds.length > 0) {
    const { error: insertError } = await client.from("profile_evidence_links").insert(
      documentIds.map((documentId, index) => ({
        account_id: accountId,
        evidence_key: evidenceKey,
        document_id: documentId,
        sort_order: index,
      })),
    );

    if (insertError) {
      throw insertError;
    }
  }

  const current = readEvidenceLinksForAccount(accountId);
  current[evidenceKey] = documentIds;
  writeEvidenceLinksForAccount(accountId, current);
}

export async function syncProfileEvidenceForAccount(accountId: string) {
  return syncEvidenceLinksForAccount(accountId);
}

export async function replaceProfileEvidenceLinks(
  accountId: string,
  evidenceKey: string,
  documentIds: string[],
) {
  return replaceEvidenceLinksForAccount(accountId, evidenceKey, documentIds);
}
