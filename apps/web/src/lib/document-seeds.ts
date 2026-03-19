import type { DocumentRecord } from "@research-os/types";

import { getDocumentFile, saveDocumentFile } from "./document-file-store";

const careerDocumentTypes = new Set<DocumentRecord["documentType"]>([
  "cv",
  "statement",
  "self_introduction",
  "portfolio",
]);

const seededFileBodies = {
  "asset-profile-cv-working-draft": {
    fileName: "Academic_CV_Working_Draft.md",
    mimeType: "text/markdown",
    body: `# Academic CV Working Draft

## Identity
- Name:
- Preferred name:
- Email:
- GitHub:
- Personal website:

## Research interests
- 
- 
- 

## Education
### Current degree
- Institution:
- Program:
- Advisor:
- Start:

## Experience
### Research
- Role:
- Lab / Center:
- Period:
- Responsibilities:

## Projects
- Project title:
- Funding source:
- What you built or measured:

## Papers and presentations
- Manuscripts:
- Posters:
- Seminars:

## Skills
- Programming:
- Experimental methods:
- Writing / collaboration:

## Service
- Mentoring:
- Teaching:
- Lab operations:
`,
  },
  "asset-profile-sop-core-draft": {
    fileName: "Statement_of_Purpose_Core_Draft.md",
    mimeType: "text/markdown",
    body: `# Statement of Purpose Core Draft

## 1. Why this field
Write the long-term question you care about and the concrete problem you want to work on.

## 2. Background and preparation
Summarize the courses, lab work, projects, or papers that prepared you for this direction.

## 3. Current research ability
Describe what you can already do independently.
- Data collection / experiment setup
- Analysis
- Writing
- Collaboration

## 4. Why this lab or professor
Keep reusable paragraphs here, then customize them for each application.

## 5. Near-term research plan
Explain what you want to study in the first one to two years.

## 6. Long-term goal
Describe the researcher or engineer you want to become.

## Reusable evidence
- Representative project:
- Representative paper or abstract:
- Public links:
`,
  },
  "asset-profile-bio-contact-kit": {
    fileName: "Short_Bio_and_Contact_Kit.md",
    mimeType: "text/markdown",
    body: `# Short Bio and Contact Kit

## One-line bio

## Short paragraph bio

## Extended paragraph bio

## Research keywords
- 
- 
- 

## Public contact
- Email:
- GitHub:
- Personal website:
- Google Scholar:

## Current affiliation summary
- Institution:
- Lab:
- Role:

## Ready-to-copy lines
- Seminar introduction:
- Homepage introduction:
- Contact email closing:
`,
  },
  "asset-profile-portfolio-highlights": {
    fileName: "Research_Portfolio_Highlights.md",
    mimeType: "text/markdown",
    body: `# Research Portfolio Highlights

## Core positioning
- One-line research identity:
- The problem area I work on:
- The type of systems or methods I build:

## Representative projects
### Project 1
- Title:
- Period:
- Affiliation / lab:
- What I built:
- What changed because of my work:
- Public link:

### Project 2
- Title:
- Period:
- Affiliation / lab:
- What I built:
- What changed because of my work:
- Public link:

## Research operations strengths
- Document reuse:
- Structured data management:
- Lab coordination:
- Public page / profile maintenance:

## Public assets
- GitHub:
- Personal website:
- Google Scholar:
- Lab page:

## Ready-to-copy portfolio paragraphs
### 80-word version

### 160-word version

### Project-focused version
`,
  },
} as const;

type SeededAssetId = keyof typeof seededFileBodies;

function isSeededAssetId(value: string): value is SeededAssetId {
  return value in seededFileBodies;
}

export function isCareerDocument(document: DocumentRecord) {
  return careerDocumentTypes.has(document.documentType);
}

export function getCareerDocumentIds(documents: DocumentRecord[]) {
  return documents.filter(isCareerDocument).map((document) => document.id);
}

export async function ensureSeededDocumentFiles(documents: DocumentRecord[]) {
  if (typeof window === "undefined") {
    return;
  }

  const seededDocuments = documents.filter(
    (document): document is DocumentRecord & { fileAssetId: SeededAssetId } =>
      typeof document.fileAssetId === "string" && isSeededAssetId(document.fileAssetId),
  );

  await Promise.all(
    seededDocuments.map(async (document) => {
      const existing = await getDocumentFile(document.fileAssetId);

      if (existing) {
        return;
      }

      const seeded = seededFileBodies[document.fileAssetId];
      const blob = new Blob([seeded.body], { type: seeded.mimeType });
      await saveDocumentFile(document.fileAssetId, blob);
    }),
  );
}
