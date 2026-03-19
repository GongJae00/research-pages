import { z } from "zod";

import {
  nonEmptyTextSchema,
  optionalTextSchema,
  ownerScopeSchema,
  recordIdSchema,
  timeOfDaySchema,
} from "./shared";

export const termSeasons = ["spring", "summer", "fall", "winter"] as const;
export const dayOfWeekValues = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
export const timetableEntryKinds = [
  "class",
  "research",
  "meeting",
  "seminar",
  "office_hours",
  "teaching",
  "deadline",
  "other",
] as const;

export const academicTermSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  season: z.enum(termSeasons),
  label: optionalTextSchema,
});

export const timetableEntrySchema = z.object({
  id: recordIdSchema,
  scheduleId: recordIdSchema.optional(),
  courseTitle: nonEmptyTextSchema,
  courseCode: optionalTextSchema,
  dayOfWeek: z.enum(dayOfWeekValues),
  startTime: timeOfDaySchema,
  endTime: timeOfDaySchema,
  kind: z.enum(timetableEntryKinds),
  location: optionalTextSchema,
  notes: optionalTextSchema,
});

export const timetableSchema = z.object({
  id: recordIdSchema,
  owner: ownerScopeSchema,
  term: academicTermSchema,
  entries: z.array(timetableEntrySchema).default([]),
});

export type AcademicTerm = z.infer<typeof academicTermSchema>;
export type TimetableEntry = z.infer<typeof timetableEntrySchema>;
export type Timetable = z.infer<typeof timetableSchema>;
