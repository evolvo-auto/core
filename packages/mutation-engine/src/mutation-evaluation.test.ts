import { describe, expect, it, vi } from 'vitest';

import { evaluateMutation } from './mutation-evaluation.ts';

describe('mutation evaluation', () => {
  it('adopts mutations when required benchmark evidence improves over baseline', async () => {
    const listRuns = vi.fn().mockResolvedValue([
      {
        attemptId: 'previous_attempt',
        benchmarkKey: 'routing-pack',
        outcome: 'PASSED',
        regressionCount: 0,
        score: 72
      }
    ]);

    await expect(
      evaluateMutation(
        {
          attemptId: 'attempt_1',
          benchmarkRuns: [
            {
              attemptId: 'attempt_1',
              benchmarkKey: 'routing-pack',
              outcome: 'PASSED',
              regressionCount: 0,
              score: 86
            }
          ] as never,
          targetSurface: 'routing',
          validationPlan: {
            benchmarkIds: ['routing-pack'],
            maxAllowedRegressionCount: 0,
            minimumPassRateDelta: 5,
            replayIssueNumbers: [],
            requireShadowMode: false
          }
        },
        {
          listRuns
        }
      )
    ).resolves.toMatchObject({
      adoptionDecision: 'adopt',
      benchmarkDelta: {
        averageScoreDelta: 14,
        benchmarkEvidenceSatisfied: true,
        missingRequiredBenchmarkKeys: []
      }
    });
  });

  it('rejects routing mutations when required benchmark evidence is missing', async () => {
    await expect(
      evaluateMutation(
        {
          attemptId: 'attempt_2',
          benchmarkRuns: [] as never,
          targetSurface: 'routing',
          validationPlan: {
            benchmarkIds: [],
            replayIssueNumbers: [],
            requireShadowMode: false
          }
        },
        {
          listRuns: vi.fn().mockResolvedValue([])
        }
      )
    ).resolves.toMatchObject({
      adoptionDecision: 'reject',
      benchmarkDelta: {
        benchmarkEvidenceSatisfied: false,
        routingEvidenceRequired: true
      },
      notes: [
        'Routing mutations require explicit benchmarkIds in validationPlan.'
      ]
    });
  });
});
