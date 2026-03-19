"use client";

import {
  labResearchProjectListSchema,
  labResearchProjectSchema,
  type LabResearchProject,
} from "@research-os/types";

import { getCollaborationBackendStatus } from "./collaboration/runtime";
import { saveBrowserLabResearchProjects } from "./lab-research-browser-store";
import { getSupabaseBrowserClient } from "./supabase/browser-client";

type LabResearchProjectRow = {
  lab_id: string;
  id: string;
  title: string;
  summary: string | null;
  start_date: string;
  end_date: string | null;
  status: "ongoing" | "completed";
  program: string;
  sponsor: string;
  sort_order: number;
  public_visible: boolean;
  updated_at: string;
};

const selectFields =
  "lab_id, id, title, summary, start_date, end_date, status, program, sponsor, sort_order, public_visible, updated_at";

function hasServerLabResearchStore() {
  const backendStatus = getCollaborationBackendStatus();
  return backendStatus.currentMode === "supabase" && backendStatus.supabaseConfigured;
}

function mapRow(row: LabResearchProjectRow): LabResearchProject {
  return labResearchProjectSchema.parse({
    id: row.id,
    owner: { type: "lab", id: row.lab_id },
    title: row.title,
    summary: row.summary ?? undefined,
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    status: row.status,
    program: row.program,
    sponsor: row.sponsor,
    sortOrder: row.sort_order,
    publicVisible: row.public_visible,
  });
}

function toPayload(labId: string, project: LabResearchProject) {
  return {
    lab_id: labId,
    id: project.id,
    title: project.title,
    summary: project.summary ?? null,
    start_date: project.startDate,
    end_date: project.endDate ?? null,
    status: project.status,
    program: project.program,
    sponsor: project.sponsor,
    sort_order: project.sortOrder,
    public_visible: project.publicVisible,
  };
}

export async function replaceLabResearchProjects(
  labId: string,
  projects: LabResearchProject[],
) {
  if (!hasServerLabResearchStore()) {
    saveBrowserLabResearchProjects(labId, projects);
    return projects;
  }

  const client = getSupabaseBrowserClient();
  const { error: deleteError } = await client
    .from("lab_research_projects")
    .delete()
    .eq("lab_id", labId);

  if (deleteError) {
    throw deleteError;
  }

  if (projects.length > 0) {
    const { error: insertError } = await client
      .from("lab_research_projects")
      .insert(projects.map((project) => toPayload(labId, project)));

    if (insertError) {
      throw insertError;
    }
  }

  saveBrowserLabResearchProjects(labId, projects);
  return projects;
}

export async function syncLabResearchProjects(
  labId: string,
  fallbackProjects: LabResearchProject[] = [],
) {
  if (!hasServerLabResearchStore()) {
    return null;
  }

  const client = getSupabaseBrowserClient();
  const { data, error } = await client
    .from("lab_research_projects")
    .select(selectFields)
    .eq("lab_id", labId)
    .order("sort_order", { ascending: true })
    .order("start_date", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as LabResearchProjectRow[];

  if (rows.length === 0 && fallbackProjects.length > 0) {
    await replaceLabResearchProjects(labId, fallbackProjects);
    return fallbackProjects;
  }

  const projects = labResearchProjectListSchema.parse(rows.map(mapRow));
  saveBrowserLabResearchProjects(labId, projects);
  return projects;
}
