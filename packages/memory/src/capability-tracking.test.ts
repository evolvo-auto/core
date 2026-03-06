import { describe, expect, it } from 'vitest';

import { buildCapabilitySnapshot } from './capability-tracking.js';

describe('capability tracking', () => {
  it('raises confidence on success and records attempts', () => {
    expect(
      buildCapabilitySnapshot({
        capabilityKey: 'nextjs',
        existing: {
          attempts: 2,
          confidenceScore: 55,
          failures: 1,
          lastIssueNumber: 12,
          recurringFailureModes: ['env/bootstrap'],
          successes: 1
        },
        issueNumber: 32,
        outcome: 'success'
      })
    ).toEqual({
      attempts: 3,
      capabilityKey: 'nextjs',
      confidenceScore: 61,
      failures: 1,
      lastIssueNumber: 32,
      recurringFailureModes: ['env/bootstrap'],
      successes: 2
    });
  });

  it('lowers confidence on failure and records recurring failure modes', () => {
    expect(
      buildCapabilitySnapshot({
        capabilityKey: 'debugging',
        existing: {
          attempts: 4,
          confidenceScore: 47,
          failures: 2,
          recurringFailureModes: ['structured-output/runtime']
        },
        issueNumber: 14,
        outcome: 'failure',
        recurrenceGroup: 'structured-output/runtime/openai'
      })
    ).toEqual({
      attempts: 5,
      capabilityKey: 'debugging',
      confidenceScore: 39,
      failures: 3,
      lastIssueNumber: 14,
      recurringFailureModes: [
        'structured-output/runtime/openai',
        'structured-output/runtime'
      ],
      successes: 0
    });
  });
});
