import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/build-failure-memory-snapshot', () => ({
  buildFailureMemorySnapshot: vi.fn().mockResolvedValue({
    capabilities: [],
    clusters: [],
    failures: [],
    generatedAt: '2026-03-06T18:46:00.000Z',
    mutations: [],
    summary: {
      openMutationProposals: 0,
      recurringClusters: 0,
      totalFailures: 0,
      weakCapabilities: 0
    }
  })
}));

import { GET } from './route';

describe('GET /api/failure-memory', () => {
  it('returns the aggregated failure memory dashboard snapshot', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      generatedAt: '2026-03-06T18:46:00.000Z',
      summary: {
        totalFailures: 0
      }
    });
  });
});
