import { publicationRecordSchema, type PublicationRecord } from "@research-os/types";

import {
  canUseBrowserStorage,
  readJsonFromStorage,
  writeJsonToStorage,
} from "./browser-json-store";
import { buildScopedStorageKey, buildScopedStorageKeyForAccount } from "./mock-auth-store";

const publicationStorageBaseKey = "researchos:publications:v1";

function getPublicationStorageKey(accountId: string | null) {
  return accountId
    ? buildScopedStorageKeyForAccount(publicationStorageBaseKey, accountId)
    : buildScopedStorageKey(publicationStorageBaseKey);
}

function normalizeStoredPublication(value: unknown): PublicationRecord | null {
  const validated = publicationRecordSchema.safeParse(value);
  return validated.success ? validated.data : null;
}

export function loadBrowserPublications(): PublicationRecord[] {
  return loadBrowserPublicationsForAccount(null);
}

export function loadBrowserPublicationsForAccount(accountId: string | null): PublicationRecord[] {
  if (!canUseBrowserStorage()) {
    return [];
  }

  try {
    const key = getPublicationStorageKey(accountId);
    const parsed = readJsonFromStorage<unknown>(key, null);

    if (!parsed) {
      return [];
    }

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => normalizeStoredPublication(item))
      .filter((item): item is PublicationRecord => item !== null);
  } catch {
    return [];
  }
}

export function saveBrowserPublications(publications: PublicationRecord[]): void {
  saveBrowserPublicationsForAccount(null, publications);
}

export function saveBrowserPublicationsForAccount(
  accountId: string | null,
  publications: PublicationRecord[],
): void {
  if (!canUseBrowserStorage()) {
    return;
  }

  const key = getPublicationStorageKey(accountId);
  writeJsonToStorage(key, publications);
}
