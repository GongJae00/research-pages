import { z } from "zod";
import { affiliationTimelineSchema } from "./affiliation";
import { documentListSchema } from "./document";
import { fundingRecordListSchema } from "./funding";
import { profileSchema } from "./profile";
import { timetableSchema } from "./timetable";

export const researcherWorkspaceSchema = z.object({
  profile: profileSchema,
  affiliations: affiliationTimelineSchema,
  funding: fundingRecordListSchema,
  documents: documentListSchema,
  timetable: timetableSchema,
});

export type ResearcherWorkspace = z.infer<typeof researcherWorkspaceSchema>;
