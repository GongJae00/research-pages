import { hasSupabasePublicEnv } from "@/lib/supabase/env";

import type { CollaborationBackendStatus } from "./auth-collaboration-repository";

export function getCollaborationBackendStatus(): CollaborationBackendStatus {
  const targetMode =
    process.env.NEXT_PUBLIC_RESEARCH_OS_DATA_MODE === "supabase"
      ? "supabase"
      : "mock-browser";
  const supabaseConfigured = hasSupabasePublicEnv();

  return {
    currentMode: targetMode === "supabase" && supabaseConfigured ? "supabase" : "mock-browser",
    targetMode,
    supabaseConfigured,
  };
}
