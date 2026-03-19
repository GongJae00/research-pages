import {
  canUseBrowserStorage,
  readFirstJsonFromStorage,
  writeJsonToStorage,
} from "./browser-json-store";
import { buildScopedStorageKey, buildScopedStorageKeyForAccount } from "./mock-auth-store";

const evidenceStorageBaseKey = "researchos:evidence-links:v1";

function getEvidenceStorageKeys(accountId: string | null) {
  return accountId
    ? [buildScopedStorageKeyForAccount(evidenceStorageBaseKey, accountId), evidenceStorageBaseKey]
    : [buildScopedStorageKey(evidenceStorageBaseKey), evidenceStorageBaseKey];
}

function normalizeEvidenceMap(parsed: Record<string, unknown>) {
  const normalized: Record<string, string[]> = {};

  for (const [key, value] of Object.entries(parsed)) {
    if (Array.isArray(value)) {
      normalized[key] = value.filter((item): item is string => typeof item === "string");
    }
  }

  return normalized;
}

export function readEvidenceLinks(): Record<string, string[]> {
  return readEvidenceLinksForAccount(null);
}

export function readEvidenceLinksForAccount(accountId: string | null): Record<string, string[]> {
  if (!canUseBrowserStorage()) {
    return {};
  }

  try {
    const parsed = readFirstJsonFromStorage<Record<string, unknown>>(
      getEvidenceStorageKeys(accountId),
      {},
    );
    return normalizeEvidenceMap(parsed);
  } catch {
    return {};
  }
}

export function writeEvidenceLinks(nextValue: Record<string, string[]>) {
  writeEvidenceLinksForAccount(null, nextValue);
}

export function writeEvidenceLinksForAccount(
  accountId: string | null,
  nextValue: Record<string, string[]>,
) {
  if (!canUseBrowserStorage()) {
    return;
  }

  writeJsonToStorage(
    accountId
      ? buildScopedStorageKeyForAccount(evidenceStorageBaseKey, accountId)
      : buildScopedStorageKey(evidenceStorageBaseKey),
    nextValue,
  );
}

export function readEvidenceForKey(evidenceKey: string): string[] {
  return readEvidenceLinks()[evidenceKey] ?? [];
}

export function hasEvidenceForKey(evidenceKey: string): boolean {
  return Object.prototype.hasOwnProperty.call(readEvidenceLinks(), evidenceKey);
}

export function readEvidenceForAccountKey(accountId: string, evidenceKey: string): string[] {
  return readEvidenceLinksForAccount(accountId)[evidenceKey] ?? [];
}

export function hasEvidenceForAccountKey(accountId: string, evidenceKey: string): boolean {
  return Object.prototype.hasOwnProperty.call(readEvidenceLinksForAccount(accountId), evidenceKey);
}

export function writeEvidenceForKey(evidenceKey: string, documentIds: string[]) {
  const current = readEvidenceLinks();
  current[evidenceKey] = documentIds;
  writeEvidenceLinks(current);
}

export function writeEvidenceForAccountKey(
  accountId: string,
  evidenceKey: string,
  documentIds: string[],
) {
  const current = readEvidenceLinksForAccount(accountId);
  current[evidenceKey] = documentIds;
  writeEvidenceLinksForAccount(accountId, current);
}
