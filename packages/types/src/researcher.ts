import { z } from "zod";

import {
  nonEmptyTextSchema,
  optionalTextSchema,
  ownerScopeSchema,
  recordIdSchema,
} from "./shared";

export const researcherSummarySchema = z.object({
  id: recordIdSchema,
  owner: ownerScopeSchema,
  accountId: recordIdSchema.optional(),
  displayName: nonEmptyTextSchema,
  koreanName: optionalTextSchema,
  englishName: optionalTextSchema,
  primaryEmail: z.string().email().optional(),
  primaryInstitution: optionalTextSchema,
  primaryLabName: optionalTextSchema,
  primaryLabSlug: optionalTextSchema,
  primaryRoleTitle: optionalTextSchema,
  primaryDiscipline: optionalTextSchema,
  photoDataUrl: optionalTextSchema,
  keywords: z.array(nonEmptyTextSchema).default([]),
  affiliationCount: z.number().int().nonnegative().default(0),
  publicationCount: z.number().int().nonnegative().default(0),
  linkedDocumentCount: z.number().int().nonnegative().default(0),
});

export type ResearcherSummary = z.infer<typeof researcherSummarySchema>;
