"use client";

import type { Account, ActivityLog, LabWorkspace } from "@research-os/types";
import { LogIn, ShieldCheck, UserPlus } from "lucide-react";
import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  getAuthCollaborationRepository,
  type CollaborationBackendStatus,
} from "@/lib/collaboration";
import type { Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

interface AuthContextValue {
  currentAccount: Account | null;
  labs: LabWorkspace[];
  isReady: boolean;
  backendStatus: CollaborationBackendStatus;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  signIn: (input: { primaryEmail: string; password: string }) => Promise<void>;
  signUp: (input: {
    koreanName: string;
    englishName: string;
    primaryEmail: string;
    nationalResearcherNumber: string;
    password: string;
  }) => Promise<void>;
  createLab: (input: {
    name: string;
    slug: string;
    summary: string;
    homepageTitle: string;
    homepageDescription: string;
  }) => Promise<LabWorkspace>;
  inviteMember: (input: {
    labId: string;
    invitedByMemberId: string;
    email: string;
    nationalResearcherNumber: string;
    roleTitle: string;
    permissionLevel: "owner" | "admin" | "member";
  }) => Promise<void>;
  updateLab: (
    labId: string,
    updates: {
      name?: string;
      slug?: string;
      summary?: string;
      homepageTitle?: string;
      homepageDescription?: string;
      publicPageEnabled?: boolean;
    },
  ) => Promise<void>;
  updateMember: (
    labId: string,
    memberId: string,
    updates: Partial<LabWorkspace["members"][number]>,
  ) => Promise<void>;
  toggleLock: (
    labId: string,
    resourceType: "document" | "paper" | "profile" | "schedule",
    resourceTitle: string,
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

const AuthContext = createContext<AuthContextValue | null>(null);
const authRepository = getAuthCollaborationRepository();
const initialAuthState = {
  currentAccount: null,
  labs: [],
  isReady: false,
} satisfies Pick<AuthContextValue, "currentAccount" | "labs" | "isReady">;
type AuthState = Pick<AuthContextValue, "currentAccount" | "labs" | "isReady">;

function useAuthValue(): AuthContextValue {
  const [state, setState] = useState<AuthState>(initialAuthState);
  const { currentAccount, labs, isReady } = state;
  const refreshRef = useRef<() => Promise<void>>(async () => undefined);

  const refresh = useCallback(async () => {
    await authRepository.sync();
    setState(authRepository.loadState());
  }, []);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      void refresh();
    }, 0);

    const unsubscribe = authRepository.subscribe(() => {
      setState(authRepository.loadState());
    });

    return () => {
      window.clearTimeout(hydrationTimer);
      unsubscribe();
    };
  }, [refresh]);

  useEffect(() => {
    if (
      !isReady ||
      !currentAccount ||
      authRepository.backendStatus.currentMode !== "supabase" ||
      !authRepository.backendStatus.supabaseConfigured
    ) {
      return;
    }

    const client = getSupabaseBrowserClient();
    const labIds = [...new Set(labs.map((lab) => lab.id))].sort();
    const normalizedEmail = currentAccount.primaryEmail.trim().toLowerCase();
    let refreshTimer: number | null = null;

    const scheduleRefresh = () => {
      if (refreshTimer !== null) {
        return;
      }

      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        void refreshRef.current();
      }, 80);
    };

    const channel = client.channel(
      `workspace-sync-${currentAccount.id}-${labIds.join("-") || "none"}`,
    );

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "labs",
        filter: `owner_account_id=eq.${currentAccount.id}`,
      },
      scheduleRefresh,
    );

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "lab_members",
        filter: `account_id=eq.${currentAccount.id}`,
      },
      scheduleRefresh,
    );

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "lab_invites",
        filter: `email=eq.${normalizedEmail}`,
      },
      scheduleRefresh,
    );

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "lab_invites",
        filter: `national_researcher_number=eq.${currentAccount.nationalResearcherNumber}`,
      },
      scheduleRefresh,
    );

    for (const labId of labIds) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "labs",
          filter: `id=eq.${labId}`,
        },
        scheduleRefresh,
      );

      for (const table of [
        "lab_members",
        "lab_invites",
        "shared_edit_locks",
        "lab_shared_documents",
        "lab_shared_publications",
        "lab_shared_schedules",
        "lab_timetable_entries",
        "activity_logs",
        "lab_research_projects",
      ]) {
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            filter: `lab_id=eq.${labId}`,
          },
          scheduleRefresh,
        );
      }
    }

    channel.subscribe();

    return () => {
      if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer);
      }
      void client.removeChannel(channel);
    };
  }, [currentAccount, isReady, labs]);

  return {
    currentAccount,
    labs,
    isReady,
    backendStatus: authRepository.backendStatus,
    refresh,
    signOut: async () => {
      await authRepository.signOut();
      await refresh();
    },
    signIn: async (input) => {
      await authRepository.signIn(input);
      await refresh();
    },
    signUp: async (input) => {
      await authRepository.signUp(input);
      await refresh();
    },
    createLab: async (input) => {
      if (!currentAccount) {
        throw new Error("로그인이 필요합니다.");
      }

      const nextLab = await authRepository.createLab(currentAccount, input);
      await refresh();
      return nextLab;
    },
    inviteMember: async (input) => {
      await authRepository.inviteMember(input);
      await refresh();
    },
    updateLab: async (labId, updates) => {
      await authRepository.updateLab(labId, updates);
      await refresh();
    },
    updateMember: async (labId, memberId, updates) => {
      await authRepository.updateMember(labId, memberId, updates);
      await refresh();
    },
    toggleLock: async (labId, resourceType, resourceTitle) => {
      if (!currentAccount) {
        return;
      }

      await authRepository.toggleLock(labId, resourceType, resourceTitle, currentAccount);
      await refresh();
    },
    toggleSharedItem: async (labId, field, itemId, itemTitle) => {
      await authRepository.toggleSharedItem(labId, field, itemId, itemTitle);
      await refresh();
    },
    listActivityLogs: async (labId) => authRepository.listActivityLogs(labId),
    getInviteLink: (lab, token, locale) => authRepository.getInviteLink(lab, token, locale),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useAuthValue();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}

export function WorkspaceAuthGate({
  children,
  locale,
}: {
  children: ReactNode;
  locale: Locale;
}) {
  const { currentAccount, isReady, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState("");
  const [signInForm, setSignInForm] = useState({
    primaryEmail: "",
    password: "",
  });
  const [signUpForm, setSignUpForm] = useState({
    koreanName: "",
    englishName: "",
    primaryEmail: "",
    nationalResearcherNumber: "",
    password: "",
  });

  const text =
    locale === "ko"
      ? {
          loading: "세션을 확인하는 중입니다.",
          title: "개인 공간과 연구실 협업 공간은 로그인 후 열립니다.",
          subtitle:
            "개인 데이터는 기본적으로 비공개이며, 연구실 공유 공간은 초대와 권한을 통해 함께 운영됩니다.",
          signin: "로그인",
          signup: "회원가입",
          email: "기본 이메일",
          password: "비밀번호",
          koreanName: "국문 이름",
          englishName: "영문 이름",
          nrn: "국가연구자번호",
          signinCta: "워크스페이스 열기",
          signupCta: "계정 만들기",
        }
      : {
          loading: "Checking your session.",
          title: "Personal and lab workspaces open after sign-in.",
          subtitle:
            "Personal data stays private by default, and shared lab workspaces open through invitation and access control.",
          signin: "Sign in",
          signup: "Sign up",
          email: "Primary email",
          password: "Password",
          koreanName: "Korean name",
          englishName: "English name",
          nrn: "National researcher ID",
          signinCta: "Open workspace",
          signupCta: "Create account",
        };

  if (!isReady) {
    return (
      <div className="auth-screen">
        <section className="card auth-card">
          <p className="card-support-text">{text.loading}</p>
        </section>
      </div>
    );
  }

  if (currentAccount) {
    return <>{children}</>;
  }

  return (
    <div className="auth-screen">
      <section className="card auth-card">
        <div className="auth-head">
          <div className="auth-mark">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2>{text.title}</h2>
            <p>{text.subtitle}</p>
          </div>
        </div>

        <div className="auth-mode-row">
          <button
            type="button"
            className={`document-filter-chip${mode === "signin" ? " document-filter-chip-active" : ""}`}
            onClick={() => {
              setMode("signin");
              setError("");
            }}
          >
            {text.signin}
          </button>
          <button
            type="button"
            className={`document-filter-chip${mode === "signup" ? " document-filter-chip-active" : ""}`}
            onClick={() => {
              setMode("signup");
              setError("");
            }}
          >
            {text.signup}
          </button>
        </div>

        {mode === "signin" ? (
          <div className="auth-form-grid">
            <label className="editor-field">
              <span>{text.email}</span>
              <input
                value={signInForm.primaryEmail}
                onChange={(event) =>
                  setSignInForm((current) => ({
                    ...current,
                    primaryEmail: event.target.value,
                  }))
                }
              />
            </label>
            <label className="editor-field">
              <span>{text.password}</span>
              <input
                type="password"
                value={signInForm.password}
                onChange={(event) =>
                  setSignInForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
              />
            </label>
            {error ? <p className="auth-error">{error}</p> : null}
            <button
              type="button"
              className="primary-cta"
              onClick={async () => {
                try {
                  await signIn(signInForm);
                  setError("");
                } catch (caught) {
                  setError(caught instanceof Error ? caught.message : "Sign-in failed.");
                }
              }}
            >
              <LogIn size={16} />
              {text.signinCta}
            </button>
          </div>
        ) : (
          <div className="auth-form-grid">
            <label className="editor-field">
              <span>{text.koreanName}</span>
              <input
                value={signUpForm.koreanName}
                onChange={(event) =>
                  setSignUpForm((current) => ({
                    ...current,
                    koreanName: event.target.value,
                  }))
                }
              />
            </label>
            <label className="editor-field">
              <span>{text.englishName}</span>
              <input
                value={signUpForm.englishName}
                onChange={(event) =>
                  setSignUpForm((current) => ({
                    ...current,
                    englishName: event.target.value,
                  }))
                }
              />
            </label>
            <label className="editor-field">
              <span>{text.email}</span>
              <input
                value={signUpForm.primaryEmail}
                onChange={(event) =>
                  setSignUpForm((current) => ({
                    ...current,
                    primaryEmail: event.target.value,
                  }))
                }
              />
            </label>
            <label className="editor-field">
              <span>{text.nrn}</span>
              <input
                value={signUpForm.nationalResearcherNumber}
                onChange={(event) =>
                  setSignUpForm((current) => ({
                    ...current,
                    nationalResearcherNumber: event.target.value,
                  }))
                }
              />
            </label>
            <label className="editor-field editor-field-full">
              <span>{text.password}</span>
              <input
                type="password"
                value={signUpForm.password}
                onChange={(event) =>
                  setSignUpForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
              />
            </label>
            {error ? <p className="auth-error">{error}</p> : null}
            <button
              type="button"
              className="primary-cta"
              onClick={async () => {
                try {
                  await signUp(signUpForm);
                  setError("");
                } catch (caught) {
                  setError(caught instanceof Error ? caught.message : "Sign-up failed.");
                }
              }}
            >
              <UserPlus size={16} />
              {text.signupCta}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
