import {
  researcherSummarySchema,
  type Account,
  type AffiliationTimelineEntry,
  type DocumentRecord,
  type LabWorkspace,
  type PublicationRecord,
  type ResearchProfile,
  type ResearcherSummary,
} from "@research-os/types";

import type { Locale } from "@/lib/i18n";

import { readLabs } from "./mock-auth-store";

type LabLink = {
  slug: string;
  name: string;
};

export function normalizeComparableText(value?: string) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9가-힣]+/g, "");
}

export function joinUniqueTextParts(parts: Array<string | undefined>, separator = " / ") {
  const seen = new Set<string>();

  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .filter((part) => {
      const normalized = normalizeComparableText(part);

      if (seen.has(normalized)) {
        return false;
      }

      seen.add(normalized);
      return true;
    })
    .join(separator);
}

export function inferRoleTrackFromMember(
  roleTitle: string,
  permissionLevel: "owner" | "admin" | "member",
): AffiliationTimelineEntry["roleTrack"] {
  const normalized = roleTitle.toLowerCase();

  if (
    normalized.includes("phd") ||
    normalized.includes("master") ||
    normalized.includes("ms") ||
    normalized.includes("student")
  ) {
    return "student";
  }

  if (
    normalized.includes("professor") ||
    normalized.includes("faculty") ||
    permissionLevel === "owner"
  ) {
    return "faculty";
  }

  if (normalized.includes("postdoc")) {
    return "postdoc";
  }

  if (normalized.includes("admin")) {
    return "admin";
  }

  return "researcher";
}

export function buildAffiliationsFromLabs(
  accountId: string,
  preferredLabSlug: string | null,
  labs: LabWorkspace[] = readLabs(),
): AffiliationTimelineEntry[] {
  const orderedLabs = [...labs].sort((left, right) => {
    const leftPreferred = preferredLabSlug ? left.slug === preferredLabSlug : false;
    const rightPreferred = preferredLabSlug ? right.slug === preferredLabSlug : false;

    if (leftPreferred !== rightPreferred) {
      return leftPreferred ? -1 : 1;
    }

    return right.createdOn.localeCompare(left.createdOn);
  });

  const entries = orderedLabs.flatMap((lab) => {
    const member = lab.members.find((item) => item.accountId === accountId);

    if (!member) {
      return [];
    }

    return [
      {
        id: `aff-${lab.id}-${member.id}`,
        owner: { type: "user" as const, id: accountId },
        institutionName: lab.name,
        department: undefined,
        labName: lab.homepageTitle ?? lab.name,
        organizationType: "lab" as const,
        roleTitle: member.roleTitle,
        roleTrack: inferRoleTrackFromMember(member.roleTitle, member.permissionLevel),
        appointmentStatus: "active" as const,
        startDate: member.joinedOn,
        active: true,
        relatedFundingIds: [],
        notes: lab.summary ?? undefined,
      },
    ];
  });

  return entries.sort((left, right) => right.startDate.localeCompare(left.startDate));
}

export function buildProfileFromAccount(
  account: Account,
  affiliations: AffiliationTimelineEntry[],
): ResearchProfile {
  const primaryAffiliation = affiliations.find((entry) => entry.active) ?? affiliations[0];

  return {
    id: `profile-${account.id}`,
    owner: { type: "user", id: account.id },
    displayName: account.koreanName || account.englishName || account.primaryEmail,
    legalName: undefined,
    preferredName: undefined,
    koreanName: account.koreanName,
    englishName: account.englishName,
    romanizedName: account.englishName,
    headline: undefined,
    primaryEmail: account.primaryEmail,
    secondaryEmail: undefined,
    emails: [account.primaryEmail],
    phone: undefined,
    phones: [],
    photoDataUrl: undefined,
    nationalResearcherNumber: account.nationalResearcherNumber,
    orcid: undefined,
    primaryInstitution: primaryAffiliation?.institutionName,
    primaryDiscipline: undefined,
    keywords: [],
    links: [],
    publicProfile: {
      enabled: false,
      slug: undefined,
    },
  };
}

export function sortAffiliations(items: AffiliationTimelineEntry[]) {
  return [...items].sort((left, right) => {
    if (left.active !== right.active) {
      return left.active ? -1 : 1;
    }

    return right.startDate.localeCompare(left.startDate);
  });
}

export function buildLabLinkLookup(labs: LabWorkspace[] = readLabs()) {
  const map = new Map<string, LabLink>();

  labs.forEach((lab) => {
    [lab.name, lab.homepageTitle, lab.slug].forEach((value) => {
      if (!value) {
        return;
      }

      map.set(normalizeComparableText(value), {
        slug: lab.slug,
        name: lab.homepageTitle ?? lab.name,
      });
    });
  });

  return map;
}

export function findLabLinkInLookup(
  lookup: Map<string, LabLink>,
  names: Array<string | undefined>,
) {
  for (const name of names) {
    if (!name) {
      continue;
    }

    const found = lookup.get(normalizeComparableText(name));

    if (found) {
      return found;
    }
  }

  return null;
}

export function buildResearcherSummary(input: {
  accountId?: string | null;
  profile: ResearchProfile;
  affiliations: AffiliationTimelineEntry[];
  publications: PublicationRecord[];
  linkedDocuments: DocumentRecord[];
  preferredLabSlug?: string | null;
  labLookup?: Map<string, LabLink>;
}): ResearcherSummary {
  const primaryAffiliation =
    input.affiliations.find((affiliation) => affiliation.active) ?? input.affiliations[0] ?? null;
  const labLookup = input.labLookup ?? buildLabLinkLookup();
  const labLink = primaryAffiliation
    ? findLabLinkInLookup(labLookup, [
        primaryAffiliation.labName,
        primaryAffiliation.institutionName,
        input.preferredLabSlug ?? undefined,
      ])
    : null;

  return researcherSummarySchema.parse({
    id: `summary-${input.profile.owner.type}-${input.profile.owner.id}`,
    owner: input.profile.owner,
    accountId: input.accountId ?? undefined,
    displayName:
      input.profile.koreanName ||
      input.profile.englishName ||
      input.profile.displayName,
    koreanName: input.profile.koreanName,
    englishName: input.profile.englishName,
    primaryEmail: input.profile.emails[0] ?? input.profile.primaryEmail,
    primaryInstitution:
      primaryAffiliation?.institutionName ?? input.profile.primaryInstitution,
    primaryLabName: primaryAffiliation?.labName,
    primaryLabSlug: labLink?.slug,
    primaryRoleTitle: primaryAffiliation?.roleTitle,
    primaryDiscipline: input.profile.primaryDiscipline,
    photoDataUrl: input.profile.photoDataUrl,
    keywords: input.profile.keywords,
    affiliationCount: input.affiliations.length,
    publicationCount: input.publications.length,
    linkedDocumentCount: input.linkedDocuments.length,
  });
}

export function buildResearcherProfileHref(
  locale: Locale,
  accountId: string,
  labSlug?: string | null,
) {
  const params = new URLSearchParams();
  params.set("account", accountId);

  if (labSlug) {
    params.set("lab", labSlug);
  }

  return `/${locale}/profile?${params.toString()}`;
}
