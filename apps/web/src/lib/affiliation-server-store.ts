"use client";

import {
  affiliationTimelineSchema,
  type AffiliationTimelineEntry,
} from "@research-os/types";

import { getCollaborationBackendStatus } from "./collaboration/runtime";
import { saveBrowserAffiliationsForAccount } from "./affiliation-browser-store";
import { getSupabaseBrowserClient } from "./supabase/browser-client";

type AffiliationRow = {
  id: string;
  owner_account_id: string;
  institution_name: string;
  department: string | null;
  lab_name: string | null;
  organization_type: AffiliationTimelineEntry["organizationType"];
  role_title: string;
  role_track: AffiliationTimelineEntry["roleTrack"];
  appointment_status: AffiliationTimelineEntry["appointmentStatus"];
  start_date: string;
  end_date: string | null;
  active: boolean;
  related_funding_ids: string[] | null;
  notes: string | null;
};

const affiliationSelect =
  "id, owner_account_id, institution_name, department, lab_name, organization_type, role_title, role_track, appointment_status, start_date, end_date, active, related_funding_ids, notes";

function hasServerAffiliationStore() {
  const backendStatus = getCollaborationBackendStatus();
  return backendStatus.currentMode === "supabase" && backendStatus.supabaseConfigured;
}

function mapAffiliationRow(row: AffiliationRow): AffiliationTimelineEntry {
  return {
    id: row.id,
    owner: { type: "user", id: row.owner_account_id },
    institutionName: row.institution_name,
    department: row.department ?? undefined,
    labName: row.lab_name ?? undefined,
    organizationType: row.organization_type,
    roleTitle: row.role_title,
    roleTrack: row.role_track,
    appointmentStatus: row.appointment_status,
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    active: row.active,
    relatedFundingIds: row.related_funding_ids ?? [],
    notes: row.notes ?? undefined,
  };
}

function toAffiliationPayload(accountId: string, entry: AffiliationTimelineEntry) {
  return {
    id: entry.id,
    owner_account_id: accountId,
    institution_name: entry.institutionName,
    department: entry.department ?? null,
    lab_name: entry.labName ?? null,
    organization_type: entry.organizationType,
    role_title: entry.roleTitle,
    role_track: entry.roleTrack,
    appointment_status: entry.appointmentStatus,
    start_date: entry.startDate,
    end_date: entry.endDate ?? null,
    active: entry.active,
    related_funding_ids: entry.relatedFundingIds,
    notes: entry.notes ?? null,
  };
}

export async function replaceAffiliationsForAccount(
  accountId: string,
  affiliations: AffiliationTimelineEntry[],
) {
  if (!hasServerAffiliationStore()) {
    saveBrowserAffiliationsForAccount(accountId, affiliations);
    return affiliations;
  }

  const client = getSupabaseBrowserClient();
  const { error: deleteError } = await client
    .from("research_affiliations")
    .delete()
    .eq("owner_account_id", accountId);

  if (deleteError) {
    throw deleteError;
  }

  if (affiliations.length > 0) {
    const { error: insertError } = await client.from("research_affiliations").insert(
      affiliations.map((entry) => toAffiliationPayload(accountId, entry)),
    );

    if (insertError) {
      throw insertError;
    }
  }

  saveBrowserAffiliationsForAccount(accountId, affiliations);
  return affiliations;
}

export async function syncAffiliationsForAccount(
  accountId: string,
  fallbackAffiliations: AffiliationTimelineEntry[] = [],
) {
  if (!hasServerAffiliationStore()) {
    return null;
  }

  const client = getSupabaseBrowserClient();
  const { data, error } = await client
    .from("research_affiliations")
    .select(affiliationSelect)
    .eq("owner_account_id", accountId)
    .order("active", { ascending: false })
    .order("start_date", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as AffiliationRow[];
  if (rows.length === 0 && fallbackAffiliations.length > 0) {
    await replaceAffiliationsForAccount(accountId, fallbackAffiliations);
    return fallbackAffiliations;
  }

  const affiliations = affiliationTimelineSchema.parse(rows.map(mapAffiliationRow));
  saveBrowserAffiliationsForAccount(accountId, affiliations);
  return affiliations;
}
