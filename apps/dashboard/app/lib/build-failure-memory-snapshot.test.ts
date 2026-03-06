import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { buildFailureMemorySnapshot } from './build-failure-memory-snapshot';

describe('buildFailureMemorySnapshot', () => {
  it('builds failure, mutation, cluster, and capability views for the dashboard', async () => {
    const snapshot = await buildFailureMemorySnapshot({
      listCapabilities: vi.fn().mockResolvedValue([
        {
          attempts: 8,
          capabilityKey: 'debugging',
          confidenceScore: 41,
          failures: 5,
          lastIssueNumber: 32,
          recurringFailureModes: ['model-quality/runtime/openai'],
          successes: 3
        }
      ]),
      listFailures: vi.fn().mockResolvedValue([
        {
          category: 'MODEL_QUALITY_ISSUE',
          createdAt: new Date('2026-03-06T18:40:00.000Z'),
          id: 'failure_1',
          isSystemic: true,
          issueNumber: 14,
          linkedIssueNumber: 41,
          phase: 'RUNTIME',
          recurrenceCount: 3,
          recurrenceGroup: 'model-quality/runtime/openai',
          severity: 'SYSTEMIC'
        }
      ]),
      listMutations: vi.fn().mockResolvedValue([
        {
          confidenceScore: 72,
          createdAt: new Date('2026-03-06T18:44:00.000Z'),
          id: 'mutation_1',
          linkedIssueNumber: 42,
          priorityScore: 81,
          sourceIssueNumber: 14,
          state: 'PROPOSED',
          targetSurface: 'PROMPTS',
          title: 'Improve prompt contract guidance'
        }
      ]),
      now: new Date('2026-03-06T18:46:00.000Z')
    });

    expect(snapshot.summary).toEqual({
      openMutationProposals: 1,
      recurringClusters: 1,
      totalFailures: 1,
      weakCapabilities: 1
    });
    expect(snapshot.failures[0]).toMatchObject({
      category: 'model-quality-issue',
      severity: 'systemic'
    });
    expect(snapshot.mutations[0]).toMatchObject({
      state: 'proposed',
      targetSurface: 'prompts'
    });
  });
});
