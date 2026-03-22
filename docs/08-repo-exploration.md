# Repo Exploration

## Purpose

This note is a contributor-oriented tour of the current repository state. It summarizes what is already implemented, where the active code lives, and which parts are still scaffolds.

## Monorepo layout

### Applications

- `apps/web`: the active product surface today
- `apps/mobile`: placeholder package for the future Expo companion app

### Shared packages

- `packages/types`: shared Zod-backed domain schemas used by the web app
- `packages/ui`: reserved for shared tokens and primitives
- `packages/config`: reserved for shared tooling presets

## Web app structure

### Route model

The Next.js app uses locale-prefixed routes. Current route groups include:

- marketing home at `/{locale}`
- authenticated workspace routes for profile, affiliations, funding, documents, timetable, and lab
- public researcher and public lab routes under locale prefixes

### Layout split

`LocaleFrame` is the main route shell decision point.

- home and public pages render with the marketing header
- workspace pages render inside `AuthProvider` and `WorkspaceAuthGate` with the app sidebar and header

This means the repository already has a clear split between public publishing surfaces and authenticated internal operations screens.

## Data and auth model today

### Domain data

The web app already renders realistic seed data through `dashboardSnapshot`, which includes:

- profile identity and links
- affiliation timeline
- funding entries
- reusable documents
- timetable entries
- lab workspace content

### Authentication mode

The current default validation mode is mock auth in browser storage. Demo accounts and passwords are seeded locally unless the app is switched to Supabase mode.

This is useful because it keeps the product slice testable while the team validates private-by-default personal scope and invitation-based lab collaboration.

## Important current docs

- `docs/00-product-vision.md`: product promise and non-goals
- `docs/02-architecture.md`: web-first and Supabase-based architecture direction
- `docs/03-roadmap.md`: phase-by-phase implementation plan
- `docs/05-auth-collaboration-slice.md`: why mock auth exists and how it maps to production
- `docs/06-lab-information-architecture.md`: lab-facing information model
- `docs/07-realtime-collaboration-foundation.md`: realtime collaboration direction

## Practical repo takeaways

1. The web app is the real implementation surface right now.
2. The mobile app is intentionally not feature-complete yet.
3. `packages/types` is the most mature shared package.
4. `packages/ui` and `packages/config` are still placeholders.
5. Product exploration should usually start from the web routes, auth gate, and shared schemas.

## Suggested exploration order for future contributors

1. Read `docs/00-product-vision.md` and `docs/02-architecture.md`.
2. Open `apps/web/src/components/locale-frame.tsx` to understand public vs authenticated shells.
3. Inspect `apps/web/src/lib/dashboard-snapshot.ts` for the current seeded product story.
4. Inspect `apps/web/src/lib/mock-auth-store.ts` for the temporary auth and collaboration model.
5. Review `packages/types/src/` to understand the domain contracts that should remain shared across web, mobile, and backend work.
