import { describe, expect, it, vi } from 'vitest';

import { runBenchmarkSuite } from './runner.js';

describe('runBenchmarkSuite', () => {
  it('selects active benchmarks and persists comparable benchmark runs', async () => {
    const createRun = vi.fn().mockImplementation(async (input) => ({
      ...input,
      id: `${input.benchmarkKey}-run`
    }));

    const result = await runBenchmarkSuite(
      {
        attemptId: 'att_1',
        builderResult: {
          filesActuallyChanged: ['packages/execution/src/runtime-loop.ts'],
          summary: 'Implemented the runtime loop.'
        },
        capabilityTags: ['typescript'],
        cycleCompletedAt: new Date('2026-03-06T18:10:00.000Z'),
        cycleStartedAt: new Date('2026-03-06T18:00:00.000Z'),
        evaluationResult: {
          checkResults: [
            {
              name: 'build',
              result: 'passed'
            },
            {
              name: 'tests',
              result: 'passed'
            },
            {
              name: 'smoke',
              result: 'passed'
            }
          ],
          evaluatorOutput: {
            outcome: 'success',
            regressionRisk: 'low',
            summary: 'All checks passed.'
          },
          observedFailures: []
        },
        issueNumber: 32,
        repairAttempt: 1,
        runtimeVersionId: 'runtime_1'
      },
      {
        createRun,
        listDefinitions: vi.fn().mockResolvedValue([
          {
            benchmarkKey: 'core-runtime-smoke',
            benchmarkType: 'FIXED',
            capabilityTags: [],
            id: 'benchmark_1',
            isActive: true,
            version: 1
          },
          {
            benchmarkKey: 'typescript-regression-pack',
            benchmarkType: 'REGRESSION_PACK',
            capabilityTags: ['typescript'],
            id: 'benchmark_2',
            isActive: true,
            version: 3
          }
        ]),
        syncRegistry: vi.fn().mockResolvedValue([])
      }
    );

    expect(createRun).toHaveBeenCalledTimes(2);
    expect(result.selectedBenchmarkKeys).toEqual([
      'core-runtime-smoke',
      'typescript-regression-pack'
    ]);
    expect(result.averageScore).toBeGreaterThan(0);
    expect(result.benchmarkRuns[0]).toEqual(
      expect.objectContaining({
        benchmarkKey: 'core-runtime-smoke',
        outcome: 'PASSED',
        retryCount: 1
      })
    );
  });

  it('records regression outcomes when evaluation risk is high', async () => {
    const createRun = vi.fn().mockImplementation(async (input) => ({
      ...input,
      id: `${input.benchmarkKey}-run`
    }));

    const result = await runBenchmarkSuite(
      {
        attemptId: 'att_2',
        builderResult: {
          filesActuallyChanged: ['apps/dashboard/app/page.tsx'],
          summary: 'Adjusted dashboard rendering.'
        },
        capabilityTags: ['nextjs'],
        cycleCompletedAt: new Date('2026-03-06T18:20:00.000Z'),
        cycleStartedAt: new Date('2026-03-06T18:15:00.000Z'),
        evaluationResult: {
          checkResults: [
            {
              name: 'build',
              result: 'passed'
            },
            {
              name: 'smoke',
              result: 'failed'
            }
          ],
          evaluatorOutput: {
            outcome: 'partial',
            regressionRisk: 'high',
            summary: 'Smoke failed after build success.'
          },
          observedFailures: ['Smoke failed']
        },
        issueNumber: 32,
        repairAttempt: 0
      },
      {
        createRun,
        listDefinitions: vi.fn().mockResolvedValue([
          {
            benchmarkKey: 'nextjs-holdout-pack',
            benchmarkType: 'HOLDOUT_PACK',
            capabilityTags: ['nextjs'],
            id: 'benchmark_3',
            isActive: true,
            version: 2
          }
        ]),
        syncRegistry: vi.fn().mockResolvedValue([])
      }
    );

    expect(result.benchmarkRuns[0]).toEqual(
      expect.objectContaining({
        benchmarkKey: 'nextjs-holdout-pack',
        outcome: 'REGRESSED',
        regressionCount: 1
      })
    );
  });
});
