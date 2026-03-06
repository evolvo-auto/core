import { describe, expect, it, vi } from 'vitest';

import {
  failureMemorySnapshotQueryKey,
  getFailureMemorySnapshot,
  getFailureMemorySnapshotQueryOptions
} from './failure-memory.js';

const snapshot = {
  capabilities: [
    {
      attempts: 8,
      capabilityKey: 'debugging',
      confidenceScore: 41,
      failures: 5,
      lastIssueNumber: 32,
      recurringFailureModes: ['model-quality/runtime/openai'],
      successes: 3
    }
  ],
  clusters: [
    {
      category: 'model-quality-issue',
      issueNumbers: [14, 32],
      latestOccurredAt: '2026-03-06T18:45:00.000Z',
      phase: 'runtime',
      recurrenceGroup: 'model-quality/runtime/openai',
      systemicCount: 2,
      totalFailures: 3
    }
  ],
  failures: [
    {
      category: 'model-quality-issue',
      createdAt: '2026-03-06T18:40:00.000Z',
      id: 'failure_1',
      isSystemic: true,
      issueNumber: 14,
      linkedIssueNumber: 41,
      phase: 'runtime',
      recurrenceCount: 3,
      recurrenceGroup: 'model-quality/runtime/openai',
      severity: 'systemic'
    }
  ],
  generatedAt: '2026-03-06T18:46:00.000Z',
  mutations: [
    {
      confidenceScore: 72,
      createdAt: '2026-03-06T18:44:00.000Z',
      id: 'mutation_1',
      linkedIssueNumber: 42,
      priorityScore: 81,
      sourceIssueNumber: 14,
      state: 'proposed',
      targetSurface: 'prompts',
      title: 'Improve prompt contract guidance'
    }
  ],
  summary: {
    openMutationProposals: 1,
    recurringClusters: 1,
    totalFailures: 1,
    weakCapabilities: 1
  }
} as const;

describe('getFailureMemorySnapshot', () => {
  it('parses a valid failure memory snapshot response', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(snapshot), {
        headers: {
          'content-type': 'application/json'
        },
        status: 200
      })
    );

    await expect(
      getFailureMemorySnapshot({
        endpoint: 'http://127.0.0.1:3000/api/failure-memory',
        fetcher
      })
    ).resolves.toEqual(snapshot);
  });

  it('throws when the endpoint returns a failure status', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('boom', {
        status: 503
      })
    );

    await expect(getFailureMemorySnapshot({ fetcher })).rejects.toThrow(
      /status 503/
    );
  });
});

describe('getFailureMemorySnapshotQueryOptions', () => {
  it('returns the shared query key and refresh policy', () => {
    const options = getFailureMemorySnapshotQueryOptions();

    expect(options.queryKey).toEqual(failureMemorySnapshotQueryKey);
    expect(options.refetchInterval).toBe(30_000);
    expect(options.staleTime).toBe(15_000);
  });
});
