# ResearchPages

ResearchPages is a cross-platform workspace for graduate students, professors, and labs.

The goal is not a generic note app. The product is a structured operating system for researcher administration and knowledge:

- profile and affiliation timeline
- funding, payroll, scholarship, and project history
- research plan and application document bank
- paper, PPT template, and portfolio archive
- lab-level collaboration and future public profile sites

This repository is intentionally starting with a light monorepo skeleton so it can move cleanly from this Windows machine to a Linux machine later.

## Chosen direction

- `apps/web`: main workstation app for heavy document and admin workflows
- `apps/mobile`: companion app for quick lookup, upload, and review on phone
- `packages/types`: shared schema and contract definitions
- `packages/ui`: shared design tokens and reusable UI primitives
- `packages/config`: shared lint and TypeScript configuration

## Recommended stack

- frontend web: Next.js + TypeScript
- mobile: Expo React Native + TypeScript
- backend: Supabase (Postgres, Auth, Storage, RLS)
- docs/editor: Tiptap or block editor later, after domain model is stable
- search: Postgres full-text first, vector search only if it proves useful

## Why this stack

- Web is the main experience for document-heavy workflows.
- Mobile can focus on lookup, capture, and lightweight management.
- TypeScript monorepo keeps agents and humans aligned in one codebase.
- Supabase gives a strong default for auth, storage, and row-level security without forcing early DevOps overhead.
- The structure is portable to Linux and does not depend on Windows-only tooling.
- The workspace stays intentionally lean until the core product model is proven.

## Security stance

Perfect security does not exist. The correct approach is security-first architecture from day one:

- private-by-default data model
- row-level access control
- signed file access
- audit-friendly activity history
- secrets kept out of the repo
- legal review before any external system integration such as IRIS

## Current status

This first pass creates the project structure and product documents. It does not install heavy app dependencies yet.

Read these first:

- `docs/00-product-vision.md`
- `docs/01-kickoff-notes.md`
- `docs/02-architecture.md`
- `docs/03-roadmap.md`

## Immediate next build step

In the next session, scaffold:

1. a Next.js web app in `apps/web`
2. an Expo app in `apps/mobile`
3. shared domain schemas in `packages/types`
4. Supabase project configuration and first database tables
