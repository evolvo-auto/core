import { describe, expect, it, vi } from 'vitest';

import {
  plannerOutputSchema,
  type PlannerOutput
} from '@evolvo/schemas/role-output-schemas';

import { runPlannerRole } from './planner-role.js';

describe('runPlannerRole', () => {
  it('invokes the planner role and returns validated planner output', async () => {
    const plannerOutput: PlannerOutput = {
      acceptanceCriteria: ['All tests pass for touched code paths.'],
      assumptions: ['GitHub metadata is available in the issue body.'],
      capabilityTags: ['typescript', 'routing'],
      confidenceScore: 86,
      constraints: ['Do not use barrel files.'],
      dependencies: [],
      evaluationPlan: {
        extraChecks: ['Run targeted role-orchestration tests.'],
        requireBuild: true,
        requireInstall: true,
        requireLint: true,
        requireRun: false,
        requireSmoke: false,
        requireTests: true,
        requireTypecheck: true
      },
      expectedValueScore: 90,
      issueNumber: 201,
      kind: 'feature',
      objective: 'Implement the planner role and validate output contracts.',
      reasoningSummary: 'This unlocks autonomous planning for issue execution.',
      recommendedApproach: 'direct-execution',
      relevantSurfaces: ['runtime', 'github-ops'],
      riskLevel: 'medium',
      title: 'Implement planner role'
    };
    const invokeRole = vi.fn().mockResolvedValue({
      output: plannerOutput
    });

    await expect(
      runPlannerRole(
        {
          body: 'Planner should return structured output.',
          issueNumber: 201,
          labels: ['kind:feature', 'state:planned'],
          title: 'Implement planner role'
        },
        invokeRole
      )
    ).resolves.toEqual(plannerOutput);

    expect(invokeRole).toHaveBeenCalledWith(
      expect.objectContaining({
        capability: 'general',
        role: 'planner',
        schema: plannerOutputSchema,
        taskKind: 'issue-planning'
      })
    );
  });

  it('throws when the planner output issue number does not match the input', async () => {
    const invokeRole = vi.fn().mockResolvedValue({
      output: {
        acceptanceCriteria: ['criterion'],
        assumptions: [],
        capabilityTags: [],
        confidenceScore: 80,
        constraints: [],
        dependencies: [],
        evaluationPlan: {
          extraChecks: [],
          requireBuild: false,
          requireInstall: false,
          requireLint: false,
          requireRun: false,
          requireSmoke: false,
          requireTests: false,
          requireTypecheck: false
        },
        expectedValueScore: 70,
        issueNumber: 999,
        kind: 'feature',
        objective: 'Objective',
        reasoningSummary: 'Summary',
        recommendedApproach: 'direct-execution',
        relevantSurfaces: ['runtime'],
        riskLevel: 'low',
        title: 'Wrong issue'
      } satisfies PlannerOutput
    });

    await expect(
      runPlannerRole(
        {
          issueNumber: 202,
          title: 'Implement planner role'
        },
        invokeRole
      )
    ).rejects.toThrow(
      'Planner output issueNumber "999" did not match input issueNumber "202".'
    );
  });

  it('includes explicit schema-shape guidance in the planner prompt', async () => {
    const plannerOutput: PlannerOutput = {
      acceptanceCriteria: ['Ship the dashboard planner flow.'],
      assumptions: [],
      capabilityTags: ['typescript'],
      confidenceScore: 75,
      constraints: [],
      dependencies: [],
      evaluationPlan: {
        extraChecks: [],
        requireBuild: false,
        requireInstall: true,
        requireLint: true,
        requireRun: false,
        requireSmoke: false,
        requireTests: true,
        requireTypecheck: true
      },
      expectedValueScore: 82,
      issueNumber: 203,
      kind: 'feature',
      objective: 'Implement the planner prompt contract.',
      reasoningSummary: 'The planner should be explicit for local models.',
      recommendedApproach: 'direct-execution',
      relevantSurfaces: ['runtime'],
      riskLevel: 'medium',
      title: 'Harden planner prompts'
    };
    const invokeRole = vi.fn().mockResolvedValue({
      output: plannerOutput
    });

    await runPlannerRole(
      {
        issueNumber: 203,
        title: 'Harden planner prompts'
      },
      invokeRole
    );

    const request = invokeRole.mock.calls[0]?.[0];

    expect(request?.systemPrompt).toContain(
      'Every required field must be present in the JSON output.'
    );
    expect(request?.userPrompt).toContain(
      'Output shape template (replace the values, keep every key):'
    );
    expect(request?.userPrompt).toContain('"evaluationPlan"');
    expect(request?.userPrompt).toContain('"requireInstall": true');
    expect(request?.userPrompt).toContain('"riskLevel": "medium"');
    expect(request?.userPrompt).toContain(
      'recommendedApproach: direct-execution, system-mutation-first, experiment-first, defer, reject'
    );
  });
});
