import { describe, expect, it, vi } from 'vitest';

import { generateMutationProposal } from './mutation-proposal-generator.js';

describe('mutation proposal generator', () => {
  it('delegates to the mutator role with the provided context', async () => {
    const generate = vi.fn().mockResolvedValue({
      confidenceScore: 70,
      evidence: ['Repeated issue failures'],
      expectedBenefits: ['Reduce future failures'],
      expectedRisks: ['Could regress prompt flexibility'],
      priorityScore: 80,
      promotionImpact: 'medium',
      proposedChangeSummary: 'Tighten prompt guardrails.',
      rationale: 'Repeated schema failures indicate a prompt weakness.',
      sourceFailureIds: ['failure_1'],
      sourceIssueNumber: 14,
      targetSurface: 'prompts',
      title: 'Improve prompt guardrails',
      validationPlan: {
        benchmarkIds: ['structured-output-pack'],
        maxAllowedRegressionCount: 0,
        minimumPassRateDelta: 5,
        replayIssueNumbers: [14],
        requireShadowMode: false
      }
    });

    await expect(
      generateMutationProposal(
        {
          failureSummary: 'Repeated structured-output failures',
          sourceFailureIds: ['failure_1'],
          sourceIssueNumber: 14
        },
        {
          generate
        }
      )
    ).resolves.toEqual(
      expect.objectContaining({
        targetSurface: 'prompts',
        title: 'Improve prompt guardrails'
      })
    );

    expect(generate).toHaveBeenCalledWith({
      failureSummary: 'Repeated structured-output failures',
      sourceFailureIds: ['failure_1'],
      sourceIssueNumber: 14
    });
  });
});
