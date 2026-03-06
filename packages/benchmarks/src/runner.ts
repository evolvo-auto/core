import { createBenchmarkRun, type CreateBenchmarkRunInput } from '@evolvo/api/benchmark-run';
import { listBenchmarkDefinitions } from '@evolvo/api/benchmark-definition';
import type {
  BenchmarkDefinition,
  BenchmarkRun
} from '@evolvo/api/generated/prisma/client';

import {
  selectBenchmarkDefinitionsForAttempt,
  syncFixedBenchmarkRegistry
} from './registry.js';

export type BenchmarkCheckResult = {
  name: string;
  result: 'failed' | 'passed' | 'skipped';
};

export type BenchmarkEvaluationSummary = {
  checkResults: BenchmarkCheckResult[];
  evaluatorOutput: {
    outcome: 'blocked' | 'failure' | 'inconclusive' | 'partial' | 'success';
    regressionRisk: 'high' | 'low' | 'medium' | 'none';
    summary: string;
  };
  observedFailures: string[];
};

export type BenchmarkBuilderSummary = {
  filesActuallyChanged: string[];
  summary: string;
};

export type RunBenchmarkSuiteInput = {
  attemptId: string;
  builderResult: BenchmarkBuilderSummary;
  capabilityTags: string[];
  cycleCompletedAt: Date;
  cycleStartedAt: Date;
  evaluationResult: BenchmarkEvaluationSummary;
  issueNumber: number;
  repairAttempt: number;
  runtimeVersionId?: string | null;
};

export type RunBenchmarkSuiteResult = {
  averageScore: number | null;
  benchmarkRuns: BenchmarkRun[];
  selectedBenchmarkKeys: string[];
};

export type RunBenchmarkSuiteDependencies = {
  createRun?: typeof createBenchmarkRun;
  listDefinitions?: typeof listBenchmarkDefinitions;
  syncRegistry?: typeof syncFixedBenchmarkRegistry;
};

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

function resolveBenchmarkOutcome(
  evaluationResult: BenchmarkEvaluationSummary
): 'FAILED' | 'INCONCLUSIVE' | 'PARTIAL' | 'PASSED' | 'REGRESSED' {
  if (evaluationResult.evaluatorOutput.regressionRisk === 'high') {
    return 'REGRESSED';
  }

  switch (evaluationResult.evaluatorOutput.outcome) {
    case 'success':
      return 'PASSED';
    case 'partial':
      return 'PARTIAL';
    case 'inconclusive':
      return 'INCONCLUSIVE';
    case 'blocked':
    case 'failure':
    default:
      return 'FAILED';
  }
}

function resolveCommandSuccessRate(checkResults: BenchmarkCheckResult[]): number | null {
  const executedChecks = checkResults.filter(
    (checkResult) => checkResult.result !== 'skipped'
  );

  if (executedChecks.length === 0) {
    return null;
  }

  const passedChecks = executedChecks.filter(
    (checkResult) => checkResult.result === 'passed'
  ).length;

  return passedChecks / executedChecks.length;
}

function getCheckResult(
  checkResults: BenchmarkCheckResult[],
  checkName: string
): 'failed' | 'passed' | 'skipped' {
  return (
    checkResults.find((checkResult) => checkResult.name === checkName)?.result ??
    'skipped'
  );
}

function resolveScore(input: {
  commandSuccessRate: number | null;
  evaluationResult: BenchmarkEvaluationSummary;
  regressionCount: number;
  retryCount: number;
}): number {
  const baseScoreByOutcome = {
    FAILED: 24,
    INCONCLUSIVE: 40,
    PARTIAL: 72,
    PASSED: 100,
    REGRESSED: 52
  } as const;
  const outcome = resolveBenchmarkOutcome(input.evaluationResult);
  const smokeResult = getCheckResult(input.evaluationResult.checkResults, 'smoke');
  const buildResult = getCheckResult(input.evaluationResult.checkResults, 'build');
  const testResult = getCheckResult(input.evaluationResult.checkResults, 'tests');
  const retryPenalty = Math.min(24, input.retryCount * 8);
  const regressionPenalty = input.regressionCount * 14;
  const smokePenalty = smokeResult === 'failed' ? 10 : 0;
  const buildPenalty = buildResult === 'failed' ? 10 : 0;
  const testPenalty = testResult === 'failed' ? 8 : 0;
  const rateBonus = Math.round((input.commandSuccessRate ?? 0) * 18);

  return clampScore(
    baseScoreByOutcome[outcome] +
      rateBonus -
      retryPenalty -
      regressionPenalty -
      smokePenalty -
      buildPenalty -
      testPenalty
  );
}

function buildRunInput(
  definition: BenchmarkDefinition,
  input: RunBenchmarkSuiteInput
): CreateBenchmarkRunInput {
  const durationMs = Math.max(
    0,
    input.cycleCompletedAt.getTime() - input.cycleStartedAt.getTime()
  );
  const commandSuccessRate = resolveCommandSuccessRate(
    input.evaluationResult.checkResults
  );
  const regressionCount =
    input.evaluationResult.evaluatorOutput.regressionRisk === 'high' ? 1 : 0;

  return {
    attemptId: input.attemptId,
    benchmarkId: definition.id,
    benchmarkKey: definition.benchmarkKey,
    benchmarkType: definition.benchmarkType,
    benchmarkVersion: definition.version,
    durationMs,
    endedAt: input.cycleCompletedAt,
    issueNumber: input.issueNumber,
    metricsJson: {
      buildStatus: getCheckResult(input.evaluationResult.checkResults, 'build'),
      changedFileCount: input.builderResult.filesActuallyChanged.length,
      commandSuccessRate,
      observedFailureCount: input.evaluationResult.observedFailures.length,
      retryCount: input.repairAttempt,
      smokeStatus: getCheckResult(input.evaluationResult.checkResults, 'smoke'),
      summary: input.evaluationResult.evaluatorOutput.summary,
      testStatus: getCheckResult(input.evaluationResult.checkResults, 'tests'),
      timeToCompletionMs: durationMs,
      typecheckStatus: getCheckResult(input.evaluationResult.checkResults, 'typecheck')
    },
    outcome: resolveBenchmarkOutcome(input.evaluationResult),
    regressionCount,
    retryCount: input.repairAttempt,
    runtimeVersionId: input.runtimeVersionId ?? null,
    score: resolveScore({
      commandSuccessRate,
      evaluationResult: input.evaluationResult,
      regressionCount,
      retryCount: input.repairAttempt
    }),
    startedAt: input.cycleStartedAt
  };
}

export async function runBenchmarkSuite(
  input: RunBenchmarkSuiteInput,
  dependencies: RunBenchmarkSuiteDependencies = {}
): Promise<RunBenchmarkSuiteResult> {
  const createRun = dependencies.createRun ?? createBenchmarkRun;
  const listDefinitions = dependencies.listDefinitions ?? listBenchmarkDefinitions;
  const syncRegistry = dependencies.syncRegistry ?? syncFixedBenchmarkRegistry;

  await syncRegistry();

  const selectedDefinitions = selectBenchmarkDefinitionsForAttempt({
    benchmarkDefinitions: await listDefinitions({
      isActive: true,
      limit: 200
    }),
    capabilityTags: input.capabilityTags,
    issueNumber: input.issueNumber
  });
  const benchmarkRuns: BenchmarkRun[] = [];

  for (const definition of selectedDefinitions) {
    benchmarkRuns.push(await createRun(buildRunInput(definition, input)));
  }

  return {
    averageScore:
      benchmarkRuns.length === 0
        ? null
        : benchmarkRuns.reduce(
            (runningTotal, benchmarkRun) => runningTotal + (benchmarkRun.score ?? 0),
            0
          ) / benchmarkRuns.length,
    benchmarkRuns,
    selectedBenchmarkKeys: selectedDefinitions.map(
      (definition) => definition.benchmarkKey
    )
  };
}
