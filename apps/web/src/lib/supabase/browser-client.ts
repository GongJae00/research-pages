"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabasePublicEnv } from "./env";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    const env = requireSupabasePublicEnv();
    browserClient = createBrowserClient(env.url, env.anonKey);
  }

  return browserClient;
}
