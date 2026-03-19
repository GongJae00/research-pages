"use client";

import { fundingRecordListSchema, type FundingRecord } from "@research-os/types";

import { getCollaborationBackendStatus } from "./collaboration/runtime";
import { saveBrowserFundingForAccount } from "./funding-browser-store";
import { getSupabaseBrowserClient } from "./supabase/browser-client";

type FundingRow = {
  id: string;
  owner_account_id: string;
  title: string;
  source_type: FundingRecord["sourceType"];
  compensation_kind: FundingRecord["compensationKind"];
  provider_name: string;
  project_name: string | null;
  currency: string;
  amount: number | null;
  cadence: FundingRecord["cadence"];
  start_date: string;
  end_date: string | null;
  active: boolean;
  linked_affiliation_id: string | null;
  restrictions: string[] | null;
  notes: string | null;
};

const fundingSelect =
  "id, owner_account_id, title, source_type, compensation_kind, provider_name, project_name, currency, amount, cadence, start_date, end_date, active, linked_affiliation_id, restrictions, notes";

function hasServerFundingStore() {
  const backendStatus = getCollaborationBackendStatus();
  return backendStatus.currentMode === "supabase" && backendStatus.supabaseConfigured;
}

function mapFundingRow(row: FundingRow): FundingRecord {
  return {
    id: row.id,
    owner: { type: "user", id: row.owner_account_id },
    title: row.title,
    sourceType: row.source_type,
    compensationKind: row.compensation_kind,
    providerName: row.provider_name,
    projectName: row.project_name ?? undefined,
    currency: row.currency,
    amount: row.amount ?? undefined,
    cadence: row.cadence,
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    active: row.active,
    linkedAffiliationId: row.linked_affiliation_id ?? undefined,
    restrictions: row.restrictions ?? [],
    notes: row.notes ?? undefined,
  };
}

function toFundingPayload(accountId: string, record: FundingRecord) {
  return {
    id: record.id,
    owner_account_id: accountId,
    title: record.title,
    source_type: record.sourceType,
    compensation_kind: record.compensationKind,
    provider_name: record.providerName,
    project_name: record.projectName ?? null,
    currency: record.currency,
    amount: record.amount ?? null,
    cadence: record.cadence,
    start_date: record.startDate,
    end_date: record.endDate ?? null,
    active: record.active,
    linked_affiliation_id: record.linkedAffiliationId ?? null,
    restrictions: record.restrictions,
    notes: record.notes ?? null,
  };
}

export async function replaceFundingForAccount(
  accountId: string,
  funding: FundingRecord[],
) {
  if (!hasServerFundingStore()) {
    saveBrowserFundingForAccount(accountId, funding);
    return funding;
  }

  const client = getSupabaseBrowserClient();
  const { error: deleteError } = await client
    .from("research_funding_records")
    .delete()
    .eq("owner_account_id", accountId);

  if (deleteError) {
    throw deleteError;
  }

  if (funding.length > 0) {
    const { error: insertError } = await client.from("research_funding_records").insert(
      funding.map((record) => toFundingPayload(accountId, record)),
    );

    if (insertError) {
      throw insertError;
    }
  }

  saveBrowserFundingForAccount(accountId, funding);
  return funding;
}

export async function syncFundingForAccount(
  accountId: string,
  fallbackFunding: FundingRecord[] = [],
) {
  if (!hasServerFundingStore()) {
    return null;
  }

  const client = getSupabaseBrowserClient();
  const { data, error } = await client
    .from("research_funding_records")
    .select(fundingSelect)
    .eq("owner_account_id", accountId)
    .order("active", { ascending: false })
    .order("start_date", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as FundingRow[];
  if (rows.length === 0 && fallbackFunding.length > 0) {
    await replaceFundingForAccount(accountId, fallbackFunding);
    return fallbackFunding;
  }

  const funding = fundingRecordListSchema.parse(rows.map(mapFundingRow));
  saveBrowserFundingForAccount(accountId, funding);
  return funding;
}
