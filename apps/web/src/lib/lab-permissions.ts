import type { LabMember, LabWorkspace } from "@research-os/types";

export type LabEditorSection =
  | "people"
  | "research"
  | "papers"
  | "documents"
  | "timetable";

export type LabPermissionScope = "profile" | "documents" | "members";

export interface LabPermissionState {
  currentMember: LabMember | null;
  canManageProfile: boolean;
  canManageDocuments: boolean;
  canManageMembers: boolean;
  canManageAnyLabContent: boolean;
  canOpenEditorForSection: (section: LabEditorSection) => boolean;
}

function getPermissionDeniedMessage(scope: LabPermissionScope) {
  switch (scope) {
    case "profile":
      return "You do not have permission to update the lab profile.";
    case "documents":
      return "You do not have permission to manage shared lab assets.";
    case "members":
      return "You do not have permission to manage lab members.";
    default:
      return "You do not have permission to edit this lab.";
  }
}

export function getCurrentLabMember(
  lab: LabWorkspace | null | undefined,
  accountId: string | null | undefined,
) {
  if (!lab || !accountId) {
    return null;
  }

  return lab.members.find((member) => member.accountId === accountId) ?? null;
}

export function buildLabPermissionState(
  lab: LabWorkspace | null | undefined,
  accountId: string | null | undefined,
): LabPermissionState {
  const currentMember = getCurrentLabMember(lab, accountId);
  const canManageProfile = Boolean(currentMember?.canManageProfile);
  const canManageDocuments = Boolean(currentMember?.canManageDocuments);
  const canManageMembers = Boolean(currentMember?.canManageMembers);

  return {
    currentMember,
    canManageProfile,
    canManageDocuments,
    canManageMembers,
    canManageAnyLabContent:
      canManageProfile || canManageDocuments || canManageMembers,
    canOpenEditorForSection: (section) => {
      switch (section) {
        case "people":
          return canManageProfile || canManageMembers;
        case "research":
          return canManageProfile;
        case "papers":
        case "documents":
        case "timetable":
          return canManageDocuments;
        default:
          return false;
      }
    },
  };
}

export function requireLabPermission(
  lab: LabWorkspace | null | undefined,
  accountId: string | null | undefined,
  scope: LabPermissionScope,
) {
  const currentMember = getCurrentLabMember(lab, accountId);

  if (!currentMember) {
    throw new Error("You are not a member of this lab.");
  }

  const hasPermission =
    scope === "profile"
      ? currentMember.canManageProfile
      : scope === "documents"
        ? currentMember.canManageDocuments
        : currentMember.canManageMembers;

  if (!hasPermission) {
    throw new Error(getPermissionDeniedMessage(scope));
  }

  return currentMember;
}
