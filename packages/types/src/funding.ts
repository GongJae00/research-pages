import { z } from "zod";

import {
  currencyCodeSchema,
  isoDateSchema,
  nonEmptyTextSchema,
  optionalTextSchema,
  ownerScopeSchema,
  recordIdSchema,
} from "./shared";

export const fundingSourceTypes = [
  "scholarship",
  "assistantship",
  "payroll",
  "internal_grant",
  "external_grant",
  "industry",
  "fellowship",
  "other",
] as const;

export const compensationKinds = ["scholarship", "payroll", "grant", "stipend", "other"] as const;
export const fundingCadences = [
  "one_time",
  "monthly",
  "quarterly",
  "semester",
  "annual",
  "custom",
] as const;

export const fundingRecordSchema = z.object({
  id: recordIdSchema,
  owner: ownerScopeSchema,
  title: nonEmptyTextSchema,
  sourceType: z.enum(fundingSourceTypes),
  compensationKind: z.enum(compensationKinds),
  providerName: nonEmptyTextSchema,
  projectName: optionalTextSchema,
  currency: currencyCodeSchema,
  amount: z.number().nonnegative().optional(),
  cadence: z.enum(fundingCadences).default("monthly"),
  startDate: isoDateSchema,
  endDate: isoDateSchema.optional(),
  active: z.boolean(),
  linkedAffiliationId: recordIdSchema.optional(),
  restrictions: z.array(nonEmptyTextSchema).default([]),
  notes: optionalTextSchema,
});

export const fundingRecordListSchema = z.array(fundingRecordSchema);

export type FundingRecord = z.infer<typeof fundingRecordSchema>;
