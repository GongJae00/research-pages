# Realtime Collaboration Foundation

## Why this document exists

ResearchPages now has multi-member lab UX in the web app, but the actual data layer is still browser-local.

That means the current app cannot yet provide:

- teammate-to-teammate realtime updates across devices
- server-enforced access control
- durable shared files and shared activity history
- auditable shared edits

This document defines the first backend foundation needed to move from validated mock UX to real collaboration.

## Current product gap

The web app currently stores:

- accounts and sessions in browser storage
- lab membership and invites in browser storage
- document metadata in browser storage
- file blobs in IndexedDB

This is acceptable for UX validation, but it is not acceptable for a real shared lab workspace.

## Decision

Keep the current UI, but introduce a backend boundary now:

1. page components talk to a collaboration repository instead of raw local storage
2. Supabase browser/server clients are added to the web app
3. a first SQL schema is checked into the repo
4. the production target remains `Supabase Auth + Postgres + Storage + RLS + Realtime`

## First backend slice

The first production slice should cover:

- account sign-in and session lookup
- lab creation
- lab membership
- explicit invites
- shared edit locks
- shared document/paper/schedule membership tables
- audit log of lab changes

Do not start with AI helpers or rich collaborative editing before this slice is stable.

## Security assumptions

- personal data is private by default
- lab access is membership-based
- file delivery uses signed URLs
- every shared mutation is attributable to an authenticated actor
- RLS is the main enforcement layer, not client-side filtering

## Rollout order

### Slice 1

- wire auth/session from Supabase Auth
- move lab, member, invite, and lock data to Postgres
- keep documents and timetable metadata local if needed during migration

### Slice 2

- move document metadata and file storage to Postgres + Storage
- add signed file delivery
- add shared activity log

### Slice 3

- add Supabase Realtime subscriptions for lab membership, locks, and shared resources
- remove local browser source of truth

## Immediate next steps

- replace the mock auth repository with a Supabase-backed repository
- add route-safe server helpers for reading the signed-in account
- move profile, document, and timetable ownership from browser scope to database scope
- add RLS tests before enabling shared deployment
