import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/build-benchmark-snapshot', () => ({
  buildBenchmarkSnapshot: vi.fn().mockResolvedValue({
    challenges: [],
    generatedAt: '2026-03-06T19:40:00.000Z',
    recentRuns: [],
    summary: {
      activeBenchmarks: 3,
      averageScore: 88,
      challengeBenchmarks: 1,
      holdoutBenchmarks: 1,
      regressedRuns: 0,
      regressionPacks: 1,
      totalRuns: 2
    },
    trends: []
  })
}));

import { GET } from './route';

describe('GET /api/benchmarks', () => {
  it('returns the aggregated benchmark dashboard snapshot', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      summary: {
        activeBenchmarks: 3
      }
    });
  });
});
