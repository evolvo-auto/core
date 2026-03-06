import { describe, expect, it, vi } from 'vitest';

import { createBenchmarkRun, listBenchmarkRuns } from './benchmark-run.js';
import type { PrismaClient } from './generated/prisma/client.js';

describe('benchmark run DAL', () => {
  it('creates a benchmark run with normalized fields and counters', async () => {
    const create = vi.fn().mockResolvedValue({
      id: 'benchmark_run_1'
    });
    const prisma = {
      benchmarkRun: {
        create
      }
    } as unknown as PrismaClient;

    await createBenchmarkRun(
      {
        attemptId: ' att_1 ',
        benchmarkId: ' bench_1 ',
        benchmarkKey: ' runtime-smoke ',
        benchmarkType: 'FIXED',
        benchmarkVersion: 1,
        durationMs: 3_200,
        issueNumber: 14,
        metricsJson: {
          pass: true
        },
        outcome: 'PASSED',
        regressionCount: 0,
        retryCount: 1,
        runtimeVersionId: ' runtime_1 ',
        score: 92.5
      },
      prisma
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        attemptId: 'att_1',
        benchmarkId: 'bench_1',
        benchmarkKey: 'runtime-smoke',
        benchmarkType: 'FIXED',
        benchmarkVersion: 1,
        durationMs: 3200,
        endedAt: null,
        issueNumber: 14,
        metricsJson: {
          pass: true
        },
        outcome: 'PASSED',
        regressionCount: 0,
        retryCount: 1,
        runtimeVersionId: 'runtime_1',
        score: 92.5,
        startedAt: undefined
      }
    });
  });

  it('lists benchmark runs with normalized filters', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'benchmark_run_1'
      }
    ]);
    const prisma = {
      benchmarkRun: {
        findMany
      }
    } as unknown as PrismaClient;

    await listBenchmarkRuns(
      {
        attemptId: ' att_1 ',
        benchmarkId: ' bench_1 ',
        benchmarkKey: ' runtime-smoke ',
        benchmarkType: 'FIXED',
        issueNumber: 14,
        limit: 5.7
      },
      prisma
    );

    expect(findMany).toHaveBeenCalledWith({
      orderBy: [
        {
          startedAt: 'desc'
        },
        {
          benchmarkKey: 'asc'
        }
      ],
      take: 5,
      where: {
        attemptId: 'att_1',
        benchmarkId: 'bench_1',
        benchmarkKey: 'runtime-smoke',
        benchmarkType: 'FIXED',
        issueNumber: 14
      }
    });
  });
});
