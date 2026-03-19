import {
  affiliationTimelineSchema,
  type AffiliationTimelineEntry,
} from "@research-os/types";

import {
  canUseBrowserStorage,
  readJsonFromStorage,
  writeJsonToStorage,
} from "./browser-json-store";
import { buildScopedStorageKey, buildScopedStorageKeyForAccount } from "./mock-auth-store";

const affiliationStorageBaseKey = "researchos:affiliations:v1";

function getAffiliationStorageKey(accountId: string | null) {
  return accountId
    ? buildScopedStorageKeyForAccount(affiliationStorageBaseKey, accountId)
    : buildScopedStorageKey(affiliationStorageBaseKey);
}

export function loadBrowserAffiliations(
  fallbackAffiliations: AffiliationTimelineEntry[],
): AffiliationTimelineEntry[] {
  return loadBrowserAffiliationsForAccount(null, fallbackAffiliations);
}

export function loadBrowserAffiliationsForAccount(
  accountId: string | null,
  fallbackAffiliations: AffiliationTimelineEntry[],
): AffiliationTimelineEntry[] {
  if (!canUseBrowserStorage()) {
    return fallbackAffiliations;
  }

  try {
    const parsed = readJsonFromStorage<unknown>(getAffiliationStorageKey(accountId), null);
    const validated = affiliationTimelineSchema.safeParse(parsed);
    return validated.success ? validated.data : fallbackAffiliations;
  } catch {
    return fallbackAffiliations;
  }
}

export function saveBrowserAffiliations(
  affiliations: AffiliationTimelineEntry[],
): void {
  saveBrowserAffiliationsForAccount(null, affiliations);
}

export function saveBrowserAffiliationsForAccount(
  accountId: string | null,
  affiliations: AffiliationTimelineEntry[],
): void {
  if (!canUseBrowserStorage()) {
    return;
  }

  writeJsonToStorage(getAffiliationStorageKey(accountId), affiliations);
}
