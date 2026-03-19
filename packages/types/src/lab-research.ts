import { z } from "zod";

import { isoDateSchema, nonEmptyTextSchema, optionalTextSchema, ownerScopeSchema, recordIdSchema } from "./shared";

export const labResearchProjectStatuses = ["ongoing", "completed"] as const;

export const labResearchProjectSchema = z.object({
  id: recordIdSchema,
  owner: ownerScopeSchema,
  title: nonEmptyTextSchema,
  summary: optionalTextSchema,
  startDate: isoDateSchema,
  endDate: isoDateSchema.optional(),
  status: z.enum(labResearchProjectStatuses),
  program: nonEmptyTextSchema,
  sponsor: nonEmptyTextSchema,
  sortOrder: z.number().int().nonnegative().default(0),
  publicVisible: z.boolean().default(true),
});

export const labResearchProjectListSchema = z.array(labResearchProjectSchema);

export type LabResearchProject = z.infer<typeof labResearchProjectSchema>;
export type LabResearchProjectStatus = z.infer<typeof labResearchProjectSchema>["status"];
