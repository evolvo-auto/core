import { describe, expect, it, vi } from 'vitest';

import {
  mutationProposalSchema,
  type MutationProposal
} from '@evolvo/schemas/role-output-schemas';

import { runMutatorRole } from './mutator-role.js';

describe('runMutatorRole', () => {
  it('returns a valid mutation proposal for the supplied failure context', async () => {
    const proposal: MutationProposal = {
      confidenceScore: 79,
      evidence: ['Planner and critic repeatedly choose low-value next steps.'],
      expectedBenefits: ['Improved issue prioritization quality.'],
      expectedRisks: ['Overfitting to recent issues.'],
      priorityScore: 82,
      promotionImpact: 'medium',
      proposedChangeSummary: 'Tune selector heuristics to weight leverage higher.',
      rationale: 'Repeated low-leverage selections indicate a scoring gap.',
      sourceFailureIds: ['failure_1', 'failure_2'],
      sourceIssueNumber: 601,
      targetSurface: 'routing',
      title: 'Improve selector leverage weighting',
      validationPlan: {
        benchmarkIds: ['selector-baseline'],
        maxAllowedRegressionCount: 0,
        minimumPassRateDelta: 5,
        replayIssueNumbers: [601],
        requireShadowMode: false
      }
    };
    const invokeRole = vi.fn().mockResolvedValue({
      output: proposal
    });

    await expect(
      runMutatorRole(
        {
          candidateSurfaces: ['routing', 'prompts'],
          failureSummary: 'Selector repeatedly picked low-value issues.',
          sourceFailureIds: ['failure_1', 'failure_2'],
          sourceIssueNumber: 601
        },
        invokeRole
      )
    ).resolves.toEqual(proposal);

    expect(invokeRole).toHaveBeenCalledWith(
      expect.objectContaining({
        capability: 'prompt-mutation',
        role: 'mutator',
        schema: mutationProposalSchema,
        taskKind: 'mutation-proposal'
      })
    );
  });

  it('throws when output references failure ids not present in sourceFailureIds', async () => {
    const invokeRole = vi.fn().mockResolvedValue({
      output: {
        confidenceScore: 70,
        evidence: ['evidence'],
        expectedBenefits: ['benefit'],
        expectedRisks: ['risk'],
        priorityScore: 60,
        promotionImpact: 'low',
        proposedChangeSummary: 'summary',
        rationale: 'rationale',
        sourceFailureIds: ['failure_9'],
        sourceIssueNumber: 602,
        targetSurface: 'routing',
        title: 'title',
        validationPlan: {
          benchmarkIds: [],
          replayIssueNumbers: [],
          requireShadowMode: false
        }
      } satisfies MutationProposal
    });

    await expect(
      runMutatorRole(
        {
          failureSummary: 'summary',
          sourceFailureIds: ['failure_1'],
          sourceIssueNumber: 602
        },
        invokeRole
      )
    ).rejects.toThrow(
      'Mutator output referenced failure id "failure_9" that was not provided in sourceFailureIds.'
    );
  });
});
