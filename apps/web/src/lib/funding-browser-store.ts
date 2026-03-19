import { fundingRecordListSchema, type FundingRecord } from "@research-os/types";

import {
  canUseBrowserStorage,
  readJsonFromStorage,
  writeJsonToStorage,
} from "./browser-json-store";
import { buildScopedStorageKey, buildScopedStorageKeyForAccount } from "./mock-auth-store";

const fundingStorageBaseKey = "researchos:funding:v1";

function getFundingStorageKey(accountId: string | null) {
  return accountId
    ? buildScopedStorageKeyForAccount(fundingStorageBaseKey, accountId)
    : buildScopedStorageKey(fundingStorageBaseKey);
}

export function loadBrowserFunding(fallbackFunding: FundingRecord[]): FundingRecord[] {
  return loadBrowserFundingForAccount(null, fallbackFunding);
}

export function loadBrowserFundingForAccount(
  accountId: string | null,
  fallbackFunding: FundingRecord[],
): FundingRecord[] {
  if (!canUseBrowserStorage()) {
    return fallbackFunding;
  }

  try {
    const parsed = readJsonFromStorage<unknown>(getFundingStorageKey(accountId), null);
    const validated = fundingRecordListSchema.safeParse(parsed);
    return validated.success ? validated.data : fallbackFunding;
  } catch {
    return fallbackFunding;
  }
}

export function saveBrowserFunding(funding: FundingRecord[]): void {
  saveBrowserFundingForAccount(null, funding);
}

export function saveBrowserFundingForAccount(
  accountId: string | null,
  funding: FundingRecord[],
): void {
  if (!canUseBrowserStorage()) {
    return;
  }

  writeJsonToStorage(getFundingStorageKey(accountId), funding);
}
