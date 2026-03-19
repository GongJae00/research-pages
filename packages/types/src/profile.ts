import { z } from "zod";

import {
  nonEmptyTextSchema,
  optionalTextSchema,
  ownerScopeSchema,
  recordIdSchema,
} from "./shared";

export const profileLinkKinds = [
  "homepage",
  "github",
  "google_scholar",
  "orcid",
  "lab",
  "cv",
  "portfolio",
  "linkedin",
  "custom",
] as const;

export const profileLinkSchema = z.object({
  kind: z.enum(profileLinkKinds).default("custom"),
  label: optionalTextSchema,
  url: z.string().trim().url(),
});

export const publicProfileSchema = z.object({
  enabled: z.boolean().default(false),
  slug: optionalTextSchema,
});

export const profileSchema = z.object({
  id: recordIdSchema,
  owner: ownerScopeSchema,
  displayName: nonEmptyTextSchema,
  legalName: optionalTextSchema,
  preferredName: optionalTextSchema,
  koreanName: optionalTextSchema,
  englishName: optionalTextSchema,
  romanizedName: optionalTextSchema,
  headline: optionalTextSchema,
  primaryEmail: z.string().email(),
  secondaryEmail: z.string().email().optional(),
  emails: z.array(z.string().email()).default([]),
  phone: optionalTextSchema,
  phones: z.array(nonEmptyTextSchema).default([]),
  photoDataUrl: optionalTextSchema,
  nationalResearcherNumber: optionalTextSchema,
  orcid: optionalTextSchema,
  primaryInstitution: optionalTextSchema,
  primaryDiscipline: optionalTextSchema,
  keywords: z.array(nonEmptyTextSchema).default([]),
  links: z.array(profileLinkSchema).default([]),
  publicProfile: publicProfileSchema.default({ enabled: false }),
});

export type ProfileLink = z.infer<typeof profileLinkSchema>;
export type ProfileLinkKind = (typeof profileLinkKinds)[number];
export type PublicProfileSettings = z.infer<typeof publicProfileSchema>;
export type ResearchProfile = z.infer<typeof profileSchema>;
