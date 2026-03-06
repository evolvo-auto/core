import { describe, expect, it, vi } from 'vitest';

import type { CriticOutput, PlannerOutput } from '@evolvo/schemas/role-output-schemas';

import { processFailureFollowup } from './failure-followup.js';

const plannerOutput: PlannerOutput = {
  acceptanceCriteria: ['Fix the runtime issue.'],
  assumptions: [],
  capabilityTags: ['typescript'],
  confidenceScore: 80,
  constraints: [],
  dependencies: [],
  evaluationPlan: {
    extraChecks: [],
    requireBuild: true,
    requireInstall: true,
    requireLint: true,
    requireRun: true,
    requireSmoke: true,
    requireTests: true,
    requireTypecheck: true
  },
  expectedValueScore: 90,
  issueNumber: 14,
  kind: 'bug',
  objective: 'Fix the runtime issue.',
  reasoningSummary: 'The issue is concrete and worth fixing.',
  recommendedApproach: 'direct-execution',
  relevantSurfaces: ['routing'],
  riskLevel: 'high',
  title: 'Fix runtime issue'
};

const criticOutput: CriticOutput = {
  completionAssessment: 'failed',
  directFixRecommended: false,
  isSystemic: true,
  issueNumber: 14,
  likelyRootCauses: [
    {
      cause: 'Structured output repair is too weak.',
      confidence: 86
    }
  ],
  mutationRecommended: true,
  notes: ['Repeated across multiple issues.'],
  outcome: 'failure',
  primarySymptoms: ['Schema validation failed'],
  recommendedNextAction: 'open-mutation'
};

describe('processFailureFollowup', () => {
  it('persists failure memory, creates follow-up issues, and records a mutation proposal', async () => {
    const createIssue = vi
      .fn()
      .mockResolvedValueOnce({
        labels: ['source:evolvo', 'kind:mutation', 'state:triage'],
        number: 41,
        title: 'Mutation: Improve prompt contract guidance',
        user: {
          type: 'Bot'
        }
      });
    const createMutation = vi.fn().mockResolvedValue({
      id: 'mutation_1'
    });

    const result = await processFailureFollowup(
      {
        attemptId: 'att_14',
        capabilityKey: 'debugging',
        criticOutput,
        issueNumber: 14,
        observedFailures: ['Schema validation failed'],
        plannerOutput
      },
      {
        createFailure: vi.fn().mockResolvedValue({
          id: 'failure_1'
        }),
        createIssue,
        createMutation,
        generateMutation: vi.fn().mockResolvedValue({
          confidenceScore: 70,
          evidence: ['Repeated schema failures'],
          expectedBenefits: ['Reduce future schema failures'],
          expectedRisks: ['Could overconstrain prompts'],
          priorityScore: 82,
          promotionImpact: 'medium',
          proposedChangeSummary: 'Tighten prompt guidance.',
          rationale: 'The repair prompt is too weak.',
          sourceFailureIds: ['failure_1'],
          sourceIssueNumber: 14,
          targetSurface: 'prompts',
          title: 'Improve prompt contract guidance',
          validationPlan: {
            benchmarkIds: [],
            maxAllowedRegressionCount: 0,
            minimumPassRateDelta: 5,
            replayIssueNumbers: [14],
            requireShadowMode: false
          }
        }),
        getCapability: vi.fn().mockResolvedValue(null),
        listFailures: vi.fn().mockResolvedValue([]),
        listMutations: vi.fn().mockResolvedValue([]),
        updateCapability: vi.fn().mockResolvedValue(undefined),
        updateFailure: vi.fn().mockResolvedValue(undefined),
        updateMutation: vi.fn().mockResolvedValue(undefined),
        upsertIssue: vi.fn().mockResolvedValue(undefined)
      }
    );

    expect(result).toEqual(
      expect.objectContaining({
        createdFailureIssueNumber: undefined,
        createdMutationIssueNumber: 41,
        failureRecordId: 'failure_1',
        mutationProposalId: 'mutation_1',
        strategy: 'mutation-first'
      })
    );
    expect(createMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceFailureIds: ['failure_1'],
        sourceIssueNumber: 14,
        state: 'PROPOSED'
      })
    );
  });
});
