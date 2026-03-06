import { describe, expect, it, vi } from 'vitest';

import {
  criticOutputSchema,
  type CriticOutput
} from '@evolvo/schemas/role-output-schemas';

import { runCriticRole } from './critic-role.js';

describe('runCriticRole', () => {
  it('invokes critic routing and returns structured failure analysis', async () => {
    const criticOutput: CriticOutput = {
      completionAssessment: 'partial',
      directFixRecommended: true,
      isSystemic: false,
      issueNumber: 501,
      likelyRootCauses: [
        {
          cause: 'One output contract check was missing.',
          confidence: 76
        }
      ],
      mutationRecommended: false,
      notes: ['Add missing output consistency validation.'],
      outcome: 'partial',
      primarySymptoms: ['Role output lacked a required target field.'],
      recommendedNextAction: 'patch-directly'
    };
    const invokeRole = vi.fn().mockResolvedValue({
      output: criticOutput
    });

    await expect(
      runCriticRole(
        {
          implementationSummary: 'Implemented selector role.',
          issueNumber: 501,
          observedFailures: ['Selector returned unknown target issue.']
        },
        invokeRole
      )
    ).resolves.toEqual(criticOutput);

    expect(invokeRole).toHaveBeenCalledWith(
      expect.objectContaining({
        capability: 'debugging',
        role: 'critic',
        schema: criticOutputSchema,
        taskKind: 'failure-analysis'
      })
    );
  });

  it('throws when critic output issue number does not match the analyzed issue', async () => {
    const invokeRole = vi.fn().mockResolvedValue({
      output: {
        completionAssessment: 'failed',
        directFixRecommended: false,
        isSystemic: true,
        issueNumber: 999,
        likelyRootCauses: [],
        mutationRecommended: true,
        notes: ['Escalate to mutation.'],
        outcome: 'failure',
        primarySymptoms: ['Recurring failure pattern.'],
        recommendedNextAction: 'open-mutation'
      } satisfies CriticOutput
    });

    await expect(
      runCriticRole(
        {
          issueNumber: 502
        },
        invokeRole
      )
    ).rejects.toThrow(
      'Critic output issueNumber "999" did not match input issueNumber "502".'
    );
  });
});
