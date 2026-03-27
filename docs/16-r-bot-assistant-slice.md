# R-Bot Assistant Slice

## Why this document exists

The product can benefit from a narrow AI assistant if it directly reduces search and admin overhead for researchers.

This assistant should not begin as a broad chatbot.

It should begin as a bounded researcher helper that can:

- explain common research-admin basics that beginners struggle to find
- point to official source pages for items such as ORCID or national researcher identifiers
- help a signed-in user find the right document inside their own repository

This document defines the safe product boundary and rollout order for that slice.

## User workflows

### Workflow 1: public research-admin guide

The user asks short questions such as:

- What is ORCID?
- Where do I register for ORCID?
- What is a national researcher number?
- Where do I start for my school's graduate rules?

The assistant should answer with:

- a short explanation
- a clear next step
- a source link
- a warning when school-specific rules may vary

### Workflow 2: signed-in document finder

The user asks questions such as:

- Find my latest scholarship statement
- Show the document I used for last semester's enrollment proof
- Which file mentions Yonsei and scholarship together?

The assistant should answer with:

- matching documents from the user's own scope
- short reasons why each result matched
- a direct workspace link to open the document

### Workflow 3: lab-safe shared retrieval

Later, a lab member may ask:

- Find the shared presentation template for our lab
- Show the most recent shared seminar deck

This requires lab membership checks and should remain out of scope until the server-backed permission path is stable.

## Product boundary

R-Bot is allowed only when it reduces document assembly or admin overhead.

R-Bot is not allowed to become:

- a generic freeform campus advice chatbot
- a source of unsourced rule interpretations
- a direct raw-file browser that bypasses workspace permissions
- a public homepage feature that exposes private document context

## Surface split

The repository already separates the public homepage from the authenticated workspace shell.

That split should remain.

### Public homepage

Allowed:

- a small side assistant for public research-admin guidance
- curated knowledge packs
- source-backed answers only
- a global dock that stays visible across pages

Not allowed:

- personal document retrieval
- lab-private knowledge
- any answer based on private workspace data

Exception:

- if the user is already signed in, the same dock may switch into authenticated workspace mode
- in that case, private retrieval is allowed only after the current user scope is resolved locally or server-side
- the dock UI may be shared across route types, but the data boundary must still follow sign-in state and owner scope

### Authenticated workspace

Allowed:

- personal document search
- workspace route guidance such as where profile, documents, funding, timetable, and lab tasks belong
- lab document search only after permission checks are server-enforced
- source-backed retrieval from the user's permitted records

## Rollout order

### Phase A: public knowledge guide

Ship this first.

Use curated markdown or JSON knowledge packs for:

- ORCID basics and registration
- national researcher number basics
- school onboarding links
- scholarship and certificate FAQ links

This can run safely on the homepage because it does not touch private user data.

### Phase B: metadata-first document finder

Ship this after the document repository is reliably server-backed.

Search only:

- document title
- summary
- tags
- document type
- institution names already stored in metadata

Do not start with full document-content retrieval if the document access path is still mixed between browser-local files and server storage.

### Phase C: grounded document retrieval

Add embeddings and chunk-level retrieval after:

- document storage is fully backed by Supabase Storage
- document metadata is in Postgres
- signed access rules are enforced
- audit expectations for shared lab retrieval are defined

## Recommendation

### Model choice

Default recommendation:

- `Qwen3-4B`

Why:

- Apache-2.0 license
- strong multilingual positioning
- good tool-calling fit for retrieval workflows
- practical size for local or low-cost self-hosting

Fallback when compute is tighter:

- `Phi-4-mini-instruct`

Why:

- MIT license
- 3.8B size
- explicit support for Korean
- function-calling support
- good fit for memory-constrained deployment

Models not recommended as the default here:

- `Llama 3.2 3B`

Reason:

- small and practical, but its official supported-language list does not include Korean, which is too limiting for this product's first assistant slice

### Runtime choice

Default recommendation:

- local development: `Ollama`
- self-hosted production: `llama.cpp` server or `Ollama`, depending on operational preference

Reason:

- simple local runs
- easy model switching
- low infra cost compared with hosted API-first stacks

### Retrieval design

#### Public guide retrieval

Use a small curated corpus with strict source metadata:

- `title`
- `summary`
- `source_url`
- `source_type`
- `school_slug`
- `last_verified_on`

Each answer should cite the source entry it used.

#### Private document retrieval

Start with metadata filtering before semantic retrieval.

That means:

1. filter documents by current user or permitted lab scope
2. search title, summary, tags, and typed metadata
3. return ranked matches
4. only later add embedding search over extracted text chunks

This is safer than sending raw private document bodies into the model first.

## Safety rules

R-Bot should follow these rules from the first slice:

- answer only from allowed sources
- show citations for public-rule answers
- never claim certainty on school-specific policies without a source
- ask the user to confirm school or program when rules differ
- treat uploaded documents as private by default
- never let the model directly enumerate files outside the caller's scope
- keep retrieval and permission checks outside the model

## Data and infra implications

The current repo direction still matters:

- public guidance can ship before deep backend AI work
- private document search should wait for stronger server-backed document ownership
- lab-shared retrieval should wait for explicit permission and audit expectations

If semantic retrieval is added later, prefer the existing stack direction:

- Supabase Postgres
- Supabase Storage
- RLS for scope enforcement
- `pgvector` for embeddings after the server-backed document path is stable

## Thin vertical slice

The first useful slice should be small:

1. Add a public `R-Bot` side panel on the homepage.
2. Limit it to a curated knowledge pack with official links.
3. Add a server route that accepts a question and returns an answer, citations, and suggested next actions.
4. Keep the assistant stateless at first.
5. Do not connect private documents yet.

The second slice can then add a workspace-only document finder panel.

## Suggested implementation shape

Potential web paths:

- `apps/web/src/components/r-bot-panel.tsx`
- `apps/web/src/app/api/r-bot/route.ts`
- `apps/web/src/lib/r-bot/knowledge-pack.ts`
- `apps/web/src/lib/r-bot/retrieval.ts`
- `apps/web/src/lib/r-bot/policy.ts`

Potential later paths for document retrieval:

- `apps/web/src/lib/r-bot/document-search.ts`
- `apps/web/src/lib/r-bot/document-embeddings.ts`

## Open questions before implementation

- Which universities should be supported first?
- Will the first deployment run on a lab machine, one self-hosted GPU box, or CPU-only infra?
- Should the homepage assistant be visible to all visitors or only in preview while the knowledge pack is incomplete?
- When private document retrieval begins, what audit signal is required for lab-shared queries?

## Decision

Proceed only with:

- a public, source-backed knowledge guide on the homepage first
- a workspace-only document finder second

Do not merge those two surfaces into one public assistant at the start.
