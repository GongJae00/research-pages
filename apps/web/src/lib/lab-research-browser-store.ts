import {
  labResearchProjectSchema,
  type LabResearchProject,
} from "@research-os/types";

import {
  canUseBrowserStorage,
  readJsonFromStorage,
  writeJsonToStorage,
} from "./browser-json-store";

const storageBaseKey = "researchos:lab-research-projects:v1";

function getStorageKey(labId: string) {
  return `${storageBaseKey}:${labId}`;
}

function normalizeStoredProject(value: unknown): LabResearchProject | null {
  const validated = labResearchProjectSchema.safeParse(value);
  return validated.success ? validated.data : null;
}

export function loadBrowserLabResearchProjects(labId: string): LabResearchProject[] {
  if (!canUseBrowserStorage()) {
    return [];
  }

  try {
    const parsed = readJsonFromStorage<unknown>(getStorageKey(labId), null);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => normalizeStoredProject(item))
      .filter((item): item is LabResearchProject => item !== null);
  } catch {
    return [];
  }
}

export function saveBrowserLabResearchProjects(
  labId: string,
  projects: LabResearchProject[],
) {
  if (!canUseBrowserStorage()) {
    return;
  }

  writeJsonToStorage(getStorageKey(labId), projects);
}
