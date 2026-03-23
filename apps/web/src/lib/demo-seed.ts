import type {
  Account,
  AccountSession,
  ActivityLog,
  AffiliationTimelineEntry,
  DocumentRecord,
  FundingRecord,
  LabResearchProject,
  LabWorkspace,
  PublicationRecord,
  ResearchProfile,
  TimetableEntry,
} from "@research-os/types";

import {
  hydrateBrowserActivityLogs,
} from "@/lib/activity-log-browser-store";
import { saveBrowserAffiliationsForAccount } from "@/lib/affiliation-browser-store";
import { writeJsonToStorage, readJsonFromStorage } from "@/lib/browser-json-store";
import {
  saveBrowserDocumentsForAccount,
} from "@/lib/document-browser-store";
import { ensureSeededDocumentFiles } from "@/lib/document-seeds";
import { getDocumentFile, saveDocumentFile } from "@/lib/document-file-store";
import { writeEvidenceLinksForAccount } from "@/lib/evidence-links";
import { saveBrowserFundingForAccount } from "@/lib/funding-browser-store";
import { saveBrowserLabResearchProjects } from "@/lib/lab-research-browser-store";
import {
  buildScopedStorageKeyForAccount,
  hydrateAccounts,
  hydrateCurrentSession,
  hydrateLabs,
} from "@/lib/mock-auth-store";
import { saveBrowserProfileForAccount } from "@/lib/profile-browser-store";
import { saveBrowserPublicationsForAccount } from "@/lib/publication-browser-store";
import {
  demoPublicLabSlug,
  demoPublicResearcherSlug,
} from "@/lib/demo-preview";

const demoEnabled = process.env.NEXT_PUBLIC_RESEARCH_PAGES_DEMO_MODE === "true";
const demoSeedVersion =
  process.env.NEXT_PUBLIC_RESEARCH_PAGES_DEMO_SEED_VERSION?.trim() || "research-pages-demo-v1";
const demoSeedMarkerKey = "researchpages:demo-seed:version";
const profileWorkspaceStorageBaseKey = "researchos:profile-workspace:v2";
const timetableStorageBaseKey = "researchos:timetable-workspace:v4";
const labTimetableStorageBaseKey = "researchos:lab-timetable:v1";

const demoAccountId = "user-gongjae";
const demoLabId = "lab-rp-pilot";
const demoTermKey = "2026-spring";

const demoAccounts: Account[] = [
  {
    id: demoAccountId,
    koreanName: "공재",
    englishName: "GongJae",
    primaryEmail: "gongjae@example.com",
    nationalResearcherNumber: "NR-2026-001",
    createdOn: "2026-03-01",
  },
  {
    id: "account-demo-vision-kim",
    koreanName: "김비전",
    englishName: "Vision Kim",
    primaryEmail: "vision@cvclab.example",
    nationalResearcherNumber: "NR-DEMO-001",
    createdOn: "2026-03-01",
  },
  {
    id: "account-demo-mina-park",
    koreanName: "박세미나",
    englishName: "Mina Park",
    primaryEmail: "mina@cvclab.example",
    nationalResearcherNumber: "NR-DEMO-002",
    createdOn: "2026-03-01",
  },
  {
    id: "account-demo-daniel-choi",
    koreanName: "최다니엘",
    englishName: "Daniel Choi",
    primaryEmail: "daniel@cvclab.example",
    nationalResearcherNumber: "NR-DEMO-003",
    createdOn: "2026-03-01",
  },
];

const demoSession: AccountSession = {
  accountId: demoAccountId,
  signedInOn: "2026-03-16",
};

const demoProfile: ResearchProfile = {
  id: "profile-main",
  owner: { type: "user", id: demoAccountId },
  displayName: "GongJae",
  koreanName: "공재",
  englishName: "Youngjae Jo",
  preferredName: "GongJae",
  romanizedName: "GongJae",
  headline:
    "Graduate researcher building a structured operations system for research life.",
  primaryEmail: "gongjae@example.com",
  secondaryEmail: "gongjae@lab.example.com",
  emails: ["gongjae@example.com", "gongjae@lab.example.com"],
  phones: [],
  nationalResearcherNumber: "NR-2026-001",
  orcid: "0000-0000-0000-0000",
  primaryInstitution: "ResearchPages Pilot Lab",
  primaryDiscipline: "Human-centered systems",
  keywords: ["profile vault", "funding context", "document reuse", "lab operations"],
  links: [
    { kind: "github", label: "GitHub", url: "https://github.com/gongjae" },
    {
      kind: "homepage",
      label: "Research homepage",
      url: "https://researchpages.example/gongjae",
    },
    {
      kind: "google_scholar",
      label: "Google Scholar",
      url: "https://scholar.google.com/citations?user=gongjae",
    },
  ],
  publicProfile: {
    enabled: true,
    slug: demoPublicResearcherSlug,
  },
};

const demoProfileWorkspace = {
  koreanName: "공재",
  englishName: "Youngjae Jo",
  emails: ["gongjae@example.com", "gongjae@lab.example.com"],
  links: [
    { kind: "github", label: "GitHub", url: "https://github.com/gongjae" },
    {
      kind: "homepage",
      label: "Research homepage",
      url: "https://researchpages.example/gongjae",
    },
    {
      kind: "google_scholar",
      label: "Google Scholar",
      url: "https://scholar.google.com/citations?user=gongjae",
    },
  ],
  nationalResearcherNumber: "NR-2026-001",
  orcid: "0000-0000-0000-0000",
  primaryInstitution: "ResearchPages Pilot Lab",
  primaryDiscipline: "Human-centered systems",
  keywordsText: "profile vault, funding context, document reuse, lab operations",
  photoDataUrl: "",
  publicProfileEnabled: true,
  publicProfileSlug: demoPublicResearcherSlug,
};

const demoAffiliations: AffiliationTimelineEntry[] = [
  {
    id: "aff-1",
    owner: { type: "user", id: demoAccountId },
    institutionName: "Yonsei University",
    department: "Graduate School",
    labName: "ResearchPages Pilot Lab",
    organizationType: "university",
    roleTitle: "Master's Student",
    roleTrack: "student",
    appointmentStatus: "active",
    startDate: "2025-03-01",
    active: true,
    relatedFundingIds: ["fund-1", "fund-2"],
    notes: "Primary academic affiliation and research home base.",
  },
  {
    id: "aff-2",
    owner: { type: "user", id: demoAccountId },
    institutionName: "Industry Collaboration Center",
    organizationType: "company",
    roleTitle: "Project Research Assistant",
    roleTrack: "industry",
    appointmentStatus: "active",
    startDate: "2025-09-01",
    active: true,
    relatedFundingIds: ["fund-3"],
    notes: "Tracks project rules separately from the university timeline.",
  },
];

const demoFunding: FundingRecord[] = [
  {
    id: "fund-1",
    owner: { type: "user", id: demoAccountId },
    title: "Graduate Scholarship",
    sourceType: "scholarship",
    compensationKind: "scholarship",
    providerName: "Yonsei Graduate School",
    currency: "KRW",
    amount: 1800000,
    cadence: "monthly",
    startDate: "2025-03-01",
    active: true,
    linkedAffiliationId: "aff-1",
    restrictions: ["Requires enrolled status", "Cannot overlap with certain assistantships"],
  },
  {
    id: "fund-2",
    owner: { type: "user", id: demoAccountId },
    title: "Lab Research Assistant Payroll",
    sourceType: "assistantship",
    compensationKind: "payroll",
    providerName: "ResearchPages Pilot Lab",
    projectName: "Researcher workflow platform prototype",
    currency: "KRW",
    amount: 900000,
    cadence: "monthly",
    startDate: "2025-03-01",
    active: true,
    linkedAffiliationId: "aff-1",
    restrictions: ["Subject to university payroll cap"],
  },
  {
    id: "fund-3",
    owner: { type: "user", id: demoAccountId },
    title: "Industry Joint Project Support",
    sourceType: "industry",
    compensationKind: "grant",
    providerName: "Industry Collaboration Center",
    projectName: "Document operations pilot",
    currency: "KRW",
    cadence: "custom",
    startDate: "2025-09-01",
    endDate: "2026-02-28",
    active: false,
    linkedAffiliationId: "aff-2",
    restrictions: ["Only available during active project months"],
    notes: "Shows that project-linked support can end independently from the profile.",
  },
];

const demoDocuments: DocumentRecord[] = [
  {
    id: "doc-1",
    owner: { type: "user", id: demoAccountId },
    title: "Academic CV Working Draft",
    documentCategory: "reference_archive",
    documentType: "cv",
    sourceKind: "mixed",
    status: "draft",
    visibility: "private",
    summary:
      "Base CV file that stays updated so new contacts and applications start from current source data.",
    originalFileName: "Academic_CV_Working_Draft.md",
    mimeType: "text/markdown",
    fileExtension: "md",
    fileSizeBytes: 4096,
    fileAssetId: "asset-profile-cv-working-draft",
    tags: ["cv", "career-kit", "profile"],
    relatedFundingIds: [],
    relatedAffiliationIds: ["aff-1", "aff-2"],
    updatedOn: "2026-03-16",
  },
  {
    id: "doc-2",
    owner: { type: "user", id: demoAccountId },
    title: "Statement of Purpose Core Draft",
    documentCategory: "application_admin",
    documentType: "statement",
    sourceKind: "mixed",
    status: "draft",
    visibility: "private",
    summary:
      "Reusable SOP paragraphs that can be refined over time and remixed for each opportunity.",
    originalFileName: "Statement_of_Purpose_Core_Draft.md",
    mimeType: "text/markdown",
    fileExtension: "md",
    fileSizeBytes: 4096,
    fileAssetId: "asset-profile-sop-core-draft",
    tags: ["sop", "statement", "career-kit"],
    relatedFundingIds: [],
    relatedAffiliationIds: ["aff-1", "aff-2"],
    updatedOn: "2026-03-15",
  },
  {
    id: "doc-3",
    owner: { type: "user", id: demoAccountId },
    title: "Research Portfolio Highlights",
    documentCategory: "reference_archive",
    documentType: "portfolio",
    sourceKind: "mixed",
    status: "draft",
    visibility: "private",
    summary:
      "Continuously updated portfolio notes covering representative projects, strengths, and public links.",
    originalFileName: "Research_Portfolio_Highlights.md",
    mimeType: "text/markdown",
    fileExtension: "md",
    fileSizeBytes: 4096,
    fileAssetId: "asset-profile-portfolio-highlights",
    tags: ["portfolio", "career-kit", "projects"],
    relatedFundingIds: [],
    relatedAffiliationIds: ["aff-1", "aff-2"],
    updatedOn: "2026-03-13",
  },
  {
    id: "doc-4",
    owner: { type: "user", id: demoAccountId },
    title: "Research Plan Core Narrative",
    documentCategory: "research",
    documentType: "research_plan",
    sourceKind: "mixed",
    status: "draft",
    visibility: "private",
    summary: "Core paragraphs to remix across institution-specific forms.",
    originalFileName: "Research_Plan_Core_Narrative.md",
    mimeType: "text/markdown",
    fileExtension: "md",
    fileSizeBytes: 4096,
    fileAssetId: "asset-demo-research-plan-core",
    tags: ["plan", "proposal", "reusable"],
    relatedFundingIds: [],
    relatedAffiliationIds: ["aff-1", "aff-2"],
    updatedOn: "2026-03-05",
  },
  {
    id: "doc-5",
    owner: { type: "user", id: demoAccountId },
    title: "2026 National Scholarship Motivation Statement",
    documentCategory: "application_admin",
    documentType: "scholarship_answer",
    sourceKind: "mixed",
    status: "active",
    visibility: "private",
    summary: "Reusable answer bank content for scholarship applications.",
    originalFileName: "2026_National_Scholarship_Motivation_Statement.md",
    mimeType: "text/markdown",
    fileExtension: "md",
    fileSizeBytes: 4096,
    fileAssetId: "asset-demo-scholarship-answer",
    tags: ["scholarship", "motivation", "2026"],
    relatedFundingIds: ["fund-1"],
    relatedAffiliationIds: ["aff-1"],
    updatedOn: "2026-03-01",
  },
];

const demoPublications: PublicationRecord[] = [
  {
    id: "pub-1",
    owner: { type: "user", id: demoAccountId },
    title: "Structured Researcher Profile and Document Reuse System",
    journalClass: "KCI",
    journalName: "Journal of Research Operations",
    publisher: "Korean Society of Information Systems",
    publishedOn: "2026-02",
    authorRole: "First author",
    participants: "GongJae, Vision Kim, Mina Park",
    doi: "10.0000/researchpages.2026.001",
    updatedOn: "2026-03-16",
  },
  {
    id: "pub-2",
    owner: { type: "user", id: demoAccountId },
    title: "Lab Publication and Seminar Archive Redesign",
    journalClass: "proceedings",
    journalName: "CHI 2026 Workshop",
    publisher: "ACM",
    publishedOn: "2025-11",
    authorRole: "Co-author",
    participants: "GongJae, Daniel Choi",
    updatedOn: "2026-03-15",
  },
];

const demoTimetableEntries: TimetableEntry[] = [
  {
    id: "slot-1",
    scheduleId: "schedule-advanced-research-methods",
    courseTitle: "Advanced Research Methods",
    courseCode: "RSH601",
    dayOfWeek: "monday",
    startTime: "09:00",
    endTime: "10:30",
    kind: "class",
    location: "Engineering Hall 301",
  },
  {
    id: "slot-2",
    scheduleId: "schedule-lab-weekly-meeting",
    courseTitle: "Lab Weekly Meeting",
    dayOfWeek: "wednesday",
    startTime: "14:00",
    endTime: "15:30",
    kind: "meeting",
    location: "Pilot Lab Conference Room",
  },
  {
    id: "slot-3",
    scheduleId: "schedule-proposal-writing-block",
    courseTitle: "Proposal Writing Block",
    dayOfWeek: "friday",
    startTime: "10:00",
    endTime: "12:00",
    kind: "research",
    notes: "Reserved writing time for scholarship and grant submissions.",
  },
];

const demoLab: LabWorkspace = {
  id: demoLabId,
  name: "ResearchPages Pilot Lab",
  slug: demoPublicLabSlug,
  summary: "Structured operations system for graduate researchers and labs.",
  ownerAccountId: demoAccountId,
  homepageTitle: "ResearchPages Pilot Lab",
  homepageDescription:
    "Profiles, documents, research, and shared schedules built from one operating dataset.",
  publicPageEnabled: true,
  members: [
    {
      id: "member-gongjae",
      accountId: demoAccountId,
      koreanName: "공재",
      englishName: "GongJae",
      email: "gongjae@example.com",
      nationalResearcherNumber: "NR-2026-001",
      roleTitle: "Lab Lead",
      sortOrder: 0,
      permissionLevel: "owner",
      canManageProfile: true,
      canManageDocuments: true,
      canManageMembers: true,
      joinedOn: "2025-03-01",
    },
    {
      id: "member-vision",
      accountId: "account-demo-vision-kim",
      koreanName: "김비전",
      englishName: "Vision Kim",
      email: "vision@cvclab.example",
      nationalResearcherNumber: "NR-DEMO-001",
      roleTitle: "PhD Researcher",
      sortOrder: 10,
      permissionLevel: "member",
      canManageProfile: false,
      canManageDocuments: true,
      canManageMembers: false,
      joinedOn: "2026-03-01",
    },
    {
      id: "member-mina",
      accountId: "account-demo-mina-park",
      koreanName: "박세미나",
      englishName: "Mina Park",
      email: "mina@cvclab.example",
      nationalResearcherNumber: "NR-DEMO-002",
      roleTitle: "MS Researcher",
      sortOrder: 20,
      permissionLevel: "member",
      canManageProfile: false,
      canManageDocuments: true,
      canManageMembers: false,
      joinedOn: "2026-03-01",
    },
    {
      id: "member-daniel",
      accountId: "account-demo-daniel-choi",
      koreanName: "최다니엘",
      englishName: "Daniel Choi",
      email: "daniel@cvclab.example",
      nationalResearcherNumber: "NR-DEMO-003",
      roleTitle: "Lab Coordinator",
      sortOrder: 30,
      permissionLevel: "admin",
      canManageProfile: true,
      canManageDocuments: true,
      canManageMembers: true,
      joinedOn: "2026-03-01",
    },
  ],
  invites: [],
  editLocks: [],
  sharedDocumentIds: ["doc-4", "doc-5"],
  sharedPaperIds: ["pub-1", "pub-2"],
  sharedScheduleIds: [
    "schedule-advanced-research-methods",
    "schedule-lab-weekly-meeting",
    "schedule-proposal-writing-block",
  ],
  createdOn: "2026-03-01",
};

const demoResearchProjects: LabResearchProject[] = [
  {
    id: "research-1",
    owner: { type: "lab", id: demoLabId },
    title: "Structured researcher profile and document reuse system",
    summary:
      "Build a web-first system that connects researcher profiles, reusable documents, and public-facing lab pages.",
    startDate: "2026-01-01",
    status: "ongoing",
    program: "ResearchPages platform build",
    sponsor: demoLab.name,
    sortOrder: 0,
    publicVisible: true,
  },
  {
    id: "research-2",
    owner: { type: "lab", id: demoLabId },
    title: "Lab publication and seminar archive redesign",
    summary:
      "Restructure publications, seminar materials, and timeline records so lab assets are easier to reuse and publish.",
    startDate: "2025-09-01",
    status: "ongoing",
    program: "Lab knowledge archive pilot",
    sponsor: "Graduate lab operations support",
    sortOrder: 1,
    publicVisible: true,
  },
  {
    id: "research-3",
    owner: { type: "lab", id: demoLabId },
    title: "Faculty and lab public profile generation pilot",
    summary:
      "Test how internal researcher data can become public profile and lab website content without re-entering the same information.",
    startDate: "2025-03-01",
    endDate: "2025-12-31",
    status: "completed",
    program: "Public publishing pilot",
    sponsor: "University innovation seed project",
    sortOrder: 2,
    publicVisible: true,
  },
];

const demoActivityLogs: ActivityLog[] = [
  {
    id: "activity-1",
    labId: demoLabId,
    actorAccountId: demoAccountId,
    actorName: "GongJae",
    action: "lab.updated",
    resourceType: "lab",
    resourceId: demoLabId,
    payload: { title: demoLab.name },
    createdAt: "2026-03-16T09:15:00+09:00",
  },
  {
    id: "activity-2",
    labId: demoLabId,
    actorAccountId: "account-demo-daniel-choi",
    actorName: "Daniel Choi",
    action: "member.updated",
    resourceType: "member",
    resourceId: "member-daniel",
    payload: { memberName: "Daniel Choi" },
    createdAt: "2026-03-15T14:10:00+09:00",
  },
  {
    id: "activity-3",
    labId: demoLabId,
    actorAccountId: demoAccountId,
    actorName: "GongJae",
    action: "document.shared",
    resourceType: "document",
    resourceId: "doc-4",
    payload: { title: "Research Plan Core Narrative" },
    createdAt: "2026-03-14T11:00:00+09:00",
  },
];

const demoEvidenceLinks = {
  "profile:core": ["doc-1", "doc-2", "doc-3"],
  "affiliation:aff-1": ["doc-1", "doc-5"],
  "affiliation:aff-2": ["doc-4"],
  "funding:fund-1": ["doc-5"],
  "funding:fund-2": ["doc-1", "doc-3"],
  "funding:fund-3": ["doc-4"],
  "timetable:schedule-advanced-research-methods": ["doc-4"],
  "timetable:schedule-proposal-writing-block": ["doc-4", "doc-5"],
} satisfies Record<string, string[]>;

const extraDocumentFileBodies = {
  "asset-demo-research-plan-core": `# Research Plan Core Narrative

## Central problem
- What practical workflow breaks today?
- Why does this matter for graduate researchers and labs?

## Proposed system
- Structured profile vault
- Document reuse
- Lab collaboration
- Public page generation

## Near-term milestones
1. Stabilize the profile, affiliation, funding, and document model.
2. Reuse the same dataset for lab pages and researcher pages.
3. Reduce repeated writing for applications and contact packets.
`,
  "asset-demo-scholarship-answer": `# National Scholarship Motivation Statement

## Motivation
I want to reduce repeated writing and scattered administrative work across research life.

## Preparation
- Maintained structured profile and funding records
- Built reusable document workflows
- Coordinated lab-facing publication and archive tasks

## Expected impact
The same core narrative should support scholarships, research plans, and future public profiles.
`,
} as const;

function canUseDemoSeed() {
  return (
    typeof window !== "undefined" &&
    demoEnabled &&
    process.env.NEXT_PUBLIC_RESEARCH_OS_DATA_MODE !== "supabase"
  );
}

function writeProfileWorkspaceSeed() {
  writeJsonToStorage(
    buildScopedStorageKeyForAccount(profileWorkspaceStorageBaseKey, demoAccountId),
    demoProfileWorkspace,
  );
}

function writeTimetableSeed() {
  writeJsonToStorage(
    buildScopedStorageKeyForAccount(timetableStorageBaseKey, demoAccountId),
    { [demoTermKey]: demoTimetableEntries },
  );
  writeJsonToStorage(
    buildScopedStorageKeyForAccount(labTimetableStorageBaseKey, demoAccountId),
    { [demoLabId]: demoTimetableEntries },
  );
}

function markSeedVersion() {
  writeJsonToStorage(demoSeedMarkerKey, demoSeedVersion);
}

function hasCurrentSeedVersion() {
  return readJsonFromStorage<string | null>(demoSeedMarkerKey, null) === demoSeedVersion;
}

export function isDemoPreviewEnabled() {
  return canUseDemoSeed();
}

export function ensureDemoBrowserSeed() {
  if (!canUseDemoSeed() || hasCurrentSeedVersion()) {
    return false;
  }

  hydrateAccounts(demoAccounts);
  hydrateCurrentSession(demoSession);
  hydrateLabs([demoLab]);
  saveBrowserProfileForAccount(demoAccountId, demoProfile);
  writeProfileWorkspaceSeed();
  saveBrowserAffiliationsForAccount(demoAccountId, demoAffiliations);
  saveBrowserFundingForAccount(demoAccountId, demoFunding);
  saveBrowserDocumentsForAccount(demoAccountId, demoDocuments);
  saveBrowserPublicationsForAccount(demoAccountId, demoPublications);
  writeEvidenceLinksForAccount(demoAccountId, demoEvidenceLinks);
  writeTimetableSeed();
  saveBrowserLabResearchProjects(demoLabId, demoResearchProjects);
  hydrateBrowserActivityLogs(demoLabId, demoActivityLogs);
  markSeedVersion();
  return true;
}

export async function ensureDemoSeedAssets() {
  if (!canUseDemoSeed()) {
    return;
  }

  await ensureSeededDocumentFiles(demoDocuments);

  await Promise.all(
    Object.entries(extraDocumentFileBodies).map(async ([assetId, body]) => {
      const existing = await getDocumentFile(assetId);

      if (existing) {
        return;
      }

      await saveDocumentFile(assetId, new Blob([body], { type: "text/markdown" }));
    }),
  );
}
