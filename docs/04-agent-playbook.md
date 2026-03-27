# Agent Playbook

## Purpose

This document defines how to use sub-agents on this repository without drifting from product scope or creating avoidable merge conflicts.

The repository is already beyond a bare scaffold, but it is still validating core workflows in a web-first, mock-friendly state. Sub-agents should preserve that reality unless a task explicitly moves one slice toward the documented Supabase target.

For operator-facing launch steps and copy-paste prompts, use:

- `docs/09-subagent-quickstart.md`
- `docs/10-subagent-prompt-templates.md`
- `docs/11-agent-capability-matrix.md`
- `docs/12-continuous-improvement-loop.md`

## Autonomy Teams and Lanes

The local autonomy loop rotates through four specialized teams, each managing a specific "lane" of continuous improvement:

- **Shell and Experience Team** (`surface QA lane`): Led by `Shell Builder`. Owns the landing page, global navigation, and internal ops board.
- **Workflow Systems Team** (`workflow polish lane`): Led by `Research Flow Lead`. Owns profile, affiliations, funding, and document slices.
- **Reliability Desk** (`collaboration and reliability lane`): Led by `Release Guard`. Owns API routes, runtime glue, and internal documentation.
- **Executive Desk** (`docs drift lane`): Led by `Operator Liaison`. Owns operator guidance, repo playbooks, and agent-ops model documentation.

## Baseline reading order

Every implementation agent should read:

1. `AGENTS.md`
2. `docs/00-product-vision.md`
3. `docs/02-architecture.md`
4. `docs/13-agent-operations-model.md`
5. `docs/15-local-autonomy-daemon.md`

Then read the role-specific docs before editing:

- `docs-scope-agent`: `README.md`, `docs/05-auth-collaboration-slice.md`, `docs/08-repo-exploration.md`
- `web-shell-agent`: `docs/08-repo-exploration.md`
- `researcher-workspace-agent`: `docs/05-auth-collaboration-slice.md`
- `document-workflow-agent`: `docs/05-auth-collaboration-slice.md`
- `lab-collaboration-agent`: `docs/05-auth-collaboration-slice.md`, `docs/06-lab-information-architecture.md`, `docs/07-realtime-collaboration-foundation.md`
- `platform-contracts-agent`: `docs/05-auth-collaboration-slice.md`, `docs/07-realtime-collaboration-foundation.md`, `docs/08-internal-preview.md`

## Default sub-agent roster

Implementation work is mapped to these functional roles, which are assigned to workers by the active Autonomy Team.

### `docs-scope-agent`

Used by: **Executive Desk**
Owned paths:

- `README.md`
- `docs/**`

Use for:

- contributor onboarding
- product wording
- rollout notes
- roadmap or architecture documentation
- task framing for other agents

Do not use for:

- application code changes unless the task is documentation-only

### `web-shell-agent`

Used by: **Shell and Experience Team**
Owned paths:

- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/[locale]/layout.tsx`
- `apps/web/src/app/[locale]/page.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/components/header.tsx`
- `apps/web/src/components/sidebar.tsx`
- `apps/web/src/components/language-switcher.tsx`
- `apps/web/src/components/locale-frame.tsx`
- `apps/web/src/components/preview-mode-banner.tsx`
- `apps/web/src/components/agent-operations-control-room.tsx`

Use for:

- route shell changes
- navigation and layout
- locale switching
- marketing home structure
- global styling
- internal ops board clarity

Do not use for:

- domain schema changes
- document, researcher, or lab data mutations

### `researcher-workspace-agent`

Used by: **Workflow Systems Team**
Owned paths:

- `apps/web/src/app/[locale]/profile/**`
- `apps/web/src/app/[locale]/affiliations/**`
- `apps/web/src/app/[locale]/funding/**`
- `apps/web/src/app/[locale]/timetable/**`
- `apps/web/src/components/profile-workspace.tsx`
- `apps/web/src/components/affiliation-workspace.tsx`
- `apps/web/src/components/funding-workspace.tsx`
- `apps/web/src/components/timetable-workspace.tsx`
- `apps/web/src/lib/profile-*`
- `apps/web/src/lib/affiliation-*`
- `apps/web/src/lib/funding-*`
- `apps/web/src/lib/timetable-*`
- `apps/web/src/lib/academic-term.ts`

Use for:

- personal workspace UX
- profile and affiliation editing
- funding history
- timetable flows

Do not use for:

- public page layout ownership
- shared contract changes without platform coordination

### `document-workflow-agent`

Used by: **Workflow Systems Team**
Owned paths:

- `apps/web/src/app/[locale]/documents/**`
- `apps/web/src/components/document-workspace.tsx`
- `apps/web/src/components/document-intake-panel.tsx`
- `apps/web/src/components/document-evidence-picker.tsx`
- `apps/web/src/components/compact-document-row.tsx`
- `apps/web/src/lib/document-*`
- `apps/web/src/lib/evidence-links.ts`
- `apps/web/src/lib/profile-evidence-server-store.ts`

Use for:

- document bank UX
- intake and metadata flow
- taxonomy changes inside the document slice
- evidence linking

Do not use for:

- shared schema exports without platform coordination
- lab collaboration behavior unless explicitly assigned

### `lab-collaboration-agent`

Used by: **Workflow Systems Team**
Owned paths:

- `apps/web/src/app/[locale]/dashboard/**`
- `apps/web/src/app/[locale]/lab/**`
- `apps/web/src/app/[locale]/labs/[slug]/**`
- `apps/web/src/app/[locale]/researcher/[slug]/**`
- `apps/web/src/components/lab-workspace.tsx`
- `apps/web/src/components/public-lab-page.tsx`
- `apps/web/src/components/public-researcher-page.tsx`
- `apps/web/src/components/auth-provider.tsx`
- `apps/web/src/lib/collaboration/**`
- `apps/web/src/lib/activity-log-*`
- `apps/web/src/lib/lab-*`
- `apps/web/src/lib/public-*`
- `apps/web/src/lib/publication-*`
- `apps/web/src/lib/researcher-directory.ts`
- `apps/web/src/lib/mock-auth-store.ts`

Use for:

- lab workspace behavior
- invitations and membership
- permissions and edit locks
- public researcher and lab publishing flows
- activity logs and collaboration UX

Do not use for:

- shell-wide layout work owned by `web-shell-agent`
- shared contract changes without platform coordination

### `platform-contracts-agent`

Used by: **Reliability Desk**
Owned paths:

- `packages/types/src/**`
- `supabase/schema.sql`
- `apps/web/src/lib/supabase/**`
- `apps/web/src/app/api/**`
- `apps/web/src/proxy.ts`
- `apps/web/next.config.ts`
- `apps/web/.env.example`
- `apps/web/src/lib/demo-preview.ts`
- `apps/web/src/lib/demo-seed.ts`
- `apps/web/src/lib/preview-access.ts`
- `apps/web/src/app/[locale]/access/**`

Use for:

- shared schema changes
- Supabase wiring
- API route work
- preview access and deployment-facing plumbing
- environment and runtime handling

Do not use for:

- broad feature UX changes that belong to a feature agent

## Serialized hot files

These files should have one designated writer at a time:

- `README.md`
- `apps/web/src/app/globals.css`
- `apps/web/src/components/locale-frame.tsx`
- `apps/web/src/components/auth-provider.tsx`
- `apps/web/src/lib/dashboard-snapshot.ts`
- `packages/types/src/index.ts`
- `supabase/schema.sql`

If work needs one of these files, call that out in the assignment and avoid parallel edits elsewhere that assume a different version.

## Default operating pattern

Use at most three implementation agents in parallel:

1. one feature agent from researcher, document, or lab
2. optionally one shell agent
3. optionally one platform agent if contracts are already agreed

If `packages/types` or `supabase/schema.sql` must change, do that first. Only start feature agents after the contract change is clear.

`apps/mobile/**`, `packages/ui/**`, and `packages/config/**` do not need dedicated standing agents yet. Treat mobile as explicitly scoped work only, and keep `packages/ui` or `packages/config` under the owning agent for the relevant change until they become active shared surfaces.

## Skills and specialist overlays

Use `docs/11-agent-capability-matrix.md` to attach the right specialist skills to the owning role.

The default role roster defines ownership. Skills add execution help on top of that ownership:

- design overlay for Figma fidelity and UI review
- document-format overlay for DOCX, PDF, slides, and spreadsheets
- delivery overlay for PR comments, CI, and issue tracking
- research or spec overlay for Notion-backed planning or documentation
- OpenAI-specific overlay only when the task explicitly involves OpenAI products

Do not let a skill choice blur file ownership. A `document-workflow-agent` using `$pdf` is still the document owner. A `web-shell-agent` using `$figma-implement-design` is still the shell owner.

## Required task framing

Every parent-to-sub-agent assignment should include:

- the user workflow being changed
- the owned paths
- explicit non-goals
- whether the slice is `mock` validation mode, `supabase` target mode, or both
- whether shared types or schema changes are allowed
- minimum verification required
- stop conditions for escalation

Use this template:

```text
Role:
Workflow:
Owned paths:
Non-goals:
Data mode:
Shared contract policy:
Checks to run:
Stop and escalate if:
```

## Required handoff back

Every sub-agent handoff should report:

- changed files
- commands run
- routes or screens checked
- docs consulted
- files intentionally not touched
- overlap risks with other agents
- unresolved assumptions

Use this template:

```text
Changed files:
Commands run:
Routes or screens checked:
Docs consulted:
Files intentionally not touched:
Overlap risks:
Unresolved assumptions:
```

## Verification matrix

- `docs-scope-agent`: confirm wording matches `docs/00-product-vision.md`, `docs/02-architecture.md`, and `docs/03-roadmap.md`
- `web-shell-agent`: run `corepack pnpm --filter @research-os/web lint` when code changes are non-trivial and check the affected shell route or layout
- `researcher-workspace-agent`: run the relevant web lint or typecheck command and verify the affected private workspace route
- `document-workflow-agent`: run the relevant web lint or typecheck command and verify the documents route plus any evidence-linking behavior touched
- `lab-collaboration-agent`: verify auth entry, affected lab or public route, and whether mock collaboration still behaves as expected
- `platform-contracts-agent`: run the relevant lint or typecheck command and confirm any changed API, preview access, env, or schema assumptions

When a task changes auth, collaboration, preview access, or realtime assumptions, the handoff must state whether it preserves mock mode, adds Supabase support, or changes both.

## Escalate instead of editing

Stop and ask for direction when the task would:

- change framework or infrastructure direction beyond `docs/02-architecture.md`
- expand mobile beyond lookup, upload, alerts, and lightweight edits
- change personal, lab, or public privacy boundaries without documented product intent
- introduce external integrations such as IRIS before legal and technical validation
- require overlapping edits in serialized hot files without a single owner
- bundle multiple product workflows into one vague assignment

## Good sub-agent tasks

- build one route or workspace slice end to end
- refactor one collaboration flow with a clear ownership boundary
- update one shared contract and then unblock dependent feature work
- review one feature for security or edge cases
- improve one contributor or product document with explicit source docs

## Bad sub-agent tasks

- "build the whole platform perfectly"
- editing shell, contracts, and multiple feature slices in one worker
- changing stack decisions without updating the architecture docs
- adding external integrations before access and policy validation
- hiding data-mode assumptions when touching auth or preview flows
