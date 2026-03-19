# Lab Information Architecture

## Why this change exists

The lab workspace should not feel like one long admin form.

ResearchPages needs a clearer split between:

- personal workspace owned by one researcher
- one or more lab workspaces the researcher belongs to
- structured lab sections that can later become a public lab site

## Navigation decision

The web sidebar should be split into two zones:

1. Personal space
   - dashboard
   - profile
   - funding
   - documents
   - timetable
2. Labs
   - lab hub
   - joined labs listed by name

This mirrors the intended product model:

- personal data stays private by default
- labs are explicit shared scopes
- users can move between multiple labs without losing the personal/private mental model

## Lab workspace decision

Each lab should open as a structured hub rather than a flat settings page.

The first hub sections are:

- People
  - Professor
  - Members
  - Alumni
- Research
- Papers
- Documents
- Timetable

For the public-facing lab page, the lead reading order should be:

1. People
   - professor first
   - then current members
   - then alumni
2. Research
   - ongoing work at the top
   - completed work below
   - include start date, end date, and the related project or funding/program source
3. Publications / Papers

These are not just UI tabs. They are the first information architecture for:

- future lab website generation
- agent workflows that assemble a lab site from structured records
- later collaboration features such as shared schedules and lab-level document reuse

## Data stance for now

This slice still runs on the local mock-auth model.

That means:

- lab sections can be structured now even if some panels still use mock or partial data
- document and paper sharing stay connected to the existing local account-scoped stores
- timetable sharing can be staged as a structured empty state before the real shared schedule flow is wired

## Near-term implication

The UI should prefer:

- shorter, sectioned panels
- visible lab identity and navigation at the top
- clearer separation between personal records and lab-shared assets
- reuse of existing shared document and paper flows instead of inventing parallel placeholders
