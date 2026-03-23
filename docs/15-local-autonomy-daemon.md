# Local Autonomy Daemon

## Purpose

This document explains the current local autonomy loop for the internal agent ops board.

It is not a full always-on swarm yet. It is the first control-plane layer that keeps the queue moving, refreshes operator-facing reports, and exposes provider health so the board can show what is truly automated versus what is still blocked.

## What exists now

- `scripts/agent-ops.mjs`
  - operator bridge for `directive`, `focus`, `pause`, `resume`, provider connect or assign, and autonomy on or off
- `scripts/agent-ops-daemon.mjs`
  - long-running local loop that reads the shared state file, generates a structured planning packet, attempts one bounded execution slice, and advances one bounded lane per cycle
- `apps/web/src/app/api/ops-state/route.ts`
  - board API for the current merged ops snapshot
- `apps/web/src/app/api/ops-terminal/route.ts`
  - local-only shell session bridge for command deck and session dock

## Current autonomy model

The daemon rotates through one bounded lane at a time:

1. shell and experience
2. workflow systems
3. reliability desk
4. executive desk

On each cycle it:

- checks provider health
- chooses the next lane
- asks a live provider for a structured planning packet when possible
- saves the planning artifact under `.researchos/autonomy-artifacts/`
- tries one bounded write pass through `Codex CLI` when the lane is executable
- skips execution when owned paths are already dirty or when the planner failed
- runs bounded validation commands for the lane after real file changes
- saves execution artifacts under `.researchos/autonomy-executions/`
- updates the current directive
- refreshes the selected team and deliverable
- appends a bottom-up report packet
- stores the latest task packet and recent planning history
- stores the latest execution packet and recent execution history
- refreshes member-level runtime state for the selected team
- updates the board queue and next run time

## Planning artifacts

Every successful or failed provider planning attempt can write an artifact file under:

- `.researchos/autonomy-artifacts/`

Each artifact records:

- loop number
- provider used
- team and lane
- prompt
- normalized planning packet
- raw provider output or error context

The ops board reads the latest packet into:

- `autonomy.currentTask`
- `autonomy.taskHistory`

## Execution artifacts

Every bounded execution attempt can write an artifact file under:

- `.researchos/autonomy-executions/`

Each execution artifact records:

- loop number
- provider used
- team and lane
- prompt
- normalized execution packet
- changed files
- validation results
- raw provider output or error context

The ops board reads the latest execution state into:

- `autonomy.currentExecution`
- `autonomy.executionHistory`

The runtime bridge also updates:

- `memberUpdates`
  - per-team member task, state, and last-update overrides for the live board

## Provider reality boundary

The board now makes provider health explicit.

Expected states:

- `Codex CLI`
  - installed path detected and callable through `codex.cmd`, but planning quality can still be generic depending on the current CLI session behavior
- `Claude Code`
  - CLI may be installed, but live model calls can still fail if authentication, quota, or subscription state is not ready
- `Gemini CLI`
  - available as a planning fallback after separate installation and PATH setup
- `Mock planner`
  - fallback mode that keeps the queue, reporting, and control-room rhythm visible when no live provider is ready or when live planning output is too generic to trust

## How to use it

Enable autonomy:

```bash
corepack pnpm ops -- autonomy on
```

Run one local cycle:

```bash
corepack pnpm ops:autonomy -- --once
```

Run the daemon continuously:

```bash
corepack pnpm ops:autonomy
```

Disable autonomy:

```bash
corepack pnpm ops -- autonomy off
```

Check shared state:

```bash
corepack pnpm ops -- status
```

Inspect the latest planning artifacts:

```bash
dir .researchos\autonomy-artifacts
```

Inspect the latest execution artifacts:

```bash
dir .researchos\autonomy-executions
```

## Current limitation

This loop now attempts real bounded code changes, but it is still not a full always-on swarm.

Current boundaries:

- it still depends on `Codex CLI` producing a usable packet or on the fallback packet being specific enough to execute safely
- it will block itself when owned paths are already dirty, which is intentional to avoid overlapping edits
- it still uses one local worker loop, not multiple true long-running collaborative provider sessions
- it still needs better provider-specific adapters if you want Codex, Gemini, and Claude to all execute as distinct live team members instead of one bounded write worker
