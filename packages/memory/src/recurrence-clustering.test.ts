import { describe, expect, it } from 'vitest';

import {
  buildFailureRecurrenceGroup,
  clusterFailureRecords
} from './recurrence-clustering.js';

describe('recurrence clustering', () => {
  it('builds deterministic recurrence group keys', () => {
    expect(
      buildFailureRecurrenceGroup({
        capabilityKey: 'nextjs',
        category: 'smoke-e2e-failure',
        likelyRootCauses: ['Hydration mismatch in dashboard layout'],
        phase: 'evaluation',
        symptom: 'Smoke check failed'
      })
    ).toBe('smoke-e2e-failure/evaluation/nextjs/hydration-mismatch-in-dashboard-layout');
  });

  it('clusters failures by recurrence group and keeps distinct issue numbers', () => {
    expect(
      clusterFailureRecords([
        {
          category: 'model-quality-issue',
          createdAt: '2026-03-06T18:00:00.000Z',
          id: 'failure_1',
          isSystemic: true,
          issueNumber: 14,
          phase: 'runtime',
          recurrenceGroup: 'model-quality-issue/runtime/structured-output',
          severity: 'systemic'
        },
        {
          category: 'model-quality-issue',
          createdAt: '2026-03-06T18:05:00.000Z',
          id: 'failure_2',
          isSystemic: true,
          issueNumber: 32,
          phase: 'runtime',
          recurrenceGroup: 'model-quality-issue/runtime/structured-output',
          severity: 'high'
        }
      ])
    ).toEqual([
      {
        category: 'model-quality-issue',
        issueNumbers: [14, 32],
        latestOccurredAt: '2026-03-06T18:05:00.000Z',
        phase: 'runtime',
        recurrenceGroup: 'model-quality-issue/runtime/structured-output',
        systemicCount: 2,
        totalFailures: 2
      }
    ]);
  });
});
