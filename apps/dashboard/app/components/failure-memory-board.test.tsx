import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@evolvo/query/failure-memory', () => ({
  getFailureMemorySnapshotQueryOptions: () => ({
    queryKey: ['failure-memory-snapshot']
  })
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: {
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
      failures: [],
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
        totalFailures: 3,
        weakCapabilities: 1
      }
    },
    error: null,
    isFetching: false
  }))
}));

import FailureMemoryBoard from './failure-memory-board';

describe('FailureMemoryBoard', () => {
  it('renders recurrence, mutation, and capability sections', () => {
    const markup = renderToStaticMarkup(<FailureMemoryBoard />);

    expect(markup).toContain(
      'Recurring failures, proposal queue, and weak capabilities in one board.'
    );
    expect(markup).toContain('model-quality/runtime/openai');
    expect(markup).toContain('Improve prompt contract guidance');
    expect(markup).toContain('debugging');
  });
});
