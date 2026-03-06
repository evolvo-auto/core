# 1. GitHub label and issue rules

## 1.1 Principles

GitHub is Evolvo’s visible operating system.

That means:

* every meaningful unit of work starts from or becomes an issue
* every code-bearing change should end in a PR
* issues are the visible source of intent
* PRs are the visible source of implementation
* comments are the visible execution journal
* labels are the visible state machine

Postgres can store richer structure, but GitHub should remain understandable on its own.

---

## 1.2 Label taxonomy

Use a deliberately structured label taxonomy from the start.

### Source labels

These define who originated the work.

* `source:human`
* `source:evolvo`

### Primary kind labels

Exactly one of these should normally be present.

* `kind:idea`
* `kind:challenge`
* `kind:feature`
* `kind:bug`
* `kind:experiment`
* `kind:failure`
* `kind:mutation`
* `kind:upgrade`
* `kind:benchmark`
* `kind:approval-request`

### State labels

Exactly one active state label should normally exist at a time.

* `state:triage`
* `state:planned`
* `state:selected`
* `state:in-progress`
* `state:awaiting-eval`
* `state:awaiting-promotion`
* `state:blocked`
* `state:done`
* `state:rejected`
* `state:deferred`

### Risk labels

* `risk:low`
* `risk:medium`
* `risk:high`
* `risk:systemic`

### Surface labels

These define what part of Evolvo or its environment is affected.

* `surface:prompts`
* `surface:templates`
* `surface:routing`
* `surface:runtime`
* `surface:evaluator`
* `surface:benchmarks`
* `surface:memory`
* `surface:worktrees`
* `surface:supervisor`
* `surface:dashboard`
* `surface:github-ops`
* `surface:external-repo`

### Capability labels

These can grow over time.

* `capability:nextjs`
* `capability:nestjs`
* `capability:typescript`
* `capability:ci`
* `capability:testing`
* `capability:debugging`
* `capability:repo-generation`
* `capability:self-upgrade`
* `capability:model-routing`

### Human policy labels

* `human-made-challenge`
* `evolvo-made-challenge`
* `human-approval-needed`

Keep these exact three because you already decided them.

### Evaluation labels

* `eval:pending`
* `eval:passed`
* `eval:partial`
* `eval:failed`
* `eval:regressed`

### Priority labels

These are optional if priority is mostly internal, but useful for GitHub visibility.

* `priority:p0`
* `priority:p1`
* `priority:p2`
* `priority:p3`

---

## 1.3 Label rules

### Required minimum label set for all tracked issues

Every issue Evolvo tracks should have at least:

* one source label
* one kind label
* one state label

### Challenges

Human-provided challenge issues must include:

* `source:human`
* `kind:challenge`
* `human-made-challenge`
* `state:triage`

Evolvo-created challenge issues must include:

* `source:evolvo`
* `kind:challenge`
* `evolvo-made-challenge`
* `state:triage`

### Mutation issues

Mutation issues must include:

* `source:evolvo`
* `kind:mutation`
* one `surface:*`
* one `risk:*`
* `state:triage`

### Approval issues

Any issue requiring human approval must include:

* `kind:approval-request`
* `human-approval-needed`
* `state:blocked`

### Upgrade issues

Any issue whose direct purpose is self-upgrade should include:

* `kind:upgrade`
* `surface:runtime` or another relevant surface
* `state:planned` or later

---

## 1.4 Issue title conventions

Use predictable prefixes.

### Human issues

Humans can title freely.

### Evolvo-created issues

Use prefixes for scanability:

* `Challenge: ...`
* `Failure: ...`
* `Mutation: ...`
* `Upgrade: ...`
* `Experiment: ...`
* `Capability Gap: ...`
* `Approval Request: ...`

Examples:

* `Failure: Next.js challenge smoke test failed after build success`
* `Mutation: Improve planner handling of fresh repo bootstrap`
* `Upgrade: Promote runtime with routing v12 and evaluator v5`
* `Experiment: Compare template-first vs freeform Next.js repo generation`

---

## 1.5 Issue body templates

## A. Human challenge issue template

```md
## Goal

Describe the challenge in plain English.

## Constraints

Optional. Any hard requirements or forbidden approaches.

## Success signal

Optional. What would count as success to you.
```

Evolvo should normalise this into structured internal form.

---

## B. Evolvo mutation issue template

```md
## Why this exists

Describe the failure trend, weakness, or opportunity that led to this mutation proposal.

## Evidence

List the issues, attempts, benchmark results, or recurring failure patterns that support this proposal.

## Proposed mutation

Describe what should change.

## Expected benefit

Describe what capability or metric should improve.

## Risks

Describe likely regressions or risks.

## Validation plan

Describe what benchmarks, regression packs, or issue replays should be used.

## Promotion impact

State whether this likely affects runtime promotion, evaluator behaviour, routing, or benchmark lineage.
```

---

## C. Evolvo failure issue template

```md
## Failed objective

What was Evolvo trying to do?

## Failure summary

What visibly failed?

## Suspected root causes

List likely causes.

## Local or systemic

State whether this appears isolated or likely systemic.

## Proposed next actions

List possible direct fixes, mutations, or experiments.
```

---

## D. Approval request template

```md
## Requested action

Describe the external action Evolvo wants to perform.

## Reason

Why does Evolvo believe this is valuable?

## Risks

What are the main risks?

## Expected outcome

What does Evolvo expect to gain?

## Rollback or containment

How can this be undone or contained?
```

---

## 1.6 Issue lifecycle rules

## Standard issue lifecycle

### 1. Triage

Labels:

* `state:triage`

Actions:

* read issue
* classify source/kind/surface
* decide whether to ignore, defer, plan, or reject

### 2. Planned

Labels:

* `state:planned`

Actions:

* issue has a structured plan
* dependencies and acceptance criteria known
* worktree not yet created

### 3. Selected

Labels:

* `state:selected`

Actions:

* issue has been chosen as next active work
* branch name reserved
* worktree pending creation

### 4. In progress

Labels:

* `state:in-progress`

Actions:

* worktree exists
* commands/logs are being generated
* issue should receive progress comments

### 5. Awaiting eval

Labels:

* `state:awaiting-eval`

Actions:

* implementation pass done
* evaluator running or pending
* PR may exist already

### 6. Awaiting promotion

Labels:

* `state:awaiting-promotion`

Use only when:

* merged change affects active runtime promotion
* supervisor/shadow flow still pending

### 7. Done

Labels:

* `state:done`
* likely `eval:passed`

### 8. Rejected or deferred

Labels:

* `state:rejected` or `state:deferred`

Use when:

* Evolvo decides not to do the work now
* the issue is low value
* the issue is superseded by systemic work
* a mutation proposal was invalidated

---

## 1.7 PR rules

Every significant PR should include:

* linked issue number
* issue kind
* surfaces affected
* risk level
* summary of changes
* evaluation summary
* benchmark delta if applicable
* promotion relevance if applicable

### PR title format

* `feat(issue-123): add ...`
* `fix(issue-123): repair ...`
* `mutation(issue-456): improve ...`
* `upgrade(issue-789): runtime promotion candidate ...`
* `experiment(issue-222): compare ...`

### PR labels

PRs should mirror issue context where useful:

* matching `kind:*`
* matching `surface:*`
* matching `risk:*`
* `eval:*` after evaluation
* `promotion:candidate` if relevant

---

## 1.8 GitHub comment rules

Evolvo should comment when:

* it starts work
* it hits a major blocker
* it finishes the main implementation pass
* evaluation completes
* it chooses to reject or defer the issue
* it proposes a meaningful mutation from the issue
* a promotion candidate is created or rejected

### Comment style rules

Comments should be concise and structured:

* current status
* what changed
* evidence
* next step

Do not spam every low-level shell command into GitHub.
Summarise, do not stream raw noise.

---

## 1.9 Decision rules for ignoring human issues

Evolvo may ignore a human issue if it determines that:

* it has low strategic value
* it is under-specified and low-value to clarify
* it is dominated by a more systemic improvement
* it conflicts with higher-priority work
* it is likely to reduce long-term progress

If so, it should post a short explanation and label the issue:

* `state:deferred` or `state:rejected`

---
