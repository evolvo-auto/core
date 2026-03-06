

# 6. Phase-by-phase ticket breakdown

Below is a full backlog breakdown by phase. These can become GitHub issues directly.

---

## Phase 0 — Foundations

Goal:
create the core skeleton and environment.

### P0-001 Create monorepo structure

Status: done
Branch: `feature/P0-001-create-monorepo-structure`
PR: `#1`

Create `apps/`, `packages/`, `genome/`, `infra/`, and base TypeScript config.

### P0-002 Set up package manager and workspace config

Status: done
Branch: `feature/P0-002-set-up-package-manager-and-workspace-config`
PR: `#2`

Configure pnpm workspace, root scripts, linting, formatting, and base build.

### P0-003 Add Docker Compose for Postgres and local services

Status: done
Branch: `feature/P0-003-add-docker-compose-for-postgres-and-local-services`
PR: `#3`

Create compose config for Postgres and supporting services needed in WSL.

### P0-004 Create database package and migration setup

Status: done
Branch: `feature/P0-004-create-database-package-and-migration-setup`
PR: `#4`

Choose Prisma and wire migrations.

### P0-005 Define initial database schema

Status: done
Branch: `feature/P0-005-define-initial-database-schema`
PR: `#5`

Create tables for runtime versions, issues, worktrees, attempts, failures, mutations, benchmarks, model invocations.

### P0-006 Create shared schema package

Status: done
Branch: `feature/P0-006-create-shared-schema-package`
PR: `#6`

Add Zod schemas for role outputs and shared enums.

### P0-007 Create logging and structured event utility

Status: done
Branch: `feature/P0-007-create-logging-and-structured-event-utility`
PR: `#7`

Add structured logging with correlation IDs for issue, attempt, worktree, runtime version.

### P0-008 Create config loader

Status: done
Branch: `feature/P0-008-create-config-loader`
PR: `#8`

Add environment/config loading for GitHub, OpenAI, Ollama, Postgres.

### P0-009 Create dashboard shell

Status: done
Branch: `feature/P0-009-create-dashboard-shell`
PR: `#9`

Create minimal Next.js dashboard with health overview.

### P0-010 Add health endpoint contracts

Status: done
Branch: `feature/P0-010-add-health-endpoint-contracts`
PR: `#10`

Add health contract for supervisor/runtime/dashboard.

---

## Phase 1 — GitHub and core issue loop

Goal:
Evolvo can read issues and write back.

### P1-001 Integrate GitHub API client

Status: done
Branch: `feature/P1-001-integrate-github-api-client`
PR: `#11`

Create GitHub package with auth and typed operations.

### P1-002 Seed GitHub labels

Status: done
Branch: `feature/P1-002-seed-github-labels`
PR: `#12`

Implement label sync/bootstrap for the initial taxonomy.

### P1-003 Build issue sync service

Status: done
Branch: `feature/P1-003-build-issue-sync-service`
PR: `#13`

Read issues, normalise labels, cache relevant metadata to DB.

### P1-004 Implement issue classification

Status: done
Branch: `feature/P1-004-implement-issue-classification`
PR: `#15`

Classify issues into kinds, sources, and surfaces.

### P1-005 Add issue state transition helpers

Status: done
Branch: `feature/P1-005-add-issue-state-transition-helpers`
PR: `#16`

Implement functions to safely move issues between `state:*` labels.

### P1-006 Implement issue comment writer

Status: done
Branch: `feature/P1-006-implement-issue-comment-writer`
PR: `#17`

Allow runtime to write structured progress/evaluation comments.

### P1-007 Implement PR creation/update client

Create and update PRs from worktree branches.

### P1-008 Add PR label syncing

Mirror core labels from issues to PRs where appropriate.

### P1-009 Implement issue rejection/defer flow

Allow Evolvo to explain and label ignored or deferred issues.

### P1-010 Add GitHub audit event persistence

Store key GitHub actions locally for observability.

---

## Phase 2 — Model routing and role orchestration

Goal:
multi-role cognition with OpenAI and Ollama.

### P2-001 Create provider abstraction interface

Uniform interface for model invocation.

### P2-002 Implement OpenAI provider

Support structured and freeform outputs.

### P2-003 Implement Ollama provider

Support structured and freeform outputs through local models.

### P2-004 Create model routing resolver

Resolve role + capability to provider/model.

### P2-005 Add structured output validation and repair

Retry/repair invalid outputs.

### P2-006 Store model invocation metrics

Persist latency, schema validity, fallback use, and outcome metadata.

### P2-007 Implement planner role

Use issue context to produce `PlannerOutput`.

### P2-008 Implement selector role

Choose next issue or mutation candidate.

### P2-009 Implement critic role

Interpret logs and failures.

### P2-010 Implement mutator role

Generate structured mutation proposals.

### P2-011 Implement narrator role

Generate GitHub-ready comments and summaries.

---

## Phase 3 — Worktrees and execution

Goal:
one issue → one worktree → one execution journal.

### P3-001 Implement branch naming strategy

Deterministic issue-to-branch naming.

### P3-002 Implement worktree reservation

Reserve and record worktree metadata before creation.

### P3-003 Implement worktree creation

Create git worktree and branch from base ref.

### P3-004 Implement worktree hydration

Install deps, verify tooling, write environment fingerprint.

### P3-005 Implement command execution engine

Run commands with timeout, stdout/stderr capture, exit code tracking.

### P3-006 Implement attempt journal

Record commands, timestamps, notes, and status transitions.

### P3-007 Implement artifact persistence

Store logs and evaluation reports outside disposable worktrees.

### P3-008 Implement worktree cleanup

Clean finished worktrees after artifact persistence.

### P3-009 Add worktree dashboard view

Show active/failed/completed worktrees.

### P3-010 Add blocker handling for worktree failures

Map setup failures back into structured issue comments.

---

## Phase 4 — Builder loop and evaluator

Goal:
Evolvo can actually do engineering work end to end.

### P4-001 Implement builder orchestration

Take a plan and generate coding steps.

### P4-002 Implement changed-file detection

Compare builder intent vs git diff.

### P4-003 Implement evaluator runner

Run install, typecheck, lint, tests, build, run, smoke checks.

### P4-004 Implement smoke test contract

Support basic route/port checks and optional Playwright smoke.

### P4-005 Implement evaluator interpreter

Convert raw command results into `EvaluatorOutput`.

### P4-006 Implement debug-repair loop

On failure, inspect logs, patch, rerun.

### P4-007 Implement PR opening from passing worktrees

Open or update PR from branch.

### P4-008 Implement issue completion summaries

Post structured completion/failure summary.

### P4-009 Add evaluation labels to issue and PR

Apply `eval:*` labels after evaluation.

### P4-010 Record attempt outcomes and evaluation results

Persist structured outcomes.

---

## Phase 5 — Failure memory and mutation proposals

Goal:
convert failures into self-improvement work.

### P5-001 Implement failure taxonomy

Define failure phases and categories.

### P5-002 Create failure reflection pipeline

Generate `FailureReflection` from failed attempts.

### P5-003 Implement recurrence clustering

Group related failures into recurring themes.

### P5-004 Create failure issue generator

Open `kind:failure` issues from structured reflections.

### P5-005 Create mutation proposal generator

Open `kind:mutation` issues from systemic failures or trends.

### P5-006 Persist mutation proposals and outcomes

Track lifecycle from proposal to adoption/rejection.

### P5-007 Implement capability tracking

Track capability confidence and recurring failure modes.

### P5-008 Add failure and mutation dashboard views

Visualise recurrence, systemic surfaces, and proposal queue.

### P5-009 Add selector weighting for repeated failures

Let recurrence influence prioritisation.

### P5-010 Implement direct-fix vs mutation-first decisioning

Allow systemic fixes to outrank one-off repairs.

---

## Phase 6 — Challenge and benchmark engine

Goal:
stable self-improvement pressure.

### P6-001 Implement challenge ingestion

Parse issues labeled `human-made-challenge` and `evolvo-made-challenge`.

### P6-002 Create challenge normalisation

Store challenge definition internally with validation expectations.

### P6-003 Implement benchmark registry

Support named benchmarks and versions.

### P6-004 Create benchmark runner

Run benchmark sets against attempts or runtime candidates.

### P6-005 Persist benchmark results

Track score, pass/fail, runtime version, and issue linkage.

### P6-006 Implement regression pack support

Run targeted validation against previously successful capability areas.

### P6-007 Implement holdout benchmark support

Reserve some tasks for overfitting detection.

### P6-008 Add benchmark lineage

Support benchmark versioning and mutation history.

### P6-009 Add benchmark dashboard trends

Show deltas over time and by runtime version.

### P6-010 Implement Evolvo-created challenge generation

Allow system to create challenge issues to test its weaknesses.

---

## Phase 7 — Genome mutation

Goal:
self-modify prompts, templates, routing, heuristics.

### P7-001 Move prompts into genome package/path

Make role prompts versionable and mutable.

### P7-002 Move routing config into genome

Make routing policy explicitly mutable.

### P7-003 Move heuristic weights into genome

Expose priority and strategy weights for mutation.

### P7-004 Implement mutation PR generation

Given a mutation issue, produce actual change branch/PR.

### P7-005 Implement mutation evaluation harness

Run benchmark/regression comparison for genome changes.

### P7-006 Add routing change evidence summaries

Require before/after reasoning in PR comments.

### P7-007 Add prompt lineage tracking

Version prompt changes with source mutation linkage.

### P7-008 Add mutation adoption/rejection logic

Record whether the mutation actually helped.

### P7-009 Add selector support for mutation work

Let Evolvo prioritise self-improvement intentionally.

### P7-010 Add benchmark evidence requirement for routing mutation

Ensure routing changes are validated before adoption.

---

## Phase 8 — Runtime and evaluator self-modification

Goal:
Evolvo can change deeper system code.

### P8-001 Support runtime-surface mutation issues

Allow mutations targeting `surface:runtime`.

### P8-002 Support evaluator-surface mutation issues

Allow mutations targeting `surface:evaluator`.

### P8-003 Add high-impact mutation validation policy

Run stricter checks for runtime/evaluator changes.

### P8-004 Implement runtime candidate discovery

Detect merged changes that affect promotable runtime behaviour.

### P8-005 Implement runtime version records

Store discovered/candidate/active/rejected versions.

### P8-006 Add promotion impact inference

Infer whether a PR requires runtime promotion.

### P8-007 Add mutation-to-runtime-version linkage

Connect change history to active runtime evolution.

### P8-008 Add evaluator lineage tracking

Track how evaluator changes affect judgment patterns.

### P8-009 Add runtime mutation dashboard

Show candidate versions and their source mutations.

### P8-010 Add high-risk mutation summaries in PRs

Ensure significant self-changes are explainable.

---

## Phase 9 — Supervisor and promotion

Goal:
complete the self-upgrade loop.

### P9-001 Build supervisor app

Minimal process controller for runtime instances.

### P9-002 Add runtime instance registry

Track active, shadow, failed, stopped instances.

### P9-003 Implement startup health checks

Verify runtime process health before authority.

### P9-004 Implement candidate validation flow

Move runtime versions from `candidate` to `validating`.

### P9-005 Implement shadow mode startup

Run candidate runtime in non-authoritative mode.

### P9-006 Implement shadow comparison capture

Compare candidate decisions against active runtime behaviour.

### P9-007 Implement promotion decision engine

Use structured evidence to produce `PromotionDecision`.

### P9-008 Implement active runtime switch

Stop old leader, promote candidate, mark new leader active.

### P9-009 Implement rollback flow

Recover last healthy active runtime after failed promotion.

### P9-010 Add promotion and runtime lineage views

Surface upgrades, rejections, rollbacks, and active version history.

---

## Phase 10 — Satellite repos and broader autonomy

Goal:
Evolvo can create repos for experiments and new work.

### P10-001 Implement spawned repo registry

Track repos created by Evolvo.

### P10-002 Implement GitHub repo creation flow

Create new repos from issues or experiments.

### P10-003 Add experiment repo workflow

Create repos specifically for strategy comparisons.

### P10-004 Add benchmark repo workflow

Create clean repos for repeatable challenge families.

### P10-005 Implement repo classification

Tag spawned repos by purpose and lifecycle.

### P10-006 Add repo lifecycle operations

Archive, ignore, or revisit spawned repos as needed.

### P10-007 Add cross-repo issue request support

Allow issues like “build this new software” to become spawned work repos.

### P10-008 Add personal engineer request parsing

Support broader instructions such as “upgrade this repo with X”.

### P10-009 Add human approval request flow for external actions

Create approval issues with `human-approval-needed`.

### P10-010 Add portfolio dashboard view

Show core repo and spawned repo ecosystem.

---

## Phase 11 — Refinement and autonomy hardening

Goal:
make Evolvo robust enough for long-term use.

### P11-001 Add meta-work ratio tracking

Measure whether Evolvo is doing real engineering vs admin churn.

### P11-002 Add difficulty collapse detection

Detect benchmark/evaluator changes that merely inflate scores.

### P11-003 Add repeated bad-mutation suppression

Avoid rediscovering the same failed self-improvements.

### P11-004 Add issue-value learning

Learn which issue types tend to produce useful progress.

### P11-005 Add provider/model performance learning

Let routing adapt from empirical results.

### P11-006 Add memory compaction and summarisation

Reduce raw history noise while retaining learnings.

### P11-007 Add serial-to-parallel evolution path

Explore safe concurrency later.

### P11-008 Add richer planner horizon support

Allow sprint-scale or roadmap-scale planning.

### P11-009 Add long-run autonomy monitoring

Detect stagnation, loops, or self-deception patterns.

### P11-010 Add full platform health score

Expose a combined operational and evolutionary health metric.
