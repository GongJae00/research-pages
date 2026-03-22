# Continuous Improvement Loop

## Purpose

This file explains how to keep ResearchPages improving continuously without drifting into random churn.

The rule is simple: run one improvement lane at a time, keep each lane tied to a real workflow, and stop when the work crosses architecture, privacy, or contract boundaries that need human review.

## Operating principles

- keep one lane per run
- prefer thin vertical slices over broad rewrites
- preserve the web-first direction for document-heavy workflows
- keep mobile work lightweight until the data model is stable
- do not hide contract or privacy-boundary changes inside routine cleanup
- update docs when contributor workflow, rollout steps, or product direction changes

## Improvement lanes

### 1. Surface QA lane

Goal:

- catch visible regressions in marketing, public pages, workspace shell, and responsive layout

Recommended roster:

- `web-shell-agent`
- `lab-collaboration-agent`
- `docs-scope-agent` only if guidance or release notes change

Useful skills:

- `$screenshot`
- `$figma`
- `$figma-implement-design`

Typical output:

- prioritized UI defects
- low-risk shell or public-page fixes
- follow-up notes for larger design changes

Suggested cadence:

- twice per week during active UI work

### 2. Workflow polish lane

Goal:

- improve one real researcher workflow such as profile editing, funding history, timetable, or document intake

Recommended roster:

- one feature owner from `researcher-workspace-agent` or `document-workflow-agent`
- `platform-contracts-agent` only if contracts truly need to move
- `docs-scope-agent` only if operator guidance changes

Useful skills:

- `$screenshot`
- `$doc`
- `$pdf`
- `$slides`
- `$spreadsheet`

Typical output:

- one improved private workflow
- tighter validation or clearer UI copy
- explicit note on whether the work stays in mock mode or moves toward Supabase

Suggested cadence:

- once per week

### 3. Collaboration and reliability lane

Goal:

- keep auth, preview access, public or private boundaries, CI, and deployment plumbing healthy

Recommended roster:

- `lab-collaboration-agent`
- `platform-contracts-agent`
- `docs-scope-agent` when rollout instructions or contributor docs change

Useful skills:

- `$gh-fix-ci`
- `$gh-address-comments`
- `$linear`

Typical output:

- bug fixes
- CI or deployment recovery
- permission boundary notes
- follow-up backlog for larger reliability work

Suggested cadence:

- weekly, plus after important PR or deployment breakage

### 4. Docs drift lane

Goal:

- keep README, AGENTS, playbooks, and roadmap notes aligned with the actual repo

Recommended roster:

- `docs-scope-agent`
- `platform-contracts-agent` only when implementation state must be verified

Useful skills:

- `$notion-spec-to-implementation`
- `$notion-research-documentation`
- `$linear`

Typical output:

- doc updates
- clearer contributor onboarding
- notes on roadmap or architecture drift

Suggested cadence:

- once per week

## How to automate these lanes

If you want recurring runs, create one automation per lane instead of one giant automation for everything.

Good automation rules:

- use one clear lane name
- keep one workflow or quality theme per automation
- point the automation at the repo root only
- require prioritized findings before broad edits
- allow low-risk fixes only when they stay inside one owned path group
- stop and escalate when architecture, shared contracts, or privacy boundaries change

## Recommended recurring runs

### Preview QA run

Use when you have an active local preview or deployed preview URL.

Prompt shape:

```text
Review the current shell and public surfaces for visible issues.
Use the surface QA lane from docs/12-continuous-improvement-loop.md.
Prioritize findings, then fix only clearly bounded low-risk issues.
Stop if the work crosses architecture, privacy, or shared-contract boundaries.
```

### Workflow polish run

Use when you want steady product progress without opening a huge feature branch.

Prompt shape:

```text
Run one workflow polish lane for a single researcher workflow.
Pick the smallest effective roster, state the data mode, and improve one thin vertical slice only.
Return findings first, then bounded fixes.
```

### Reliability sweep

Use when preview access, auth, environment handling, or CI feels unstable.

Prompt shape:

```text
Run one collaboration and reliability lane.
Focus on auth, preview access, CI fallout, or deployment-facing runtime issues.
Keep shared-contract work serialized and report any required follow-up.
```

### Docs drift sweep

Use when the codebase has moved and the docs may no longer match.

Prompt shape:

```text
Run one docs drift lane.
Compare README, AGENTS, the agent playbook, and current repo state.
Update only the docs needed to remove drift and report any larger roadmap or architecture mismatches.
```

## What you should do as the operator

Use this loop:

1. choose one lane
2. choose one workflow inside that lane
3. tell Codex the data mode and constraints
4. ask for findings first if the lane is exploratory
5. let Codex apply only bounded fixes
6. review the handoff summary before accepting broad follow-up work

If you keep the team on this cadence, the page improves continuously across UI, workflow quality, reliability, and documentation without turning into undirected busywork.
