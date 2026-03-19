"use client";

import {
  accountSchema,
  accountSessionSchema,
  labInviteSchema,
  labMemberSchema,
  labWorkspaceListSchema,
  labWorkspaceSchema,
  type Account,
  type AccountSession,
  type LabWorkspace,
} from "@research-os/types";
import type { Locale } from "@/lib/i18n";
import {
  readJsonFromStorage,
  removeFromStorage,
  writeJsonToStorage,
} from "@/lib/browser-json-store";
import { activityLogStorageKey } from "@/lib/activity-log-browser-store";

const accountsStorageKey = "researchos:auth:accounts:v1";
const sessionStorageKey = "researchos:auth:session:v1";
const labsStorageKey = "researchos:labs:v1";
const credentialsStorageKey = "researchos:auth:credentials:v1";
const shouldSeedMockData = process.env.NEXT_PUBLIC_RESEARCH_OS_DATA_MODE !== "supabase";

type StoredAccountCredentialMap = Record<string, string>;

interface SignUpInput {
  koreanName: string;
  englishName: string;
  primaryEmail: string;
  nationalResearcherNumber: string;
  password: string;
}

interface SignInInput {
  primaryEmail: string;
  password: string;
}

interface CreateLabInput {
  name: string;
  slug: string;
  summary: string;
  homepageTitle: string;
  homepageDescription: string;
}

interface UpdateLabInput {
  name?: string;
  slug?: string;
  summary?: string;
  homepageTitle?: string;
  homepageDescription?: string;
  publicPageEnabled?: boolean;
}

interface InviteLabInput {
  labId: string;
  invitedByMemberId: string;
  email: string;
  nationalResearcherNumber: string;
  roleTitle: string;
  permissionLevel: "owner" | "admin" | "member";
}

function getTodayInSeoul() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function createId(prefix: string) {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const demoAccounts = [
  accountSchema.parse({
    id: "account-demo-vision-kim",
    koreanName: "김비전",
    englishName: "Vision Kim",
    primaryEmail: "vision@cvclab.example",
    nationalResearcherNumber: "NR-DEMO-001",
    createdOn: "2026-03-01",
  }),
  accountSchema.parse({
    id: "account-demo-mina-park",
    koreanName: "박세미나",
    englishName: "Mina Park",
    primaryEmail: "mina@cvclab.example",
    nationalResearcherNumber: "NR-DEMO-002",
    createdOn: "2026-03-01",
  }),
  accountSchema.parse({
    id: "account-demo-daniel-choi",
    koreanName: "최다니엘",
    englishName: "Daniel Choi",
    primaryEmail: "daniel@cvclab.example",
    nationalResearcherNumber: "NR-DEMO-003",
    createdOn: "2026-03-01",
  }),
];

const demoAccountPasswords: StoredAccountCredentialMap = {
  "account-demo-vision-kim": "demo-password",
  "account-demo-mina-park": "demo-password",
  "account-demo-daniel-choi": "demo-password",
};

const defaultLabMemberSeeds = [
  {
    accountId: "account-demo-vision-kim",
    koreanName: "김비전",
    englishName: "Vision Kim",
    email: "vision@cvclab.example",
    nationalResearcherNumber: "NR-DEMO-001",
    roleTitle: "PhD Researcher",
    sortOrder: 10,
    permissionLevel: "member" as const,
    canManageProfile: false,
    canManageDocuments: true,
    canManageMembers: false,
  },
  {
    accountId: "account-demo-mina-park",
    koreanName: "박세미나",
    englishName: "Mina Park",
    email: "mina@cvclab.example",
    nationalResearcherNumber: "NR-DEMO-002",
    roleTitle: "MS Researcher",
    sortOrder: 20,
    permissionLevel: "member" as const,
    canManageProfile: false,
    canManageDocuments: true,
    canManageMembers: false,
  },
  {
    accountId: "account-demo-daniel-choi",
    koreanName: "최다니엘",
    englishName: "Daniel Choi",
    email: "daniel@cvclab.example",
    nationalResearcherNumber: "NR-DEMO-003",
    roleTitle: "Lab Coordinator",
    sortOrder: 30,
    permissionLevel: "admin" as const,
    canManageProfile: true,
    canManageDocuments: true,
    canManageMembers: true,
  },
];

function mergeDemoAccounts(accounts: Account[]) {
  let didChange = false;
  const nextAccounts = [...accounts];

  demoAccounts.forEach((account) => {
    if (nextAccounts.some((item) => item.id === account.id)) {
      return;
    }

    nextAccounts.push(account);
    didChange = true;
  });

  return { didChange, nextAccounts };
}

function readStoredCredentials() {
  const parsed = readJsonFromStorage<Record<string, unknown>>(credentialsStorageKey, {});
  const nextCredentials: StoredAccountCredentialMap = {};
  let didChange = false;

  Object.entries(parsed).forEach(([accountId, password]) => {
    if (typeof password === "string" && password.trim().length > 0) {
      nextCredentials[accountId] = password;
    }
  });

  if (shouldSeedMockData) {
    Object.entries(demoAccountPasswords).forEach(([accountId, password]) => {
      if (nextCredentials[accountId] === password) {
        return;
      }

      nextCredentials[accountId] = password;
      didChange = true;
    });
  }

  if (didChange) {
    writeStoredCredentials(nextCredentials);
  }

  return nextCredentials;
}

function writeStoredCredentials(credentials: StoredAccountCredentialMap) {
  writeJsonToStorage(credentialsStorageKey, credentials);
}

function migrateEmbeddedPasswords(rawAccounts: unknown[], accounts: Account[]) {
  const nextCredentials = readStoredCredentials();
  let didChange = false;

  rawAccounts.forEach((item, index) => {
    if (!item || typeof item !== "object" || !("password" in item)) {
      return;
    }

    const account = accounts[index];
    const password = item.password;

    if (!account || typeof password !== "string" || password.trim().length === 0) {
      return;
    }

    if (nextCredentials[account.id] === password) {
      return;
    }

    nextCredentials[account.id] = password;
    didChange = true;
  });

  if (didChange) {
    writeStoredCredentials(nextCredentials);
  }

  return didChange;
}

function withDefaultLabMembers(lab: LabWorkspace) {
  if (lab.members.length > 1) {
    return { didChange: false, nextLab: lab };
  }

  const nextMembers = [...lab.members];

  defaultLabMemberSeeds.forEach((member, index) => {
    if (nextMembers.some((item) => item.accountId === member.accountId)) {
      return;
    }

    nextMembers.push(
      labMemberSchema.parse({
        id: `member-demo-${lab.id}-${index + 1}`,
        ...member,
        joinedOn: "2026-03-01",
      }),
    );
  });

  return {
    didChange: nextMembers.length !== lab.members.length,
    nextLab:
      nextMembers.length === lab.members.length
        ? lab
        : {
            ...lab,
            members: nextMembers,
          },
  };
}

export function buildScopedStorageKeyForAccount(baseKey: string, accountId: string) {
  return `${baseKey}:${accountId}`;
}

export function getActiveAccountId() {
  const session = readCurrentSession();
  return session?.accountId ?? null;
}

export function buildScopedStorageKey(baseKey: string) {
  const accountId = getActiveAccountId();
  return accountId ? buildScopedStorageKeyForAccount(baseKey, accountId) : `${baseKey}:guest`;
}

export function readAccounts() {
  const parsed = readJsonFromStorage<unknown[]>(accountsStorageKey, []);
  const accounts = parsed
    .map((item) => accountSchema.safeParse(item))
    .filter((item) => item.success)
    .map((item) => item.data);
  const { didChange: mergedDemoAccounts, nextAccounts } = shouldSeedMockData
    ? mergeDemoAccounts(accounts)
    : { didChange: false, nextAccounts: accounts };
  const migratedPasswords = migrateEmbeddedPasswords(parsed, accounts);
  const didChange = mergedDemoAccounts || migratedPasswords;

  if (didChange) {
    writeAccounts(nextAccounts);
  }

  return nextAccounts;
}

function writeAccounts(accounts: Account[]) {
  writeJsonToStorage(accountsStorageKey, accounts);
}

export function hydrateAccounts(accounts: Account[]) {
  writeAccounts(accounts);
}

export function readCurrentSession() {
  const parsed = readJsonFromStorage<unknown | null>(sessionStorageKey, null);
  const validated = accountSessionSchema.safeParse(parsed);
  return validated.success ? validated.data : null;
}

function writeCurrentSession(session: AccountSession) {
  writeJsonToStorage(sessionStorageKey, session);
}

export function hydrateCurrentSession(session: AccountSession | null) {
  if (session) {
    writeCurrentSession(session);
    return;
  }

  clearCurrentSession();
}

export function clearCurrentSession() {
  removeFromStorage(sessionStorageKey);
}

export function getCurrentAccount() {
  const session = readCurrentSession();

  if (!session) {
    return null;
  }

  return readAccounts().find((account) => account.id === session.accountId) ?? null;
}

export function getAccountById(accountId: string) {
  return readAccounts().find((account) => account.id === accountId) ?? null;
}

export function readLabs() {
  const parsed = readJsonFromStorage<unknown[]>(labsStorageKey, []);
  const validated = labWorkspaceListSchema.safeParse(parsed);
  const labs = validated.success ? validated.data : [];
  let didChange = false;
  const nextLabs = shouldSeedMockData
    ? labs.map((lab) => {
        const result = withDefaultLabMembers(lab);
        didChange = didChange || result.didChange;
        return result.nextLab;
      })
    : labs;

  if (didChange) {
    writeLabs(nextLabs);
  }

  return nextLabs;
}

function writeLabs(labs: LabWorkspace[]) {
  writeJsonToStorage(labsStorageKey, labs);
}

export function hydrateLabs(labs: LabWorkspace[]) {
  writeLabs(labs);
}

export function signUpAccount(input: SignUpInput) {
  const accounts = readAccounts();
  const credentials = readStoredCredentials();
  const normalizedEmail = input.primaryEmail.trim().toLowerCase();
  const normalizedNumber = input.nationalResearcherNumber.trim();

  if (accounts.some((account) => account.primaryEmail.toLowerCase() === normalizedEmail)) {
    throw new Error("이미 사용 중인 이메일입니다.");
  }

  if (
    accounts.some(
      (account) => account.nationalResearcherNumber.trim() === normalizedNumber,
    )
  ) {
    throw new Error("이미 사용 중인 국가연구자번호입니다.");
  }

  const account = accountSchema.parse({
    id: createId("account"),
    koreanName: input.koreanName.trim(),
    englishName: input.englishName.trim() || undefined,
    primaryEmail: normalizedEmail,
    nationalResearcherNumber: normalizedNumber,
    createdOn: getTodayInSeoul(),
  });

  writeAccounts([...accounts, account]);
  writeStoredCredentials({
    ...credentials,
    [account.id]: input.password,
  });
  writeCurrentSession({
    accountId: account.id,
    signedInOn: getTodayInSeoul(),
  });

  return account;
}

export function signInAccount(input: SignInInput) {
  const credentials = readStoredCredentials();
  const account =
    readAccounts().find(
      (item) => item.primaryEmail.toLowerCase() === input.primaryEmail.trim().toLowerCase(),
    ) ?? null;

  if (!account || credentials[account.id] !== input.password) {
    throw new Error("이메일 또는 비밀번호가 맞지 않습니다.");
  }

  writeCurrentSession({
    accountId: account.id,
    signedInOn: getTodayInSeoul(),
  });

  return acceptPendingInvites(account);
}

export function signOutAccount() {
  clearCurrentSession();
}

export function getLabsForAccount(accountId: string) {
  return readLabs().filter((lab) =>
    lab.members.some((member) => member.accountId === accountId),
  );
}

export function createLabWorkspace(account: Account, input: CreateLabInput) {
  const labs = readLabs();
  const slug = input.slug.trim().toLowerCase();

  if (labs.some((lab) => lab.slug === slug)) {
    throw new Error("이미 사용 중인 연구실 슬러그입니다.");
  }

  const ownerMember = labMemberSchema.parse({
    id: createId("member"),
    accountId: account.id,
    koreanName: account.koreanName,
    englishName: account.englishName,
    email: account.primaryEmail,
    nationalResearcherNumber: account.nationalResearcherNumber,
    roleTitle: "Lab Lead",
    sortOrder: 0,
    permissionLevel: "owner",
    canManageProfile: true,
    canManageDocuments: true,
    canManageMembers: true,
    joinedOn: getTodayInSeoul(),
  });

  const lab = labWorkspaceSchema.parse({
    id: createId("lab"),
    name: input.name.trim(),
    slug,
    summary: input.summary.trim() || undefined,
    ownerAccountId: account.id,
    homepageTitle: input.homepageTitle.trim() || input.name.trim(),
    homepageDescription: input.homepageDescription.trim() || undefined,
    publicPageEnabled: false,
    members: [ownerMember],
    invites: [],
    editLocks: [],
    sharedDocumentIds: [],
    sharedPaperIds: [],
    sharedScheduleIds: [],
    createdOn: getTodayInSeoul(),
  });

  writeLabs([...labs, lab]);
  return lab;
}

export function inviteLabMember(input: InviteLabInput) {
  const labs = readLabs();
  const nextLabs = labs.map((lab) => {
    if (lab.id !== input.labId) {
      return lab;
    }

    const invite = labInviteSchema.parse({
      id: createId("invite"),
      email: input.email.trim().toLowerCase(),
      nationalResearcherNumber: input.nationalResearcherNumber.trim(),
      roleTitle: input.roleTitle.trim(),
      permissionLevel: input.permissionLevel,
      invitedByMemberId: input.invitedByMemberId,
      invitedOn: getTodayInSeoul(),
      status: "pending",
      token: createId("token"),
    });

    return {
      ...lab,
      invites: [invite, ...lab.invites],
    };
  });

  writeLabs(nextLabs);

  return nextLabs.find((lab) => lab.id === input.labId) ?? null;
}

export function acceptPendingInvites(account: Account) {
  const labs = readLabs();
  let didChange = false;
  const nextLabs = labs.map((lab) => {
    const nextMembers = [...lab.members];
    const nextInvites = lab.invites.map((invite) => {
      if (
        invite.status === "pending" &&
        invite.email.toLowerCase() === account.primaryEmail.toLowerCase() &&
        invite.nationalResearcherNumber.trim() === account.nationalResearcherNumber.trim()
      ) {
        didChange = true;

        if (!nextMembers.some((member) => member.accountId === account.id)) {
          nextMembers.push(
            labMemberSchema.parse({
              id: createId("member"),
              accountId: account.id,
              koreanName: account.koreanName,
              englishName: account.englishName,
              email: account.primaryEmail,
              nationalResearcherNumber: account.nationalResearcherNumber,
              roleTitle: invite.roleTitle,
              sortOrder:
                nextMembers.reduce(
                  (maxOrder, member) => Math.max(maxOrder, member.sortOrder ?? 0),
                  0,
                ) + 10,
              permissionLevel: invite.permissionLevel,
              canManageProfile: invite.permissionLevel !== "member",
              canManageDocuments: true,
              canManageMembers: invite.permissionLevel === "owner" || invite.permissionLevel === "admin",
              joinedOn: getTodayInSeoul(),
            }),
          );
        }

        return { ...invite, status: "accepted" as const };
      }

      return invite;
    });

    return {
      ...lab,
      members: nextMembers,
      invites: nextInvites,
    };
  });

  if (didChange) {
    writeLabs(nextLabs);
  }

  return account;
}

export function updateLabMember(labId: string, memberId: string, updates: Partial<LabWorkspace["members"][number]>) {
  const labs = readLabs();
  const nextLabs = labs.map((lab) => {
    if (lab.id !== labId) {
      return lab;
    }

    return {
      ...lab,
      members: lab.members.map((member) =>
        member.id === memberId ? { ...member, ...updates } : member,
      ),
    };
  });

  writeLabs(nextLabs);
}

export function updateLabWorkspaceInfo(labId: string, updates: UpdateLabInput) {
  const labs = readLabs();
  const nextSlug = updates.slug?.trim().toLowerCase();

  if (
    nextSlug &&
    labs.some((lab) => lab.id !== labId && lab.slug === nextSlug)
  ) {
    throw new Error("이미 사용 중인 연구실 주소입니다.");
  }

  const nextLabs = labs.map((lab) => {
    if (lab.id !== labId) {
      return lab;
    }

    return {
      ...lab,
      name: updates.name?.trim() || lab.name,
      slug: nextSlug || lab.slug,
      summary:
        typeof updates.summary === "string"
          ? updates.summary.trim() || undefined
          : lab.summary,
      homepageTitle:
        typeof updates.homepageTitle === "string"
          ? updates.homepageTitle.trim() || undefined
          : lab.homepageTitle,
        homepageDescription:
          typeof updates.homepageDescription === "string"
            ? updates.homepageDescription.trim() || undefined
            : lab.homepageDescription,
        publicPageEnabled:
          typeof updates.publicPageEnabled === "boolean"
            ? updates.publicPageEnabled
            : lab.publicPageEnabled,
      };
  });

  writeLabs(nextLabs);
  return nextLabs.find((lab) => lab.id === labId) ?? null;
}

export function toggleLabEditLock(labId: string, resourceType: "document" | "paper" | "profile" | "schedule", resourceTitle: string, holder: Account) {
  const labs = readLabs();
  const nextLabs = labs.map((lab) => {
    if (lab.id !== labId) {
      return lab;
    }

    const existing = lab.editLocks.find(
      (lock) => lock.resourceType === resourceType && lock.resourceTitle === resourceTitle,
    );

    const nextLocks = existing
      ? lab.editLocks.map((lock) =>
          lock.id === existing.id
            ? { ...lock, active: !lock.active, updatedOn: getTodayInSeoul() }
            : lock,
        )
      : [
          ...lab.editLocks,
          {
            id: createId("lock"),
            resourceType,
            resourceTitle,
            holderAccountId: holder.id,
            holderName: holder.koreanName,
            active: true,
            updatedOn: getTodayInSeoul(),
          },
        ];

    return {
      ...lab,
      editLocks: nextLocks,
    };
  });

  writeLabs(nextLabs);
}

export function toggleLabSharedItem(
  labId: string,
  field: "sharedDocumentIds" | "sharedPaperIds" | "sharedScheduleIds",
  itemId: string,
) {
  const labs = readLabs();
  const nextLabs = labs.map((lab) => {
    if (lab.id !== labId) {
      return lab;
    }

    const items = lab[field];
    const nextItems = items.includes(itemId)
      ? items.filter((value) => value !== itemId)
      : [itemId, ...items];

    return {
      ...lab,
      [field]: nextItems,
    };
  });

  writeLabs(nextLabs);
}

export function buildInviteLink(lab: LabWorkspace, token: string, locale: Locale) {
  return `${window.location.origin}/${locale}/lab?lab=${lab.slug}&invite=${token}`;
}

export function getSessionStorageKey() {
  return sessionStorageKey;
}

export function getAuthStorageKeys() {
  return [
    accountsStorageKey,
    credentialsStorageKey,
    sessionStorageKey,
    labsStorageKey,
    activityLogStorageKey,
  ] as const;
}
