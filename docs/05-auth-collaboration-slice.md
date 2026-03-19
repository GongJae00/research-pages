# Auth And Collaboration Slice

## Why this slice exists

ResearchPages cannot stay as a purely single-user demo.

The next validated product slice is:

1. personal data is private by default
2. users sign in to open their own workspace
3. labs can be created as shared workspaces
4. members join labs through invitation
5. shared profile and document permissions are explicit

## Current implementation stance

This repository now uses a local mock implementation in the web app to validate the product flow before Supabase is wired in.

That means:

- auth is local-browser only for now
- sessions are stored in browser storage
- personal document/profile/timetable state is scoped by account
- lab creation, invites, and member permissions are also stored locally

This is intentionally temporary. The purpose is to prove the UX and domain model.

## Target production mapping

Later this should map to:

- Supabase Auth for accounts
- Supabase Postgres for labs, memberships, invites, and locks
- Supabase Storage for personal and lab files
- Row Level Security for personal-only and lab-shared records

## Access model

### Personal scope

- every personal document is visible only to the signed-in owner
- personal profile, timetable, and related-document links are owner-scoped

### Lab scope

- a lab has members and invites
- permission levels are `owner`, `admin`, `member`
- profile/document/member management permissions can be granted separately
- edit locks are tracked as lightweight collaborative signals

## Invitation model

Invites are matched by:

- main email
- national researcher number

This mirrors the intended onboarding logic for research institutions and labs.

## What is still missing

- real password security and password reset
- server-side session validation
- server-enforced RLS
- signed file delivery
- audit log for shared changes
- real-time lock updates
- shared lab document editor flows

## Decision

Keep the web app in a validated mock-auth state until:

1. personal/private scope feels correct
2. lab creation and invitation UX feels correct
3. permission surfaces are understandable

After that, replace the local store with Supabase without changing the top-level workflow.
