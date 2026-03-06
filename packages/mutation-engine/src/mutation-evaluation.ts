import { listBenchmarkRuns } from '@evolvo/api/benchmark-run';
import type { BenchmarkRun } from '@evolvo/api/generated/prisma/client';
import { z } from 'zod';

const validationPlanSchema = z.object({
  benchmarkIds: z.array(z.string().trim().min(1)),
  maxAllowedRegressionCount: z.number().int().min(0).optional(),
  minimumPassRateDelta: z.number().min(0).max(100).optional(),
  replayIssueNumbers: z.array(z.number().int().positive()),
  requireShadowMode: z.boolean()
});

export type MutationEvaluationInput = {
  attemptId: string;
  benchmarkRuns: BenchmarkRun[];
  targetSurface: string;
  validationPlan: unknown;
};

export type MutationEvaluationSummary = {
  adoptionDecision: 'adopt' | 'inconclusive' | 'reject';
  benchmarkDelta: {
    averageBaselineScore: number | null;
    averageCurrentScore: number | null;
    averageScoreDelta: number | null;
    benchmarkComparisons: Array<{
      baselineScore: number | null;
      benchmarkKey: string;
      currentScore: number | null;
      delta: number | null;
      outcome: BenchmarkRun['outcome'] | 'MISSING';
    }>;
    benchmarkEvidenceSatisfied: boolean;
    currentRegressionCount: number;
    executedBenchmarkKeys: string[];
    maxAllowedRegressionCount: number;
    minimumPassRateDelta: number;
    missingRequiredBenchmarkKeys: string[];
    requiredBenchmarkKeys: string[];
    routingEvidenceRequired: boolean;
  };
  notes: string[];
};

export type EvaluateMutationDependencies = {
  listRuns?: typeof listBenchmarkRuns;
};

function averageScore(runs: BenchmarkRun[]): number | null {
  const scoredRuns = runs.filter(
    (run) => typeof run.score === 'number' && Number.isFinite(run.score)
  );

  if (scoredRuns.length === 0) {
    return null;
  }

  return (
    scoredRuns.reduce((total, run) => total + (run.score ?? 0), 0) /
    scoredRuns.length
  );
}

export async function evaluateMutation(
  input: MutationEvaluationInput,
  dependencies: EvaluateMutationDependencies = {}
): Promise<MutationEvaluationSummary> {
  const listRuns = dependencies.listRuns ?? listBenchmarkRuns;
  const validationPlan = validationPlanSchema.parse(input.validationPlan);
  const requiredBenchmarkKeys = [...new Set(validationPlan.benchmarkIds)];
  const executedBenchmarkKeys = [...new Set(input.benchmarkRuns.map((run) => run.benchmarkKey))];
  const missingRequiredBenchmarkKeys = requiredBenchmarkKeys.filter(
    (benchmarkKey) => !executedBenchmarkKeys.includes(benchmarkKey)
  );
  const currentRegressionCount = input.benchmarkRuns.reduce(
    (total, run) => total + (run.regressionCount ?? 0),
    0
  );
  const routingEvidenceRequired = input.targetSurface === 'routing';
  const benchmarkComparisons: MutationEvaluationSummary['benchmarkDelta']['benchmarkComparisons'] =
    [];

  for (const benchmarkKey of requiredBenchmarkKeys) {
    const currentRuns = input.benchmarkRuns.filter(
      (run) => run.benchmarkKey === benchmarkKey
    );
    const historicalRuns = (
      await listRuns({
        benchmarkKey,
        limit: 10
      })
    ).filter((run) => run.attemptId !== input.attemptId);
    const currentScore = averageScore(currentRuns);
    const baselineScore = averageScore(historicalRuns);

    benchmarkComparisons.push({
      baselineScore,
      benchmarkKey,
      currentScore,
      delta:
        currentScore === null || baselineScore === null
          ? null
          : currentScore - baselineScore,
      outcome:
        currentRuns[0]?.outcome ??
        (missingRequiredBenchmarkKeys.includes(benchmarkKey) ? 'MISSING' : 'FAILED')
    });
  }

  const averageCurrentScore = averageScore(
    requiredBenchmarkKeys.length === 0
      ? input.benchmarkRuns
      : input.benchmarkRuns.filter((run) =>
          requiredBenchmarkKeys.includes(run.benchmarkKey)
        )
  );
  const comparisonDeltas = benchmarkComparisons
    .map((comparison) => comparison.delta)
    .filter((delta): delta is number => delta !== null);
  const averageBaselineScore =
    benchmarkComparisons.length === 0
      ? null
      : averageScore(
          benchmarkComparisons
            .filter(
              (comparison): comparison is typeof comparison & {
                baselineScore: number;
              } => comparison.baselineScore !== null
            )
            .map((comparison) => ({
              score: comparison.baselineScore
            })) as BenchmarkRun[]
        );
  const averageScoreDelta =
    comparisonDeltas.length === 0
      ? null
      : comparisonDeltas.reduce((total, delta) => total + delta, 0) /
        comparisonDeltas.length;
  const maxAllowedRegressionCount = validationPlan.maxAllowedRegressionCount ?? 0;
  const minimumPassRateDelta = validationPlan.minimumPassRateDelta ?? 0;
  const benchmarkEvidenceSatisfied =
    requiredBenchmarkKeys.length > 0 &&
    missingRequiredBenchmarkKeys.length === 0 &&
    currentRegressionCount <= maxAllowedRegressionCount &&
    requiredBenchmarkKeys.every((benchmarkKey) =>
      benchmarkComparisons.some(
        (comparison) =>
          comparison.benchmarkKey === benchmarkKey &&
          comparison.currentScore !== null &&
          comparison.baselineScore !== null &&
          (comparison.delta ?? Number.NEGATIVE_INFINITY) >= minimumPassRateDelta
      )
    );
  const notes: string[] = [];

  if (routingEvidenceRequired && requiredBenchmarkKeys.length === 0) {
    notes.push('Routing mutations require explicit benchmarkIds in validationPlan.');
  }

  if (missingRequiredBenchmarkKeys.length > 0) {
    notes.push(
      `Missing required benchmark evidence for: ${missingRequiredBenchmarkKeys.join(', ')}.`
    );
  }

  if (currentRegressionCount > maxAllowedRegressionCount) {
    notes.push(
      `Observed ${String(currentRegressionCount)} regression(s), above the allowed maximum of ${String(maxAllowedRegressionCount)}.`
    );
  }

  if (
    requiredBenchmarkKeys.length > 0 &&
    averageScoreDelta !== null &&
    averageScoreDelta < minimumPassRateDelta
  ) {
    notes.push(
      `Average benchmark score delta ${averageScoreDelta.toFixed(2)} did not meet the required minimum delta of ${minimumPassRateDelta.toFixed(2)}.`
    );
  }

  const adoptionDecision: MutationEvaluationSummary['adoptionDecision'] =
    routingEvidenceRequired && !benchmarkEvidenceSatisfied
      ? 'reject'
      : benchmarkEvidenceSatisfied
        ? 'adopt'
        : requiredBenchmarkKeys.length > 0
          ? 'reject'
          : currentRegressionCount === 0 && averageCurrentScore !== null
            ? 'inconclusive'
            : 'reject';

  return {
    adoptionDecision,
    benchmarkDelta: {
      averageBaselineScore,
      averageCurrentScore,
      averageScoreDelta,
      benchmarkComparisons,
      benchmarkEvidenceSatisfied,
      currentRegressionCount,
      executedBenchmarkKeys,
      maxAllowedRegressionCount,
      minimumPassRateDelta,
      missingRequiredBenchmarkKeys,
      requiredBenchmarkKeys,
      routingEvidenceRequired
    },
    notes
  };
}
