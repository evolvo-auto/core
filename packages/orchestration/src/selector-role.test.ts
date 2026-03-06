import { describe, expect, it, vi } from 'vitest';

import {
  selectorDecisionSchema,
  type SelectorDecision
} from '@evolvo/schemas/role-output-schemas';

import { runSelectorRole } from './selector-role.js';

describe('runSelectorRole', () => {
  it('invokes governor routing and returns a valid issue selection', async () => {
    const decision: SelectorDecision = {
      decisionType: 'select-issue',
      expectedLeverageScore: 88,
      nextStep: 'Start execution in a dedicated worktree.',
      priorityScore: 92,
      reason: 'Highest value with low immediate risk.',
      riskPenaltyScore: 22,
      strategicValueScore: 90,
      targetIssueNumber: 301,
      urgencyScore: 80
    };
    const invokeRole = vi.fn().mockResolvedValue({
      output: decision
    });

    await expect(
      runSelectorRole(
        {
          candidateIssues: [
            {
              issueNumber: 301,
              title: 'Implement planner role'
            },
            {
              issueNumber: 302,
              title: 'Implement narrator role'
            }
          ]
        },
        invokeRole
      )
    ).resolves.toEqual(decision);

    expect(invokeRole).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'governor',
        schema: selectorDecisionSchema,
        taskKind: 'issue-selection'
      })
    );
  });

  it('throws when issue-based decisions reference issues outside the candidate list', async () => {
    const invokeRole = vi.fn().mockResolvedValue({
      output: {
        decisionType: 'select-issue',
        expectedLeverageScore: 80,
        nextStep: 'Proceed',
        priorityScore: 90,
        reason: 'Reason',
        riskPenaltyScore: 30,
        strategicValueScore: 89,
        targetIssueNumber: 999,
        urgencyScore: 75
      } satisfies SelectorDecision
    });

    await expect(
      runSelectorRole(
        {
          candidateIssues: [
            {
              issueNumber: 400,
              title: 'Known candidate'
            }
          ]
        },
        invokeRole
      )
    ).rejects.toThrow(
      'Selector chose issue "999" that was not in the candidate issue list.'
    );
  });
});
