import { describe, expect, it, vi } from 'vitest';

import { getBenchmarkSnapshot } from './benchmarks.js';

describe('getBenchmarkSnapshot', () => {
  it('fetches and validates the benchmark dashboard snapshot', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      json: async () => ({
        challenges: [],
        generatedAt: '2026-03-06T19:20:00.000Z',
        recentRuns: [],
        summary: {
          activeBenchmarks: 3,
          averageScore: 90,
          challengeBenchmarks: 1,
          holdoutBenchmarks: 1,
          regressedRuns: 0,
          regressionPacks: 1,
          totalRuns: 2
        },
        trends: []
      }),
      ok: true,
      status: 200
    });

    await expect(
      getBenchmarkSnapshot({
        endpoint: '/api/benchmarks',
        fetcher: fetcher as never
      })
    ).resolves.toMatchObject({
      summary: {
        activeBenchmarks: 3
      }
    });
  });
});
