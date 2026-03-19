import { z } from "zod";

import {
  isoDateSchema,
  nonEmptyTextSchema,
  optionalTextSchema,
  recordIdSchema,
} from "./shared";

export const membershipPermissionLevels = ["owner", "admin", "member"] as const;
export const inviteStatuses = ["pending", "accepted", "revoked"] as const;
export const sharedResourceTypes = ["document", "paper", "profile", "schedule"] as const;
export const activityResourceTypes = [
  "lab",
  "member",
  "invite",
  "document",
  "paper",
  "research",
  "profile",
  "schedule",
] as const;

export const accountSchema = z.object({
  id: recordIdSchema,
  koreanName: nonEmptyTextSchema,
  englishName: optionalTextSchema,
  primaryEmail: z.string().email(),
  nationalResearcherNumber: nonEmptyTextSchema,
  createdOn: isoDateSchema,
});

export const accountSessionSchema = z.object({
  accountId: recordIdSchema,
  signedInOn: isoDateSchema,
});

export const labMemberSchema = z.object({
  id: recordIdSchema,
  accountId: recordIdSchema,
  koreanName: nonEmptyTextSchema,
  englishName: optionalTextSchema,
  email: z.string().email(),
  nationalResearcherNumber: nonEmptyTextSchema,
  roleTitle: nonEmptyTextSchema,
  sortOrder: z.number().int().default(0),
  permissionLevel: z.enum(membershipPermissionLevels),
  canManageProfile: z.boolean().default(false),
  canManageDocuments: z.boolean().default(false),
  canManageMembers: z.boolean().default(false),
  joinedOn: isoDateSchema,
});

export const labInviteSchema = z.object({
  id: recordIdSchema,
  email: z.string().email(),
  nationalResearcherNumber: nonEmptyTextSchema,
  roleTitle: nonEmptyTextSchema,
  permissionLevel: z.enum(membershipPermissionLevels),
  invitedByMemberId: recordIdSchema,
  invitedOn: isoDateSchema,
  status: z.enum(inviteStatuses).default("pending"),
  token: nonEmptyTextSchema,
});

export const sharedEditLockSchema = z.object({
  id: recordIdSchema,
  resourceType: z.enum(sharedResourceTypes),
  resourceTitle: nonEmptyTextSchema,
  holderAccountId: recordIdSchema,
  holderName: nonEmptyTextSchema,
  active: z.boolean().default(true),
  updatedOn: isoDateSchema,
});

export const activityLogSchema = z.object({
  id: recordIdSchema,
  labId: recordIdSchema,
  actorAccountId: recordIdSchema,
  actorName: nonEmptyTextSchema,
  action: nonEmptyTextSchema,
  resourceType: z.enum(activityResourceTypes),
  resourceId: nonEmptyTextSchema,
  payload: z.record(z.string(), z.unknown()).default({}),
  createdAt: nonEmptyTextSchema,
});

export const activityLogListSchema = z.array(activityLogSchema);

export const labWorkspaceSchema = z.object({
  id: recordIdSchema,
  name: nonEmptyTextSchema,
  slug: nonEmptyTextSchema,
  summary: optionalTextSchema,
  ownerAccountId: recordIdSchema,
  homepageTitle: optionalTextSchema,
  homepageDescription: optionalTextSchema,
  publicPageEnabled: z.boolean().default(false),
  members: z.array(labMemberSchema).default([]),
  invites: z.array(labInviteSchema).default([]),
  editLocks: z.array(sharedEditLockSchema).default([]),
  sharedDocumentIds: z.array(recordIdSchema).default([]),
  sharedPaperIds: z.array(recordIdSchema).default([]),
  sharedScheduleIds: z.array(recordIdSchema).default([]),
  createdOn: isoDateSchema,
});

export const labWorkspaceListSchema = z.array(labWorkspaceSchema);

export type Account = z.infer<typeof accountSchema>;
export type AccountSession = z.infer<typeof accountSessionSchema>;
export type ActivityLog = z.infer<typeof activityLogSchema>;
export type LabInvite = z.infer<typeof labInviteSchema>;
export type LabMember = z.infer<typeof labMemberSchema>;
export type LabWorkspace = z.infer<typeof labWorkspaceSchema>;
export type SharedEditLock = z.infer<typeof sharedEditLockSchema>;
