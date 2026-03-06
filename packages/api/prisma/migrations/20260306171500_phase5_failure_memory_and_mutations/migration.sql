-- CreateEnum
CREATE TYPE "FailureCategory" AS ENUM (
    'PLANNING_FAILURE',
    'REQUIREMENT_MISUNDERSTANDING',
    'CODE_GENERATION_DEFECT',
    'ENVIRONMENT_SETUP_FAILURE',
    'DEPENDENCY_CONFIGURATION_ISSUE',
    'RUNTIME_FAILURE',
    'SMOKE_E2E_FAILURE',
    'EVALUATOR_MISMATCH',
    'MODEL_QUALITY_ISSUE',
    'MUTATION_REGRESSION',
    'BENCHMARK_INTEGRITY_ISSUE'
);

-- AlterTable
ALTER TABLE "failures"
ADD COLUMN "category" "FailureCategory" NOT NULL DEFAULT 'RUNTIME_FAILURE',
ADD COLUMN "linked_issue_number" INTEGER,
ADD COLUMN "reflection_json" JSONB;

-- AlterTable
ALTER TABLE "mutation_proposals"
ADD COLUMN "linked_issue_number" INTEGER;

-- CreateTable
CREATE TABLE "capabilities" (
    "id" TEXT NOT NULL,
    "capability_key" TEXT NOT NULL,
    "confidence_score" INTEGER NOT NULL DEFAULT 50,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "successes" INTEGER NOT NULL DEFAULT 0,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "recurring_failure_modes" JSONB,
    "last_issue_number" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capabilities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "failures_linked_issue_number_key" ON "failures"("linked_issue_number");

-- CreateIndex
CREATE INDEX "failures_category_idx" ON "failures"("category");

-- CreateIndex
CREATE UNIQUE INDEX "mutation_proposals_linked_issue_number_key" ON "mutation_proposals"("linked_issue_number");

-- CreateIndex
CREATE INDEX "mutation_proposals_linked_issue_number_idx" ON "mutation_proposals"("linked_issue_number");

-- CreateIndex
CREATE UNIQUE INDEX "capabilities_capability_key_key" ON "capabilities"("capability_key");

-- CreateIndex
CREATE INDEX "capabilities_confidence_score_idx" ON "capabilities"("confidence_score");
