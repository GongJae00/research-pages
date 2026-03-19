import type { Account, ActivityLog, LabWorkspace } from "@research-os/types";

import type { Locale } from "@/lib/i18n";

export interface SignInInput {
  primaryEmail: string;
  password: string;
}

export interface SignUpInput {
  koreanName: string;
  englishName: string;
  primaryEmail: string;
  nationalResearcherNumber: string;
  password: string;
}

export interface CreateLabInput {
  name: string;
  slug: string;
  summary: string;
  homepageTitle: string;
  homepageDescription: string;
}

export interface UpdateLabInput {
  name?: string;
  slug?: string;
  summary?: string;
  homepageTitle?: string;
  homepageDescription?: string;
  publicPageEnabled?: boolean;
}

export interface InviteLabInput {
  labId: string;
  invitedByMemberId: string;
  email: string;
  nationalResearcherNumber: string;
  roleTitle: string;
  permissionLevel: "owner" | "admin" | "member";
}

export interface CollaborationStateSnapshot {
  currentAccount: Account | null;
  labs: LabWorkspace[];
  isReady: boolean;
}

export interface CollaborationRepositoryCapabilities {
  multiUserSharing: boolean;
  realtimePresence: boolean;
  serverPersistence: boolean;
}

export interface CollaborationBackendStatus {
  currentMode: "mock-browser" | "supabase";
  targetMode: "mock-browser" | "supabase";
  supabaseConfigured: boolean;
}

export interface AuthCollaborationRepository {
  mode: CollaborationBackendStatus["currentMode"];
  capabilities: CollaborationRepositoryCapabilities;
  backendStatus: CollaborationBackendStatus;
  loadState: () => CollaborationStateSnapshot;
  sync: () => Promise<void>;
  subscribe: (listener: () => void) => () => void;
  signOut: () => Promise<void>;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  createLab: (account: Account, input: CreateLabInput) => Promise<LabWorkspace>;
  inviteMember: (input: InviteLabInput) => Promise<void>;
  updateLab: (labId: string, updates: UpdateLabInput) => Promise<void>;
  updateMember: (
    labId: string,
    memberId: string,
    updates: Partial<LabWorkspace["members"][number]>,
  ) => Promise<void>;
  toggleLock: (
    labId: string,
    resourceType: "document" | "paper" | "profile" | "schedule",
    resourceTitle: string,
    holder: Account,
  ) => Promise<void>;
  toggleSharedItem: (
    labId: string,
    field: "sharedDocumentIds" | "sharedPaperIds" | "sharedScheduleIds",
    itemId: string,
    itemTitle?: string,
  ) => Promise<void>;
  listActivityLogs: (labId: string) => Promise<ActivityLog[]>;
  getInviteLink: (lab: LabWorkspace, token: string, locale: Locale) => string;
}
