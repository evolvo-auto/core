import { describe, expect, it } from 'vitest';

import { buildMutationIssueDraft } from './mutation-issue-draft.js';

describe('mutation issue draft', () => {
  it('builds a mutation issue body and label set from a proposal', () => {
    expect(
      buildMutationIssueDraft({
        confidenceScore: 74,
        evidence: ['Repeated structured-output failures on issue #14'],
        expectedBenefits: ['Lower schema repair churn'],
        expectedRisks: ['May overconstrain planner responses'],
        id: 'mutation_1',
        priorityScore: 81,
        promotionImpact: 'medium',
        proposedChangeSummary: 'Tighten prompt contract guidance.',
        rationale: 'Planner and builder outputs keep dropping required fields.',
        sourceFailureIds: ['failure_1', 'failure_2'],
        sourceIssueNumber: 14,
        targetSurface: 'prompts',
        title: 'Improve prompt contract guidance',
        validationPlan: {
          benchmarkIds: ['structured-output-pack'],
          maxAllowedRegressionCount: 0,
          minimumPassRateDelta: 5,
          replayIssueNumbers: [14, 32],
          requireShadowMode: false
        }
      })
    ).toEqual(
      expect.objectContaining({
        labels: expect.arrayContaining([
          'source:evolvo',
          'kind:mutation',
          'state:triage',
          'surface:prompts',
          'risk:medium',
          'priority:p0'
        ]),
        title: 'Mutation: Improve prompt contract guidance'
      })
    );
  });
});
