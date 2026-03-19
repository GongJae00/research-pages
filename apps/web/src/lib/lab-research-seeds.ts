import { labResearchProjectListSchema, type LabResearchProject } from "@research-os/types";

export function buildSeedLabResearchProjects(labId: string, labName: string): LabResearchProject[] {
  return labResearchProjectListSchema.parse([
    {
      id: "research-1",
      owner: { type: "lab", id: labId },
      title: "Structured researcher profile and document reuse system",
      summary:
        "Build a web-first system that connects researcher profiles, reusable documents, and public-facing lab pages.",
      startDate: "2026-01-01",
      status: "ongoing",
      program: "ResearchPages platform build",
      sponsor: labName,
      sortOrder: 0,
      publicVisible: true,
    },
    {
      id: "research-2",
      owner: { type: "lab", id: labId },
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
      owner: { type: "lab", id: labId },
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
  ]);
}
