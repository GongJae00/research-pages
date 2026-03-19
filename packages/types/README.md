# Types Package

This package holds shared domain schemas for:

- profile
- affiliations
- funding
- documents
- timetable
- lab workspace

Current implementation:

- Zod-backed schemas for profile, affiliation timeline, funding, documents, and timetable
- shared validation primitives for ownership, dates, times, and currency codes
- exported TypeScript types inferred from the schemas

Prefer schema-first modeling so web, mobile, and backend stay aligned.
