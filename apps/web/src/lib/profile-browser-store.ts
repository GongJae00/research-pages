import { profileSchema, type ResearchProfile } from "@research-os/types";

import {
  canUseBrowserStorage,
  readJsonFromStorage,
  writeJsonToStorage,
} from "./browser-json-store";
import { buildScopedStorageKey, buildScopedStorageKeyForAccount } from "./mock-auth-store";

const profileStorageBaseKey = "researchos:profile-record:v1";

function getProfileStorageKey(accountId: string | null) {
  return accountId
    ? buildScopedStorageKeyForAccount(profileStorageBaseKey, accountId)
    : buildScopedStorageKey(profileStorageBaseKey);
}

function normalizeStoredProfile(value: unknown): ResearchProfile | null {
  const validated = profileSchema.safeParse(value);
  return validated.success ? validated.data : null;
}

export function loadBrowserProfile(initialProfile: ResearchProfile): ResearchProfile {
  return loadBrowserProfileForAccount(null, initialProfile);
}

export function loadBrowserProfileForAccount(
  accountId: string | null,
  fallbackProfile: ResearchProfile,
): ResearchProfile {
  if (!canUseBrowserStorage()) {
    return fallbackProfile;
  }

  try {
    const parsed = readJsonFromStorage<unknown>(getProfileStorageKey(accountId), null);
    return normalizeStoredProfile(parsed) ?? fallbackProfile;
  } catch {
    return fallbackProfile;
  }
}

export function saveBrowserProfile(profile: ResearchProfile): void {
  saveBrowserProfileForAccount(null, profile);
}

export function saveBrowserProfileForAccount(
  accountId: string | null,
  profile: ResearchProfile,
): void {
  if (!canUseBrowserStorage()) {
    return;
  }

  writeJsonToStorage(getProfileStorageKey(accountId), profile);
}
