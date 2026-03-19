"use client";

import type { Account, LabWorkspace } from "@research-os/types";
import { accountSchema, labWorkspaceSchema } from "@research-os/types";
import type { User } from "@supabase/supabase-js";

import type { Locale } from "@/lib/i18n";
import { listActivityLogsForLab } from "@/lib/activity-log-server-store";
import { requireLabPermission } from "@/lib/lab-permissions";
import {
  hydrateAccounts,
  hydrateCurrentSession,
  hydrateLabs,
} from "@/lib/mock-auth-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

import type {
  AuthCollaborationRepository,
  CollaborationStateSnapshot,
} from "./auth-collaboration-repository";
import { getCollaborationBackendStatus } from "./runtime";

type ResearchAccountRow = {
  id: string;
  korean_name: string;
  english_name: string | null;
  primary_email: string;
  national_researcher_number: string;
  created_on: string;
};

type LabMemberRow = {
  id: string;
  account_id: string;
  role_title: string;
  sort_order: number | null;
  permission_level: "owner" | "admin" | "member";
  can_manage_profile: boolean;
  can_manage_documents: boolean;
  can_manage_members: boolean;
  joined_on: string;
};

type LabInviteRow = {
  id: string;
  email: string;
  national_researcher_number: string;
  role_title: string;
  permission_level: "owner" | "admin" | "member";
  invited_by_member_id: string;
  invited_on: string;
  status: "pending" | "accepted" | "revoked";
  token: string;
};

type SharedEditLockRow = {
  id: string;
  resource_type: "document" | "paper" | "profile" | "schedule";
  resource_title: string;
  holder_account_id: string;
  active: boolean;
  updated_at: string;
};

type SharedIdRow = {
  document_id?: string;
  publication_id?: string;
  schedule_id?: string;
};

type LabRow = {
  id: string;
  name: string;
  slug: string;
  summary: string | null;
  owner_account_id: string;
  homepage_title: string | null;
  homepage_description: string | null;
  public_page_enabled: boolean | null;
  created_on: string;
  lab_members?: LabMemberRow[] | null;
  lab_invites?: LabInviteRow[] | null;
  shared_edit_locks?: SharedEditLockRow[] | null;
  lab_shared_documents?: SharedIdRow[] | null;
  lab_shared_publications?: SharedIdRow[] | null;
  lab_shared_schedules?: SharedIdRow[] | null;
};

const backendStatus = getCollaborationBackendStatus();
const listeners = new Set<() => void>();

let snapshot: CollaborationStateSnapshot = {
  currentAccount: null,
  labs: [],
  isReady: false,
};

function emit() {
  listeners.forEach((listener) => listener());
}

function createClient() {
  return getSupabaseBrowserClient();
}

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function createToken(prefix: string) {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toDateOnly(value?: string | null) {
  return value?.slice(0, 10) ?? todayIso();
}

function normalizeComparableEmail(value: string) {
  return value.trim().toLowerCase();
}

function requirePermissionFromSnapshot(
  labId: string,
  scope: "profile" | "documents" | "members",
) {
  const currentAccount = snapshot.currentAccount;

  if (!currentAccount) {
    throw new Error("Sign in first.");
  }

  const currentLab = snapshot.labs.find((lab) => lab.id === labId);
  return requireLabPermission(currentLab, currentAccount.id, scope);
}

async function insertActivityLog(input: {
  labId: string;
  actorAccountId: string;
  actorName?: string;
  action: string;
  resourceType: "lab" | "member" | "invite" | "document" | "paper" | "profile" | "schedule";
  resourceId: string;
  payload?: Record<string, unknown>;
}) {
  const client = createClient();
  const { error } = await client.from("activity_logs").insert({
    lab_id: input.labId,
    actor_account_id: input.actorAccountId,
    action: input.action,
    resource_type: input.resourceType,
    resource_id: input.resourceId,
    payload: {
      ...(input.payload ?? {}),
      ...(input.actorName ? { actorName: input.actorName } : {}),
    },
  });

  if (error) {
    throw error;
  }
}

function mapAccountRow(row: ResearchAccountRow): Account {
  return accountSchema.parse({
    id: row.id,
    koreanName: row.korean_name,
    englishName: row.english_name ?? undefined,
    primaryEmail: row.primary_email,
    nationalResearcherNumber: row.national_researcher_number,
    createdOn: row.created_on,
  });
}

function buildFallbackAccount(accountId: string): Account {
  return accountSchema.parse({
    id: accountId,
    koreanName: "Researcher",
    englishName: undefined,
    primaryEmail: `${accountId}@researchpages.local`,
    nationalResearcherNumber: `pending-${accountId.slice(0, 8)}`,
    createdOn: todayIso(),
  });
}

function mapLabs(rows: LabRow[], accounts: Account[]) {
  const accountById = new Map(accounts.map((account) => [account.id, account]));

  return rows.map((lab) =>
    labWorkspaceSchema.parse({
      id: lab.id,
      name: lab.name,
      slug: lab.slug,
      summary: lab.summary ?? undefined,
      ownerAccountId: lab.owner_account_id,
      homepageTitle: lab.homepage_title ?? undefined,
      homepageDescription: lab.homepage_description ?? undefined,
      publicPageEnabled: lab.public_page_enabled ?? false,
      createdOn: lab.created_on,
      members: (lab.lab_members ?? []).map((member) => {
        const account = accountById.get(member.account_id) ?? buildFallbackAccount(member.account_id);

        return {
          id: member.id,
          accountId: member.account_id,
          koreanName: account.koreanName,
          englishName: account.englishName,
          email: account.primaryEmail,
          nationalResearcherNumber: account.nationalResearcherNumber,
          roleTitle: member.role_title,
          sortOrder: member.sort_order ?? 0,
          permissionLevel: member.permission_level,
          canManageProfile: member.can_manage_profile,
          canManageDocuments: member.can_manage_documents,
          canManageMembers: member.can_manage_members,
          joinedOn: member.joined_on,
        };
      }),
      invites: (lab.lab_invites ?? []).map((invite) => ({
        id: invite.id,
        email: invite.email,
        nationalResearcherNumber: invite.national_researcher_number,
        roleTitle: invite.role_title,
        permissionLevel: invite.permission_level,
        invitedByMemberId: invite.invited_by_member_id,
        invitedOn: invite.invited_on,
        status: invite.status,
        token: invite.token,
      })),
      editLocks: (lab.shared_edit_locks ?? []).map((lock) => ({
        id: lock.id,
        resourceType: lock.resource_type,
        resourceTitle: lock.resource_title,
        holderAccountId: lock.holder_account_id,
        holderName:
          accountById.get(lock.holder_account_id)?.koreanName ??
          accountById.get(lock.holder_account_id)?.englishName ??
          "Researcher",
        active: lock.active,
        updatedOn: toDateOnly(lock.updated_at),
      })),
      sharedDocumentIds: (lab.lab_shared_documents ?? [])
        .map((row) => row.document_id)
        .filter((value): value is string => Boolean(value)),
      sharedPaperIds: (lab.lab_shared_publications ?? [])
        .map((row) => row.publication_id)
        .filter((value): value is string => Boolean(value)),
      sharedScheduleIds: (lab.lab_shared_schedules ?? [])
        .map((row) => row.schedule_id)
        .filter((value): value is string => Boolean(value)),
    }),
  );
}

async function ensureResearchAccountRow(user: User) {
  const client = createClient();
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;

  const payload = {
    id: user.id,
    korean_name:
      typeof metadata.korean_name === "string"
        ? metadata.korean_name
        : typeof metadata.koreanName === "string"
          ? metadata.koreanName
          : user.email?.split("@")[0] ?? "Researcher",
    english_name:
      typeof metadata.english_name === "string"
        ? metadata.english_name
        : typeof metadata.englishName === "string"
          ? metadata.englishName
          : null,
    primary_email:
      user.email ??
      (typeof metadata.primary_email === "string" ? metadata.primary_email : ""),
    national_researcher_number:
      typeof metadata.national_researcher_number === "string"
        ? metadata.national_researcher_number
        : typeof metadata.nationalResearcherNumber === "string"
          ? metadata.nationalResearcherNumber
          : `pending-${user.id.slice(0, 8)}`,
    created_on: todayIso(),
  };

  const { error } = await client.from("research_accounts").upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    throw error;
  }
}

async function loadAccountRows(accountIds: string[]) {
  if (!accountIds.length) {
    return [] as ResearchAccountRow[];
  }

  const client = createClient();
  const { data, error } = await client
    .from("research_accounts")
    .select(
      "id, korean_name, english_name, primary_email, national_researcher_number, created_on",
    )
    .in("id", accountIds);

  if (error) {
    throw error;
  }

  return (data ?? []) as ResearchAccountRow[];
}

async function loadLabsAndVisibleAccounts(currentAccountId: string) {
  const client = createClient();
  const { data, error } = await client.from("labs").select(
    `
      id,
      name,
      slug,
      summary,
      owner_account_id,
      homepage_title,
      homepage_description,
      public_page_enabled,
      created_on,
      lab_members (
        id,
        account_id,
        role_title,
        sort_order,
        permission_level,
        can_manage_profile,
        can_manage_documents,
        can_manage_members,
        joined_on
      ),
      lab_invites (
        id,
        email,
        national_researcher_number,
        role_title,
        permission_level,
        invited_by_member_id,
        invited_on,
        status,
        token
      ),
      shared_edit_locks (
        id,
        resource_type,
        resource_title,
        holder_account_id,
        active,
        updated_at
      ),
      lab_shared_documents (
        document_id
      ),
      lab_shared_publications (
        publication_id
      ),
      lab_shared_schedules (
        schedule_id
      )
    `,
  );

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as LabRow[];
  const accountIds = new Set<string>([currentAccountId]);

  rows.forEach((lab) => {
    accountIds.add(lab.owner_account_id);
    (lab.lab_members ?? []).forEach((member) => accountIds.add(member.account_id));
    (lab.shared_edit_locks ?? []).forEach((lock) => accountIds.add(lock.holder_account_id));
  });

  const accountRows = await loadAccountRows([...accountIds]);
  const accounts = accountRows.map(mapAccountRow);

  return {
    labs: mapLabs(rows, accounts),
    accounts,
  };
}

async function syncSnapshot() {
  const client = createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    hydrateCurrentSession(null);
    hydrateAccounts([]);
    hydrateLabs([]);
    snapshot = {
      currentAccount: null,
      labs: [],
      isReady: true,
    };
    emit();
    return;
  }

  await ensureResearchAccountRow(user);

  const { accounts, labs } = await loadLabsAndVisibleAccounts(user.id);
  const currentAccount = accounts.find((account) => account.id === user.id) ?? null;

  if (!currentAccount) {
    throw new Error("Could not load the signed-in account profile from Supabase.");
  }

  hydrateCurrentSession({
    accountId: currentAccount.id,
    signedInOn: todayIso(),
  });
  hydrateAccounts(accounts);
  hydrateLabs(labs);

  snapshot = {
    currentAccount,
    labs,
    isReady: true,
  };
  emit();
}

function buildInviteLink(lab: LabWorkspace, token: string, locale: Locale) {
  return `${window.location.origin}/${locale}/lab?lab=${lab.slug}&invite=${token}`;
}

export const supabaseAuthCollaborationRepository: AuthCollaborationRepository = {
  mode: "supabase",
  capabilities: {
    multiUserSharing: true,
    realtimePresence: false,
    serverPersistence: true,
  },
  backendStatus,
  loadState: () => snapshot,
  sync: async () => {
    await syncSnapshot();
  },
  subscribe: (listener) => {
    listeners.add(listener);

    const client = createClient();
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(() => {
      void syncSnapshot();
    });

    return () => {
      listeners.delete(listener);
      subscription.unsubscribe();
    };
  },
  signOut: async () => {
    const client = createClient();
    const { error } = await client.auth.signOut();

    if (error) {
      throw error;
    }
  },
  signIn: async (input) => {
    const client = createClient();
    const { error } = await client.auth.signInWithPassword({
      email: normalizeComparableEmail(input.primaryEmail),
      password: input.password,
    });

    if (error) {
      throw error;
    }
  },
  signUp: async (input) => {
    const client = createClient();
    const { data, error } = await client.auth.signUp({
      email: normalizeComparableEmail(input.primaryEmail),
      password: input.password,
      options: {
        data: {
          korean_name: input.koreanName.trim(),
          english_name: input.englishName.trim() || null,
          primary_email: normalizeComparableEmail(input.primaryEmail),
          national_researcher_number: input.nationalResearcherNumber.trim(),
        },
      },
    });

    if (error) {
      throw error;
    }

    if (!data.session) {
      throw new Error(
        "Email confirmation is enabled. Confirm the email first, then sign in to open the workspace.",
      );
    }
  },
  createLab: async (account, input) => {
    const client = createClient();
    const { data: labRow, error: labError } = await client
      .from("labs")
      .insert({
        owner_account_id: account.id,
        name: input.name.trim(),
        slug: input.slug.trim().toLowerCase(),
        summary: input.summary.trim() || null,
        homepage_title: input.homepageTitle.trim() || input.name.trim(),
        homepage_description: input.homepageDescription.trim() || null,
        public_page_enabled: false,
      })
      .select(
        "id, name, slug, summary, owner_account_id, homepage_title, homepage_description, public_page_enabled, created_on",
      )
      .single();

    if (labError) {
      throw labError;
    }

    const { error: memberError } = await client.from("lab_members").insert({
      lab_id: labRow.id,
      account_id: account.id,
      role_title: "Lab Lead",
      sort_order: 0,
      permission_level: "owner",
      can_manage_profile: true,
      can_manage_documents: true,
      can_manage_members: true,
      joined_on: todayIso(),
    });

    if (memberError) {
      throw memberError;
    }

    await insertActivityLog({
      labId: labRow.id,
      actorAccountId: account.id,
      actorName: account.koreanName,
      action: "lab.created",
      resourceType: "lab",
      resourceId: labRow.id,
      payload: {
        name: input.name.trim(),
        slug: input.slug.trim().toLowerCase(),
      },
    });

    await syncSnapshot();
    const nextLab =
      snapshot.labs.find((lab) => lab.id === labRow.id) ??
      mapLabs([labRow as LabRow], [account])[0];

    return nextLab;
  },
  inviteMember: async (input) => {
    const actorMember = requirePermissionFromSnapshot(input.labId, "members");
    const client = createClient();
    const { error } = await client.from("lab_invites").insert({
      lab_id: input.labId,
      invited_by_member_id: actorMember.id,
      email: normalizeComparableEmail(input.email),
      national_researcher_number: input.nationalResearcherNumber.trim(),
      role_title: input.roleTitle.trim(),
      permission_level: input.permissionLevel,
      token: createToken("invite"),
    });

    if (error) {
      throw error;
    }

    if (snapshot.currentAccount) {
      await insertActivityLog({
        labId: input.labId,
        actorAccountId: snapshot.currentAccount.id,
        actorName: snapshot.currentAccount.koreanName,
        action: "member.invited",
        resourceType: "invite",
        resourceId: normalizeComparableEmail(input.email),
        payload: {
          email: normalizeComparableEmail(input.email),
          roleTitle: input.roleTitle.trim(),
        },
      });
    }
  },
  updateLab: async (labId, updates) => {
    requirePermissionFromSnapshot(labId, "profile");
    const client = createClient();
    const { error } = await client
      .from("labs")
      .update({
        name: updates.name?.trim(),
        slug: updates.slug?.trim().toLowerCase(),
        summary:
          typeof updates.summary === "string" ? updates.summary.trim() || null : undefined,
        homepage_title:
          typeof updates.homepageTitle === "string"
            ? updates.homepageTitle.trim() || null
            : undefined,
        homepage_description:
          typeof updates.homepageDescription === "string"
            ? updates.homepageDescription.trim() || null
            : undefined,
        public_page_enabled:
          typeof updates.publicPageEnabled === "boolean"
            ? updates.publicPageEnabled
            : undefined,
      })
      .eq("id", labId);

    if (error) {
      throw error;
    }

    if (snapshot.currentAccount) {
      const changedFields = Object.entries(updates)
        .filter(([, value]) => typeof value !== "undefined")
        .map(([key]) => key);
      await insertActivityLog({
        labId,
        actorAccountId: snapshot.currentAccount.id,
        actorName: snapshot.currentAccount.koreanName,
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
    requirePermissionFromSnapshot(labId, "members");
    const client = createClient();
    const currentLab = snapshot.labs.find((lab) => lab.id === labId);
    const member = currentLab?.members.find((item) => item.id === memberId);
    const { error } = await client
      .from("lab_members")
      .update({
        role_title: updates.roleTitle?.trim(),
        sort_order: updates.sortOrder,
        permission_level: updates.permissionLevel,
        can_manage_profile: updates.canManageProfile,
        can_manage_documents: updates.canManageDocuments,
        can_manage_members: updates.canManageMembers,
      })
      .eq("lab_id", labId)
      .eq("id", memberId);

    if (error) {
      throw error;
    }

    if (snapshot.currentAccount) {
      const changedFields = Object.entries(updates)
        .filter(([, value]) => typeof value !== "undefined")
        .map(([key]) => key);
      await insertActivityLog({
        labId,
        actorAccountId: snapshot.currentAccount.id,
        actorName: snapshot.currentAccount.koreanName,
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
  toggleLock: async (labId, resourceType, resourceTitle, holder) => {
    requirePermissionFromSnapshot(
      labId,
      resourceType === "profile" ? "profile" : "documents",
    );
    const client = createClient();
    const { data: existing, error: readError } = await client
      .from("shared_edit_locks")
      .select("id, active")
      .eq("lab_id", labId)
      .eq("resource_type", resourceType)
      .eq("resource_title", resourceTitle)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (readError) {
      throw readError;
    }

    if (existing) {
      const { error } = await client
        .from("shared_edit_locks")
        .update({
          active: !existing.active,
          holder_account_id: holder.id,
        })
        .eq("id", existing.id);

      if (error) {
        throw error;
      }

      await insertActivityLog({
        labId,
        actorAccountId: holder.id,
        actorName: holder.koreanName,
        action: existing.active ? "lock.disabled" : "lock.enabled",
        resourceType,
        resourceId: resourceTitle,
        payload: {
          title: resourceTitle,
        },
      });

      return;
    }

    const { error } = await client.from("shared_edit_locks").insert({
      lab_id: labId,
      resource_type: resourceType,
      resource_title: resourceTitle,
      holder_account_id: holder.id,
      active: true,
    });

    if (error) {
      throw error;
    }

    await insertActivityLog({
      labId,
      actorAccountId: holder.id,
      actorName: holder.koreanName,
      action: "lock.enabled",
      resourceType,
      resourceId: resourceTitle,
      payload: {
        title: resourceTitle,
      },
    });
  },
  toggleSharedItem: async (labId, field, itemId, itemTitle) => {
    requirePermissionFromSnapshot(labId, "documents");
    const client = createClient();
    const tableConfig =
      field === "sharedDocumentIds"
        ? {
            table: "lab_shared_documents",
            idColumn: "document_id",
          }
        : field === "sharedPaperIds"
          ? {
              table: "lab_shared_publications",
              idColumn: "publication_id",
            }
          : {
              table: "lab_shared_schedules",
              idColumn: "schedule_id",
            };

    const { data: existing, error: readError } = await client
      .from(tableConfig.table)
      .select("lab_id")
      .eq("lab_id", labId)
      .eq(tableConfig.idColumn, itemId)
      .maybeSingle();

    if (readError) {
      throw readError;
    }

    if (existing) {
      const { error } = await client
        .from(tableConfig.table)
        .delete()
        .eq("lab_id", labId)
        .eq(tableConfig.idColumn, itemId);

      if (error) {
        throw error;
      }

      if (snapshot.currentAccount) {
        const resourceType =
          field === "sharedDocumentIds"
            ? "document"
            : field === "sharedPaperIds"
              ? "paper"
              : "schedule";
        await insertActivityLog({
          labId,
          actorAccountId: snapshot.currentAccount.id,
          actorName: snapshot.currentAccount.koreanName,
          action: `shared.${resourceType}.removed`,
          resourceType,
          resourceId: itemId,
          payload: {
            title: itemTitle ?? itemId,
          },
        });
      }

      return;
    }

    const insertPayload =
      field === "sharedDocumentIds"
        ? { lab_id: labId, document_id: itemId, shared_by_account_id: snapshot.currentAccount?.id }
        : field === "sharedPaperIds"
          ? {
              lab_id: labId,
              publication_id: itemId,
              shared_by_account_id: snapshot.currentAccount?.id,
            }
          : {
              lab_id: labId,
              schedule_id: itemId,
              shared_by_account_id: snapshot.currentAccount?.id,
            };

    const { error } = await client.from(tableConfig.table).insert(insertPayload);

    if (error) {
      throw error;
    }

    if (snapshot.currentAccount) {
      const resourceType =
        field === "sharedDocumentIds"
          ? "document"
          : field === "sharedPaperIds"
            ? "paper"
            : "schedule";
      await insertActivityLog({
        labId,
        actorAccountId: snapshot.currentAccount.id,
        actorName: snapshot.currentAccount.koreanName,
        action: `shared.${resourceType}.added`,
        resourceType,
        resourceId: itemId,
        payload: {
          title: itemTitle ?? itemId,
        },
      });
    }
  },
  listActivityLogs: async (labId) => listActivityLogsForLab(labId),
  getInviteLink: buildInviteLink,
};
