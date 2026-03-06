import { describe, expect, it, vi } from 'vitest';

import { buildRoutingChangeEvidence } from './routing-change-evidence.ts';

describe('routing change evidence', () => {
  it('summarizes routing diff evidence for pull request output', async () => {
    await expect(
      buildRoutingChangeEvidence(
        {
          evaluation: {
            adoptionDecision: 'adopt',
            benchmarkDelta: {
              averageBaselineScore: 70,
              averageCurrentScore: 82,
              averageScoreDelta: 12,
              benchmarkComparisons: [],
              benchmarkEvidenceSatisfied: true,
              currentRegressionCount: 0,
              executedBenchmarkKeys: ['routing-pack'],
              maxAllowedRegressionCount: 0,
              minimumPassRateDelta: 5,
              missingRequiredBenchmarkKeys: [],
              requiredBenchmarkKeys: ['routing-pack'],
              routingEvidenceRequired: true
            },
            notes: []
          },
          rationale: 'Switch planner routing to a stronger model for debugging.',
          worktreePath: '/repo/worktree'
        },
        {
          exec: vi.fn().mockResolvedValue({
            stdout: [
              'diff --git a/genome/routing/model-routing.ts b/genome/routing/model-routing.ts',
              '-    model: \'gpt-5-mini\',',
              '+    model: \'gpt-5\','
            ].join('\n')
          }) as never
        }
      )
    ).resolves.toContain('## Routing Change Evidence');
  });
});
