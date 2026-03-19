import { z } from "zod";

import {
  isoDateSchema,
  nonEmptyTextSchema,
  optionalTextSchema,
  ownerScopeSchema,
  recordIdSchema,
} from "./shared";

export const documentCategories = [
  "research",
  "application_admin",
  "certificate",
  "course_material",
  "presentation_meeting",
  "template_form",
  "data_analysis",
  "reference_archive",
] as const;

export const documentTypes = [
  "research_plan",
  "abstract",
  "research_note",
  "scholarship_answer",
  "scholarship_application",
  "admission_application",
  "self_introduction",
  "statement",
  "recommendation_letter",
  "administrative_form",
  "bio",
  "cv",
  "proposal",
  "paper",
  "poster",
  "seminar_material",
  "meeting_material",
  "speech_script",
  "presentation",
  "lecture_material",
  "course_assignment",
  "syllabus",
  "teaching_material",
  "certificate_enrollment",
  "certificate_transcript",
  "certificate_expected_graduation",
  "tuition_payment_confirmation",
  "acceptance_notice",
  "certificate_other",
  "form_template",
  "dataset",
  "spreadsheet",
  "analysis_report",
  "policy",
  "guide",
  "portfolio",
  "template",
  "other",
] as const;

export const documentSourceKinds = ["rich_text", "file", "mixed"] as const;
export const documentStatuses = ["draft", "active", "submitted", "archived"] as const;
export const documentVisibilities = ["private", "lab", "public"] as const;

export const documentRecordSchema = z.object({
  id: recordIdSchema,
  owner: ownerScopeSchema,
  title: nonEmptyTextSchema,
  documentCategory: z.enum(documentCategories).default("reference_archive"),
  documentType: z.enum(documentTypes),
  sourceKind: z.enum(documentSourceKinds),
  status: z.enum(documentStatuses).default("draft"),
  visibility: z.enum(documentVisibilities).default("private"),
  summary: optionalTextSchema,
  originalFileName: optionalTextSchema,
  mimeType: optionalTextSchema,
  fileExtension: optionalTextSchema,
  fileSizeBytes: z.number().int().nonnegative().optional(),
  fileAssetId: recordIdSchema.optional(),
  tags: z.array(nonEmptyTextSchema).default([]),
  relatedFundingIds: z.array(recordIdSchema).default([]),
  relatedAffiliationIds: z.array(recordIdSchema).default([]),
  updatedOn: isoDateSchema,
});

export const documentListSchema = z.array(documentRecordSchema);

export type DocumentRecord = z.infer<typeof documentRecordSchema>;
