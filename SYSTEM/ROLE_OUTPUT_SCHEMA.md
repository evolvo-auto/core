
# 2. Role output schemas

Use strict schemas for role outputs. Below are TypeScript/Zod-style definitions.

---

## 2.1 Shared base types

```ts
export type RiskLevel = "low" | "medium" | "high" | "systemic";

export type IssueKind =
  | "idea"
  | "challenge"
  | "feature"
  | "bug"
  | "experiment"
  | "failure"
  | "mutation"
  | "upgrade"
  | "benchmark"
  | "approval-request";

export type Outcome =
  | "success"
  | "partial"
  | "failure"
  | "blocked"
  | "inconclusive";

export type Surface =
  | "prompts"
  | "templates"
  | "routing"
  | "runtime"
  | "evaluator"
  | "benchmarks"
  | "memory"
  | "worktrees"
  | "supervisor"
  | "dashboard"
  | "github-ops"
  | "external-repo";
```

---

## 2.2 Planner output schema

Purpose:
turn raw issue state into a structured plan.

```ts
export type PlannerOutput = {
  issueNumber: number;
  kind: IssueKind;
  title: string;
  objective: string;
  constraints: string[];
  assumptions: string[];
  acceptanceCriteria: string[];
  relevantSurfaces: Surface[];
  capabilityTags: string[];
  dependencies: number[];
  recommendedApproach:
    | "direct-execution"
    | "system-mutation-first"
    | "experiment-first"
    | "defer"
    | "reject";
  reasoningSummary: string;
  evaluationPlan: {
    requireInstall: boolean;
    requireTypecheck: boolean;
    requireLint: boolean;
    requireTests: boolean;
    requireBuild: boolean;
    requireRun: boolean;
    requireSmoke: boolean;
    extraChecks: string[];
  };
  riskLevel: RiskLevel;
  expectedValueScore: number; // 0-100
  confidenceScore: number; // 0-100
};
```

### Validation rules

* `objective` required and non-empty
* `acceptanceCriteria` min 1 unless `reject`
* `expectedValueScore` 0–100
* `confidenceScore` 0–100

---

## 2.3 Governor / selector output schema

Purpose:
choose the next work item or decide whether to pursue a mutation/promotion.

```ts
export type SelectorDecision = {
  decisionType:
    | "select-issue"
    | "defer-issue"
    | "reject-issue"
    | "select-mutation"
    | "select-experiment"
    | "promote-runtime"
    | "reject-promotion";
  targetIssueNumber?: number;
  targetMutationId?: string;
  targetRuntimeVersionId?: string;
  reason: string;
  priorityScore: number; // 0-100
  urgencyScore: number; // 0-100
  strategicValueScore: number; // 0-100
  expectedLeverageScore: number; // 0-100
  riskPenaltyScore: number; // 0-100
  nextStep: string;
};
```

---

## 2.4 Builder / engineer output schema

Purpose:
define the result of a coding pass.

```ts
export type BuilderOutput = {
  issueNumber: number;
  summary: string;
  filesIntendedToChange: string[];
  filesActuallyChanged: string[];
  commandsSuggested: Array<{
    name: string;
    command: string;
    cwd?: string;
    timeoutMs?: number;
  }>;
  implementationNotes: string[];
  possibleKnownRisks: string[];
  believesReadyForEvaluation: boolean;
};
```

This is not the source of truth for changed files; git diff is.
It is the builder’s declared intent/result.

---

## 2.5 Critic output schema

Purpose:
interpret failures or assess completeness.

```ts
export type CriticOutput = {
  issueNumber: number;
  outcome: Outcome;
  completionAssessment: "complete" | "mostly-complete" | "partial" | "failed";
  primarySymptoms: string[];
  likelyRootCauses: Array<{
    cause: string;
    confidence: number; // 0-100
  }>;
  isSystemic: boolean;
  directFixRecommended: boolean;
  mutationRecommended: boolean;
  recommendedNextAction:
    | "retry"
    | "patch-directly"
    | "open-mutation"
    | "open-failure"
    | "defer"
    | "stop";
  notes: string[];
};
```

---

## 2.6 Evaluator output schema

Purpose:
formal result of evaluation.

```ts
export type EvaluatorOutput = {
  issueNumber: number;
  outcome: Outcome;
  checks: {
    install?: "passed" | "failed" | "skipped";
    typecheck?: "passed" | "failed" | "skipped";
    lint?: "passed" | "failed" | "skipped";
    tests?: "passed" | "failed" | "skipped";
    build?: "passed" | "failed" | "skipped";
    run?: "passed" | "failed" | "skipped";
    smoke?: "passed" | "failed" | "skipped";
  };
  extraChecks: Array<{
    name: string;
    result: "passed" | "failed" | "skipped";
    notes?: string;
  }>;
  regressionRisk: "none" | "low" | "medium" | "high";
  summary: string;
  shouldOpenPR: boolean;
  shouldMergeIfPRExists: boolean;
};
```

---

## 2.7 Failure reflection schema

Purpose:
turn a failed attempt into reusable structured insight.

```ts
export type FailureReflection = {
  issueNumber: number;
  attemptId: string;
  phase:
    | "planning"
    | "implementation"
    | "environment"
    | "evaluation"
    | "promotion"
    | "runtime";
  symptom: string;
  likelyRootCauses: Array<{
    cause: string;
    confidence: number; // 0-100
  }>;
  recurrenceHints: string[];
  localVsSystemic: "local" | "systemic" | "unclear";
  immediateFollowups: Array<{
    type: "retry" | "fix" | "mutation" | "experiment" | "approval-request";
    title: string;
    summary: string;
  }>;
  shouldCreateFailureIssue: boolean;
  shouldCreateMutationIssue: boolean;
};
```

---

## 2.8 Mutation proposal schema

Purpose:
formal proposal for self-improvement.

```ts
export type MutationProposal = {
  id?: string;
  sourceIssueNumber: number;
  sourceFailureIds: string[];
  targetSurface: Surface;
  title: string;
  rationale: string;
  evidence: string[];
  proposedChangeSummary: string;
  expectedBenefits: string[];
  expectedRisks: string[];
  validationPlan: {
    benchmarkIds: string[];
    replayIssueNumbers: number[];
    requireShadowMode: boolean;
    minimumPassRateDelta?: number;
    maxAllowedRegressionCount?: number;
  };
  promotionImpact: "none" | "low" | "medium" | "high";
  confidenceScore: number; // 0-100
  priorityScore: number; // 0-100
};
```

---

## 2.9 Promotion decision schema

Purpose:
decide whether a candidate runtime becomes active.

```ts
export type PromotionDecision = {
  candidateRuntimeVersionId: string;
  decision: "promote" | "reject" | "shadow-first" | "rollback";
  reason: string;
  healthCheckPassed: boolean;
  benchmarkSummary: {
    totalBenchmarks: number;
    passed: number;
    failed: number;
    regressed: number;
  };
  confidenceScore: number; // 0-100
  requiredNextAction:
    | "activate-now"
    | "run-shadow"
    | "collect-more-evidence"
    | "rollback-candidate";
};
```

---

## 2.10 Narrator output schema

Purpose:
generate GitHub comments cleanly.

```ts
export type NarratorOutput = {
  target: "issue" | "pull-request";
  targetNumber: number;
  commentKind:
    | "work-started"
    | "progress"
    | "blocker"
    | "evaluation-result"
    | "mutation-rationale"
    | "promotion-update"
    | "defer"
    | "reject";
  title: string;
  body: string;
};
```