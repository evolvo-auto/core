import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-query', () => ({
  queryOptions: (options: unknown) => options,
  useQuery: vi.fn().mockReturnValue({
    data: {
      challenges: [
        {
          capabilityTags: ['nextjs'],
          category: 'feature-implementation',
          issueSource: 'human',
          sourceIssueNumber: 32,
          title: 'Improve dashboard loading'
        }
      ],
      generatedAt: '2026-03-06T19:45:00.000Z',
      recentRuns: [
        {
          benchmarkKey: 'core-runtime-smoke',
          benchmarkType: 'fixed',
          benchmarkVersion: 1,
          durationMs: 4200,
          issueNumber: 32,
          outcome: 'passed',
          regressionCount: 0,
          retryCount: 1,
          score: 92,
          startedAt: '2026-03-06T19:40:00.000Z'
        }
      ],
      summary: {
        activeBenchmarks: 3,
        averageScore: 88,
        challengeBenchmarks: 1,
        holdoutBenchmarks: 1,
        regressedRuns: 0,
        regressionPacks: 1,
        totalRuns: 2
      },
      trends: [
        {
          averageScore: 88,
          benchmarkKey: 'core-runtime-smoke',
          benchmarkType: 'fixed',
          capabilityTags: ['runtime', 'testing'],
          isHoldout: false,
          isRegressionPack: false,
          lastRunAt: '2026-03-06T19:40:00.000Z',
          latestOutcome: 'passed',
          runCount: 2,
          title: 'Core runtime smoke',
          version: 1
        }
      ]
    },
    error: undefined,
    isFetching: false
  })
}));

import BenchmarkBoard from './benchmark-board';

describe('BenchmarkBoard', () => {
  it('renders benchmark summary, trends, and challenge registry content', () => {
    const markup = renderToStaticMarkup(<BenchmarkBoard />);

    expect(markup).toContain('Benchmark engine');
    expect(markup).toContain('Core runtime smoke');
    expect(markup).toContain('Improve dashboard loading');
    expect(markup).not.toContain('style=');
  });
});
