import { getCollaborationBackendStatus } from "@/lib/collaboration/runtime";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { normalizePublicLabSlug } from "@/lib/public-lab";

type PublicLabPageRow = {
  id: string;
  name: string;
  slug: string;
  summary: string | null;
  homepage_title: string | null;
  homepage_description: string | null;
};

type PublicLabMemberRow = {
  member_id: string;
  account_id: string;
  role_title: string;
  sort_order: number;
  korean_name: string | null;
  english_name: string | null;
  display_name: string | null;
  headline: string | null;
  photo_data_url: string | null;
  primary_institution: string | null;
  primary_discipline: string | null;
  public_profile_slug: string | null;
};

type PublicLabPaperRow = {
  id: string;
  title: string;
  journal_class: string | null;
  journal_name: string | null;
  publisher: string | null;
  published_on: string | null;
  author_role: string | null;
  participants: string | null;
};

type PublicLabProjectRow = {
  id: string;
  title: string;
  summary: string | null;
  start_date: string;
  end_date: string | null;
  status: "ongoing" | "completed";
  program: string;
  sponsor: string;
  sort_order: number;
};

export interface PublicLabPageData {
  id: string;
  slug: string;
  name: string;
  summary?: string;
  homepageTitle?: string;
  homepageDescription?: string;
  people: Array<{
    id: string;
    accountId: string;
    roleTitle: string;
    sortOrder: number;
    koreanName?: string;
    englishName?: string;
    displayName: string;
    headline?: string;
    photoDataUrl?: string;
    primaryInstitution?: string;
    primaryDiscipline?: string;
    publicProfileSlug?: string;
  }>;
  papers: Array<{
    id: string;
    title: string;
    journalClass?: string;
    journalName?: string;
    publisher?: string;
    publishedOn?: string;
    authorRole?: string;
    participants?: string;
  }>;
  researchProjects: Array<{
    id: string;
    title: string;
    summary?: string;
    startDate: string;
    endDate?: string;
    status: "ongoing" | "completed";
    program: string;
    sponsor: string;
    sortOrder: number;
  }>;
}

function hasPublicLabServerStore() {
  const backendStatus = getCollaborationBackendStatus();
  return backendStatus.currentMode === "supabase" && backendStatus.supabaseConfigured;
}

function sortPeople(rows: PublicLabMemberRow[]) {
  return [...rows].sort((left, right) => {
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }

    const leftName = left.korean_name ?? left.english_name ?? left.display_name ?? "";
    const rightName = right.korean_name ?? right.english_name ?? right.display_name ?? "";
    return leftName.localeCompare(rightName);
  });
}

function sortPapers(rows: PublicLabPaperRow[]) {
  return [...rows].sort((left, right) => {
    const leftDate = left.published_on ?? "";
    const rightDate = right.published_on ?? "";
    return rightDate.localeCompare(leftDate);
  });
}

function sortProjects(rows: PublicLabProjectRow[]) {
  return [...rows].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === "ongoing" ? -1 : 1;
    }

    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }

    if (left.status === "ongoing") {
      return right.start_date.localeCompare(left.start_date);
    }

    return (right.end_date ?? "").localeCompare(left.end_date ?? "");
  });
}

export async function getPublicLabPageData(
  slug: string,
): Promise<PublicLabPageData | null> {
  if (!hasPublicLabServerStore()) {
    return null;
  }

  const normalizedSlug = normalizePublicLabSlug(slug);

  if (!normalizedSlug) {
    return null;
  }

  const client = await createSupabaseServerClient();
  const [
    { data: pageRows, error: pageError },
    { data: peopleRows, error: peopleError },
    { data: paperRows, error: paperError },
    { data: projectRows, error: projectError },
  ] = await Promise.all([
    client.rpc("get_public_lab_page", { target_slug: normalizedSlug }),
    client.rpc("get_public_lab_people", { target_slug: normalizedSlug }),
    client.rpc("get_public_lab_papers", { target_slug: normalizedSlug }),
    client.rpc("get_public_lab_projects", { target_slug: normalizedSlug }),
  ]);

  if (pageError) {
    throw pageError;
  }

  if (peopleError) {
    throw peopleError;
  }

  if (paperError) {
    throw paperError;
  }

  if (projectError) {
    throw projectError;
  }

  const page = (pageRows as PublicLabPageRow[] | null)?.[0];

  if (!page) {
    return null;
  }

  return {
    id: page.id,
    slug: page.slug,
    name: page.name,
    summary: page.summary ?? undefined,
    homepageTitle: page.homepage_title ?? undefined,
    homepageDescription: page.homepage_description ?? undefined,
    people: sortPeople((peopleRows as PublicLabMemberRow[] | null) ?? []).map((row) => ({
      id: row.member_id,
      accountId: row.account_id,
      roleTitle: row.role_title,
      sortOrder: row.sort_order,
      koreanName: row.korean_name ?? undefined,
      englishName: row.english_name ?? undefined,
      displayName:
        row.display_name ??
        row.korean_name ??
        row.english_name ??
        "Researcher",
      headline: row.headline ?? undefined,
      photoDataUrl: row.photo_data_url ?? undefined,
      primaryInstitution: row.primary_institution ?? undefined,
      primaryDiscipline: row.primary_discipline ?? undefined,
      publicProfileSlug: row.public_profile_slug ?? undefined,
    })),
    papers: sortPapers((paperRows as PublicLabPaperRow[] | null) ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      journalClass: row.journal_class ?? undefined,
      journalName: row.journal_name ?? undefined,
      publisher: row.publisher ?? undefined,
      publishedOn: row.published_on ?? undefined,
      authorRole: row.author_role ?? undefined,
      participants: row.participants ?? undefined,
    })),
    researchProjects: sortProjects((projectRows as PublicLabProjectRow[] | null) ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      summary: row.summary ?? undefined,
      startDate: row.start_date,
      endDate: row.end_date ?? undefined,
      status: row.status,
      program: row.program,
      sponsor: row.sponsor,
      sortOrder: row.sort_order,
    })),
  };
}
