# R-Bot Qwen Setup

## Goal

Run the public R-Bot assistant against a local Qwen model through Ollama.

The default model choice in the web app is:

- `qwen3:4b`

## Runtime behavior

The app now behaves like this:

- if Ollama is reachable and `qwen3:4b` is installed, R-Bot uses Qwen
- if Ollama is reachable but the model is missing, the homepage shows the pull command
- if Ollama is unreachable, R-Bot falls back to source-only answers

## Default config

The app reads:

- `RBOT_MODEL`
- `RBOT_OLLAMA_URL`
- `RBOT_DISABLE_OLLAMA`

Defaults:

- `RBOT_MODEL=qwen3:4b`
- `RBOT_OLLAMA_URL=http://127.0.0.1:11434`
- `RBOT_DISABLE_OLLAMA=false`

## Local setup

1. Install Ollama.
2. Pull the model:

```bash
ollama pull qwen3:4b
```

3. Start Ollama if it is not already running.
4. Put any overrides in `.env.local` only.
5. Run the web app.

## Optional overrides

Use these only if needed:

```bash
RBOT_MODEL=qwen3:8b
RBOT_OLLAMA_URL=http://127.0.0.1:11434
RBOT_DISABLE_OLLAMA=false
```

## Validation

Homepage:

- open the public homepage
- confirm the R-Bot status shows `Qwen ready`
- ask an ORCID or national researcher number question
- confirm the answer still includes source links

Documents workspace:

- open the documents page
- use the R-Bot document finder
- ask for a recent scholarship or certificate document
- confirm the ranked results open the expected document preview

## Non-goals

- full document-body RAG
- lab-wide shared retrieval with audit requirements
- school-specific rule packs for every university

Those remain later slices.
