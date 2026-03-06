-- CreateEnum
CREATE TYPE "AttemptOutcome" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILURE', 'BLOCKED', 'INCONCLUSIVE');

-- CreateEnum
CREATE TYPE "BenchmarkOutcome" AS ENUM ('PASSED', 'FAILED', 'PARTIAL', 'REGRESSED', 'INCONCLUSIVE');

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('PENDING', 'PASSED', 'PARTIAL', 'FAILED', 'REGRESSED');

-- CreateEnum
CREATE TYPE "FailurePhase" AS ENUM ('PLANNING', 'IMPLEMENTATION', 'ENVIRONMENT', 'EVALUATION', 'PROMOTION', 'RUNTIME');

-- CreateEnum
CREATE TYPE "IssueKind" AS ENUM ('IDEA', 'CHALLENGE', 'FEATURE', 'BUG', 'EXPERIMENT', 'FAILURE', 'MUTATION', 'UPGRADE', 'BENCHMARK', 'APPROVAL_REQUEST');

-- CreateEnum
CREATE TYPE "IssueSource" AS ENUM ('HUMAN', 'EVOLVO');

-- CreateEnum
CREATE TYPE "IssueWorkflowState" AS ENUM ('TRIAGE', 'PLANNED', 'SELECTED', 'IN_PROGRESS', 'AWAITING_EVAL', 'AWAITING_PROMOTION', 'BLOCKED', 'DONE', 'REJECTED', 'DEFERRED');

-- CreateEnum
CREATE TYPE "ModelProvider" AS ENUM ('OPENAI', 'OLLAMA');

-- CreateEnum
CREATE TYPE "MutationOutcomeState" AS ENUM ('ADOPTED', 'REJECTED', 'ROLLED_BACK', 'INCONCLUSIVE');

-- CreateEnum
CREATE TYPE "MutationState" AS ENUM ('PROPOSED', 'SELECTED', 'IN_PROGRESS', 'VALIDATED', 'ADOPTED', 'REJECTED', 'REVERTED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'SYSTEMIC');

-- CreateEnum
CREATE TYPE "RuntimeBootStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "RuntimeHealthStatus" AS ENUM ('UNKNOWN', 'HEALTHY', 'DEGRADED', 'FAILED');

-- CreateEnum
CREATE TYPE "RuntimeVersionState" AS ENUM ('DISCOVERED', 'CANDIDATE', 'VALIDATING', 'SHADOW', 'PROMOTABLE', 'ACTIVE', 'REJECTED', 'ROLLED_BACK', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Surface" AS ENUM ('PROMPTS', 'TEMPLATES', 'ROUTING', 'RUNTIME', 'EVALUATOR', 'BENCHMARKS', 'MEMORY', 'WORKTREES', 'SUPERVISOR', 'DASHBOARD', 'GITHUB_OPS', 'EXTERNAL_REPO');

-- CreateEnum
CREATE TYPE "WorktreeStatus" AS ENUM ('RESERVED', 'CREATING', 'READY', 'HYDRATING', 'ACTIVE', 'AWAITING_EVAL', 'COMPLETED', 'FAILED', 'ARCHIVED', 'CLEANED');

-- CreateTable
CREATE TABLE "benchmark_runs" (
    "id" TEXT NOT NULL,
    "benchmark_key" TEXT NOT NULL,
    "issue_number" INTEGER,
    "attempt_id" TEXT,
    "runtime_version_id" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "outcome" "BenchmarkOutcome" NOT NULL,
    "score" DOUBLE PRECISION,
    "metrics_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benchmark_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempts" (
    "id" TEXT NOT NULL,
    "issue_number" INTEGER NOT NULL,
    "worktree_id" TEXT NOT NULL,
    "runtime_version_id" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "outcome" "AttemptOutcome",
    "summary" TEXT,
    "evaluation_status" "EvaluationStatus",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "failures" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "issue_number" INTEGER NOT NULL,
    "phase" "FailurePhase" NOT NULL,
    "symptom" TEXT NOT NULL,
    "root_cause_hypotheses" JSONB NOT NULL,
    "confirmed_root_cause" TEXT,
    "severity" "RiskLevel" NOT NULL,
    "recurrence_group" TEXT,
    "recurrence_count" INTEGER NOT NULL DEFAULT 1,
    "is_systemic" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "failures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_invocations" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT,
    "role" TEXT NOT NULL,
    "provider" "ModelProvider" NOT NULL,
    "model" TEXT NOT NULL,
    "task_kind" TEXT NOT NULL,
    "prompt_hash" TEXT,
    "duration_ms" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "schema_valid" BOOLEAN,
    "fallback_used" BOOLEAN NOT NULL DEFAULT false,
    "cost_estimate" DOUBLE PRECISION,
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_invocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issues" (
    "github_issue_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "current_labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "state" "IssueWorkflowState" NOT NULL,
    "kind" "IssueKind" NOT NULL,
    "source" "IssueSource" NOT NULL,
    "priority_score" DOUBLE PRECISION,
    "risk_level" "RiskLevel",
    "linked_branch" TEXT,
    "linked_worktree_id" TEXT,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issues_pkey" PRIMARY KEY ("github_issue_number")
);

-- CreateTable
CREATE TABLE "mutation_outcomes" (
    "id" TEXT NOT NULL,
    "mutation_proposal_id" TEXT NOT NULL,
    "candidate_runtime_version_id" TEXT,
    "outcome" "MutationOutcomeState" NOT NULL,
    "benchmark_delta" JSONB,
    "notes" TEXT,
    "adopted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mutation_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mutation_proposal_failures" (
    "mutation_proposal_id" TEXT NOT NULL,
    "failure_record_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mutation_proposal_failures_pkey" PRIMARY KEY ("mutation_proposal_id","failure_record_id")
);

-- CreateTable
CREATE TABLE "mutation_proposals" (
    "id" TEXT NOT NULL,
    "source_issue_number" INTEGER,
    "target_surface" "Surface" NOT NULL,
    "title" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "predicted_benefit" TEXT,
    "predicted_risk" TEXT,
    "validation_plan" JSONB NOT NULL,
    "state" "MutationState" NOT NULL,
    "confidence_score" INTEGER,
    "priority_score" INTEGER,
    "implementation_plan" TEXT,
    "rollback_considerations" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mutation_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runtime_versions" (
    "id" TEXT NOT NULL,
    "git_ref" TEXT NOT NULL,
    "source_issue_number" INTEGER,
    "source_pull_request_number" INTEGER,
    "source_mutation_id" TEXT,
    "state" "RuntimeVersionState" NOT NULL,
    "boot_status" "RuntimeBootStatus",
    "health_status" "RuntimeHealthStatus",
    "promoted_at" TIMESTAMP(3),
    "rolled_back_from_version_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "runtime_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worktrees" (
    "id" TEXT NOT NULL,
    "issue_number" INTEGER NOT NULL,
    "branch_name" TEXT NOT NULL,
    "filesystem_path" TEXT NOT NULL,
    "base_ref" TEXT NOT NULL,
    "status" "WorktreeStatus" NOT NULL,
    "last_command_at" TIMESTAMP(3),
    "cleanup_eligible_at" TIMESTAMP(3),
    "linked_pull_request_number" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worktrees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "benchmark_runs_benchmark_key_idx" ON "benchmark_runs"("benchmark_key");

-- CreateIndex
CREATE INDEX "benchmark_runs_attempt_id_idx" ON "benchmark_runs"("attempt_id");

-- CreateIndex
CREATE INDEX "benchmark_runs_runtime_version_id_idx" ON "benchmark_runs"("runtime_version_id");

-- CreateIndex
CREATE INDEX "attempts_issue_number_idx" ON "attempts"("issue_number");

-- CreateIndex
CREATE INDEX "attempts_worktree_id_idx" ON "attempts"("worktree_id");

-- CreateIndex
CREATE INDEX "attempts_runtime_version_id_idx" ON "attempts"("runtime_version_id");

-- CreateIndex
CREATE INDEX "failures_attempt_id_idx" ON "failures"("attempt_id");

-- CreateIndex
CREATE INDEX "failures_issue_number_idx" ON "failures"("issue_number");

-- CreateIndex
CREATE INDEX "failures_recurrence_group_idx" ON "failures"("recurrence_group");

-- CreateIndex
CREATE INDEX "model_invocations_attempt_id_idx" ON "model_invocations"("attempt_id");

-- CreateIndex
CREATE INDEX "model_invocations_role_provider_model_idx" ON "model_invocations"("role", "provider", "model");

-- CreateIndex
CREATE INDEX "issues_kind_idx" ON "issues"("kind");

-- CreateIndex
CREATE INDEX "issues_state_idx" ON "issues"("state");

-- CreateIndex
CREATE INDEX "issues_source_idx" ON "issues"("source");

-- CreateIndex
CREATE INDEX "mutation_outcomes_mutation_proposal_id_idx" ON "mutation_outcomes"("mutation_proposal_id");

-- CreateIndex
CREATE INDEX "mutation_outcomes_candidate_runtime_version_id_idx" ON "mutation_outcomes"("candidate_runtime_version_id");

-- CreateIndex
CREATE INDEX "mutation_proposal_failures_failure_record_id_idx" ON "mutation_proposal_failures"("failure_record_id");

-- CreateIndex
CREATE INDEX "mutation_proposals_source_issue_number_idx" ON "mutation_proposals"("source_issue_number");

-- CreateIndex
CREATE INDEX "mutation_proposals_target_surface_idx" ON "mutation_proposals"("target_surface");

-- CreateIndex
CREATE INDEX "mutation_proposals_state_idx" ON "mutation_proposals"("state");

-- CreateIndex
CREATE INDEX "runtime_versions_source_issue_number_idx" ON "runtime_versions"("source_issue_number");

-- CreateIndex
CREATE INDEX "runtime_versions_source_mutation_id_idx" ON "runtime_versions"("source_mutation_id");

-- CreateIndex
CREATE INDEX "runtime_versions_state_idx" ON "runtime_versions"("state");

-- CreateIndex
CREATE UNIQUE INDEX "worktrees_branch_name_key" ON "worktrees"("branch_name");

-- CreateIndex
CREATE INDEX "worktrees_issue_number_idx" ON "worktrees"("issue_number");

-- CreateIndex
CREATE INDEX "worktrees_status_idx" ON "worktrees"("status");

-- AddForeignKey
ALTER TABLE "benchmark_runs" ADD CONSTRAINT "benchmark_runs_issue_number_fkey" FOREIGN KEY ("issue_number") REFERENCES "issues"("github_issue_number") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmark_runs" ADD CONSTRAINT "benchmark_runs_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmark_runs" ADD CONSTRAINT "benchmark_runs_runtime_version_id_fkey" FOREIGN KEY ("runtime_version_id") REFERENCES "runtime_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_issue_number_fkey" FOREIGN KEY ("issue_number") REFERENCES "issues"("github_issue_number") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_worktree_id_fkey" FOREIGN KEY ("worktree_id") REFERENCES "worktrees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_runtime_version_id_fkey" FOREIGN KEY ("runtime_version_id") REFERENCES "runtime_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "failures" ADD CONSTRAINT "failures_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "failures" ADD CONSTRAINT "failures_issue_number_fkey" FOREIGN KEY ("issue_number") REFERENCES "issues"("github_issue_number") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_invocations" ADD CONSTRAINT "model_invocations_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mutation_outcomes" ADD CONSTRAINT "mutation_outcomes_mutation_proposal_id_fkey" FOREIGN KEY ("mutation_proposal_id") REFERENCES "mutation_proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mutation_outcomes" ADD CONSTRAINT "mutation_outcomes_candidate_runtime_version_id_fkey" FOREIGN KEY ("candidate_runtime_version_id") REFERENCES "runtime_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mutation_proposal_failures" ADD CONSTRAINT "mutation_proposal_failures_mutation_proposal_id_fkey" FOREIGN KEY ("mutation_proposal_id") REFERENCES "mutation_proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mutation_proposal_failures" ADD CONSTRAINT "mutation_proposal_failures_failure_record_id_fkey" FOREIGN KEY ("failure_record_id") REFERENCES "failures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mutation_proposals" ADD CONSTRAINT "mutation_proposals_source_issue_number_fkey" FOREIGN KEY ("source_issue_number") REFERENCES "issues"("github_issue_number") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runtime_versions" ADD CONSTRAINT "runtime_versions_source_issue_number_fkey" FOREIGN KEY ("source_issue_number") REFERENCES "issues"("github_issue_number") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runtime_versions" ADD CONSTRAINT "runtime_versions_source_mutation_id_fkey" FOREIGN KEY ("source_mutation_id") REFERENCES "mutation_proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runtime_versions" ADD CONSTRAINT "runtime_versions_rolled_back_from_version_id_fkey" FOREIGN KEY ("rolled_back_from_version_id") REFERENCES "runtime_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worktrees" ADD CONSTRAINT "worktrees_issue_number_fkey" FOREIGN KEY ("issue_number") REFERENCES "issues"("github_issue_number") ON DELETE RESTRICT ON UPDATE CASCADE;
