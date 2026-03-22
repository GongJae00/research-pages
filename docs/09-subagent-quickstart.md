# Sub-agent Quickstart

## Purpose

This guide is for the human operator. Use it when you want Codex to split one task across sub-agents without creating unnecessary overlap.

Read `docs/04-agent-playbook.md` first for the ownership model. Use this file for the practical launch sequence.

## When to use sub-agents

Use sub-agents when:

- the task touches two or more owned path groups
- the work can be separated into shell, feature, contract, or docs slices
- you want one read-only exploration pass before implementation
- you need independent verification on separate repo surfaces

Do not use sub-agents when:

- the task is one small file or one narrow slice
- the task only touches a serialized hot file
- the architecture or product direction is still unclear
- the task mixes scope definition, contract changes, and multiple feature flows with no order

## Five-minute launch flow

1. Define the workflow in one sentence.
   Example: "Improve the document intake flow for internal demo preview."
2. Mark the mode.
   State whether the task is `mock`, `supabase`, or both.
3. Check for contract or hot-file impact.
   If `packages/types`, `supabase/schema.sql`, `locale-frame.tsx`, `auth-provider.tsx`, `globals.css`, or `README.md` are involved, serialize the work.
4. Pick the smallest roster that fits.
   Most tasks only need one feature agent, or one feature agent plus `platform-contracts-agent`.
   If the task needs design, document-format handling, CI repair, or external spec support, add the relevant specialist overlay from `docs/11-agent-capability-matrix.md`.
5. Ask Codex to orchestrate.
   Use one of the templates in `docs/10-subagent-prompt-templates.md`.

## Default launch order

Use this order unless the task is obviously simpler:

1. `docs-scope-agent` if the task changes scope, rollout notes, or contributor instructions
2. `platform-contracts-agent` if shared contracts, preview access, env, API, or Supabase wiring changes
3. `web-shell-agent` if layout, route shell, locale frame, or global styling changes
4. one feature agent from `researcher-workspace-agent`, `document-workflow-agent`, or `lab-collaboration-agent`

Do not start downstream feature work until shared contract changes are stable.

## Apply checklist

Before telling Codex to apply or merge sub-agent work, check:

- each agent stayed inside its owned paths
- no two agents edited the same serialized hot file
- every handoff states the data mode
- every handoff lists commands run and files intentionally not touched
- feature agents did not silently change `packages/types` or `supabase/schema.sql`
- shell or auth hotspots were not edited by multiple agents in parallel

## Conflict recovery

If an apply conflict happens:

1. stop applying more overlapping work
2. identify whether the conflict is in a serialized hot file
3. keep one designated owner for that file
4. merge that file manually through the parent Codex task
5. if the conflict changed contracts, re-run downstream feature agents from the merged state

Use these rules:

- `README.md` and `docs/**`: reassign to `docs-scope-agent`
- `packages/types/**` or `supabase/schema.sql`: reassign to `platform-contracts-agent`, then re-run dependent feature work
- `locale-frame.tsx`, `globals.css`, `auth-provider.tsx`: stop parallel edits and serialize the shell or lab collaboration work
- one clean file and one conflicting file from the same agent: apply only if the clean file is outside hot files and does not depend on the conflicting change

## Smallest effective roster

Start smaller than you think:

- docs-only task: `docs-scope-agent`
- one private feature slice: one feature agent only
- one feature plus shared contracts: `platform-contracts-agent` first, then one feature agent
- layout plus feature: `web-shell-agent` plus one feature agent
- read-only repo mapping before edits: one explorer pass, then implementation agents

More parallelism is not automatically better. In this repo, three implementation agents at once is usually the practical ceiling.

## What you should tell Codex

Every request should clearly state:

- the user workflow
- the allowed roles
- the data mode
- serialized hot files to avoid
- what counts as done
- what verification you want back

If you do not want Codex to choose the roster for you, say the exact roles explicitly.

## Good operator habits

- ask for one workflow at a time
- tell Codex whether this is mock validation work or production-targeted wiring
- mention if public, lab, or private data boundaries are involved
- keep docs changes explicit instead of bundling them into feature work silently
- ask for a read-only exploration pass first when you are unsure which role owns the task
- run recurring improvement work from `docs/12-continuous-improvement-loop.md` instead of mixing maintenance with feature delivery randomly
