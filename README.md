# ResearchPages

ResearchPages is a web-first platform for graduate students, professors, and labs.

The goal is not a generic note app. The product focuses on structured researcher administration and reusable knowledge:

- profile and affiliation timeline
- funding, scholarship, and project history
- research plan and application document bank
- paper, presentation template, and portfolio archive
- lab collaboration and public publishing surfaces

This repository uses a portable pnpm monorepo so the same workspace can move cleanly across Linux and Windows environments.

## Current workspace map

- `apps/web`: active Next.js product surface for marketing, authenticated workspaces, and public profile or lab pages
- `apps/mobile`: placeholder package for the future Expo companion app
- `packages/types`: shared Zod-backed domain schemas and inferred TypeScript types
- `packages/ui`: reserved for shared design tokens and reusable primitives
- `packages/config`: reserved for shared lint, TypeScript, and tooling presets

## Implemented today

- locale-aware Next.js web app with marketing, authenticated workspace, and public publishing routes
- profile, affiliations, funding, documents, timetable, and lab workspace screens
- mock-auth collaboration flow stored in browser storage for UX validation
- demo preview and access-gated internal review flow for deployed previews
- shared schema package and Supabase-oriented runtime boundaries for later production wiring

## Recommended reading order

1. `AGENTS.md`
2. `docs/00-product-vision.md`
3. `docs/02-architecture.md`
4. `docs/03-roadmap.md`
5. `docs/04-agent-playbook.md`
6. `docs/09-subagent-quickstart.md`
7. `docs/10-subagent-prompt-templates.md`
8. `docs/11-agent-capability-matrix.md`
9. `docs/12-continuous-improvement-loop.md`
10. `docs/05-auth-collaboration-slice.md`
11. `docs/08-repo-exploration.md`
12. `docs/08-internal-preview.md`

## Development commands

- `corepack pnpm dev:web`
- `corepack pnpm dev:mobile`
- `corepack pnpm build`
- `corepack pnpm lint`
- `corepack pnpm typecheck`

## Security stance

Perfect security does not exist. The correct approach is security-first architecture from day one:

- private-by-default data model
- row-level access control
- signed file access
- audit-friendly activity history
- secrets kept out of the repo
- legal review before any external system integration such as IRIS

## Current product direction

- The web app remains the primary surface for heavy document and admin workflows.
- Mobile stays focused on lookup, upload, alerts, and lightweight edits until the core data model is stable.
- Mock auth and browser storage are deliberate validation steps, not the intended production architecture.
- Public researcher and lab pages should be derived from structured private data, not managed as separate copy-paste surfaces.

## Contributor note

Read `docs/04-agent-playbook.md` for the ownership model, `docs/09-subagent-quickstart.md` for the operator workflow, `docs/10-subagent-prompt-templates.md` for copy-paste launch prompts, `docs/11-agent-capability-matrix.md` for skill routing, and `docs/12-continuous-improvement-loop.md` for recurring improvement runs. Together they define the roster, serialized hot files, handoff rules, specialist overlays, and repeatable quality loops for parallel sub-agent work.
