"use client";

import {
  documentListSchema,
  documentRecordSchema,
  type DocumentRecord,
} from "@research-os/types";

import { getCollaborationBackendStatus } from "./collaboration/runtime";
import { removeFromStorage, writeJsonToStorage } from "./browser-json-store";
import { buildScopedStorageKeyForAccount } from "./mock-auth-store";
import { getSupabaseBrowserClient } from "./supabase/browser-client";

type DocumentRow = {
  id: string;
  owner_account_id: string;
  title: string;
  document_category: DocumentRecord["documentCategory"];
  document_type: DocumentRecord["documentType"];
  source_kind: DocumentRecord["sourceKind"];
  status: DocumentRecord["status"];
  visibility: DocumentRecord["visibility"];
  original_file_name: string | null;
  mime_type: string | null;
  file_extension: string | null;
  file_size_bytes: number | null;
  storage_path: string | null;
  summary: string | null;
  tags: string[] | null;
  related_funding_ids: string[] | null;
  related_affiliation_ids: string[] | null;
  updated_on: string;
};

const storageBaseKey = "researchos:documents-workspace:v2";
const legacyStorageBaseKey = "researchos:documents-workspace:v1";
const documentSelect =
  "id, owner_account_id, title, document_category, document_type, source_kind, status, visibility, original_file_name, mime_type, file_extension, file_size_bytes, storage_path, summary, tags, related_funding_ids, related_affiliation_ids, updated_on";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hasServerDocumentStore() {
  const backendStatus = getCollaborationBackendStatus();
  return backendStatus.currentMode === "supabase" && backendStatus.supabaseConfigured;
}

function mapDocumentRow(row: DocumentRow): DocumentRecord {
  return documentRecordSchema.parse({
    id: row.id,
    owner: { type: "user", id: row.owner_account_id },
    title: row.title,
    documentCategory: row.document_category,
    documentType: row.document_type,
    sourceKind: row.source_kind,
    status: row.status,
    visibility: row.visibility,
    summary: row.summary ?? undefined,
    originalFileName: row.original_file_name ?? undefined,
    mimeType: row.mime_type ?? undefined,
    fileExtension: row.file_extension ?? undefined,
    fileSizeBytes: row.file_size_bytes ?? undefined,
    fileAssetId: row.storage_path ?? undefined,
    tags: row.tags ?? [],
    relatedFundingIds: row.related_funding_ids ?? [],
    relatedAffiliationIds: row.related_affiliation_ids ?? [],
    updatedOn: row.updated_on,
  });
}

function toDocumentPayload(record: DocumentRecord, ownerAccountId: string) {
  return {
    owner_account_id: ownerAccountId,
    title: record.title,
    document_category: record.documentCategory,
    document_type: record.documentType,
    source_kind: record.sourceKind,
    status: record.status,
    visibility: record.visibility,
    original_file_name: record.originalFileName ?? null,
    mime_type: record.mimeType ?? null,
    file_extension: record.fileExtension ?? null,
    file_size_bytes: record.fileSizeBytes ?? null,
    storage_path: record.fileAssetId ?? null,
    summary: record.summary ?? null,
    tags: record.tags,
    related_funding_ids: record.relatedFundingIds,
    related_affiliation_ids: record.relatedAffiliationIds,
    updated_on: record.updatedOn,
  };
}

function getDocumentCacheKey(accountId: string) {
  return buildScopedStorageKeyForAccount(storageBaseKey, accountId);
}

function getLegacyDocumentCacheKey(accountId: string) {
  return buildScopedStorageKeyForAccount(legacyStorageBaseKey, accountId);
}

export function writeDocumentCache(accountId: string, documents: DocumentRecord[]) {
  writeJsonToStorage(getDocumentCacheKey(accountId), documents);
  removeFromStorage(getLegacyDocumentCacheKey(accountId));
}

export async function syncDocumentsForAccount(accountId: string) {
  if (!hasServerDocumentStore()) {
    return null;
  }

  const client = getSupabaseBrowserClient();
  const { data, error } = await client
    .from("documents")
    .select(documentSelect)
    .eq("owner_account_id", accountId)
    .order("updated_on", { ascending: false });

  if (error) {
    throw error;
  }

  const documents = documentListSchema.parse(((data ?? []) as DocumentRow[]).map(mapDocumentRow));
  writeDocumentCache(accountId, documents);
  return documents;
}

export async function createServerDocumentRecord(
  record: DocumentRecord,
  ownerAccountId: string,
) {
  if (!hasServerDocumentStore()) {
    return record;
  }

  const client = getSupabaseBrowserClient();
  const { data, error } = await client
    .from("documents")
    .insert(toDocumentPayload(record, ownerAccountId))
    .select(documentSelect)
    .single();

  if (error) {
    throw error;
  }

  return mapDocumentRow(data as DocumentRow);
}

export async function updateServerDocumentRecord(
  record: DocumentRecord,
  ownerAccountId: string,
) {
  if (!hasServerDocumentStore()) {
    return record;
  }

  const client = getSupabaseBrowserClient();
  const { data, error } = await client
    .from("documents")
    .update(toDocumentPayload(record, ownerAccountId))
    .eq("id", record.id)
    .select(documentSelect)
    .single();

  if (error) {
    throw error;
  }

  return mapDocumentRow(data as DocumentRow);
}

export async function deleteServerDocumentRecord(documentId: string) {
  if (!hasServerDocumentStore()) {
    return;
  }

  const client = getSupabaseBrowserClient();
  const { error } = await client.from("documents").delete().eq("id", documentId);

  if (error) {
    throw error;
  }
}

export function isServerDocumentId(documentId: string) {
  return uuidPattern.test(documentId);
}
