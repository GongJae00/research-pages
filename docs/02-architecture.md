# Architecture

## Recommended architecture

### Frontend

- `apps/web`: Next.js app for the full researcher dashboard
- `apps/mobile`: Expo React Native app for quick access and lightweight management

### Shared packages

- `packages/types`: domain models, validation schemas, API contracts
- `packages/ui`: design tokens and reusable UI primitives
- `packages/config`: shared TypeScript, lint, and formatting presets

### Backend

- Supabase Auth for account management
- Supabase Postgres for structured researcher data
- Supabase Storage for documents, templates, and uploads
- Row Level Security for per-user and per-lab access control

## Why web-first

The hardest workflows here are:

- form-heavy admin data entry
- document comparison and reuse
- file library management
- timeline and structured profile editing

Those are better on the web first. Mobile should support fast lookup, upload, and notification-oriented tasks before it becomes a full editing environment.

## Initial domain modules

1. Profile
   - name variants
   - contact
   - national researcher identifiers
   - education and affiliation summary
2. Affiliation timeline
   - institution
   - role
   - start and end dates
   - active status
3. Funding and compensation
   - source type
   - project
   - scholarship
   - notes and restrictions
4. Document bank
   - research plans
   - scholarship answers
   - self-introduction answers
   - statements and bios
5. Output archive
   - papers
   - presentations
   - portfolios
6. Template library
   - PPT templates
   - institutional forms
7. Timetable
   - semester
   - course
   - day and time
8. Workspace
   - personal space
   - lab space

## Security baseline

- Every record belongs to a scoped owner: user or lab.
- Every file is private by default.
- Access should be mediated through signed URLs or controlled backend endpoints.
- Sensitive profile data should be separated from public profile data.
- Auditability should be designed in early for shared lab workspaces.

## Integration stance

IRIS and similar external systems are important, but must be treated as later integrations.

Before implementing them, verify:

- official APIs or supported integration paths
- terms of service
- data handling obligations
- whether automation is legally and technically allowed

## Why not start with desktop packaging

Desktop packaging is not the hardest problem here. Data model, access control, document workflows, and UI clarity are harder. If the web app is excellent and mobile is useful, desktop packaging can be added later with much lower risk.
