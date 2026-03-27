# R-Bot Adaptation Plan

## Decision

Yes, R-Bot should eventually be adapted to this product.

But the first adaptation step should **not** be full fine-tuning.

The correct order for this repository is:

1. source-backed retrieval
2. metadata-first document finding
3. evaluation set and feedback loop
4. narrow LoRA or SFT only after repeated failure patterns are visible

## Why not fine-tune first

This product has two very different problem types:

- public research-admin guidance
- private document retrieval under permissions

Fine-tuning does not solve the hard part of either one by itself.

It does not replace:

- official source links
- permission checks
- document ranking logic
- audit boundaries for shared data

If we fine-tune too early, we risk making the assistant sound more confident without actually improving grounding.

## What should be adapted first

### Public guidance

Adapt the assistant to:

- answer in the tone ResearchPages wants
- stay short and operational
- defer cleanly when school-specific rules are missing
- always end with a next step

This is mostly prompt and evaluation work first.

### Private document finding

Adapt the system to:

- map messy user wording onto document title, summary, tags, and type
- explain why a document was matched
- avoid over-returning irrelevant files

This is first a retrieval and ranking problem.

Fine-tuning may help later with query rewriting or result explanation, but not before the document search behavior is measured.

## Recommended adaptation ladder

### Stage 1: retrieval and prompt tuning

Use:

- curated public knowledge packs
- metadata-first search for private documents
- strong system prompts
- strict citations and refusal rules

Ship this first.

### Stage 2: evaluation set

Build a small fixed eval set for:

- ORCID questions
- national researcher number questions
- school-rule routing questions
- document finder questions

Each eval case should record:

- user question
- expected behavior
- acceptable citations
- acceptable refusal or escalation behavior

Do this before any training.

### Stage 3: feedback capture

Collect examples where:

- the answer was correct
- the answer was too vague
- the answer missed the right document
- the answer should have refused

Only keep training examples that are:

- de-identified
- permission-safe
- high-confidence and human-reviewed

### Stage 4: narrow Qwen LoRA or SFT

Only after enough reviewed examples exist, add a narrow fine-tune for:

- answer style
- question routing
- document-query rewriting
- result explanation formatting

Do not fine-tune Qwen on raw private documents as the main strategy.

That knowledge should stay in retrieval, not in model weights.

## What should never be the main fine-tune target

- raw private PDFs
- lab-private document bodies
- school rules that change frequently
- personal data that should remain revocable or deletable

These belong in storage and retrieval layers, not permanent model memory.

## When fine-tuning becomes justified

Fine-tuning becomes reasonable when all of these are true:

- the retrieval path is stable
- the public knowledge pack has a repeatable structure
- at least one fixed eval set exists
- there are repeated failure patterns that prompt-only changes do not solve
- training data can be reviewed and de-identified safely

## Suggested first fine-tune target

The best first target is not broad knowledge.

It is:

- `Qwen query-rewrite + answer-style adaptation`

That means training examples like:

- ambiguous user question -> normalized retrieval query
- retrieved facts -> short grounded answer
- missing school context -> ask for school and program instead of hallucinating

## Data shape for future SFT

Keep future examples in JSONL with fields like:

- `task_type`
- `input`
- `retrieved_context`
- `expected_output`
- `review_status`
- `contains_private_data`

Only examples with:

- `review_status=approved`
- `contains_private_data=false`

should be considered for shared model training.

## Practical threshold

Do not start training because the idea sounds right.

Start when there are roughly:

- 300+ reviewed public guidance examples for style and routing work, or
- 500+ reviewed document-finder examples for query rewrite and ranking explanation work

Below that, prompt and retrieval changes are usually cheaper and safer.

## Project-specific recommendation

For this repo right now:

- keep the public Qwen assistant grounded on curated sources
- keep private document search metadata-first
- log misses and edge cases
- build an eval set
- revisit LoRA after enough reviewed failures accumulate

That is the highest-signal route for ResearchPages.
