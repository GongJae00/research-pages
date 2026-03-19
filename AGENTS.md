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
