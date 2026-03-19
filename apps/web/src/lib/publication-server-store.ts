"use client";

import {
  publicationListSchema,
  publicationRecordSchema,
  type PublicationRecord,
} from "@research-os/types";

import { getCollaborationBackendStatus } from "./collaboration/runtime";
import { getSupabaseBrowserClient } from "./supabase/browser-client";
import { saveBrowserPublicationsForAccount } from "./publication-browser-store";

type PublicationRow = {
  id: string;
  owner_account_id: string;
  title: string;
  journal_class: PublicationRecord["journalClass"] | null;
  journal_name: string | null;
  publisher: string | null;
  published_on: string | null;
  author_role: string | null;
  participants: string | null;
  updated_at: string;
};

const publicationSelect =
  "id, owner_account_id, title, journal_class, journal_name, publisher, published_on, author_role, participants, updated_at";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hasServerPublicationStore() {
  const backendStatus = getCollaborationBackendStatus();
  return backendStatus.currentMode === "supabase" && backendStatus.supabaseConfigured;
}

function mapPublicationRow(row: PublicationRow): PublicationRecord {
  return publicationRecordSchema.parse({
    id: row.id,
    owner: { type: "user", id: row.owner_account_id },
    title: row.title,
    journalClass: row.journal_class ?? undefined,
    journalName: row.journal_name ?? undefined,
    publisher: row.publisher ?? undefined,
    publishedOn: row.published_on ?? undefined,
    authorRole: row.author_role ?? undefined,
    participants: row.participants ?? undefined,
    updatedOn: row.updated_at.slice(0, 10),
  });
}

function toPublicationPayload(record: PublicationRecord, ownerAccountId: string) {
  return {
    owner_account_id: ownerAccountId,
    title: record.title,
    journal_class: record.journalClass ?? null,
    journal_name: record.journalName ?? null,
    publisher: record.publisher ?? null,
    published_on: record.publishedOn ?? null,
    author_role: record.authorRole ?? null,
    participants: record.participants ?? null,
    updated_at: `${record.updatedOn}T00:00:00+09:00`,
  };
}

export function isServerPublicationId(publicationId: string) {
  return uuidPattern.test(publicationId);
}

export async function syncPublicationsForAccount(accountId: string) {
  if (!hasServerPublicationStore()) {
    return null;
  }

  const client = getSupabaseBrowserClient();
  const { data, error } = await client
    .from("publications")
    .select(publicationSelect)
    .eq("owner_account_id", accountId)
    .order("published_on", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  const publications = publicationListSchema.parse(
    ((data ?? []) as PublicationRow[]).map(mapPublicationRow),
  );
  saveBrowserPublicationsForAccount(accountId, publications);
  return publications;
}

export async function createServerPublicationRecord(
  record: PublicationRecord,
  ownerAccountId: string,
) {
  if (!hasServerPublicationStore()) {
    return record;
  }

  const client = getSupabaseBrowserClient();
  const { data, error } = await client
    .from("publications")
    .insert(toPublicationPayload(record, ownerAccountId))
    .select(publicationSelect)
    .single();

  if (error) {
    throw error;
  }

  return mapPublicationRow(data as PublicationRow);
}

export async function updateServerPublicationRecord(
  record: PublicationRecord,
  ownerAccountId: string,
) {
  if (!hasServerPublicationStore()) {
    return record;
  }

  const client = getSupabaseBrowserClient();
  const { data, error } = await client
    .from("publications")
    .update(toPublicationPayload(record, ownerAccountId))
    .eq("id", record.id)
    .select(publicationSelect)
    .single();

  if (error) {
    throw error;
  }

  return mapPublicationRow(data as PublicationRow);
}

export async function deleteServerPublicationRecord(publicationId: string) {
  if (!hasServerPublicationStore()) {
    return;
  }

  const client = getSupabaseBrowserClient();
  const { error } = await client.from("publications").delete().eq("id", publicationId);

  if (error) {
    throw error;
  }
}

