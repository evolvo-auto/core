import { describe, expect, it } from 'vitest';

import { buildFailureIssueDraft } from './failure-issue-draft.js';

describe('failure issue draft', () => {
  it('builds a labeled failure issue draft from reflection data', () => {
    expect(
      buildFailureIssueDraft({
        capabilityKey: 'debugging',
        category: 'model-quality-issue',
        recurrenceCount: 3,
        reflection: {
          attemptId: 'att_14',
          immediateFollowups: [
            {
              summary: 'Create a mutation proposal.',
              title: 'Create mutation proposal',
              type: 'mutation'
            }
          ],
          issueNumber: 14,
          localVsSystemic: 'systemic',
          likelyRootCauses: [
            {
              cause: 'Structured outputs remain under-specified.',
              confidence: 88
            }
          ],
          phase: 'runtime',
          recurrenceHints: ['recurrence-group:model-quality/runtime'],
          shouldCreateFailureIssue: true,
          shouldCreateMutationIssue: true,
          symptom: 'Structured output schema validation failed'
        },
        severity: 'systemic',
        sourceIssueNumber: 14,
        surface: 'routing'
      })
    ).toEqual(
      expect.objectContaining({
        labels: expect.arrayContaining([
          'source:evolvo',
          'kind:failure',
          'state:triage',
          'risk:systemic',
          'surface:routing',
          'priority:p0',
          'capability:debugging'
        ])
      })
    );
  });
});
