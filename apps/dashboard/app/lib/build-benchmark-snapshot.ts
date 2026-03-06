import 'server-only';

import { listBenchmarkDefinitions } from '@evolvo/api/benchmark-definition';
import { listBenchmarkRuns } from '@evolvo/api/benchmark-run';
import { listChallengeRecords } from '@evolvo/api/challenge-record';
import {
  benchmarkDashboardSnapshotSchema,
  type BenchmarkDashboardSnapshot
} from '@evolvo/schemas/benchmark-schemas';

import { loadDashboardEnv } from '../../env';

loadDashboardEnv();

export type BuildBenchmarkSnapshotOptions = {
  listBenchmarks?: typeof listBenchmarkDefinitions;
  listChallenges?: typeof listChallengeRecords;
  listRuns?: typeof listBenchmarkRuns;
  now?: Date;
};

function toSharedEnum(value: string): string {
  return value.toLowerCase().replace(/_/g, '-');
}

function buildRecentRuns(
  runs: Awaited<ReturnType<typeof listBenchmarkRuns>>,
  definitionsByKey: Map<string, Awaited<ReturnType<typeof listBenchmarkDefinitions>>[number]>
): BenchmarkDashboardSnapshot['recentRuns'] {
  return runs.slice(0, 8).map((benchmarkRun) => {
    const definition = definitionsByKey.get(benchmarkRun.benchmarkKey);

    return {
      benchmarkKey: benchmarkRun.benchmarkKey,
      benchmarkType: toSharedEnum(
        benchmarkRun.benchmarkType ?? definition?.benchmarkType ?? 'FIXED'
      ) as BenchmarkDashboardSnapshot['recentRuns'][number]['benchmarkType'],
      benchmarkVersion: benchmarkRun.benchmarkVersion ?? definition?.version ?? null,
      durationMs: benchmarkRun.durationMs ?? null,
      issueNumber: benchmarkRun.issueNumber ?? null,
      outcome: toSharedEnum(
        benchmarkRun.outcome
      ) as BenchmarkDashboardSnapshot['recentRuns'][number]['outcome'],
      regressionCount: benchmarkRun.regressionCount,
      retryCount: benchmarkRun.retryCount,
      score: benchmarkRun.score ?? null,
      startedAt: benchmarkRun.startedAt.toISOString()
    };
  });
}

function buildTrendItems(
  definitions: Awaited<ReturnType<typeof listBenchmarkDefinitions>>,
  runs: Awaited<ReturnType<typeof listBenchmarkRuns>>
): BenchmarkDashboardSnapshot['trends'] {
  return definitions.map((definition) => {
    const definitionRuns = runs.filter(
      (benchmarkRun) => benchmarkRun.benchmarkKey === definition.benchmarkKey
    );
    const latestRun = definitionRuns[0];
    const scores = definitionRuns.flatMap((benchmarkRun) =>
      benchmarkRun.score === null || benchmarkRun.score === undefined
        ? []
        : [benchmarkRun.score]
    );

    return {
      averageScore:
        scores.length === 0
          ? null
          : scores.reduce((runningTotal, score) => runningTotal + score, 0) /
            scores.length,
      benchmarkKey: definition.benchmarkKey,
      benchmarkType: toSharedEnum(
        definition.benchmarkType
      ) as BenchmarkDashboardSnapshot['trends'][number]['benchmarkType'],
      capabilityTags: definition.capabilityTags,
      isHoldout: definition.isHoldout,
      isRegressionPack: definition.isRegressionPack,
      lastRunAt: latestRun?.startedAt.toISOString() ?? null,
      latestOutcome:
        latestRun === undefined
          ? null
          : (toSharedEnum(
              latestRun.outcome
            ) as BenchmarkDashboardSnapshot['trends'][number]['latestOutcome']),
      runCount: definitionRuns.length,
      title: definition.title,
      version: definition.version
    };
  });
}

function buildChallengeItems(
  challenges: Awaited<ReturnType<typeof listChallengeRecords>>
): BenchmarkDashboardSnapshot['challenges'] {
  return challenges.slice(0, 8).map((challenge) => ({
    capabilityTags: challenge.capabilityTags,
    category: toSharedEnum(
      challenge.category
    ) as BenchmarkDashboardSnapshot['challenges'][number]['category'],
    issueSource: toSharedEnum(
      challenge.issueSource
    ) as BenchmarkDashboardSnapshot['challenges'][number]['issueSource'],
    sourceIssueNumber: challenge.sourceIssueNumber,
    title: challenge.title
  }));
}

function buildSummary(
  definitions: Awaited<ReturnType<typeof listBenchmarkDefinitions>>,
  runs: Awaited<ReturnType<typeof listBenchmarkRuns>>
): BenchmarkDashboardSnapshot['summary'] {
  const scores = runs.flatMap((benchmarkRun) =>
    benchmarkRun.score === null || benchmarkRun.score === undefined
      ? []
      : [benchmarkRun.score]
  );

  return {
    activeBenchmarks: definitions.length,
    averageScore:
      scores.length === 0
        ? null
        : scores.reduce((runningTotal, score) => runningTotal + score, 0) /
          scores.length,
    challengeBenchmarks: definitions.filter((definition) =>
      ['HUMAN_CHALLENGE', 'EVOLVO_CHALLENGE'].includes(definition.benchmarkType)
    ).length,
    holdoutBenchmarks: definitions.filter((definition) => definition.isHoldout)
      .length,
    regressedRuns: runs.filter((benchmarkRun) => benchmarkRun.outcome === 'REGRESSED')
      .length,
    regressionPacks: definitions.filter((definition) => definition.isRegressionPack)
      .length,
    totalRuns: runs.length
  };
}

export async function buildBenchmarkSnapshot(
  options: BuildBenchmarkSnapshotOptions = {}
): Promise<BenchmarkDashboardSnapshot> {
  const listBenchmarks = options.listBenchmarks ?? listBenchmarkDefinitions;
  const listChallenges = options.listChallenges ?? listChallengeRecords;
  const listRuns = options.listRuns ?? listBenchmarkRuns;
  const now = options.now ?? new Date();
  const definitions = await listBenchmarks({
    isActive: true,
    limit: 200
  });
  const runs = await listRuns({
    limit: 80
  });
  const challenges = await listChallenges({
    limit: 40
  });
  const definitionsByKey = new Map(
    definitions.map((definition) => [definition.benchmarkKey, definition])
  );

  return benchmarkDashboardSnapshotSchema.parse({
    challenges: buildChallengeItems(challenges),
    generatedAt: now.toISOString(),
    recentRuns: buildRecentRuns(runs, definitionsByKey),
    summary: buildSummary(definitions, runs),
    trends: buildTrendItems(definitions, runs)
  });
}
