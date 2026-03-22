# AGENTS.md

## Project purpose

ResearchOS is a cross-platform platform for graduate students, professors, and labs. It manages structured researcher information, document history, funding context, templates, schedules, and lab collaboration.

## Working rules for agents

- Read `docs/00-product-vision.md` before changing scope.
- Read `docs/02-architecture.md` before introducing framework or infrastructure changes.
- Prefer web-first decisions for complex document workflows.
- Keep the mobile app focused on lookup, upload, alerts, and lightweight edits until the core data model is stable.
- Preserve Linux portability. Avoid Windows-only tooling, hard-coded backslashes in source code, and machine-specific assumptions.
- Keep secrets out of git. Use `.env.local`, `.env`, or deployment secret stores only.
- Treat IRIS or other external government/institution integrations as separate research tasks requiring legal and technical validation.
- Do not add AI-generated features by default. Only add them if they directly reduce document assembly or admin overhead.

## Repo conventions

- Use a monorepo layout under `apps/` and `packages/`.
- Put product decisions in `docs/` before large code changes.
- Shared domain types belong in `packages/types`.
- Shared design tokens and reusable primitives belong in `packages/ui`.
- Prefer `pnpm` through Corepack for consistency across Windows and Linux.

## Quality bar

- Build thin vertical slices instead of wide placeholder systems.
- Security-sensitive flows need explicit access rules and threat assumptions.
- Every new feature should map to a real researcher workflow, not a generic productivity idea.

## Sub-agent operating rules

- Read `docs/04-agent-playbook.md` before spawning implementation sub-agents.
- For human-operated launches, use `docs/09-subagent-quickstart.md`, `docs/10-subagent-prompt-templates.md`, `docs/11-agent-capability-matrix.md`, and `docs/12-continuous-improvement-loop.md`.
- Keep one clear owner per file tree. Do not assign the same file or hotspot to multiple workers in parallel.
- Treat `README.md`, `apps/web/src/app/globals.css`, `apps/web/src/components/locale-frame.tsx`, `apps/web/src/components/auth-provider.tsx`, `apps/web/src/lib/dashboard-snapshot.ts`, `packages/types/src/index.ts`, and `supabase/schema.sql` as serialized hot files.
- If a task changes shared contracts in `packages/types` or `supabase/schema.sql`, land that contract work first and branch feature work from the updated contract.
- Every sub-agent brief must state the user workflow, owned paths, non-goals, data mode (`mock` or `supabase`), validation target, and stop conditions.
- Every sub-agent handoff must report changed files, commands run, docs consulted, overlap risks, and unresolved assumptions.
- Use optional skills only when the task actually matches them. Skills are specialist overlays, not a substitute for correct role ownership.

## Default sub-agent roster

- `docs-scope-agent`: owns `README.md` and `docs/**`; handles product wording, contributor guidance, rollout notes, and architecture or roadmap documentation.
- `web-shell-agent`: owns route shells, navigation, locale framing, marketing home composition, and global styling under `apps/web/src/app/**`, `apps/web/src/components/{header,sidebar,language-switcher,locale-frame,preview-mode-banner}.tsx`, and `apps/web/src/app/globals.css`.
- `researcher-workspace-agent`: owns the private profile, affiliations, funding, and timetable slices under `apps/web/src/app/[locale]/{profile,affiliations,funding,timetable}` plus the matching workspace components and stores.
- `document-workflow-agent`: owns the document bank route, document workspace components, document stores, taxonomy, evidence linking, and related file-handling flows.
- `lab-collaboration-agent`: owns lab workspace flows, public researcher or lab pages, collaboration repositories, activity logs, publications, and shared auth-facing collaboration behavior.
- `platform-contracts-agent`: owns `packages/types`, `supabase/schema.sql`, `apps/web/src/lib/supabase/**`, `apps/web/src/app/api/**`, preview access plumbing, runtime config, and deployment-facing environment handling.

## Escalate instead of editing

- framework or architecture direction changes
- personal, lab, or public data boundary changes that are not already documented
- mobile scope expansion beyond lookup, upload, alerts, and lightweight edits
- external integrations such as IRIS or institution systems
- any task that requires overlapping edits in serialized hot files without a single designated owner
