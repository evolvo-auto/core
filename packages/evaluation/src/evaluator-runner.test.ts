import { describe, expect, it, vi } from 'vitest';

import type { EvaluatorOutput } from '@evolvo/schemas/role-output-schemas';

import { runEvaluation } from './evaluator-runner.js';

describe('runEvaluation', () => {
  it('runs required checks, performs smoke, and interprets the combined evidence', async () => {
    const executeCommand = vi.fn(async (input: {
      args?: string[];
      command: string;
    }) => ({
      classification: 'custom' as const,
      result: {
        args: input.args ?? [],
        command: input.command,
        cwd: '/repo/worktree',
        durationMs: 25,
        exitCode: 0,
        stderr: '',
        stdout: 'ok',
        timedOut: false
      }
    }));
    const appendJournalCommand = vi.fn().mockResolvedValue(undefined);
    const updateWorktree = vi.fn().mockResolvedValue({
      id: 'wt_1'
    });
    const startBackgroundCommand = vi.fn().mockResolvedValue({
      args: ['--filter', '@evolvo/dashboard', 'start'],
      command: 'pnpm',
      cwd: '/repo/worktree',
      getExitCode: () => 0,
      getStderr: () => '',
      getStdout: () => 'ready',
      stop: vi.fn().mockResolvedValue(undefined)
    });
    const waitForUrl = vi.fn().mockResolvedValue(undefined);
    const runSmoke = vi.fn().mockResolvedValue({
      browserCheck: {
        notes: ['Playwright smoke was not requested.'],
        path: '/',
        result: 'skipped'
      },
      notes: ['Smoke contract passed.'],
      passed: true,
      routeChecks: []
    });
    const evaluatorOutput: EvaluatorOutput = {
      checks: {
        build: 'passed',
        install: 'passed',
        run: 'passed',
        smoke: 'passed',
        tests: 'passed',
        typecheck: 'passed'
      },
      extraChecks: [
        {
          name: 'bench',
          result: 'passed'
        }
      ],
      issueNumber: 601,
      outcome: 'success',
      regressionRisk: 'low',
      shouldMergeIfPRExists: false,
      shouldOpenPR: true,
      summary: 'Everything passed.'
    };
    const interpretEvaluation = vi.fn().mockResolvedValue(evaluatorOutput);

    const result = await runEvaluation(
      {
        attemptId: 'att_1',
        builderSummary: 'Implemented the execution loop.',
        changedFiles: ['packages/execution/src/runtime-loop.ts'],
        evaluationPlan: {
          extraChecks: ['bench'],
          requireBuild: true,
          requireInstall: true,
          requireLint: false,
          requireRun: true,
          requireSmoke: true,
          requireTests: true,
          requireTypecheck: true
        },
        issueNumber: 601,
        journalPath: '/repo/worktree/.evolvo/attempt-journal.json',
        smokeContract: {
          baseUrl: 'http://127.0.0.1:3000',
          startupCommand: {
            args: ['--filter', '@evolvo/dashboard', 'start'],
            command: 'pnpm',
            startupTimeoutMs: 15_000
          }
        },
        worktreeId: 'wt_1',
        worktreePath: '/repo/worktree'
      },
      {
        appendJournalCommand,
        executeCommand,
        interpretEvaluation,
        readRootPackageJson: vi.fn().mockResolvedValue({
          scripts: {
            bench: 'vitest run bench',
            build: 'turbo run build',
            test: 'turbo run test',
            typecheck: 'turbo run typecheck'
          }
        }),
        runSmoke,
        startBackgroundCommand,
        updateWorktree,
        waitForUrl
      }
    );

    expect(result.evaluatorOutput).toEqual(evaluatorOutput);
    expect(result.checkResults.map((checkResult) => checkResult.name)).toEqual([
      'install',
      'typecheck',
      'lint',
      'tests',
      'build',
      'bench',
      'run',
      'smoke'
    ]);
    expect(result.checkResults[2]).toEqual({
      name: 'lint',
      notes: 'lint check not required.',
      result: 'skipped'
    });
    expect(startBackgroundCommand).toHaveBeenCalledWith({
      args: ['--filter', '@evolvo/dashboard', 'start'],
      command: 'pnpm',
      cwd: '/repo/worktree',
      env: undefined
    });
    expect(waitForUrl).toHaveBeenCalledWith({
      fetchImpl: fetch,
      timeoutMs: 15000,
      url: 'http://127.0.0.1:3000/api/health'
    });
    expect(appendJournalCommand).toHaveBeenCalledTimes(1);
    expect(updateWorktree).toHaveBeenCalledWith({
      id: 'wt_1',
      lastCommandAt: expect.any(Date)
    });
    expect(interpretEvaluation).toHaveBeenCalledWith(
      expect.objectContaining({
        issueNumber: 601,
        checks: expect.arrayContaining([
          expect.objectContaining({
            name: 'run',
            result: 'passed'
          }),
          expect.objectContaining({
            name: 'smoke',
            result: 'passed'
          })
        ])
      })
    );
  });

  it('skips missing scripts and surfaces failed run setup to the evaluator interpreter', async () => {
    const interpretEvaluation = vi.fn().mockResolvedValue({
      checks: {
        run: 'failed',
        smoke: 'skipped'
      },
      extraChecks: [],
      issueNumber: 602,
      outcome: 'failure',
      regressionRisk: 'medium',
      shouldMergeIfPRExists: false,
      shouldOpenPR: false,
      summary: 'Run setup failed.'
    } satisfies EvaluatorOutput);

    const result = await runEvaluation(
      {
        attemptId: 'att_2',
        evaluationPlan: {
          extraChecks: ['bench'],
          requireBuild: false,
          requireInstall: false,
          requireLint: false,
          requireRun: true,
          requireSmoke: false,
          requireTests: false,
          requireTypecheck: false
        },
        issueNumber: 602,
        journalPath: '/repo/worktree/.evolvo/attempt-journal.json',
        worktreeId: 'wt_2',
        worktreePath: '/repo/worktree'
      },
      {
        executeCommand: vi.fn(),
        interpretEvaluation,
        readRootPackageJson: vi.fn().mockResolvedValue({
          scripts: {}
        })
      }
    );

    expect(result.checkResults).toEqual([
      { name: 'install', notes: 'Install check not required.', result: 'skipped' },
      {
        name: 'typecheck',
        notes: 'typecheck check not required.',
        result: 'skipped'
      },
      { name: 'lint', notes: 'lint check not required.', result: 'skipped' },
      { name: 'tests', notes: 'tests check not required.', result: 'skipped' },
      { name: 'build', notes: 'build check not required.', result: 'skipped' },
      {
        name: 'bench',
        notes: 'Root package.json does not define a "bench" script.',
        result: 'skipped'
      },
      {
        name: 'run',
        notes: 'A smoke contract startupCommand is required for run/smoke evaluation.',
        result: 'failed'
      },
      {
        name: 'smoke',
        notes: 'Smoke check not required.',
        result: 'skipped'
      }
    ]);
    expect(result.observedFailures).toEqual([
      'A smoke contract startupCommand is required for run/smoke evaluation.'
    ]);
    expect(interpretEvaluation).toHaveBeenCalledWith(
      expect.objectContaining({
        observedFailures: [
          'A smoke contract startupCommand is required for run/smoke evaluation.'
        ]
      })
    );
  });
});
