
# 4. Worktree lifecycle contract

This should be formal because a lot of the system depends on it.

---

## 4.1 Core rule

One issue maps to one active worktree and one branch.

No issue should have multiple concurrent worktrees unless Evolvo explicitly evolves that policy later.

---

## 4.2 Worktree states

```ts
export type WorktreeStatus =
  | "reserved"
  | "creating"
  | "ready"
  | "hydrating"
  | "active"
  | "awaiting-eval"
  | "completed"
  | "failed"
  | "archived"
  | "cleaned";
```

---

## 4.3 Worktree record

```ts
export type WorktreeRecord = {
  id: string;
  issueNumber: number;
  branchName: string;
  path: string;
  baseRef: string;
  status: WorktreeStatus;
  createdAt: string;
  updatedAt: string;
  lastCommandAt?: string;
  cleanupEligibleAt?: string;
  linkedPullRequestNumber?: number;
};
```

---

## 4.4 Lifecycle stages

## Stage 1: Reservation

Trigger:
issue selected for active work.

Actions:

* determine branch name
* ensure no existing active worktree for the issue
* create DB record with `reserved`

Contract:

* no filesystem path yet required
* issue label becomes `state:selected`

---

## Stage 2: Creation

Trigger:
runtime begins execution.

Actions:

* create git worktree from base ref, usually `main`
* create branch if absent
* verify filesystem path exists
* register metadata

Contract:

* status becomes `creating`, then `ready`
* issue comment: work has started
* issue label becomes `state:in-progress`

---

## Stage 3: Hydration

Actions:

* verify repo shape
* install deps if needed
* confirm required tools available
* create attempt journal
* store environment fingerprint

Contract:

* status becomes `hydrating`, then `active`
* failed hydration should generate a clear failure reflection

---

## Stage 4: Active execution

Actions:

* inspect files
* edit code
* run commands
* debug failures
* rerun checks

Contract:

* all shell commands must be attached to the current attempt
* changed files must be discoverable from git
* major milestones should be narrated back to GitHub

---

## Stage 5: Awaiting evaluation

Trigger:
builder believes implementation is ready.

Actions:

* run evaluation plan
* produce structured evaluator output

Contract:

* status becomes `awaiting-eval`
* if evaluation passes and code changed, PR should be opened or updated
* if evaluation fails, return to `active` or mark `failed`

---

## Stage 6: Completion

Trigger:
issue work is finished for this pass.

Actions:

* push branch
* open/update PR if applicable
* summarise result in issue
* mark worktree complete

Contract:

* status becomes `completed`
* issue label becomes `state:done` if fully resolved, otherwise stays active/deferred depending on outcome

---

## Stage 7: Failure

Trigger:
execution or evaluation is abandoned for now.

Actions:

* write failure summary to issue
* open failure and/or mutation issues if appropriate
* mark worktree failed

Contract:

* status becomes `failed`
* issue label becomes `state:blocked`, `state:deferred`, or remains `state:in-progress` if Evolvo intends to retry later

---

## Stage 8: Cleanup

Actions:

* persist relevant logs/artifacts
* ensure branch/PR references are stored
* delete worktree directory
* mark record cleaned

Contract:

* no worktree should be cleaned before critical logs and summaries are safely persisted
* status becomes `archived` or `cleaned`

---

## 4.5 Worktree invariants

These must always hold.

* one active issue → at most one active worktree
* one worktree → exactly one branch
* one worktree → exactly one current issue owner
* all commands in a worktree belong to a known attempt
* worktree cannot be cleaned before journaling and artifact persistence
* PR branch must match worktree branch
* issue comments should reference the issue’s current worktree status indirectly, not raw filesystem paths

---

## 4.6 Branch naming contract

```ts
export function makeBranchName(issueNumber: number, slug: string): string {
  return `issue/${issueNumber}-${slug}`;
}
```

Examples:

* `issue/142-improve-planner-routing`
* `issue/211-nextjs-challenge-bootstrap`
* `issue/402-promote-runtime-v7`

---

## 4.7 Artifact contract

Each worktree attempt should persist at least:

* git diff summary
* command history
* evaluator summary
* failure reflection if failed
* final summary

Recommended artifact types:

```ts
export type ArtifactType =
  | "command-log"
  | "stdout"
  | "stderr"
  | "diff-summary"
  | "evaluation-report"
  | "failure-reflection"
  | "promotion-report"
  | "issue-summary";
```
