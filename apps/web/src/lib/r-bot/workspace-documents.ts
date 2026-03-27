import { documentListSchema, type DocumentRecord } from "@research-os/types";

import { readFirstJsonFromStorage } from "@/lib/browser-json-store";
import { buildScopedStorageKeyForAccount } from "@/lib/mock-auth-store";

const storageBaseKey = "researchos:documents-workspace:v2";
const legacyStorageBaseKey = "researchos:documents-workspace:v1";

export function getWorkspaceDocumentStorageKeys(accountId: string) {
  return [
    buildScopedStorageKeyForAccount(storageBaseKey, accountId),
    buildScopedStorageKeyForAccount(legacyStorageBaseKey, accountId),
    storageBaseKey,
    legacyStorageBaseKey,
  ];
}

export function readCachedWorkspaceDocuments(accountId: string | null) {
  if (!accountId) {
    return [] satisfies DocumentRecord[];
  }

  const parsed = readFirstJsonFromStorage<unknown>(getWorkspaceDocumentStorageKeys(accountId), []);
  const validated = documentListSchema.safeParse(parsed);

  if (!validated.success) {
    return [] satisfies DocumentRecord[];
  }

  return validated.data;
}
