# Roadmap

## Phase 0: Foundation

Goal: define the product and establish a portable repository.

Deliverables:

- project structure
- architecture decision
- initial product scope
- development workflow that works on Windows and Linux

## Phase 1: Personal Researcher Core

Goal: ship something one researcher can use alone every day.

Scope:

- account and sign-in
- profile vault
- affiliation timeline
- funding and scholarship timeline
- timetable manager
- document bank with tags and search

Success condition:

The user can stop relying on scattered folders and notes for core personal research administration.

## Phase 2: Reusable Writing System

Goal: reduce repeated writing work.

Scope:

- answer bank for scholarship and self-introduction questions
- reusable research statement blocks
- template-driven document assembly
- paper and presentation metadata archive

Success condition:

The user can compose new applications from structured past content instead of searching old files manually.

## Phase 3: Lab Workspace

Goal: move from single-user to shared research team value.

Scope:

- lab workspace
- shared templates
- shared profile assets
- permissions by role
- activity history

Success condition:

A lab can manage shared resources without mixing them into personal storage or unsecured folders.

## Phase 4: Public Publishing Layer

Goal: turn private structured data into public-facing outputs safely.

Scope:

- professor profile site
- lab website blocks
- publication list export
- CV and portfolio export

Success condition:

A researcher or lab can publish a clean profile site without re-entering the same information.

## Immediate next implementation plan

1. Scaffold Next.js in `apps/web`
2. Scaffold Expo in `apps/mobile`
3. Define the first database schema in `packages/types`
4. Implement Phase 1 screens:
   - dashboard
   - profile
   - affiliations
   - funding
   - documents
   - timetable
