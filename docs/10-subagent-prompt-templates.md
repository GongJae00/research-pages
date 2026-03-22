# Sub-agent Prompt Templates

## Purpose

These are copy-paste prompts for the human operator. Send them to the parent Codex agent and replace the bracketed text.

Keep the role names aligned with `docs/04-agent-playbook.md`.

## 1. Read-only exploration first

Use this when you are not sure which files or roles are involved.

```text
Use a read-only exploration pass before editing anything.

Goal: [what I want changed]
Workflow: [one user workflow]
Constraints: [business or product constraints]
Data mode: [mock / supabase / both]

I want back:
- recommended sub-agent roster
- owned path split
- serialized hot files to avoid
- risks or overlap points

Do not edit files until the exploration summary is done.
```

## 2. One feature agent only

Use this when the task clearly fits one owned path group.

```text
Use one sub-agent only for this task.

Role: [researcher-workspace-agent / document-workflow-agent / lab-collaboration-agent / web-shell-agent / docs-scope-agent / platform-contracts-agent]
Goal: [what I want changed]
Workflow: [one workflow]
Owned paths: [path group or "use the role default"]
Non-goals: [what must not change]
Data mode: [mock / supabase / both]
Shared contract policy: do not change shared contracts unless you stop and ask first
Checks to run: [lint / typecheck / route review / docs cross-check]

Return:
- changed files
- commands run
- routes or screens checked
- files intentionally not touched
- unresolved assumptions
```

## 3. Contract first, feature second

Use this when `packages/types`, `supabase/schema.sql`, API routes, preview access, or env wiring may change.

```text
Split this into two stages.

Stage 1 role: platform-contracts-agent
Stage 1 goal: define or update the shared contract for [feature]

Stage 2 role: [researcher-workspace-agent / document-workflow-agent / lab-collaboration-agent / web-shell-agent]
Stage 2 goal: implement the feature after the shared contract is clear

Workflow: [one workflow]
Data mode: [mock / supabase / both]
Serialized hot files: packages/types/src/index.ts, supabase/schema.sql, [add others if relevant]
Non-goals: [what must stay unchanged]

Requirements:
- do not start Stage 2 until Stage 1 is stable
- report the contract delta explicitly
- report which downstream files depend on that contract delta
```

## 4. Shell plus feature split

Use this when layout or route shell work must be kept separate from feature logic.

```text
Use two sub-agents with a strict boundary.

Role 1: web-shell-agent
Role 1 goal: handle shell, layout, route framing, or global styling only

Role 2: [researcher-workspace-agent / document-workflow-agent / lab-collaboration-agent]
Role 2 goal: handle the feature logic and owned feature files only

Workflow: [one workflow]
Data mode: [mock / supabase / both]
Serialized hot files: apps/web/src/app/globals.css, apps/web/src/components/locale-frame.tsx, [add others if relevant]
Non-goals: [what must not change]

Return from each role:
- changed files
- commands run
- routes checked
- overlap risks
```

## 5. Docs plus implementation

Use this when the task must update contributor docs or rollout notes together with code.

```text
Use two sub-agents for code plus docs.

Role 1: [feature role]
Role 1 goal: implement [feature]

Role 2: docs-scope-agent
Role 2 goal: update README or docs only if the implementation changes onboarding, rollout, or operating guidance

Workflow: [one workflow]
Data mode: [mock / supabase / both]
Non-goals: do not let the docs agent edit app code, and do not let the feature agent silently rewrite docs

Return:
- implementation diff summary
- docs that changed
- docs that were reviewed but intentionally left unchanged
```

## 6. Conflict recovery

Use this after a partial apply conflict.

```text
An apply conflict happened. Recover it with one designated owner per conflicting file.

Goal: merge the conflicting sub-agent work safely
Conflicting files: [list files]
Cleanly applied files: [list files]
Data mode: [mock / supabase / both]

Requirements:
- identify the correct owner role for each conflicting file
- merge the conflict through the parent task instead of reapplying overlapping edits blindly
- tell me whether downstream sub-agent work must be re-run
- do not expand scope while resolving the conflict
```

## 7. Operator summary only

Use this when you want Codex to choose the roster and explain the plan before any edits.

```text
Plan the sub-agent setup for this task before editing.

Goal: [what I want changed]
Workflow: [one workflow]
Constraints: [important boundaries]
Data mode: [mock / supabase / both]

I want:
- recommended roles
- launch order
- serialized hot files
- verification plan
- a short note on what I should watch for before applying changes

Do not edit yet.
```

## 8. Continuous improvement sweep

Use this when you want Codex to run one recurring improvement lane manually or prepare it for automation.

```text
Run one continuous improvement sweep for this repo.

Lane: [surface QA / workflow polish / collaboration and reliability / docs drift]
Goal: [what should improve]
Workflow: [one workflow or one quality lane]
Data mode: [mock / supabase / both]
Specialist overlays: [figma / screenshot / pdf / doc / slides / spreadsheet / gh-fix-ci / gh-address-comments / linear / none]
Constraints: [what must not change]

I want:
- the smallest effective sub-agent roster
- specialist skills to attach
- the exact checks to run
- prioritized findings first
- low-risk fixes only if clearly bounded

Stop and ask before any architecture, privacy-boundary, or shared-contract expansion.
```
