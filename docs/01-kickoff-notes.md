# Kickoff Notes

## User context captured on 2026-03-08

The user wants to build a deployable platform used on both mobile and computer, starting with personal use and then improving the UI to production quality.

## Main pain points

- A graduate student has both student and worker characteristics.
- Affiliation history is complicated: school, company, project, funding source, scholarship, payroll, and administrative constraints all interact.
- Existing tools like generic documents or Notion are too free-form, so the information becomes hard to manage consistently.
- Research plans, scholarship forms, self-introduction letters, and institutional applications reuse the same underlying information, but are constantly rewritten from scratch.
- Paper records, personal information, national researcher identifiers, and institution-specific assets are scattered.
- PPT templates by school, company, or project should be easy to store and find.
- Timetables need semester-based upload, editing, and retrieval.
- Later, the same structured information should support a professor profile website or a lab website.
- Shared lab-level resource storage is important.
- Mobile access is required for quick checking and management.
- Security matters because the stored information is personal, professional, and often sensitive.

## Product interpretation

This is not a note-taking app.

It is a domain-specific operating layer for researcher life:

- structured personal data
- reusable document ingredients
- institutional asset management
- lab-level knowledge and template storage
- future public publishing from private structured data

## Working assumptions

- The first version should be web-first with mobile support.
- The user is new to app building, so the repository must stay understandable.
- The machine is not strong, so early setup should avoid heavy and unnecessary local infrastructure.
- The project should migrate smoothly to a Linux development machine later.

## Working project name

`ResearchPages`

This is the current public product name. The older internal codename was `ResearchOS`.
