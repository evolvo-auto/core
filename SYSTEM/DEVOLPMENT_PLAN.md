# Evolvo — Full Development Plan

## 1. Purpose

Evolvo is a self-hosting, GitHub-native, autonomous engineering system.

Its job is not merely to complete coding tasks. Its real purpose is to:

* interpret goals and challenges from GitHub
* decide what work is worth doing
* execute engineering work in isolated branches/worktrees
* evaluate outcomes
* analyse its failures
* mutate its own behaviour, architecture, and operating strategy
* promote improved versions of itself
* continue operating with minimal or no human intervention

The long-term vision is that Evolvo becomes your personal autonomous engineer, able to:

* implement features in existing repos
* create new repos from ideas
* run experiments
* benchmark itself
* improve itself from failures
* decide how to allocate its own effort
* justify its evolution in a GitHub-visible way

Evolvo is therefore both:

* an autonomous software engineer
* an autonomous self-improving platform

---

# 2. Core Principles

## 2.1 GitHub is the canonical operating surface

GitHub is the visible operating system for Evolvo.

This means Evolvo should use GitHub as its main interface for:

* incoming work
* challenge injection
* proposals
* execution tracking
* branch/PR lifecycle
* review summaries
* mutation justifications
* audit trail of its reasoning and actions

GitHub issues and PR comments are the public brain.
Postgres is internal state and memory, not the source of truth.

## 2.2 One core repo, many optional satellite repos

Evolvo itself is one repo.

That repo contains:

* the runtime
* the orchestration system
* the memory system
* the evaluator
* the benchmark runner
* the dashboard
* the worktree manager
* the model router
* the self-upgrade machinery

Evolvo may create additional repos for:

* challenges
* experiments
* strategy testing
* benchmarking candidate approaches
* validating new generation techniques
* future user-requested projects

But the system itself remains one core repo.

## 2.3 Full autonomy inside practical execution boundaries

Evolvo is not a “suggestion system.”
It is allowed to:

* mutate prompts
* mutate runtime code
* mutate evaluator logic
* mutate model routing
* mutate benchmark definitions
* create repos
* manage labels
* manage issues
* merge to `main`
* promote new runtime versions of itself

Human input should be optional, minimal, and mostly limited to:

* injecting issues
* occasionally granting explicit approval for sensitive external actions

## 2.4 Evolution is first-class

The platform should treat self-improvement as a primary workflow, not an optional add-on.

The central loop is:

* attempt work
* evaluate outcome
* identify weaknesses
* propose self-mutations
* validate mutations
* adopt mutations that improve performance
* continue

## 2.5 Every meaningful change should be explainable

Even though Evolvo is autonomous, it should remain inspectable.

When Evolvo makes a significant internal change, it should be able to explain:

* what failed
* what it believes caused the failure
* what it changed
* why it expects the change to help
* what evidence suggests the change improved performance
* why it promoted the new version

This explanation should exist in GitHub, typically through issues, PR descriptions, and comments.

## 2.6 Autonomy without self-delusion

Since Evolvo is allowed to mutate even its evaluator and benchmarks, the system must still defend against degenerative behaviour such as:

* lowering difficulty to claim improvement
* weakening validations to increase pass rate
* overfitting to one benchmark
* redefining failures as successes
* selecting only easy work
* repeatedly generating admin noise instead of progress

The system should remain fully autonomous, but it must track comparative history in a way that makes fake progress detectable.

---

# 3. Platform Goals

## 3.1 Immediate goals

* build a self-operating engineering runtime in TypeScript
* accept work from GitHub issues
* execute work in worktrees linked to branches
* create and manage PRs
* use OpenAI for builder/engineer
* use Ollama for all other roles by default
* store internal memory/metrics in Postgres
* support self-mutation and self-promotion

## 3.2 Medium-term goals

* support challenge-based self-benchmarking
* create its own challenges
* create new repos as experiments
* maintain capability confidence
* route tasks to models dynamically
* compare strategies across runs
* operate a shadow runtime for self-upgrade validation
* maintain a rich historical mutation lineage

## 3.3 Long-term goals

* become your autonomous engineering partner
* execute real-world software tasks outside the Evolvo repo
* bootstrap entirely new software from issue prompts
* improve its internal strategy over time
* generalise from repo-specific tasks to broad engineering capabilities
* evolve into a platform capable of managing multiple projects autonomously

---

# 4. Scope

## 4.1 In scope

* core runtime/orchestrator
* model routing
* OpenAI + Ollama provider abstraction
* GitHub integration
* issue/label/PR orchestration
* worktree management
* command execution
* debugging loop
* evaluator
* challenge system
* benchmark system
* reflection system
* mutation engine
* memory engine
* supervisor
* shadow mode
* runtime promotion and restart
* dashboard
* Postgres state
* repo spawning
* logging and observability

## 4.2 Out of scope for early phases, but planned

* email sending
* public deployment automation
* arbitrary internet account creation
* production infrastructure mutation beyond declared boundaries
* multi-user SaaS surface

These can be added later, but any action with external side effects should produce a GitHub issue with `human-approval-needed`.

---

# 5. High-Level Operating Model

Evolvo operates as a set of cooperating subsystems.

At the highest level:

1. it observes GitHub
2. it decides what to do
3. it creates a worktree and branch
4. it performs execution
5. it validates results
6. it writes progress and evidence back to GitHub
7. it opens/updates PRs
8. it reflects on outcomes
9. it creates follow-up issues or self-mutation work
10. it validates candidate upgrades to itself
11. it promotes a new runtime version if the evidence justifies it

This means Evolvo is both:

* a task executor
* a self-modifying runtime

---

# 6. Role Architecture

Evolvo should use explicit internal roles. These are logical roles, not separate apps.

## 6.1 Governor / Selector

Purpose:

* decide what work matters
* choose next issue/challenge/mutation
* decide whether a candidate change should be attempted
* decide whether a validated upgrade is worth promoting

Responsibilities:

* prioritisation
* mutation selection
* promotion decisions
* escalation classification
* deciding when to ignore human-provided issues

Default model:

* Ollama initially
* may self-reassign later

## 6.2 Planner

Purpose:

* transform issue text and context into structured work plans

Responsibilities:

* read issue state
* infer objective
* infer constraints
* determine acceptance criteria
* decide task decomposition
* define evaluation plan
* identify dependencies
* decide whether to solve directly or improve the system

Default model:

* Ollama

## 6.3 Builder / Engineer

Purpose:

* implement code and configuration changes

Responsibilities:

* edit code
* write tests
* write configs
* patch workflows
* fix failures
* debug commands
* generate repos
* make runtime changes to Evolvo itself

Default model:

* OpenAI initially

## 6.4 Critic / Evaluator Interpreter

Purpose:

* interpret logs, command output, test failures, runtime behaviour

Responsibilities:

* classify failure type
* identify likely root causes
* score implementation completeness
* compare observed results against acceptance criteria

Default model:

* Ollama

## 6.5 Mutator

Purpose:

* propose self-improvement changes based on recurring outcomes

Responsibilities:

* identify system-level weaknesses
* propose mutations to prompts/runtime/evaluator/routing/benchmarks
* define validation plans for candidate mutations

Default model:

* Ollama

## 6.6 Archivist / Memory Manager

Purpose:

* maintain internal memory and confidence systems

Responsibilities:

* store outcomes
* track capability confidence
* track mutation lineage
* summarise recurring patterns
* inform future prioritisation

Default model:

* Ollama or deterministic logic
* should prefer deterministic processing where possible

## 6.7 Summariser / GitHub Narrator

Purpose:

* write useful issue/PR comments

Responsibilities:

* progress updates
* concise execution summaries
* PR mutation justification
* benchmark delta summaries
* promotion summaries

Default model:

* Ollama

---

# 7. Provider and Model Routing

## 7.1 Design goal

The system must support role-specific provider/model assignment.

It should not hardcode model usage into business logic. Instead, the platform should route model calls through a model gateway.

## 7.2 Initial routing policy

Initial default:

* Builder / Engineer → OpenAI
* Everything else → Ollama local

This is the initial policy, not a permanent rule.

## 7.3 Routing layers

There should be three layers of routing:

### Base role routing

Maps each role to a provider/model.

### Capability override routing

Allows override by domain or task type, for example:

* Next.js work
* CI/CD work
* prompt mutation
* debugging
* evaluator change
* repo generation

### Performance-informed routing

Allows Evolvo to promote or demote model choices based on measured outcomes.

## 7.4 Provider abstraction

Implement a uniform interface so the rest of the system does not care whether the provider is OpenAI or Ollama.

Core interface should support:

* system prompt
* user prompt
* optional schema
* response mode (json/text)
* timeout
* retry policy
* role metadata
* execution metadata capture

## 7.5 Structured output validation

Structured roles must return schema-validated outputs.

These include:

* planning outputs
* prioritisation outputs
* reflection outputs
* mutation proposals
* benchmark results
* promotion decisions

If the model returns invalid structured output:

1. attempt repair prompt
2. retry with same model once
3. fall back to alternative model/provider if allowed
4. record reliability failure
5. surface to issue/journal if relevant

## 7.6 Model performance tracking

Postgres should record:

* provider
* model
* role
* task type
* latency
* structured output validity
* downstream success/failure correlation
* cost, where applicable
* fallback frequency

This allows Evolvo to mutate routing based on evidence.

---

# 8. Core Runtime Topology

Evolvo should be built from a small number of cooperating processes and packages.

## 8.1 Supervisor

Purpose:

* own the active runtime lifecycle
* restart after crashes
* promote candidate versions
* rollback failed upgrades
* maintain single active leader

The supervisor should be minimal and stable, but not immutable in theory. It is allowed to evolve eventually, though changes to it should be treated as high-impact.

## 8.2 Runtime / Orchestrator

Purpose:

* the main autonomous brain

Responsibilities:

* poll GitHub
* interpret issues
* prioritise work
* orchestrate roles
* manage worktree lifecycle
* execute commands
* write to GitHub
* generate mutations
* request promotions

## 8.3 Worktree Manager

Purpose:

* manage issue-linked worktrees and branches

Responsibilities:

* create worktree per issue
* map issue ↔ branch ↔ path
* clean up finished worktrees
* protect active worktrees
* support branch naming conventions
* track worktree metadata

## 8.4 Execution Runner

Purpose:

* run shell commands safely and consistently

Responsibilities:

* install dependencies
* run tests/builds
* run dev servers
* run smoke tests
* capture stdout/stderr
* enforce timeouts
* normalise results
* expose command traces

## 8.5 Evaluation Engine

Purpose:

* determine if work succeeded and whether mutations improved performance

Responsibilities:

* validate acceptance criteria
* run tests/build
* run app and smoke checks
* compare benchmark results
* detect regressions

## 8.6 Memory Engine

Purpose:

* persistent internal cognition support

Responsibilities:

* store attempt history
* store failures and mutation outcomes
* track capability confidence
* feed prioritisation and mutation generation

## 8.7 GitHub Engine

Purpose:

* encapsulate all GitHub operations

Responsibilities:

* read issues
* create/update labels
* create/update comments
* open/update PRs
* manage branches where needed
* read/write project state if Evolvo adopts GitHub Projects

## 8.8 Dashboard

Purpose:

* human-facing observability layer

Responsibilities:

* show current runtime version
* show active issue/worktree
* show recent mutations
* show benchmark trends
* show model routing
* show failures
* show promotion history

Dashboard is not required for the core loop to function, but it is very valuable.

---

# 9. Repository Structure

A suggested structure:

```txt
evolvo/
  apps/
    supervisor/
    runtime/
    dashboard/

  packages/
    core/
    github/
    models/
    orchestration/
    worktrees/
    execution/
    evaluation/
    mutation-engine/
    memory/
    scoring/
    observability/
    benchmarks/
    challenges/
    prompts/
    schemas/
    utils/

  genome/
    prompts/
    templates/
    heuristics/
    routing/
    benchmark-config/
    issue-strategy/

  infra/
    docker/
    compose/
    scripts/

  docs/
    architecture/
    operations/
    experiments/

  .github/
    workflows/
    ISSUE_TEMPLATE/
    pull_request_template.md
```

## 9.1 Meaning of `genome/`

`genome/` contains Evolvo’s self-editable behavioural configuration.

This includes:

* prompts
* templates
* routing configs
* prioritisation heuristics
* benchmark config
* issue strategy

These are easier and safer to mutate than arbitrary runtime code and should likely be the first mutation surface.

## 9.2 Meaning of `packages/`

Packages contain the durable code architecture.

This is the actual runtime implementation and shared libraries.

## 9.3 Meaning of `apps/`

Apps are runnable entrypoints:

* supervisor
* runtime
* dashboard

---

# 10. GitHub Operating System

GitHub should be treated as Evolvo’s visible operating environment.

## 10.1 Canonical labels

At minimum, seed these labels:

### Human labels

* `human-made-challenge`
* `human-idea`
* `human-approval-needed`

### Evolvo-generated labels

* `evolvo-made-challenge`
* `evolvo-proposal`
* `evolvo-mutation`
* `evolvo-failure`
* `evolvo-experiment`
* `evolvo-benchmark-regression`
* `evolvo-capability-gap`
* `evolvo-self-upgrade`

### Status labels

* `status-triage`
* `status-planned`
* `status-in-progress`
* `status-blocked`
* `status-awaiting-evaluation`
* `status-done`
* `status-rejected`

### Risk labels

* `risk-low`
* `risk-medium`
* `risk-high`

### Area labels

* `area-runtime`
* `area-evaluator`
* `area-model-routing`
* `area-benchmarks`
* `area-prompts`
* `area-memory`
* `area-dashboard`
* `area-supervisor`

Evolvo is allowed to evolve the label taxonomy later.

## 10.2 Issue types

GitHub issues may be typed by label rather than a formal issue type field.

The runtime should recognise issue classes such as:

* human challenge
* human idea
* failure issue
* mutation proposal
* experiment
* capability gap
* benchmark regression
* upgrade request
* approval-required action

## 10.3 Issue lifecycle

Standard lifecycle:

1. issue detected
2. triaged
3. planned
4. worktree/branch created
5. progress comments written
6. execution and debugging
7. evaluation
8. PR opened/updated
9. issue updated with results
10. follow-up issues created if necessary
11. issue closed or deprioritised

## 10.4 Branch naming

Each issue should map to a branch and worktree.

Suggested format:

* `issue/123-short-slug`
* `mutation/456-improve-benchmark-selection`
* `experiment/789-template-vs-freeform-nextjs`

## 10.5 PR discipline

PRs should be used for:

* normal feature or repair work
* self-mutations
* runtime upgrades
* benchmark changes
* routing changes
* evaluator changes

Every meaningful PR should include:

* linked issue
* summary of intent
* what changed
* evaluation evidence
* relevant benchmark deltas
* model routing justification if applicable

## 10.6 Commenting style

Evolvo should narrate its work in a concise but useful way.

Comments should include:

* current step
* command/test status
* notable findings
* failure summary
* mutation rationale
* promotion result

The goal is not to dump logs into GitHub, but to keep a strong execution narrative.

---

# 11. Data Model and Postgres

Postgres is Evolvo’s internal memory substrate.

GitHub is canonical for work state, but Postgres stores structured history and performance data.

## 11.1 Core entities

### RuntimeVersion

Tracks self versions of Evolvo.

Fields:

* id
* git_ref
* created_at
* source_issue_number
* source_pr_number
* source_mutation_id
* state
* boot_status
* health_status
* promoted_at
* rolled_back_from_version_id

### IssueRecord

Mirror/cache of relevant GitHub issues.

Fields:

* github_issue_number
* title
* current_labels
* state
* kind
* priority_score
* last_synced_at
* linked_branch
* linked_worktree_id

### WorktreeRecord

Tracks issue execution environments.

Fields:

* id
* issue_number
* branch_name
* filesystem_path
* base_ref
* created_at
* status
* cleanup_at

### Attempt

Tracks one execution attempt.

Fields:

* id
* issue_number
* worktree_id
* runtime_version_id
* started_at
* ended_at
* outcome
* summary
* evaluation_status

### CommandExecution

Tracks command history.

Fields:

* id
* attempt_id
* step_name
* command
* cwd
* started_at
* ended_at
* exit_code
* stdout_path
* stderr_path
* summary

### FailureRecord

Tracks failures in structured form.

Fields:

* id
* attempt_id
* issue_number
* phase
* symptom
* root_cause_hypotheses
* confirmed_root_cause
* severity
* recurrence_group
* recurrence_count

### MutationProposal

Tracks self-improvement proposals.

Fields:

* id
* source_failure_id
* source_issue_number
* target_surface
* rationale
* predicted_benefit
* predicted_risk
* validation_plan
* state

### MutationOutcome

Tracks what happened when a mutation was attempted.

Fields:

* id
* mutation_proposal_id
* candidate_runtime_version_id
* outcome
* benchmark_delta_json
* notes
* adopted_at

### Capability

Tracks Evolvo’s belief about its own ability.

Fields:

* id
* capability_key
* confidence_score
* attempts
* successes
* failures
* recurring_failure_modes
* last_updated_at

### BenchmarkRun

Tracks benchmark and challenge evaluation runs.

Fields:

* id
* benchmark_id
* attempt_id
* runtime_version_id
* started_at
* ended_at
* outcome
* score
* metrics_json

### ModelInvocation

Tracks LLM calls for analysis and routing quality.

Fields:

* id
* role
* provider
* model
* task_kind
* prompt_hash
* duration_ms
* success
* schema_valid
* fallback_used
* cost_estimate
* created_at

### Artifact

Tracks files/logs/reports.

Fields:

* id
* attempt_id
* type
* path
* metadata_json
* retention_policy

## 11.2 Why both GitHub and Postgres matter

GitHub is best for:

* visible narrative
* issue/PR state
* collaboration
* audit trail

Postgres is best for:

* historical metrics
* mutation lineage
* querying repeated failure modes
* comparative benchmark analysis
* provider/model performance analysis
* structured capability tracking

Both are needed.

---

# 12. Memory Model

## 12.1 Memory categories

Evolvo should maintain memory in categories:

### Episodic memory

What happened in specific attempts.

Examples:

* command failed
* branch produced certain regression
* issue 183 required a specific fix

### Semantic memory

Generalised knowledge about capabilities and patterns.

Examples:

* Next.js repo scaffolding is moderately reliable
* CI failures often stem from missing workspace config
* certain model is poor at YAML repair

### Evolutionary memory

How Evolvo has changed over time.

Examples:

* planner prompt v7 improved decomposition
* routing change from model A to model B improved benchmark success
* benchmark config mutation caused regressions and was reverted

### Operational memory

Runtime-specific practical state.

Examples:

* active runtime version
* current worktree allocations
* pending promotions
* shadow runtime status

## 12.2 Memory usage in decision making

Memory should inform:

* prioritisation
* model routing
* mutation generation
* retry decisions
* benchmark selection
* challenge generation
* when to ignore human ideas

## 12.3 Memory compaction

As the system grows, raw attempt history will become noisy.

Evolvo should eventually learn to:

* summarise repetitive patterns
* compress stale details into aggregate knowledge
* retain links back to original attempts
* avoid forgetting failed mutation classes

---

# 13. Issue Planning and Prioritisation

## 13.1 Planning output

Every issue should be normalised into a structured plan.

Minimum fields:

* issue number
* issue kind
* objective
* constraints
* assumptions
* acceptance criteria
* direct execution vs system improvement choice
* dependencies
* evaluation plan
* estimated risk
* predicted value

## 13.2 Prioritisation dimensions

Evolvo should be free to invent its own strategy, but the initial engine should expose useful dimensions:

* strategic value
* benchmark relevance
* recurrence of related failures
* potential for general improvement
* implementation cost
* uncertainty
* risk
* novelty value
* human-origin signal
* capability-building value

## 13.3 Prioritisation philosophy

Because Evolvo is autonomous, it must be allowed to ignore human issues if it believes:

* the issue is low value
* a more fundamental system improvement should come first
* the request conflicts with a higher-priority goal
* the issue is under-specified and not worth immediate effort
* the issue is strategically bad

It should still explain that decision in the issue thread.

---

# 14. Worktree Strategy

## 14.1 Core rule

One worktree per issue.

This means:

* one issue
* one branch
* one worktree
* one primary execution journal

This creates clean traceability.

## 14.2 Worktree lifecycle

### Creation

When Evolvo starts an issue:

* derive branch name
* create git worktree
* checkout base ref, usually `main`
* register worktree in Postgres
* post issue comment indicating work start

### Hydration

Prepare environment:

* install dependencies if needed
* ensure env/config access
* verify repo state
* initialise journal

### Execution

Perform coding/debugging/evaluation in the worktree.

### Finalisation

If completed:

* push branch
* open/update PR
* summarise outcome

If abandoned or failed:

* summarise findings in issue
* create follow-up issues if needed

### Cleanup

By default, worktrees need not be kept long-term.
Cleanup may happen after:

* PR opened and stable
* issue abandoned
* logs/artifacts safely persisted

## 14.3 Journal expectations

The worktree journal should include:

* timeline of steps
* commands run
* key observations
* patches or changed files summary
* validation results
* final outcome

Important journal summaries should be mirrored into GitHub comments.

---

# 15. Execution Engine

## 15.1 Responsibilities

The execution engine must support:

* shell commands
* timeout enforcement
* environment variable injection
* process stdout/stderr capture
* dev server startup
* smoke testing
* browser automation
* retries where sensible
* command classification

## 15.2 Standard phases

A normal issue execution may include:

1. inspect
2. install
3. type-check
4. lint
5. test
6. build
7. run app
8. smoke test
9. debug
10. patch
11. rerun validation

These should be composable rather than hardcoded in one giant flow.

## 15.3 Smoke test model

At minimum, the system should support:

* starting the app
* verifying expected port is live
* checking main route or health route
* optionally performing basic browser navigation

Later Evolvo may make this more sophisticated.

## 15.4 Debugging loop

On failure, Evolvo should be able to:

* inspect logs
* classify error
* inspect changed files
* patch code
* rerun relevant command
* decide whether to continue or stop

This loop is critical. A coding system without a strong debug loop is not a serious engineering system.

---

# 16. Evaluation Engine

## 16.1 Default evaluation requirements

Per your preference, the baseline evaluator should include:

* build
* tests
* run app
* smoke test

Additional evaluation types may be added by Evolvo.

## 16.2 Evaluation categories

### Completion evaluation

Did the issue objective get implemented?

### Technical validity evaluation

Do lint, type-check, tests, and build pass?

### Runtime evaluation

Does the app start and behave minimally correctly?

### Regression evaluation

Did this break existing benchmark expectations?

### Mutation evaluation

Did a self-change improve future performance?

## 16.3 Acceptance model

The evaluator should output structured judgments such as:

* success
* partial success
* failure
* success with regression risk
* invalid due to environment
* inconclusive

## 16.4 Self-mutating evaluator

Since Evolvo is allowed to evolve the evaluator, evaluator changes must themselves be benchmarked against prior outcomes.

It should never simply say “the evaluator changed, therefore improvement is assumed.”

Instead it should record:

* prior evaluator behaviour
* new evaluator behaviour
* impact on benchmark outcomes
* impact on false positives/false negatives if measurable

---

# 17. Challenge System

## 17.1 Human challenges

A GitHub issue with the label `human-made-challenge` is a challenge.

The challenge is freeform natural language.
Planner must interpret it into a structured challenge plan.

## 17.2 Evolvo-created challenges

Evolvo may create issues with `evolvo-made-challenge`.

These may be used to:

* test a new strategy
* validate a mutation
* probe a weak capability
* stress a specific subsystem
* form an improvement hypothesis

## 17.3 Challenge registry

Even though issues are the visible source, internal challenge definitions should be normalised and stored in Postgres and/or generated config.

A challenge definition should include:

* title
* source issue
* intent
* artifact expectations
* validation steps
* scoring notes
* relevant capability tags

## 17.4 Challenge categories

Examples:

* fresh repo generation
* feature implementation
* CI setup
* bug fixing
* refactor
* test generation
* runtime upgrade stability
* prompt mutation impact
* model routing quality

## 17.5 Why challenges matter

Challenges are not just demos.
They are the training gym for evolution.

They give Evolvo stable pressure to improve.

---

# 18. Benchmark System

## 18.1 Benchmark categories

Benchmarks should exist in several forms:

### Fixed benchmarks

Stable recurring tasks used for historical comparison.

### Human challenges

User-injected, ad hoc evaluation tasks.

### Evolvo-generated benchmarks

Benchmarks invented by the system to test weak or promising areas.

### Regression packs

Focused checks against previously successful capabilities.

### Holdout-style packs

Tasks not used frequently in mutation loops, used to detect overfitting.

Even though Evolvo can mutate benchmarks, the system should still retain benchmark lineage and historical comparability.

## 18.2 Benchmark lineage

Every benchmark mutation should preserve:

* benchmark version
* source of change
* why it changed
* relation to previous benchmark
* performance before and after change

This prevents “improvement” from becoming impossible to interpret.

## 18.3 Benchmark scoring

Scoring can evolve, but initial metrics should include:

* pass/fail
* command success rates
* build/test status
* smoke test result
* time to completion
* retry count
* regression count

---

# 19. Failure Reflection

## 19.1 Why this matters

A failure must become data.

Without structured reflection, Evolvo will just retry blindly or create noisy meta-issues.

## 19.2 Reflection output

A failure reflection should answer:

* what failed
* where it failed
* what was the visible symptom
* likely root causes
* confidence in each root cause
* whether the failure is local or systemic
* whether to retry, fix directly, or mutate the system
* what follow-up issues or mutations are suggested

## 19.3 Failure taxonomy

Initial taxonomy should include:

* planning failure
* misunderstanding of requirements
* code generation defect
* environment/setup failure
* dependency/configuration issue
* runtime failure
* smoke/e2e failure
* evaluator mismatch
* model quality issue
* mutation regression
* benchmark integrity issue

Evolvo may evolve this taxonomy later.

## 19.4 Recurrence detection

Failures should be grouped into recurrence clusters.

This allows Evolvo to identify things like:

* repeated CI scaffold mistakes
* repeated TypeScript config issues
* repeated structured-output failures from a model
* repeated overfitting to a benchmark family

These clusters are prime mutation candidates.

---

# 20. Mutation Engine

## 20.1 Central concept

Mutation is the main mechanism of evolution.

A mutation is a proposed change to Evolvo’s own behaviour or architecture intended to improve future outcomes.

## 20.2 Mutation surfaces

Possible mutation surfaces include:

* prompts
* templates
* routing config
* prioritisation heuristics
* benchmark config
* issue strategy
* evaluator logic
* runtime orchestration logic
* worktree policy
* memory summarisation logic
* dashboard reporting
* supervisor behaviour
* challenge generation strategy

## 20.3 Mutation lifecycle

### 1. Trigger

A failure, trend, or opportunity suggests self-improvement.

### 2. Proposal

Mutator generates a structured mutation proposal.

### 3. Selection

Governor/Selector decides whether it is worth attempting now.

### 4. Execution

Builder applies mutation in a worktree branch.

### 5. Validation

Evaluation engine runs benchmark/regression checks.

### 6. Comparison

Results are compared against relevant baselines.

### 7. Adoption decision

If the mutation improved performance and did not regress critical areas, it may be merged.

### 8. Promotion

If the merged mutation changes runtime behaviour enough, Evolvo may promote itself into a new active version.

## 20.4 Mutation proposal schema

A mutation proposal should include:

* source issue/failure
* target surface
* rationale
* expected benefit
* expected risks
* implementation plan
* validation plan
* rollback considerations
* confidence level

## 20.5 Mutation prioritisation

Mutations should generally be prioritised higher when they:

* address repeated failures
* improve multiple capabilities
* are low effort relative to value
* reduce future issue churn
* improve model routing quality
* improve ability to self-debug
* improve repo generation reliability

---

# 21. Self-Upgrade and Promotion

## 21.1 Core requirement

Evolvo must be able to upgrade itself and then restart as the new version.

This requires explicit runtime versioning and promotion, not just merging code and hoping the running process updates somehow.

## 21.2 Runtime versions

Each accepted self-upgrade should produce a runtime version record.

A runtime version is a concrete operational identity tied to a commit/ref and validation state.

## 21.3 Upgrade flow

### Step 1

Mutation/change implemented in issue worktree.

### Step 2

PR opened and validated.

### Step 3

Change merged to `main`.

### Step 4

Supervisor detects new promotable candidate.

### Step 5

Candidate runtime is started in shadow mode if required.

### Step 6

Health checks and comparative validation run.

### Step 7

Supervisor promotes candidate to active runtime.

### Step 8

Old runtime is demoted/archived.

### Step 9

If promotion fails, rollback occurs.

## 21.4 Promotion criteria

Promotion criteria should be configurable and evolvable, but initially should include:

* runtime boot success
* health check pass
* no fatal startup errors
* issue queue handling intact
* required benchmark/evaluation checks passed
* shadow-mode sanity acceptable if used

## 21.5 Rollback criteria

Rollback should happen automatically on:

* boot failure
* health failure
* startup exceptions
* repeated fatal orchestration error
* obvious benchmark regression during promotion validation

## 21.6 Why supervisor exists

Without a supervisor, self-restart is brittle.

The supervisor gives Evolvo continuity when the runtime breaks itself.

---

# 22. Shadow Mode

## 22.1 Purpose

Shadow mode is a non-authoritative runtime started from a candidate version.

It reads state and makes decisions, but does not perform authoritative writes unless allowed.

## 22.2 Uses

* compare planner decisions
* compare issue prioritisation
* compare mutation proposals
* compare benchmark evaluation interpretations
* validate that a new runtime boots and behaves sensibly

## 22.3 Shadow comparison

A shadow runtime may be compared to the active runtime on:

* issue selection
* plan structure
* mutation recommendations
* routing choices
* benchmark evaluations

This is especially valuable for major internal changes.

## 22.4 Promotion from shadow mode

After a shadow period or validation set, the supervisor may promote the candidate.

Shadow mode is not always required, but it should be supported.

---

# 23. Repo Spawning and Experimental Repos

## 23.1 Why Evolvo needs satellite repos

Satellite repos let Evolvo:

* test strategies without polluting the core repo
* run controlled experiments
* benchmark generation styles
* try fresh scaffolds
* explore new architectures
* build new software from ideas

## 23.2 Repo categories

Possible repo types:

* challenge repos
* benchmark repos
* experiment repos
* output/product repos
* scratch repos

## 23.3 Repo metadata

Each spawned repo should be tracked with:

* repo name
* repo type
* origin issue/mutation
* creation reason
* linked capabilities
* last activity
* disposition

## 23.4 Disposal policy

Evolvo should be free to archive/delete/ignore experiment repos as needed, but should keep a record of what was learned.

---

# 24. Observability and Audit Trail

## 24.1 Goals

Observability should answer:

* what is Evolvo doing right now
* what version is active
* what issue is being worked on
* what failed recently
* what mutations were adopted
* how are models performing
* what changed after the last upgrade

## 24.2 GitHub as narrative layer

Use GitHub for:

* issue progress
* PR intent and evidence
* mutation justifications
* approval-required actions

## 24.3 Dashboard as internal control plane

The dashboard should expose:

* current issue queue
* active worktree
* current branch mappings
* recent command failures
* benchmark trends
* mutation outcomes
* model routing table
* runtime promotion history
* shadow candidate status

## 24.4 Log storage

Raw logs need not live forever in worktrees.

Recommended approach:

* write raw logs to disk/object-like path
* store metadata in Postgres
* summarise important findings back to GitHub
* clean worktrees aggressively once safe

---

# 25. Anti-Degeneracy and Anti-Self-Delusion Controls

Because Evolvo can change anything, this is essential.

## 25.1 Historical comparability

Even if benchmarks evolve, the system must keep:

* benchmark versions
* previous scores
* mutation lineage
* runtime lineage
* evaluator lineage

Without this, claims of improvement become meaningless.

## 25.2 Comparative validation

A mutation should not be judged by one successful run.
Use repeated or relevant comparative checks where practical.

## 25.3 Benchmark diversity

Do not judge evolution on only one challenge family.
Use multiple benchmark categories.

## 25.4 Holdout thinking

Maintain some evaluation paths that are not always used for direct optimisation.
This helps expose overfitting.

## 25.5 Mutation memory

Record rejected and reverted mutations.
Otherwise Evolvo may repeatedly rediscover the same bad ideas.

## 25.6 Admin-noise detection

Track issue churn and meta-work ratio.

Evolvo should not evolve into a system that mostly produces:

* proposals
* labels
* comments
* dashboards
* benchmark tweaks

while doing little meaningful engineering.

## 25.7 Difficulty collapse detection

Track whether benchmark evolution is reducing difficulty in a way that inflates scores without increasing broad capability.

---

# 26. Sensitive External Actions

Per your requirement, Evolvo may request human approval for meaningful external effects.

## 26.1 Approval-required categories

Initially:

* sending email
* public deployment
* interacting with external accounts/services not yet approved
* actions with financial or reputational impact
* changes affecting production systems outside sandboxed scope

## 26.2 Approval mechanism

When such an action is desired, Evolvo should create or update an issue with:

* `human-approval-needed`

It should explain:

* what action it wants to take
* why
* risks
* expected value
* rollback strategy if applicable

---

# 27. Security and Execution Environment

## 27.1 Initial hosting context

Initial runtime environment:

* Ubuntu in WSL
* laptop-hosted
* Docker and Docker Compose available
* Postgres via Docker Compose
* Ollama local
* OpenAI API available
* worktree filesystem access
* browser automation allowed
* dev servers allowed

## 27.2 Environment assumptions

Evolvo needs access to:

* GitHub credentials/app token
* OpenAI API key
* Ollama local endpoint
* Postgres connection
* repo filesystem
* Docker CLI
* git CLI
* package managers and build tools

## 27.3 Execution policy

Evolvo should be able to:

* clone/create repos
* spawn worktrees
* run commands
* launch containers
* run browsers
* patch files
* manage branches

Execution should still have:

* timeouts
* logging
* command result capture
* some sanity around cleanup

---

# 28. Stack

## 28.1 Core stack

* TypeScript
* Node.js
* Next.js for dashboard
* Postgres
* Docker Compose
* GitHub API
* OpenAI API
* Ollama local

## 28.2 Suggested library choices

These are suggestions, not constraints:

* Octokit for GitHub
* Prisma or Drizzle for Postgres access
* Zod for schemas
* execa for shell execution
* simple process supervisor logic in Node, or a small runtime wrapper
* Playwright for browser smoke/e2e
* pino or structured logger for logs
* node-cron or internal scheduler for polling/ticks if needed

---

# 29. Internal Package Design

Suggested responsibilities by package:

## `packages/core`

Core shared types and utilities.

## `packages/github`

GitHub client, issue/PR/label/project operations.

## `packages/models`

Provider abstraction, routing, invocation tracking, schema validation.

## `packages/orchestration`

Issue loop, role coordination, prioritisation, control flow.

## `packages/worktrees`

Worktree creation, cleanup, mapping, status tracking.

## `packages/execution`

Shell commands, dev server control, timeouts, log capture.

## `packages/evaluation`

Build/test/run/smoke validation, mutation comparison, scoring.

## `packages/mutation-engine`

Failure-to-mutation reasoning, proposal tracking, adoption logic.

## `packages/memory`

Persistence, capability tracking, summaries, recurrence clusters.

## `packages/scoring`

Priority and benchmark scoring logic.

## `packages/benchmarks`

Benchmark definitions, registry, runner logic, lineage management.

## `packages/challenges`

Challenge parsing, normalisation, challenge-specific evaluators.

## `packages/prompts`

Prompt loading, versioning, prompt metadata.

## `packages/schemas`

Zod/JSON schemas for structured role outputs.

## `packages/observability`

Metrics, traces, dashboard-facing query helpers.

---

# 30. Prompt and Genome Strategy

## 30.1 Why prompts belong in `genome/`

Prompts are part of Evolvo’s behaviour and must be easy to mutate and version.

## 30.2 Prompt versioning

Each prompt should have metadata:

* prompt id
* role
* version
* last changed by issue/pr
* performance notes if any

## 30.3 Prompt mutation flow

If prompt mutation is proposed:

* create PR with justification
* run benchmark comparison
* store performance deltas
* merge only if worthwhile

## 30.4 Beyond prompts

`genome/` should also hold:

* repo templates
* routing policies
* heuristic weights
* issue strategy definitions
* benchmark strategy config

This keeps many behaviour changes out of deep runtime code early on.

---

# 31. Scheduling and Main Loop

## 31.1 Main loop responsibilities

The runtime should regularly:

* sync GitHub state
* update issue cache
* assess active work
* choose next work
* execute issue loop
* evaluate outcomes
* process pending mutation proposals
* process promotion opportunities
* emit summaries

## 31.2 Concurrency

Recommended starting model:

* one active leader runtime
* one primary issue execution at a time initially
* support future concurrency later

Reason:
self-modifying systems get complicated quickly.
Serial execution is easier to reason about at first.

## 31.3 Future concurrency

Later, Evolvo can evolve into:

* one leader
* multiple workers
* issue queue scheduling
* parallel challenge runs
* isolated mutation test runs

But phase one should stay simpler.

---

# 32. Suggested Database Tables

A concise initial table set:

* `runtime_versions`
* `issues`
* `worktrees`
* `attempts`
* `command_executions`
* `failures`
* `mutation_proposals`
* `mutation_outcomes`
* `capabilities`
* `benchmark_runs`
* `benchmarks`
* `spawned_repos`
* `model_invocations`
* `artifacts`
* `promotion_events`
* `shadow_comparisons`

This is enough to support most of the platform.

---

# 33. Dashboard Design

## 33.1 Main views

### Overview

* active runtime version
* current issue
* queue status
* recent mutations
* last promotion

### Issues

* tracked issues
* state
* priority
* linked branch/worktree
* last activity

### Runtime Versions

* candidate/promoted/failed versions
* lineage graph
* health state
* promotion history

### Mutations

* proposal list
* status
* target surface
* benchmark delta
* adoption/revert history

### Benchmarks

* benchmark families
* trends over time
* regressions
* holdout status

### Models

* role routing
* provider health
* latency
* schema-valid rate
* success association

### Failures

* recent failures
* recurrence clusters
* top failure themes

### Repos

* spawned repos
* category
* current state
* purpose

---

# 34. Development Phases

## Phase 0 — Foundations

Goal:
create the platform skeleton and stable execution environment.

Build:

* monorepo structure
* Postgres setup
* GitHub integration basics
* model gateway abstraction
* issue sync
* worktree manager
* execution runner
* schema package
* logging
* dashboard skeleton

Deliverables:

* Evolvo can read issues
* create labels if missing
* create a worktree for an issue
* run basic commands
* write comments back to GitHub

## Phase 1 — Single-Issue Autonomous Execution

Goal:
Evolvo can take one issue and work it end-to-end.

Build:

* planner output schema
* builder loop
* critic/reflection loop
* branch/worktree mapping
* PR open/update logic
* issue narration
* test/build/run/smoke evaluator

Deliverables:

* one issue → one worktree → one PR → one issue summary

## Phase 2 — Structured Reflection and Failure Memory

Goal:
turn failures into usable long-term signals.

Build:

* failure taxonomy
* reflection outputs
* recurrence clustering
* capability tracking
* mutation proposal generation
* issue creation for failures and capability gaps

Deliverables:

* failures become structured records
* repeated failures start producing mutation ideas

## Phase 3 — Challenge and Benchmark Engine

Goal:
give Evolvo stable self-improvement pressure.

Build:

* support `human-made-challenge`
* support `evolvo-made-challenge`
* challenge normalisation
* benchmark registry
* benchmark run tracking
* trend dashboard

Deliverables:

* Evolvo can benchmark itself and track changes over time

## Phase 4 — Self-Mutation of Genome

Goal:
allow Evolvo to improve prompts/templates/routing/heuristics.

Build:

* mutation proposal schema
* mutation PR generation
* benchmark comparison for mutations
* adoption/rejection storage
* routing mutation support
* prompt/template mutation support

Deliverables:

* Evolvo can improve its own genome and justify it

## Phase 5 — Runtime Self-Modification

Goal:
allow Evolvo to change deeper runtime code and evaluator logic.

Build:

* runtime mutation handling
* evaluator mutation lineage
* higher-impact benchmark validation
* runtime version records
* promotion candidate detection

Deliverables:

* Evolvo can change the system code that runs itself

## Phase 6 — Supervisor, Shadow Mode, Promotion

Goal:
complete the self-upgrade loop.

Build:

* supervisor process
* active runtime registration
* candidate runtime startup
* shadow mode
* promotion logic
* rollback handling
* runtime lineage view

Deliverables:

* Evolvo can merge changes, boot candidate version, validate, and promote itself

## Phase 7 — Satellite Repo Strategy

Goal:
allow broader experimentation and software creation.

Build:

* repo spawning logic
* experiment repo metadata
* challenge repo workflows
* repo classification
* repo lifecycle management

Deliverables:

* Evolvo can create new repos for challenges, experiments, and outputs

## Phase 8 — Broader Autonomy and Personal Engineer Mode

Goal:
turn Evolvo into your general autonomous engineer.

Build:

* cross-repo task support
* repo onboarding
* user-goal issue patterns
* strategic planning capabilities
* task portfolio selection
* richer long-horizon planning

Deliverables:

* Evolvo can take larger engineering requests and work across projects

---

# 35. Suggested Order of Implementation Within Phases

A practical order:

1. repo skeleton + infra
2. database + migrations
3. GitHub read/write
4. role schemas
5. model gateway
6. worktree manager
7. execution runner
8. issue planner
9. evaluator
10. PR loop
11. failure reflection
12. mutation proposals
13. benchmark engine
14. genome mutation
15. runtime mutation
16. supervisor + promotion
17. spawned repos
18. expanded autonomy

---

# 36. First Milestones

## Milestone 1

“Evolvo can read a GitHub issue, create a worktree, implement a basic change, run validation, open a PR, and narrate the process.”

## Milestone 2

“Evolvo can process a `human-made-challenge` issue and evaluate itself against it.”

## Milestone 3

“Evolvo can generate a mutation proposal from a failure and implement a genome-level self-improvement.”

## Milestone 4

“Evolvo can merge a change to itself and promote a new runtime version via supervisor.”

## Milestone 5

“Evolvo can create new repos to test strategies and learn from the results.”

---

# 37. Risks

## 37.1 False progress

It may appear to improve by mutating scoring/benchmarks/evaluator in flattering ways.

Mitigation:

* lineage
* historical comparison
* diverse benchmarks
* mutation evidence

## 37.2 Meta-work explosion

It may spend too much time creating issues/comments/proposals instead of building.

Mitigation:

* track action ratios
* bias toward execution
* score meta-work utility

## 37.3 Runtime fragility

Self-modification may break the live runtime.

Mitigation:

* supervisor
* shadow mode
* promotion and rollback

## 37.4 Model instability

Local model behaviour may be inconsistent.

Mitigation:

* schema validation
* fallback
* performance tracking

## 37.5 Worktree/environment drift

Long-lived worktrees may become stale.

Mitigation:

* keep one worktree per issue
* clean aggressively
* rebuild as needed

---

# 38. Success Metrics

Track success on multiple axes.

## 38.1 Execution metrics

* issue completion rate
* PR merge rate
* first-pass build/test success
* smoke test success

## 38.2 Evolution metrics

* successful mutation adoption rate
* benchmark delta after mutations
* regression rate after self-upgrades
* repeated failure reduction

## 38.3 Capability metrics

* capability confidence growth
* breadth of task types completed
* repo generation reliability

## 38.4 Runtime metrics

* successful promotions
* rollback frequency
* runtime health uptime

## 38.5 Model metrics

* schema-valid output rate
* cost per successful builder task
* fallback frequency
* success by provider/model/role

---

# 39. Product End State

The mature form of Evolvo is:

* a GitHub-native autonomous engineering runtime
* self-improving
* self-benchmarking
* self-promoting
* able to create and work across repos
* able to choose what matters
* able to narrate and justify its decisions
* able to act as your personal engineering system

You should be able to open issues like:

* “upgrade this repo with feature X”
* “create a SaaS for this idea”
* “investigate why this architecture is underperforming”
* “make a benchmark for your own CI capability”
* “compare two routing strategies and adopt the better one”

And Evolvo should decide how to handle them.
