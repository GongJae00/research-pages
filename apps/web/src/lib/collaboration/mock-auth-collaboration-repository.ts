"use client";

import type { Account } from "@research-os/types";

import type { Locale } from "@/lib/i18n";
import {
  appendBrowserActivityLog,
  loadBrowserActivityLogs,
} from "@/lib/activity-log-browser-store";
import { requireLabPermission } from "@/lib/lab-permissions";
import {
  acceptPendingInvites,
  buildInviteLink,
  createLabWorkspace,
  getAuthStorageKeys,
  getCurrentAccount,
  getLabsForAccount,
  inviteLabMember,
  signInAccount,
  signOutAccount,
  signUpAccount,
  toggleLabEditLock,
  toggleLabSharedItem,
  updateLabMember,
  updateLabWorkspaceInfo,
} from "@/lib/mock-auth-store";

import type {
  AuthCollaborationRepository,
  CollaborationStateSnapshot,
} from "./auth-collaboration-repository";
import { getCollaborationBackendStatus } from "./runtime";

function currentActor() {
  return loadState().currentAccount;
}

function requirePermissionFromState(
  labId: string,
  scope: "profile" | "documents" | "members",
) {
  const state = loadState();

  if (!state.currentAccount) {
    throw new Error("Sign in first.");
  }

  const currentLab = state.labs.find((lab) => lab.id === labId);
  return requireLabPermission(currentLab, state.currentAccount.id, scope);
}

function loadState(): CollaborationStateSnapshot {
  const account = getCurrentAccount();

  if (!account) {
    return {
      currentAccount: null,
      labs: [],
      isReady: true,
    };
  }

  const resolvedAccount = acceptPendingInvites(account);

  return {
    currentAccount: resolvedAccount,
    labs: getLabsForAccount(resolvedAccount.id),
    isReady: true,
  };
}

function subscribe(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const watchedKeys = new Set<string>(getAuthStorageKeys());
  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || watchedKeys.has(event.key)) {
      listener();
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener("storage", handleStorage);
  };
}

export const mockAuthCollaborationRepository: AuthCollaborationRepository = {
  mode: "mock-browser",
  capabilities: {
    multiUserSharing: false,
    realtimePresence: false,
    serverPersistence: false,
  },
  backendStatus: getCollaborationBackendStatus(),
  loadState,
  sync: async () => undefined,
  subscribe,
  signOut: async () => {
    signOutAccount();
  },
  signIn: async (input) => {
    signInAccount(input);
  },
  signUp: async (input) => {
    signUpAccount(input);
  },
  createLab: async (account, input) => {
    const nextLab = createLabWorkspace(account, input);
    appendBrowserActivityLog({
      labId: nextLab.id,
      actorAccountId: account.id,
      actorName: account.koreanName,
      action: "lab.created",
      resourceType: "lab",
      resourceId: nextLab.id,
      payload: {
        name: nextLab.name,
        slug: nextLab.slug,
      },
    });
    return nextLab;
  },
  inviteMember: async (input) => {
    const actorMember = requirePermissionFromState(input.labId, "members");
    const actor = currentActor();
    inviteLabMember({
      ...input,
      invitedByMemberId: actorMember.id,
    });
    if (actor) {
      appendBrowserActivityLog({
        labId: input.labId,
        actorAccountId: actor.id,
        actorName: actor.koreanName,
        action: "member.invited",
        resourceType: "invite",
        resourceId: input.email.trim().toLowerCase(),
        payload: {
          email: input.email.trim().toLowerCase(),
          roleTitle: input.roleTitle.trim(),
        },
      });
    }
  },
  updateLab: async (labId, updates) => {
    requirePermissionFromState(labId, "profile");
    const actor = currentActor();
    updateLabWorkspaceInfo(labId, updates);
    if (actor) {
      const changedFields = Object.entries(updates)
        .filter(([, value]) => typeof value !== "undefined")
        .map(([key]) => key);
      appendBrowserActivityLog({
        labId,
        actorAccountId: actor.id,
        actorName: actor.koreanName,
        action: "lab.updated",
        resourceType: "lab",
        resourceId: labId,
        payload: {
          changedFields,
        },
      });
    }
  },
  updateMember: async (labId, memberId, updates) => {
    requirePermissionFromState(labId, "members");
    const actor = currentActor();
    const currentLab = loadState().labs.find((lab) => lab.id === labId);
    const member = currentLab?.members.find((item) => item.id === memberId);
    updateLabMember(labId, memberId, updates);
    if (actor) {
      const changedFields = Object.entries(updates)
        .filter(([, value]) => typeof value !== "undefined")
        .map(([key]) => key);
      appendBrowserActivityLog({
        labId,
        actorAccountId: actor.id,
        actorName: actor.koreanName,
        action:
          changedFields.length === 1 && changedFields[0] === "sortOrder"
            ? "member.reordered"
            : "member.updated",
        resourceType: "member",
        resourceId: memberId,
        payload: {
          memberName: member?.koreanName ?? member?.englishName ?? memberId,
          changedFields,
        },
      });
    }
  },
  toggleLock: async (labId, resourceType, resourceTitle, holder: Account) => {
    requirePermissionFromState(
      labId,
      resourceType === "profile" ? "profile" : "documents",
    );
    const currentLab = loadState().labs.find((lab) => lab.id === labId);
    const existing = currentLab?.editLocks.find(
      (lock) => lock.resourceType === resourceType && lock.resourceTitle === resourceTitle,
    );
    toggleLabEditLock(labId, resourceType, resourceTitle, holder);
    appendBrowserActivityLog({
      labId,
      actorAccountId: holder.id,
      actorName: holder.koreanName,
      action: existing?.active ? "lock.disabled" : "lock.enabled",
      resourceType,
      resourceId: resourceTitle,
      payload: {
        title: resourceTitle,
      },
    });
  },
  toggleSharedItem: async (labId, field, itemId, itemTitle) => {
    requirePermissionFromState(labId, "documents");
    const actor = currentActor();
    const currentLab = loadState().labs.find((lab) => lab.id === labId);
    const existed = currentLab?.[field].includes(itemId) ?? false;
    toggleLabSharedItem(labId, field, itemId);
    if (actor) {
      const resourceType =
        field === "sharedDocumentIds" ? "document" : field === "sharedPaperIds" ? "paper" : "schedule";
      appendBrowserActivityLog({
        labId,
        actorAccountId: actor.id,
        actorName: actor.koreanName,
        action: `shared.${resourceType}.${existed ? "removed" : "added"}`,
        resourceType,
        resourceId: itemId,
        payload: {
          title: itemTitle ?? itemId,
        },
      });
    }
  },
  listActivityLogs: async (labId) => loadBrowserActivityLogs(labId),
  getInviteLink: (lab, token, locale: Locale) => buildInviteLink(lab, token, locale),
};
