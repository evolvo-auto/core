-- CreateEnum
CREATE TYPE "BenchmarkType" AS ENUM ('FIXED', 'HUMAN_CHALLENGE', 'EVOLVO_CHALLENGE', 'REGRESSION_PACK', 'HOLDOUT_PACK');

-- CreateEnum
CREATE TYPE "ChallengeCategory" AS ENUM ('GENERAL', 'FEATURE_IMPLEMENTATION', 'BUG_FIXING', 'REFACTOR', 'TEST_GENERATION', 'FRESH_REPO_GENERATION', 'CI_SETUP', 'RUNTIME_UPGRADE_STABILITY', 'PROMPT_MUTATION_IMPACT', 'MODEL_ROUTING_QUALITY');

-- AlterTable
ALTER TABLE "benchmark_runs" ADD COLUMN     "benchmark_id" TEXT,
ADD COLUMN     "benchmark_type" "BenchmarkType",
ADD COLUMN     "benchmark_version" INTEGER,
ADD COLUMN     "duration_ms" INTEGER,
ADD COLUMN     "regression_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "retry_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "failures" ALTER COLUMN "category" DROP DEFAULT;

-- CreateTable
CREATE TABLE "benchmarks" (
    "id" TEXT NOT NULL,
    "benchmark_key" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "benchmark_type" "BenchmarkType" NOT NULL,
    "challenge_id" TEXT,
    "source_issue_number" INTEGER,
    "source_mutation_id" TEXT,
    "family_key" TEXT,
    "capability_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_regression_pack" BOOLEAN NOT NULL DEFAULT false,
    "is_holdout" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "lineage_parent_id" TEXT,
    "lineage_reason" TEXT,
    "source_fingerprint" TEXT NOT NULL,
    "definition_json" JSONB NOT NULL,
    "scoring_config_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benchmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenges" (
    "id" TEXT NOT NULL,
    "source_issue_number" INTEGER NOT NULL,
    "issue_source" "IssueSource" NOT NULL,
    "title" TEXT NOT NULL,
    "category" "ChallengeCategory" NOT NULL,
    "intent" TEXT NOT NULL,
    "success_signal" TEXT,
    "constraints_json" JSONB,
    "artifact_expectations_json" JSONB,
    "validation_steps_json" JSONB,
    "scoring_notes_json" JSONB,
    "capability_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source_fingerprint" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "benchmarks_benchmark_key_is_active_idx" ON "benchmarks"("benchmark_key", "is_active");

-- CreateIndex
CREATE INDEX "benchmarks_benchmark_type_idx" ON "benchmarks"("benchmark_type");

-- CreateIndex
CREATE INDEX "benchmarks_challenge_id_idx" ON "benchmarks"("challenge_id");

-- CreateIndex
CREATE INDEX "benchmarks_source_issue_number_idx" ON "benchmarks"("source_issue_number");

-- CreateIndex
CREATE INDEX "benchmarks_source_mutation_id_idx" ON "benchmarks"("source_mutation_id");

-- CreateIndex
CREATE INDEX "benchmarks_family_key_idx" ON "benchmarks"("family_key");

-- CreateIndex
CREATE UNIQUE INDEX "benchmarks_benchmark_key_version_key" ON "benchmarks"("benchmark_key", "version");

-- CreateIndex
CREATE UNIQUE INDEX "challenges_source_issue_number_key" ON "challenges"("source_issue_number");

-- CreateIndex
CREATE INDEX "challenges_category_idx" ON "challenges"("category");

-- CreateIndex
CREATE INDEX "challenges_issue_source_idx" ON "challenges"("issue_source");

-- CreateIndex
CREATE INDEX "benchmark_runs_benchmark_id_idx" ON "benchmark_runs"("benchmark_id");

-- CreateIndex
CREATE INDEX "benchmark_runs_benchmark_type_idx" ON "benchmark_runs"("benchmark_type");

-- AddForeignKey
ALTER TABLE "benchmarks" ADD CONSTRAINT "benchmarks_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmarks" ADD CONSTRAINT "benchmarks_source_issue_number_fkey" FOREIGN KEY ("source_issue_number") REFERENCES "issues"("github_issue_number") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmarks" ADD CONSTRAINT "benchmarks_source_mutation_id_fkey" FOREIGN KEY ("source_mutation_id") REFERENCES "mutation_proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmarks" ADD CONSTRAINT "benchmarks_lineage_parent_id_fkey" FOREIGN KEY ("lineage_parent_id") REFERENCES "benchmarks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmark_runs" ADD CONSTRAINT "benchmark_runs_benchmark_id_fkey" FOREIGN KEY ("benchmark_id") REFERENCES "benchmarks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_source_issue_number_fkey" FOREIGN KEY ("source_issue_number") REFERENCES "issues"("github_issue_number") ON DELETE RESTRICT ON UPDATE CASCADE;
