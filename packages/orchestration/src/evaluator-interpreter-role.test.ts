import { describe, expect, it, vi } from 'vitest';

import {
  evaluatorOutputSchema,
  type EvaluatorOutput
} from '@evolvo/schemas/role-output-schemas';

import { runEvaluatorInterpreterRole } from './evaluator-interpreter-role.js';

describe('runEvaluatorInterpreterRole', () => {
  it('invokes the evaluator-interpreter route and returns structured evaluation output', async () => {
    const evaluatorOutput: EvaluatorOutput = {
      checks: {
        build: 'passed',
        lint: 'passed',
        run: 'passed',
        smoke: 'passed',
        tests: 'passed',
        typecheck: 'passed'
      },
      extraChecks: [],
      issueNumber: 501,
      outcome: 'success',
      regressionRisk: 'low',
      shouldMergeIfPRExists: false,
      shouldOpenPR: true,
      summary: 'All required checks passed and the worktree is ready for PR.'
    };
    const invokeRole = vi.fn().mockResolvedValue({
      output: evaluatorOutput
    });

    await expect(
      runEvaluatorInterpreterRole(
        {
          checks: [
            { name: 'typecheck', result: 'passed' },
            { name: 'test', result: 'passed' }
          ],
          issueNumber: 501
        },
        invokeRole
      )
    ).resolves.toEqual(evaluatorOutput);

    expect(invokeRole).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'evaluator-interpreter',
        schema: evaluatorOutputSchema,
        taskKind: 'evaluation-interpretation'
      })
    );
  });

  it('throws when the evaluator output issue number does not match the input', async () => {
    const invokeRole = vi.fn().mockResolvedValue({
      output: {
        checks: {},
        extraChecks: [],
        issueNumber: 777,
        outcome: 'failure',
        regressionRisk: 'high',
        shouldMergeIfPRExists: false,
        shouldOpenPR: false,
        summary: 'Wrong issue number.'
      } satisfies EvaluatorOutput
    });

    await expect(
      runEvaluatorInterpreterRole(
        {
          checks: [],
          issueNumber: 502
        },
        invokeRole
      )
    ).rejects.toThrow(
      'Evaluator output issueNumber "777" did not match input issueNumber "502".'
    );
  });
});
