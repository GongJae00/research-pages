import type { ProfileLink } from "@research-os/types";

import { buildPublicLabPath, normalizePublicLabSlug } from "@/lib/public-lab";
import {
  buildPublicResearcherPath,
  normalizePublicProfileSlug,
} from "@/lib/public-profile";

export const demoPublicResearcherSlug = "gongjae";
export const demoPublicLabSlug = "researchpages-pilot-lab";

const demoProfileLinks: ProfileLink[] = [
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
];

export function isDemoPreviewRuntimeEnabled() {
  return (
    process.env.NEXT_PUBLIC_RESEARCH_PAGES_DEMO_MODE === "true" &&
    process.env.NEXT_PUBLIC_RESEARCH_OS_DATA_MODE !== "supabase"
  );
}

export function getDemoPreviewLinks() {
  return {
    researcher: {
      ko: buildPublicResearcherPath("ko", demoPublicResearcherSlug),
      en: buildPublicResearcherPath("en", demoPublicResearcherSlug),
    },
    lab: {
      ko: buildPublicLabPath("ko", demoPublicLabSlug),
      en: buildPublicLabPath("en", demoPublicLabSlug),
    },
  };
}

export function getDemoPublicResearcherPageData(slug: string) {
  if (!isDemoPreviewRuntimeEnabled()) {
    return null;
  }

  if (normalizePublicProfileSlug(slug) !== demoPublicResearcherSlug) {
    return null;
  }

  return {
    accountId: "user-gongjae",
    slug: demoPublicResearcherSlug,
    displayName: "GongJae",
    koreanName: "공재",
    englishName: "Youngjae Jo",
    headline: "Graduate researcher building a structured operations system for research life.",
    orcid: "0000-0000-0000-0000",
    primaryInstitution: "ResearchPages Pilot Lab",
    primaryDiscipline: "Human-centered systems",
    keywords: ["profile vault", "funding context", "document reuse", "lab operations"],
    links: demoProfileLinks,
    affiliations: [
      {
        id: "aff-2",
        institutionName: "Industry Collaboration Center",
        organizationType: "company",
        roleTitle: "Project Research Assistant",
        roleTrack: "industry",
        appointmentStatus: "active",
        startDate: "2025-09-01",
        active: true,
        notes: "Tracks project rules separately from the university timeline.",
      },
      {
        id: "aff-1",
        institutionName: "Yonsei University",
        department: "Graduate School",
        labName: "ResearchPages Pilot Lab",
        organizationType: "university",
        roleTitle: "Master's Student",
        roleTrack: "student",
        appointmentStatus: "active",
        startDate: "2025-03-01",
        active: true,
        notes: "Primary academic affiliation and research home base.",
      },
    ],
    publications: [
      {
        id: "pub-1",
        title: "Structured Researcher Profile and Document Reuse System",
        journalClass: "KCI",
        journalName: "Journal of Research Operations",
        publisher: "Korean Society of Information Systems",
        publishedOn: "2026-02",
        authorRole: "First author",
        participants: "GongJae, Vision Kim, Mina Park",
      },
      {
        id: "pub-2",
        title: "Lab Publication and Seminar Archive Redesign",
        journalClass: "Proceedings",
        journalName: "CHI 2026 Workshop",
        publisher: "ACM",
        publishedOn: "2025-11",
        authorRole: "Co-author",
        participants: "GongJae, Daniel Choi",
      },
    ],
  };
}

export function getDemoPublicLabPageData(slug: string) {
  if (!isDemoPreviewRuntimeEnabled()) {
    return null;
  }

  if (normalizePublicLabSlug(slug) !== demoPublicLabSlug) {
    return null;
  }

  return {
    id: "lab-rp-pilot",
    slug: demoPublicLabSlug,
    name: "ResearchPages Pilot Lab",
    summary: "Structured operations system for graduate researchers and labs.",
    homepageTitle: "ResearchPages Pilot Lab",
    homepageDescription:
      "Profiles, documents, research, and shared schedules built from one operating dataset.",
    people: [
      {
        id: "member-gongjae",
        accountId: "user-gongjae",
        roleTitle: "Lab Lead",
        sortOrder: 0,
        koreanName: "공재",
        englishName: "GongJae",
        displayName: "GongJae",
        headline: "Graduate researcher building a structured operations system for research life.",
        primaryInstitution: "ResearchPages Pilot Lab",
        primaryDiscipline: "Human-centered systems",
        publicProfileSlug: demoPublicResearcherSlug,
      },
      {
        id: "member-vision",
        accountId: "account-demo-vision-kim",
        roleTitle: "PhD Researcher",
        sortOrder: 10,
        koreanName: "김비전",
        englishName: "Vision Kim",
        displayName: "Vision Kim",
        primaryInstitution: "ResearchPages Pilot Lab",
        primaryDiscipline: "Publication systems",
      },
      {
        id: "member-mina",
        accountId: "account-demo-mina-park",
        roleTitle: "MS Researcher",
        sortOrder: 20,
        koreanName: "박세미나",
        englishName: "Mina Park",
        displayName: "Mina Park",
        primaryInstitution: "ResearchPages Pilot Lab",
        primaryDiscipline: "Seminar archives",
      },
      {
        id: "member-daniel",
        accountId: "account-demo-daniel-choi",
        roleTitle: "Lab Coordinator",
        sortOrder: 30,
        koreanName: "최다니엘",
        englishName: "Daniel Choi",
        displayName: "Daniel Choi",
        primaryInstitution: "ResearchPages Pilot Lab",
        primaryDiscipline: "Research operations",
      },
    ],
    papers: [
      {
        id: "pub-1",
        title: "Structured Researcher Profile and Document Reuse System",
        journalClass: "KCI",
        journalName: "Journal of Research Operations",
        publisher: "Korean Society of Information Systems",
        publishedOn: "2026-02",
        authorRole: "First author",
        participants: "GongJae, Vision Kim, Mina Park",
      },
      {
        id: "pub-2",
        title: "Lab Publication and Seminar Archive Redesign",
        journalClass: "Proceedings",
        journalName: "CHI 2026 Workshop",
        publisher: "ACM",
        publishedOn: "2025-11",
        authorRole: "Co-author",
        participants: "GongJae, Daniel Choi",
      },
    ],
    researchProjects: [
      {
        id: "research-1",
        title: "Structured researcher profile and document reuse system",
        summary:
          "Build a web-first system that connects researcher profiles, reusable documents, and public-facing lab pages.",
        startDate: "2026-01-01",
        status: "ongoing" as const,
        program: "ResearchPages platform build",
        sponsor: "ResearchPages Pilot Lab",
        sortOrder: 0,
      },
      {
        id: "research-2",
        title: "Lab publication and seminar archive redesign",
        summary:
          "Restructure publications, seminar materials, and timeline records so lab assets are easier to reuse and publish.",
        startDate: "2025-09-01",
        status: "ongoing" as const,
        program: "Lab knowledge archive pilot",
        sponsor: "Graduate lab operations support",
        sortOrder: 1,
      },
      {
        id: "research-3",
        title: "Faculty and lab public profile generation pilot",
        summary:
          "Test how internal researcher data can become public profile and lab website content without re-entering the same information.",
        startDate: "2025-03-01",
        endDate: "2025-12-31",
        status: "completed" as const,
        program: "Public publishing pilot",
        sponsor: "University innovation seed project",
        sortOrder: 2,
      },
    ],
  };
}
