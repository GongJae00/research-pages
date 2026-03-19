"use client";

import {
  profileLinkSchema,
  profileSchema,
  type ProfileLink,
  type ResearchProfile,
} from "@research-os/types";

import { getCollaborationBackendStatus } from "./collaboration/runtime";
import { getSupabaseBrowserClient } from "./supabase/browser-client";
import { saveBrowserProfileForAccount } from "./profile-browser-store";

type ResearchAccountRow = {
  id: string;
  korean_name: string;
  english_name: string | null;
  primary_email: string;
  national_researcher_number: string;
};

type ResearchProfileRow = {
  account_id: string;
  display_name: string | null;
  korean_name: string | null;
  english_name: string | null;
  legal_name: string | null;
  preferred_name: string | null;
  romanized_name: string | null;
  headline: string | null;
  secondary_email: string | null;
  emails: string[] | null;
  phone: string | null;
  phones: string[] | null;
  photo_data_url: string | null;
  orcid: string | null;
  primary_institution: string | null;
  primary_discipline: string | null;
  keywords: string[] | null;
  links: unknown;
  public_profile_enabled: boolean;
  public_profile_slug: string | null;
};

const accountSelect =
  "id, korean_name, english_name, primary_email, national_researcher_number";
const profileSelect =
  "account_id, display_name, korean_name, english_name, legal_name, preferred_name, romanized_name, headline, secondary_email, emails, phone, phones, photo_data_url, orcid, primary_institution, primary_discipline, keywords, links, public_profile_enabled, public_profile_slug";

function hasServerProfileStore() {
  const backendStatus = getCollaborationBackendStatus();
  return backendStatus.currentMode === "supabase" && backendStatus.supabaseConfigured;
}

function normalizeProfileLinks(value: unknown): ProfileLink[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => profileLinkSchema.safeParse(item))
    .filter((result) => result.success)
    .map((result) => result.data);
}

function mapProfileRow(
  account: ResearchAccountRow,
  row: ResearchProfileRow | null,
  fallbackProfile?: ResearchProfile,
): ResearchProfile {
  return profileSchema.parse({
    id: fallbackProfile?.id ?? `profile-${account.id}`,
    owner: fallbackProfile?.owner ?? { type: "user", id: account.id },
    displayName:
      row?.display_name ??
      row?.preferred_name ??
      row?.korean_name ??
      account.korean_name ??
      row?.english_name ??
      account.english_name ??
      fallbackProfile?.displayName ??
      "Researcher",
    legalName: row?.legal_name ?? fallbackProfile?.legalName,
    preferredName: row?.preferred_name ?? fallbackProfile?.preferredName,
    koreanName: row?.korean_name ?? account.korean_name ?? fallbackProfile?.koreanName,
    englishName: row?.english_name ?? account.english_name ?? fallbackProfile?.englishName,
    romanizedName: row?.romanized_name ?? fallbackProfile?.romanizedName,
    headline: row?.headline ?? fallbackProfile?.headline,
    primaryEmail: account.primary_email,
    secondaryEmail: row?.secondary_email ?? fallbackProfile?.secondaryEmail,
    emails: row?.emails ?? fallbackProfile?.emails ?? [account.primary_email],
    phone: row?.phone ?? fallbackProfile?.phone,
    phones: row?.phones ?? fallbackProfile?.phones ?? [],
    photoDataUrl: row?.photo_data_url ?? fallbackProfile?.photoDataUrl,
    nationalResearcherNumber:
      account.national_researcher_number ?? fallbackProfile?.nationalResearcherNumber,
    orcid: row?.orcid ?? fallbackProfile?.orcid,
    primaryInstitution: row?.primary_institution ?? fallbackProfile?.primaryInstitution,
    primaryDiscipline: row?.primary_discipline ?? fallbackProfile?.primaryDiscipline,
    keywords: row?.keywords ?? fallbackProfile?.keywords ?? [],
    links: row ? normalizeProfileLinks(row.links) : fallbackProfile?.links ?? [],
    publicProfile: {
      enabled: row?.public_profile_enabled ?? fallbackProfile?.publicProfile.enabled ?? false,
      slug: row?.public_profile_slug ?? fallbackProfile?.publicProfile.slug,
    },
  });
}

function buildAccountPayload(accountId: string, profile: ResearchProfile) {
  return {
    id: accountId,
    korean_name: profile.koreanName ?? profile.displayName,
    english_name: profile.englishName ?? null,
    primary_email: profile.primaryEmail,
    national_researcher_number:
      profile.nationalResearcherNumber ?? `pending-${accountId.slice(0, 8)}`,
  };
}

function buildProfilePayload(accountId: string, profile: ResearchProfile) {
  return {
    account_id: accountId,
    display_name: profile.displayName,
    korean_name: profile.koreanName ?? null,
    english_name: profile.englishName ?? null,
    legal_name: profile.legalName ?? null,
    preferred_name: profile.preferredName ?? null,
    romanized_name: profile.romanizedName ?? null,
    headline: profile.headline ?? null,
    secondary_email: profile.secondaryEmail ?? null,
    emails: profile.emails,
    phone: profile.phone ?? null,
    phones: profile.phones,
    photo_data_url: profile.photoDataUrl ?? null,
    orcid: profile.orcid ?? null,
    primary_institution: profile.primaryInstitution ?? null,
    primary_discipline: profile.primaryDiscipline ?? null,
    keywords: profile.keywords,
    links: profile.links,
    public_profile_enabled: profile.publicProfile.enabled,
    public_profile_slug: profile.publicProfile.slug ?? null,
  };
}

export async function upsertServerProfileForAccount(
  accountId: string,
  profile: ResearchProfile,
) {
  if (!hasServerProfileStore()) {
    saveBrowserProfileForAccount(accountId, profile);
    return profile;
  }

  const client = getSupabaseBrowserClient();
  const { error: accountError } = await client
    .from("research_accounts")
    .upsert(buildAccountPayload(accountId, profile), {
      onConflict: "id",
    });

  if (accountError) {
    throw accountError;
  }

  const { error: profileError } = await client
    .from("research_profiles")
    .upsert(buildProfilePayload(accountId, profile), {
      onConflict: "account_id",
    });

  if (profileError) {
    throw profileError;
  }

  saveBrowserProfileForAccount(accountId, profile);
  return profile;
}

export async function syncProfileForAccount(
  accountId: string,
  fallbackProfile?: ResearchProfile,
) {
  if (!hasServerProfileStore()) {
    return null;
  }

  const client = getSupabaseBrowserClient();
  const [{ data: accountData, error: accountError }, { data: profileData, error: profileError }] =
    await Promise.all([
      client
        .from("research_accounts")
        .select(accountSelect)
        .eq("id", accountId)
        .maybeSingle(),
      client
        .from("research_profiles")
        .select(profileSelect)
        .eq("account_id", accountId)
        .maybeSingle(),
    ]);

  if (accountError) {
    throw accountError;
  }

  if (profileError) {
    throw profileError;
  }

  if (!accountData) {
    if (!fallbackProfile) {
      return null;
    }

    await upsertServerProfileForAccount(accountId, fallbackProfile);
    return fallbackProfile;
  }

  if (!profileData && fallbackProfile) {
    await upsertServerProfileForAccount(accountId, fallbackProfile);
    return fallbackProfile;
  }

  const profile = mapProfileRow(
    accountData as ResearchAccountRow,
    (profileData as ResearchProfileRow | null) ?? null,
    fallbackProfile,
  );
  saveBrowserProfileForAccount(accountId, profile);
  return profile;
}
