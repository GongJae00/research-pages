import { z } from "zod";

import { isoDateSchema, nonEmptyTextSchema, optionalTextSchema, ownerScopeSchema, recordIdSchema } from "./shared";

export const journalClasses = [
  "SCI",
  "SCIE",
  "SSCI",
  "A&HCI",
  "KCI",
  "KCI등재",
  "국내학술",
  "국제학술",
  "proceedings",
  "기타",
] as const;

export type JournalClass = (typeof journalClasses)[number];

export const publicationRecordSchema = z.object({
  id: recordIdSchema,
  owner: ownerScopeSchema,
  title: nonEmptyTextSchema,
  journalClass: z.enum(journalClasses).optional(),
  journalName: optionalTextSchema,
  publisher: optionalTextSchema,
  publishedOn: optionalTextSchema,
  authorRole: optionalTextSchema,
  participants: optionalTextSchema,
  doi: optionalTextSchema,
  updatedOn: isoDateSchema,
});

export const publicationListSchema = z.array(publicationRecordSchema);

export type PublicationRecord = z.infer<typeof publicationRecordSchema>;
