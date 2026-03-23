import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AgentOperationsDashboard } from "@/components/agent-operations-dashboard";
import { isDemoPreviewRuntimeEnabled } from "@/lib/demo-preview";

interface OpsPageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

function isInternalOpsEnabled() {
  return process.env.NODE_ENV !== "production" || isDemoPreviewRuntimeEnabled();
}

export default async function OpsPage({ params }: OpsPageProps) {
  const { locale } = await params;

  if (!isInternalOpsEnabled()) {
    notFound();
  }

  return <AgentOperationsDashboard locale={locale} />;
}
