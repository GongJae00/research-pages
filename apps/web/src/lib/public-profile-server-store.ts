import { profileLinkSchema, type ProfileLink } from "@research-os/types";

import { getCollaborationBackendStatus } from "@/lib/collaboration/runtime";
import { getDemoPublicResearcherPageData } from "@/lib/demo-preview";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { normalizePublicProfileSlug } from "@/lib/public-profile";

type PublicProfileRow = {
  account_id: string;
  display_name: string | null;
  korean_name: string | null;
  english_name: string | null;
  headline: string | null;
  photo_data_url: string | null;
  orcid: string | null;
  primary_institution: string | null;
  primary_discipline: string | null;
  keywords: string[] | null;
  links: unknown;
  public_profile_slug: string | null;
};

type PublicAffiliationRow = {
  id: string;
  institution_name: string;
  department: string | null;
  lab_name: string | null;
  organization_type: string;
  role_title: string;
  role_track: string;
  appointment_status: string;
  start_date: string;
  end_date: string | null;
  active: boolean;
  notes: string | null;
};

type PublicPublicationRow = {
  id: string;
  title: string;
  journal_class: string | null;
  journal_name: string | null;
  publisher: string | null;
  published_on: string | null;
  author_role: string | null;
  participants: string | null;
};

export interface PublicResearcherPageData {
  accountId: string;
  slug: string;
  displayName: string;
  koreanName?: string;
  englishName?: string;
  headline?: string;
  photoDataUrl?: string;
  orcid?: string;
  primaryInstitution?: string;
  primaryDiscipline?: string;
  keywords: string[];
  links: ProfileLink[];
  affiliations: Array<{
    id: string;
    institutionName: string;
    department?: string;
    labName?: string;
    organizationType: string;
    roleTitle: string;
    roleTrack: string;
    appointmentStatus: string;
    startDate: string;
    endDate?: string;
    active: boolean;
    notes?: string;
  }>;
  publications: Array<{
    id: string;
    title: string;
    journalClass?: string;
    journalName?: string;
    publisher?: string;
    publishedOn?: string;
    authorRole?: string;
    participants?: string;
  }>;
}

function hasPublicProfileServerStore() {
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

function sortAffiliations(rows: PublicAffiliationRow[]) {
  return [...rows].sort((left, right) => {
    if (left.active !== right.active) {
      return left.active ? -1 : 1;
    }

    return right.start_date.localeCompare(left.start_date);
  });
}

function sortPublications(rows: PublicPublicationRow[]) {
  return [...rows].sort((left, right) => {
    const leftDate = left.published_on ?? "";
    const rightDate = right.published_on ?? "";
    return rightDate.localeCompare(leftDate);
  });
}

export async function getPublicResearcherPageData(
  slug: string,
): Promise<PublicResearcherPageData | null> {
  const normalizedSlug = normalizePublicProfileSlug(slug);

  if (!normalizedSlug) {
    return null;
  }

  const demoData = getDemoPublicResearcherPageData(normalizedSlug);
  if (demoData) {
    return demoData;
  }

  if (!hasPublicProfileServerStore()) {
    return null;
  }

  const client = await createSupabaseServerClient();
  const { data: profileRow, error: profileError } = await client
    .from("research_profiles")
    .select(
      "account_id, display_name, korean_name, english_name, headline, photo_data_url, orcid, primary_institution, primary_discipline, keywords, links, public_profile_slug",
    )
    .eq("public_profile_enabled", true)
    .eq("public_profile_slug", normalizedSlug)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profileRow) {
    return null;
  }

  const [{ data: affiliations, error: affiliationsError }, { data: publications, error: publicationsError }] =
    await Promise.all([
      client
        .from("research_affiliations")
        .select(
          "id, institution_name, department, lab_name, organization_type, role_title, role_track, appointment_status, start_date, end_date, active, notes",
        )
        .eq("owner_account_id", profileRow.account_id),
      client
        .from("publications")
        .select(
          "id, title, journal_class, journal_name, publisher, published_on, author_role, participants",
        )
        .eq("owner_account_id", profileRow.account_id),
    ]);

  if (affiliationsError) {
    throw affiliationsError;
  }

  if (publicationsError) {
    throw publicationsError;
  }

  const typedProfile = profileRow as PublicProfileRow;

  return {
    accountId: typedProfile.account_id,
    slug: typedProfile.public_profile_slug ?? normalizedSlug,
    displayName:
      typedProfile.display_name ??
      typedProfile.korean_name ??
      typedProfile.english_name ??
      "Researcher",
    koreanName: typedProfile.korean_name ?? undefined,
    englishName: typedProfile.english_name ?? undefined,
    headline: typedProfile.headline ?? undefined,
    photoDataUrl: typedProfile.photo_data_url ?? undefined,
    orcid: typedProfile.orcid ?? undefined,
    primaryInstitution: typedProfile.primary_institution ?? undefined,
    primaryDiscipline: typedProfile.primary_discipline ?? undefined,
    keywords: typedProfile.keywords ?? [],
    links: normalizeProfileLinks(typedProfile.links),
    affiliations: sortAffiliations((affiliations ?? []) as PublicAffiliationRow[]).map((row) => ({
      id: row.id,
      institutionName: row.institution_name,
      department: row.department ?? undefined,
      labName: row.lab_name ?? undefined,
      organizationType: row.organization_type,
      roleTitle: row.role_title,
      roleTrack: row.role_track,
      appointmentStatus: row.appointment_status,
      startDate: row.start_date,
      endDate: row.end_date ?? undefined,
      active: row.active,
      notes: row.notes ?? undefined,
    })),
    publications: sortPublications((publications ?? []) as PublicPublicationRow[]).map((row) => ({
      id: row.id,
      title: row.title,
      journalClass: row.journal_class ?? undefined,
      journalName: row.journal_name ?? undefined,
      publisher: row.publisher ?? undefined,
      publishedOn: row.published_on ?? undefined,
      authorRole: row.author_role ?? undefined,
      participants: row.participants ?? undefined,
    })),
  };
}
