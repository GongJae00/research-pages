import { z } from "zod";

import {
  isoDateSchema,
  nonEmptyTextSchema,
  optionalTextSchema,
  ownerScopeSchema,
  recordIdSchema,
} from "./shared";

export const organizationTypes = [
  "university",
  "lab",
  "company",
  "government",
  "research_institute",
  "hospital",
  "foundation",
  "other",
] as const;

export const roleTracks = [
  "student",
  "faculty",
  "postdoc",
  "researcher",
  "staff",
  "admin",
  "industry",
  "other",
] as const;

export const appointmentStatuses = ["planned", "active", "paused", "completed"] as const;

export const affiliationSchema = z.object({
  id: recordIdSchema,
  owner: ownerScopeSchema,
  institutionName: nonEmptyTextSchema,
  department: optionalTextSchema,
  labName: optionalTextSchema,
  organizationType: z.enum(organizationTypes),
  roleTitle: nonEmptyTextSchema,
  roleTrack: z.enum(roleTracks),
  appointmentStatus: z.enum(appointmentStatuses).default("active"),
  startDate: isoDateSchema,
  endDate: isoDateSchema.optional(),
  active: z.boolean(),
  relatedFundingIds: z.array(recordIdSchema).default([]),
  notes: optionalTextSchema,
});

export const affiliationTimelineSchema = z.array(affiliationSchema);

export type AffiliationTimelineEntry = z.infer<typeof affiliationSchema>;
