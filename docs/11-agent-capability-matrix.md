# Agent Capability Matrix

## Purpose

This file maps each sub-agent role to the skills, core functions, and verification habits that make the team effective in this repository.

Role ownership still comes from `docs/04-agent-playbook.md`. Skills are optional specialist overlays. Use them only when the task actually matches.

## Core function stack

These are the default functions that power the team:

- `shell_command`: inspect the repo, run targeted checks, inspect git state, and execute validation commands
- `apply_patch`: make manual file edits safely and explicitly
- `multi_tool_use.parallel`: parallelize read-only inspection work such as file reads, diffs, and git checks
- `spawn_agent`: delegate bounded sidecar work with a disjoint scope
- `wait_agent`: use only when blocked on a delegated result
- `update_plan`: keep larger tasks structured when multiple stages or lanes exist

## Skill routing rule

Choose the owner role first. Attach skills second.

Examples:

- use `web-shell-agent` plus `$figma-implement-design` for a shell or landing-page fidelity task
- use `document-workflow-agent` plus `$pdf` for PDF-related intake or preview work
- use `platform-contracts-agent` plus `$gh-fix-ci` for CI or deployment breakage

Do not choose a role based only on the skill name.

## Role matrix

### `docs-scope-agent`

Mission:

- contributor docs
- product wording
- rollout and operating guidance

High-value skills:

- `$notion-spec-to-implementation` when a feature spec lives in Notion
- `$notion-research-documentation` when synthesizing documentation from multiple sources
- `$linear` when the work must update or reflect ticket state
- `$gh-address-comments` when documentation must respond to PR review feedback

Primary functions:

- `shell_command`
- `apply_patch`
- `multi_tool_use.parallel`

Must-check before handoff:

- wording aligns with `docs/00-product-vision.md`, `docs/02-architecture.md`, and `docs/03-roadmap.md`
- onboarding or launch instructions reflect the current repo state
- docs touched are listed explicitly

### `web-shell-agent`

Mission:

- route shell
- navigation
- locale framing
- global styling
- marketing and public shell composition

High-value skills:

- `$figma`
- `$figma-implement-design`
- `$screenshot`
- `$gh-address-comments` when UI review comments are the main input

Primary functions:

- `shell_command`
- `apply_patch`
- `multi_tool_use.parallel`
- `view_image` when the user provides local mockups or screenshots

Must-check before handoff:

- affected route shell or layout renders coherently
- `locale-frame.tsx` and `globals.css` were not edited in parallel by another role
- responsive or visual regressions are called out if not fully checked

### `researcher-workspace-agent`

Mission:

- private profile, affiliations, funding, and timetable workflows

High-value skills:

- `$figma-implement-design` for UI-fidelity tasks
- `$screenshot` for workspace review or visual QA
- `$spreadsheet` when the task involves tabular import, export, or bulk data reasoning
- `$linear` when the work is ticket-driven

Primary functions:

- `shell_command`
- `apply_patch`
- `multi_tool_use.parallel`
- `spawn_agent` for read-only sidecar exploration in related stores or routes

Must-check before handoff:

- affected private route was reviewed
- mock-auth assumptions are stated
- profile or funding changes that affect public views are called out

### `document-workflow-agent`

Mission:

- document bank
- intake flow
- taxonomy
- evidence linking
- file-oriented workflow UX

High-value skills:

- `$doc`
- `$pdf`
- `$slides`
- `$spreadsheet`
- `$figma-implement-design`
- `$screenshot`

Primary functions:

- `shell_command`
- `apply_patch`
- `multi_tool_use.parallel`
- `spawn_agent` for sidecar analysis on document stores or evidence paths

Must-check before handoff:

- documents route or relevant intake flow was checked
- file-format assumptions are explicit
- links to profile, funding, or lab scope are called out when touched

### `lab-collaboration-agent`

Mission:

- lab workspace
- collaboration flows
- permissions
- activity logs
- public researcher and lab surfaces

High-value skills:

- `$figma`
- `$figma-implement-design`
- `$screenshot`
- `$gh-address-comments`
- `$gh-fix-ci`
- `$linear`

Primary functions:

- `shell_command`
- `apply_patch`
- `multi_tool_use.parallel`
- `spawn_agent` for read-only exploration across public and private boundaries

Must-check before handoff:

- auth entry and affected lab or public route were reviewed
- public versus private data assumptions are explicit
- `auth-provider.tsx` was not changed in parallel by another role

### `platform-contracts-agent`

Mission:

- shared contracts
- Supabase wiring
- env handling
- API routes
- preview access and deployment-facing plumbing

High-value skills:

- `$gh-fix-ci`
- `$gh-address-comments`
- `$linear`
- `$openai-docs` only when the task explicitly involves OpenAI products or APIs

Primary functions:

- `shell_command`
- `apply_patch`
- `multi_tool_use.parallel`
- `spawn_agent` for bounded schema or runtime exploration
- `update_plan` when staging contract-first work

Must-check before handoff:

- contract deltas are stated explicitly
- dependent files or routes are listed
- env, API, preview, or schema changes include validation notes
- `packages/types/src/index.ts` and `supabase/schema.sql` stayed single-writer

## Specialist overlays

Use these overlays across roles when relevant:

- design overlay: `$figma`, `$figma-implement-design`, `$screenshot`
- document-format overlay: `$doc`, `$pdf`, `$slides`, `$spreadsheet`
- delivery overlay: `$gh-address-comments`, `$gh-fix-ci`, `$linear`
- planning overlay: `$notion-spec-to-implementation`, `$notion-research-documentation`
- OpenAI overlay: `$openai-docs`, `$chatgpt-apps`

The OpenAI overlay is off by default in this repository. Use it only when the user explicitly wants OpenAI product work and the task still meets the product rules in `AGENTS.md`.

## Practical pairing patterns

- `web-shell-agent` + design overlay for landing page or shell polish
- `document-workflow-agent` + document-format overlay for file ingestion or preview tasks
- `lab-collaboration-agent` + delivery overlay for PR feedback, CI fallout, or release hardening
- `docs-scope-agent` + planning overlay for roadmap or contributor workflow updates
- `platform-contracts-agent` + delivery overlay for CI, env, schema, or preview reliability work
