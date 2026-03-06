# AGENTS.md

## Purpose

This repository is the implementation home for Evolvo: a TurboRepo monorepo written in TypeScript.

The `SYSTEM/` documents are the product and architecture source of truth. Before starting work, read the ticket in `SYSTEM/PHASE_TICKET_BREAKDOWN.md` and any related contract documents in `SYSTEM/`.

Relevant system documents include:

* `SYSTEM/DEVOLPMENT_PLAN.md`
* `SYSTEM/GITHUB_LABEL_AND_ISSUE_RULES.md`
* `SYSTEM/ROLE_OUTPUT_SCHEMA.md`
* `SYSTEM/MODEL_ROUTING_CONFIG.md`
* `SYSTEM/WORKTREE_LIFECYCLE_CONTRACT.md`
* `SYSTEM/SUPERVISOR_AND_PROMOTION_STATE_MACHINE.md`
* `SYSTEM/PHASE_TICKET_BREAKDOWN.md`

## Delivery workflow

`AGENTS.md` is the only planned exception to the branch-per-ticket rule and is created on `main`.

All other implementation work must follow this flow:

1. Pick exactly one ticket from `SYSTEM/PHASE_TICKET_BREAKDOWN.md`.
2. Create a dedicated branch for that ticket from `main`.
3. Use the ticket code in the branch name.
4. Keep the branch scoped to that ticket only.
5. Verify the ticket properly before asking for review.
6. Open a PR for review.
7. Mark the ticket done in `SYSTEM/PHASE_TICKET_BREAKDOWN.md` only after the ticket has been verified and the PR has been created.

Branch naming example:

* `feature/P0-001-create-monorepo-structure`

PRs must explicitly state what the user can now do with the system because of that completed ticket.

## Commit rules

Use conventional commits only.

Examples:

* `feat: add worktree reservation flow`
* `fix: correct evaluator outcome mapping`
* `docs: add repository agent instructions`
* `test: cover branch naming utility`

Keep commits small and atomic where practical.

## Monorepo rules

This repository must remain a TurboRepo monorepo.

General rules:

* never use barrel files
* if a package has exports, define them explicitly in that package's `package.json`
* prefer clear package boundaries over convenience imports
* default to TypeScript throughout the repo

Package rules:

### `packages/lib`

* may have imports and dependencies
* may use other functions

### `packages/utils`

* utilities must be pure
* no runtime dependencies
* no imports other than types
* a util function must not call another util function

### `packages/api`

* used as the DAL for the database
* CRUD files should be named by model
* split operations by applicable sections such as GET and POST
* all files should be `"use server"` files

### `packages/query`

* holds reusable `@tanstack/react-query` queries and mutations
* group functions by model/data type
* split functions by GET and POST style concerns where applicable

## Testing rules

When creating a new non-documentation file, create a matching Vitest test file and aim for full coverage.

When updating existing code:

* tests for untouched behavior should still pass
* tests for touched behavior should be updated to match the new logic

## Next.js rules

If work touches a Next.js app:

* use the Next.js MCP tools first
* keep components server components unless they need hooks or client-only behavior
* data loading should use `@tanstack/react-query`
* prefetch data in `page.tsx`
* use `useQuery` in the component where data is consumed
* put reusable queries and mutations in `packages/query`

## Prisma rules

If work touches Prisma:

* use Prisma model types and helpers instead of recreating model types manually
* use Prisma 7 with the Prisma 7 config model
* use Prisma MCP guidance when Prisma-specific decisions are needed

## Implementation expectations

Before making changes, identify which system documents govern the ticket.

When implementing:

* preserve alignment with the existing system contracts
* prefer explicit schemas and typed boundaries
* avoid hidden magic and implicit behavior
* keep GitHub, runtime, worktree, and promotion logic traceable to the design docs

When closing a ticket:

* verify the work locally as far as the repo state allows
* summarize the verification performed
* open a PR with a clear summary
* state the newly unlocked user-visible capability in the PR description

