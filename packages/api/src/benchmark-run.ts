'use server';

import { getPrismaClient } from './client.ts';
import {
  Prisma
} from './generated/prisma/client.ts';
import type {
  $Enums,
  BenchmarkRun,
  PrismaClient
} from './generated/prisma/client.ts';

export type CreateBenchmarkRunInput = {
  attemptId?: string | null;
  benchmarkId?: string | null;
  benchmarkKey: string;
  benchmarkType?: $Enums.BenchmarkType | null;
  benchmarkVersion?: number | null;
  durationMs?: number | null;
  endedAt?: Date | null;
  issueNumber?: number | null;
  metricsJson?: Prisma.InputJsonValue | null;
  outcome: $Enums.BenchmarkOutcome;
  regressionCount?: number;
  retryCount?: number;
  runtimeVersionId?: string | null;
  score?: number | null;
  startedAt?: Date;
};

export type ListBenchmarkRunsOptions = {
  attemptId?: string;
  benchmarkId?: string;
  benchmarkKey?: string;
  benchmarkType?: $Enums.BenchmarkType;
  issueNumber?: number;
  limit?: number;
};

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`Benchmark run ${fieldName} is required.`);
  }

  return normalizedValue;
}

function normalizeOptionalText(
  value: string | null | undefined
): string | null | undefined {
  if (value === null || value === undefined) {
    return value;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue;
}

function normalizeOptionalIssueNumber(
  issueNumber: number | null | undefined
): number | null | undefined {
  if (issueNumber === null || issueNumber === undefined) {
    return issueNumber;
  }

  if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
    throw new Error('Benchmark run issueNumber must be a positive integer.');
  }

  return issueNumber;
}

function normalizeOptionalNonNegativeInteger(
  value: number | null | undefined,
  fieldName: 'benchmarkVersion' | 'durationMs' | 'regressionCount' | 'retryCount'
): number | null | undefined {
  if (value === null || value === undefined) {
    return value;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Benchmark run ${fieldName} must be a non-negative integer.`);
  }

  return value;
}

function normalizeOptionalScore(
  score: number | null | undefined
): number | null | undefined {
  if (score === null || score === undefined) {
    return score;
  }

  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new Error('Benchmark run score must be between 0 and 100.');
  }

  return score;
}

// POST
export async function createBenchmarkRun(
  input: CreateBenchmarkRunInput,
  prisma: PrismaClient = getPrismaClient()
): Promise<BenchmarkRun> {
  return prisma.benchmarkRun.create({
    data: {
      attemptId: normalizeOptionalText(input.attemptId) ?? null,
      benchmarkId: normalizeOptionalText(input.benchmarkId) ?? null,
      benchmarkKey: normalizeRequiredText(input.benchmarkKey, 'benchmarkKey'),
      benchmarkType: input.benchmarkType ?? null,
      benchmarkVersion:
        normalizeOptionalNonNegativeInteger(
          input.benchmarkVersion,
          'benchmarkVersion'
        ) ?? null,
      durationMs:
        normalizeOptionalNonNegativeInteger(input.durationMs, 'durationMs') ?? null,
      endedAt: input.endedAt ?? null,
      issueNumber: normalizeOptionalIssueNumber(input.issueNumber) ?? null,
      metricsJson: input.metricsJson ?? undefined,
      outcome: input.outcome,
      regressionCount:
        normalizeOptionalNonNegativeInteger(
          input.regressionCount,
          'regressionCount'
        ) ?? 0,
      retryCount:
        normalizeOptionalNonNegativeInteger(input.retryCount, 'retryCount') ?? 0,
      runtimeVersionId: normalizeOptionalText(input.runtimeVersionId) ?? null,
      score: normalizeOptionalScore(input.score) ?? null,
      startedAt: input.startedAt ?? undefined
    }
  });
}

// GET
export async function listBenchmarkRuns(
  options: ListBenchmarkRunsOptions = {},
  prisma: PrismaClient = getPrismaClient()
): Promise<BenchmarkRun[]> {
  const limit = Math.max(1, Math.floor(options.limit ?? 100));

  return prisma.benchmarkRun.findMany({
    orderBy: [
      {
        startedAt: 'desc'
      },
      {
        benchmarkKey: 'asc'
      }
    ],
    take: limit,
    where: {
      attemptId:
        options.attemptId === undefined
          ? undefined
          : normalizeRequiredText(options.attemptId, 'attemptId'),
      benchmarkId:
        options.benchmarkId === undefined
          ? undefined
          : normalizeRequiredText(options.benchmarkId, 'benchmarkId'),
      benchmarkKey:
        options.benchmarkKey === undefined
          ? undefined
          : normalizeRequiredText(options.benchmarkKey, 'benchmarkKey'),
      benchmarkType: options.benchmarkType,
      issueNumber: normalizeOptionalIssueNumber(options.issueNumber)
    }
  });
}
