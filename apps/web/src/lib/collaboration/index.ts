import type { AuthCollaborationRepository } from "./auth-collaboration-repository";
import { mockAuthCollaborationRepository } from "./mock-auth-collaboration-repository";
import { supabaseAuthCollaborationRepository } from "./supabase-auth-collaboration-repository";
import { getCollaborationBackendStatus } from "./runtime";

export * from "./auth-collaboration-repository";
export { getCollaborationBackendStatus } from "./runtime";

// Keep the UI talking to a stable repository boundary so the storage backend
// can move to Supabase later without rewriting page components.
export function getAuthCollaborationRepository(): AuthCollaborationRepository {
  const backendStatus = getCollaborationBackendStatus();

  return backendStatus.currentMode === "supabase"
    ? supabaseAuthCollaborationRepository
    : mockAuthCollaborationRepository;
}
