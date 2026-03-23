import type { AgentOperationsSnapshot } from "@/lib/agent-operations-snapshot";
import { getLiveAgentOperationsSnapshot } from "@/lib/agent-ops-runtime";

import { AgentOperationsControlRoom } from "./agent-operations-control-room";

interface AgentOperationsDashboardProps {
  locale: string;
}

export async function AgentOperationsDashboard({ locale }: AgentOperationsDashboardProps) {
  const snapshot: AgentOperationsSnapshot = await getLiveAgentOperationsSnapshot(locale);

  return <AgentOperationsControlRoom initialSnapshot={snapshot} locale={locale} />;
}
