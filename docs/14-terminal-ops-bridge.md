# Terminal Ops Bridge

## Purpose

This bridge lets the operator use the terminal as a lightweight command channel while the homepage agent layer and the internal ops board show the current directive, selected team, connected CLI agents, and recent communication feed.

It does not create a true always-on agent swarm by itself. It creates a shared local state file that both the terminal workflow and the internal ops dashboard can read.

## State file

The bridge writes local runtime state to:

- `.researchos/agent-ops-state.json`

This file is intentionally ignored by git. It is local operator state, not product data.

## Commands

From the repo root:

```bash
node scripts/agent-ops.mjs status
node scripts/agent-ops.mjs connect codex executive-desk "Codex is supervising the queue."
node scripts/agent-ops.mjs assign claude workflow-systems "Claude is taking the workflow lane."
node scripts/agent-ops.mjs disconnect gemini
node scripts/agent-ops.mjs directive "Focus on homepage quality next."
node scripts/agent-ops.mjs pause "I am reviewing the current state."
node scripts/agent-ops.mjs resume "Continue with the shell team first."
node scripts/agent-ops.mjs focus shell-experience "Polish the public homepage hero."
node scripts/agent-ops.mjs note shell-experience "Use tighter spacing in the hero cards."
node scripts/agent-ops.mjs clear
```

You can also use the package alias:

```bash
corepack pnpm ops -- status
corepack pnpm ops -- directive "Prepare a clean briefing."
```

## Provider ids

Use one of these provider ids with `connect`, `assign`, or `disconnect`:

- `codex`
- `claude`
- `gemini`

## Team ids

Use one of these team ids with `focus` or `note`:

- `executive-desk`
- `shell-experience`
- `workflow-systems`
- `reliability-desk`

## How it shows up in the product

Open:

- `/ko`
- `/en`
- `/ko/ops`
- `/en/ops`
- `/api/ops-setup?locale=ko&provider=codex&team=executive-desk`

The homepage agent layer and the internal ops board will poll the local runtime state and update:

- terminal bridge connection state
- current terminal directive
- connected CLI providers and their assigned teams
- selected team
- recent communication feed
- team deliverable override when `focus` is used
- homepage setup builder commands for `connect` and `assign`

The setup API can also return a plain-text brief:

- `/api/ops-setup?locale=ko&provider=codex&team=executive-desk&format=txt`

## Practical workflow

Use this loop:

1. keep the web app open on `/ko` or `/ko/ops`
2. register local CLI agents with `connect`
3. move a provider to a different team with `assign`
4. issue operating instructions from the terminal
5. use the chat with Codex for implementation or redirection
6. use `pause` when you want a briefing before more code work
7. use `resume` or `focus` when you want the next lane clarified

This gives you three surfaces with one shared mental model:

- chat for implementation requests
- terminal for lightweight operating commands
- homepage agent layer for setup and fast supervision
- ops board for detailed visual supervision
