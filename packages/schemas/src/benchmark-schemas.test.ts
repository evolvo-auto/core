import { describe, expect, it } from 'vitest';

import { benchmarkDashboardSnapshotSchema } from './benchmark-schemas.js';

describe('benchmark schemas', () => {
  it('parses a valid benchmark dashboard snapshot', () => {
    expect(
      benchmarkDashboardSnapshotSchema.parse({
        challenges: [
          {
            capabilityTags: ['nextjs'],
            category: 'feature-implementation',
            issueSource: 'human',
            sourceIssueNumber: 32,
            title: 'Improve dashboard loading'
          }
        ],
        generatedAt: '2026-03-06T19:10:00.000Z',
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
            score: 91.4,
            startedAt: '2026-03-06T19:05:00.000Z'
          }
        ],
        summary: {
          activeBenchmarks: 3,
          averageScore: 88.2,
          challengeBenchmarks: 1,
          holdoutBenchmarks: 1,
          regressedRuns: 0,
          regressionPacks: 1,
          totalRuns: 1
        },
        trends: [
          {
            averageScore: 88.2,
            benchmarkKey: 'core-runtime-smoke',
            benchmarkType: 'fixed',
            capabilityTags: ['runtime', 'testing'],
            isHoldout: false,
            isRegressionPack: false,
            lastRunAt: '2026-03-06T19:05:00.000Z',
            latestOutcome: 'passed',
            runCount: 1,
            title: 'Core runtime smoke',
            version: 1
          }
        ]
      })
    ).toMatchObject({
      summary: {
        activeBenchmarks: 3
      }
    });
  });
});
