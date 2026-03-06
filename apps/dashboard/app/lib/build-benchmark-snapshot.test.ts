import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { buildBenchmarkSnapshot } from './build-benchmark-snapshot';

describe('buildBenchmarkSnapshot', () => {
  it('aggregates active benchmark definitions, recent runs, and challenge metadata', async () => {
    const snapshot = await buildBenchmarkSnapshot({
      listBenchmarks: vi.fn().mockResolvedValue([
        {
          benchmarkKey: 'core-runtime-smoke',
          benchmarkType: 'FIXED',
          capabilityTags: ['runtime', 'testing'],
          isHoldout: false,
          isRegressionPack: false,
          title: 'Core runtime smoke',
          version: 1
        },
        {
          benchmarkKey: 'nextjs-holdout-pack',
          benchmarkType: 'HOLDOUT_PACK',
          capabilityTags: ['nextjs'],
          isHoldout: true,
          isRegressionPack: false,
          title: 'Next.js holdout pack',
          version: 2
        }
      ]),
      listChallenges: vi.fn().mockResolvedValue([
        {
          capabilityTags: ['nextjs'],
          category: 'FEATURE_IMPLEMENTATION',
          issueSource: 'HUMAN',
          sourceIssueNumber: 32,
          title: 'Improve dashboard loading'
        }
      ]),
      listRuns: vi.fn().mockResolvedValue([
        {
          benchmarkKey: 'core-runtime-smoke',
          benchmarkType: 'FIXED',
          benchmarkVersion: 1,
          durationMs: 4300,
          issueNumber: 32,
          outcome: 'PASSED',
          regressionCount: 0,
          retryCount: 1,
          score: 92,
          startedAt: new Date('2026-03-06T19:30:00.000Z')
        }
      ]),
      now: new Date('2026-03-06T19:35:00.000Z')
    });

    expect(snapshot.summary).toEqual({
      activeBenchmarks: 2,
      averageScore: 92,
      challengeBenchmarks: 0,
      holdoutBenchmarks: 1,
      regressedRuns: 0,
      regressionPacks: 0,
      totalRuns: 1
    });
    expect(snapshot.recentRuns[0]).toEqual(
      expect.objectContaining({
        benchmarkKey: 'core-runtime-smoke',
        outcome: 'passed'
      })
    );
    expect(snapshot.trends[1]).toEqual(
      expect.objectContaining({
        benchmarkKey: 'nextjs-holdout-pack',
        runCount: 0
      })
    );
  });
});
