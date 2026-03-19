import { documentRecordSchema, type DocumentRecord } from "@research-os/types";

import { canUseBrowserStorage, readFirstJsonFromStorage } from "./browser-json-store";
import { inferCategoryFromType, type DocumentType } from "./document-taxonomy";
import {
  buildScopedStorageKey,
  buildScopedStorageKeyForAccount,
} from "./mock-auth-store";

const currentStorageBaseKey = "researchos:documents-workspace:v2";
const legacyStorageBaseKey = "researchos:documents-workspace:v1";

function normalizeStoredDocument(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const normalized = {
    ...candidate,
    documentCategory:
      typeof candidate.documentCategory === "string"
        ? candidate.documentCategory
        : inferCategoryFromType((candidate.documentType as DocumentType | undefined) ?? "other"),
  };

  const validated = documentRecordSchema.safeParse(normalized);
  return validated.success ? validated.data : null;
}

export function loadBrowserDocuments(initialDocuments: DocumentRecord[]): DocumentRecord[] {
  return loadBrowserDocumentsForAccount(initialDocuments, null);
}

export function loadBrowserDocumentsForAccount(
  initialDocuments: DocumentRecord[],
  accountId: string | null,
): DocumentRecord[] {
  if (!canUseBrowserStorage()) {
    return initialDocuments;
  }

  try {
    const currentStorageKey = accountId
      ? buildScopedStorageKeyForAccount(currentStorageBaseKey, accountId)
      : buildScopedStorageKey(currentStorageBaseKey);
    const legacyStorageKey = accountId
      ? buildScopedStorageKeyForAccount(legacyStorageBaseKey, accountId)
      : buildScopedStorageKey(legacyStorageBaseKey);
    const parsed = readFirstJsonFromStorage<unknown>(
      [currentStorageKey, legacyStorageKey, currentStorageBaseKey, legacyStorageBaseKey],
      null,
    );

    if (!parsed) {
      return initialDocuments;
    }

    if (!Array.isArray(parsed)) {
      return initialDocuments;
    }

    const migrated = parsed
      .map((item) => normalizeStoredDocument(item))
      .filter((item): item is DocumentRecord => item !== null);

    return migrated.length > 0 ? migrated : initialDocuments;
  } catch {
    return initialDocuments;
  }
}
