import { NextResponse } from "next/server";
import { getDemoPreviewLinks, isDemoPreviewRuntimeEnabled } from "@/lib/demo-preview";
import { isPreviewAccessEnabled } from "@/lib/preview-access";
import { hasSupabasePublicEnv } from "@/lib/supabase/env";

function readFlag(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

function readValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function GET() {
  const dataMode = readValue(process.env.NEXT_PUBLIC_RESEARCH_OS_DATA_MODE) ?? "mock";
  const demoMode = readFlag(process.env.NEXT_PUBLIC_RESEARCH_PAGES_DEMO_MODE);
  const health = {
    status: "ok",
    app: "ResearchPages",
    dataMode,
    demoMode,
    previewAccessEnabled: isPreviewAccessEnabled(),
    supabaseConfigured: hasSupabasePublicEnv(),
    vercel: {
      env: readValue(process.env.VERCEL_ENV),
      url: readValue(process.env.VERCEL_URL),
      branch: readValue(process.env.VERCEL_GIT_COMMIT_REF),
      commitSha: readValue(process.env.VERCEL_GIT_COMMIT_SHA),
    },
    demoPreviewLinks: isDemoPreviewRuntimeEnabled() ? getDemoPreviewLinks() : null,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(health);
}
