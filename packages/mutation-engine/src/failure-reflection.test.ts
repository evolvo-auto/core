import { describe, expect, it } from 'vitest';

import { buildFailureReflection } from './failure-reflection.js';

describe('failure reflection', () => {
  it('builds structured reflections from critic output and recurrence metadata', () => {
    expect(
      buildFailureReflection({
        attemptId: 'att_14',
        criticOutput: {
          completionAssessment: 'failed',
          directFixRecommended: false,
          isSystemic: true,
          issueNumber: 14,
          likelyRootCauses: [
            {
              cause: 'Planner outputs are missing required fields.',
              confidence: 87
            }
          ],
          mutationRecommended: true,
          notes: ['Repeated across multiple issues.'],
          outcome: 'failure',
          primarySymptoms: ['Schema validation failed'],
          recommendedNextAction: 'open-mutation'
        },
        issueNumber: 14,
        recurrenceCount: 3,
        recurrenceGroup: 'model-quality-issue/runtime/structured-output',
        symptom: 'Schema validation failed'
      })
    ).toEqual(
      expect.objectContaining({
        localVsSystemic: 'systemic',
        shouldCreateFailureIssue: true,
        shouldCreateMutationIssue: true
      })
    );
  });
});
