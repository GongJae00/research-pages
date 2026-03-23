# Local Autonomy Daemon

## Purpose

This document explains the current local autonomy loop for the internal agent ops board.

It is not a full always-on swarm yet. It is the first control-plane layer that keeps the queue moving, refreshes operator-facing reports, and exposes provider health so the board can show what is truly automated versus what is still blocked.

## What exists now

- `scripts/agent-ops.mjs`
  - operator bridge for `directive`, `focus`, `pause`, `resume`, provider connect or assign, and autonomy on or off
- `scripts/agent-ops-daemon.mjs`
  - long-running local loop that reads the shared state file, generates a structured planning packet, and advances one bounded lane per cycle
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
- updates the current directive
- refreshes the selected team and deliverable
- appends a bottom-up report packet
- stores the latest task packet and recent planning history
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

## Current limitation

This loop now produces live planning packets and a real artifact trail, but it still does not make real code changes by itself.

The next step is provider adapters with authenticated long-running execution sessions so the autonomy daemon can hand bounded tasks to real Codex, Claude, or Gemini workers, validate the result, and then schedule the next slice from actual file changes instead of planning output alone.
