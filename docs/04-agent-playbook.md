# Agent Playbook

## Purpose

This file explains how to use AI agents on this repository without losing product direction.

## What agents should do first

Before coding, agents should read:

1. `README.md`
2. `docs/00-product-vision.md`
3. `docs/02-architecture.md`
4. `docs/03-roadmap.md`

## Recommended division of work

- Codex:
  - repository structure
  - implementation
  - refactors
  - testing
  - bug fixing
- Claude:
  - product wording
  - UX writing
  - feature breakdowns
  - long-form requirement clarification

## Good agent tasks

- define database tables for one module
- build one screen end to end
- refactor one workflow
- review one feature for security or edge cases
- improve one document or onboarding flow

## Bad agent tasks

- "build the whole platform perfectly"
- adding broad features without checking roadmap priority
- changing stack decisions without updating architecture docs
- creating integrations with external services before validating access and policy

## Required workflow

1. Choose one narrow feature.
2. Define the user workflow.
3. Define the data model.
4. Build the web flow first if it is document-heavy.
5. Add mobile support only for the useful subset.
6. Document decisions when the architecture changes.

## Current implementation order

1. authentication
2. profile vault
3. affiliation timeline
4. funding records
5. document bank
6. timetable
7. lab workspace
8. public profile export
