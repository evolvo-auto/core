import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it, vi } from 'vitest';

import type { PlannerOutput } from '@evolvo/schemas/role-output-schemas';

import { runBuilderOrchestration } from './builder-orchestration.js';

const plannerOutput: PlannerOutput = {
  acceptanceCriteria: ['Runtime loop executes one issue end to end.'],
  assumptions: [],
  capabilityTags: ['typescript'],
  confidenceScore: 82,
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
  issueNumber: 701,
  kind: 'feature',
  objective: 'Implement the runtime loop.',
  reasoningSummary: 'This unlocks autonomous issue execution.',
  recommendedApproach: 'direct-execution',
  relevantSurfaces: ['runtime', 'github-ops'],
  riskLevel: 'medium',
  title: 'Implement runtime loop'
};

describe('runBuilderOrchestration', () => {
  it('requests a builder patch, applies it, runs safe follow-up commands, and reports the resulting diff', async () => {
    const worktreePath = await mkdtemp(join(tmpdir(), 'evolvo-builder-'));
    const executeCommand = vi
      .fn()
      .mockResolvedValueOnce({
        result: {
          stdout:
            'package.json\napps/runtime/src/server.ts\npackages/execution/src/runtime-loop.ts\n'
        }
      })
      .mockResolvedValueOnce({
        result: {
          stdout: ''
        }
      })
      .mockResolvedValueOnce({
        result: {
          stdout: ''
        }
      })
      .mockResolvedValueOnce({
        result: {
          stdout: ''
        }
      });
    const invokeRole = vi.fn().mockResolvedValue({
      output: {
        believesReadyForEvaluation: true,
        commandsSuggested: [
          {
            command: 'pnpm typecheck',
            name: 'typecheck'
          }
        ],
        filesIntendedToChange: ['packages/execution/src/runtime-loop.ts'],
        implementationNotes: ['Added the scheduler loop.'],
        issueNumber: 701,
        patch:
          'diff --git a/packages/execution/src/runtime-loop.ts b/packages/execution/src/runtime-loop.ts\nindex 1111111..2222222 100644\n--- a/packages/execution/src/runtime-loop.ts\n+++ b/packages/execution/src/runtime-loop.ts\n@@ -1 +1 @@\n-old\n+new\n',
        possibleKnownRisks: ['Rate limit backoff may need tuning.'],
        summary: 'Implemented the runtime loop.'
      }
    });
    const detectChanges = vi.fn().mockResolvedValue({
      actualChangedFiles: ['packages/execution/src/runtime-loop.ts'],
      diffSummary: '1 file changed',
      hasChanges: true,
      intendedOnlyFiles: [],
      unexpectedChangedFiles: []
    });
    const buildContext = vi.fn().mockResolvedValue([
      {
        content: 'export const runtimeLoop = true;\n',
        path: 'packages/execution/src/runtime-loop.ts'
      }
    ]);

    try {
      const result = await runBuilderOrchestration(
        {
          attemptId: 'att_701',
          body: 'Build the autonomous issue loop.',
          issueNumber: 701,
          journalPath: `${worktreePath}/.evolvo/attempt-journal.json`,
          plannerOutput,
          title: 'Implement runtime loop',
          worktreeId: 'wt_701',
          worktreePath
        },
        {
          buildContext,
          detectChanges,
          executeCommand: executeCommand as never,
          invokeRole
        }
      );

      expect(result.builderOutput).toEqual({
        believesReadyForEvaluation: true,
        commandsSuggested: [
          {
            command: 'pnpm typecheck',
            name: 'typecheck'
          }
        ],
        filesActuallyChanged: ['packages/execution/src/runtime-loop.ts'],
        filesIntendedToChange: ['packages/execution/src/runtime-loop.ts'],
        implementationNotes: ['Added the scheduler loop.'],
        issueNumber: 701,
        possibleKnownRisks: ['Rate limit backoff may need tuning.'],
        summary: 'Implemented the runtime loop.'
      });
      expect(detectChanges).toHaveBeenCalledWith({
        intendedFiles: ['packages/execution/src/runtime-loop.ts'],
        journalPath: `${worktreePath}/.evolvo/attempt-journal.json`,
        worktreeId: 'wt_701',
        worktreePath
      });
      expect(executeCommand).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          args: ['apply', '--whitespace=nowarn', expect.stringContaining('.evolvo/builder.patch')],
          command: 'git'
        })
      );
      expect(executeCommand).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          args: ['typecheck'],
          command: 'pnpm'
        })
      );
    } finally {
      await rm(worktreePath, {
        force: true,
        recursive: true
      });
    }
  });

  it('rejects builder-suggested commands that fall outside the safety allowlist', async () => {
    const worktreePath = await mkdtemp(join(tmpdir(), 'evolvo-builder-'));
    const executeCommand = vi
      .fn()
      .mockResolvedValueOnce({
        result: {
          stdout: 'packages/execution/src/runtime-loop.ts\n'
        }
      })
      .mockResolvedValueOnce({
        result: {
          stdout: ''
        }
      })
      .mockResolvedValueOnce({
        result: {
          stdout: ''
        }
      });
    const invokeRole = vi.fn().mockResolvedValue({
      output: {
        believesReadyForEvaluation: true,
        commandsSuggested: [
          {
            command: 'rm -rf .',
            name: 'bad-command'
          }
        ],
        filesIntendedToChange: ['packages/execution/src/runtime-loop.ts'],
        implementationNotes: [],
        issueNumber: 701,
        patch:
          'diff --git a/packages/execution/src/runtime-loop.ts b/packages/execution/src/runtime-loop.ts\nindex 1111111..2222222 100644\n--- a/packages/execution/src/runtime-loop.ts\n+++ b/packages/execution/src/runtime-loop.ts\n@@ -1 +1 @@\n-old\n+new\n',
        possibleKnownRisks: [],
        summary: 'Unsafe command'
      }
    });

    try {
      await expect(
        runBuilderOrchestration(
          {
            attemptId: 'att_702',
            issueNumber: 701,
            journalPath: `${worktreePath}/.evolvo/attempt-journal.json`,
            plannerOutput,
            title: 'Implement runtime loop',
            worktreeId: 'wt_702',
            worktreePath
          },
          {
            buildContext: vi.fn().mockResolvedValue([]),
            detectChanges: vi.fn(),
            executeCommand: executeCommand as never,
            invokeRole
          }
        )
      ).rejects.toThrow(
        'Builder suggested command "rm -rf ." is not in the safe allowlist.'
      );
    } finally {
      await rm(worktreePath, {
        force: true,
        recursive: true
      });
    }
  });

  it('derives missing command suggestion names before running safe follow-up commands', async () => {
    const worktreePath = await mkdtemp(join(tmpdir(), 'evolvo-builder-'));
    const executeCommand = vi
      .fn()
      .mockResolvedValueOnce({
        result: {
          stdout: 'packages/execution/src/runtime-loop.ts\n'
        }
      })
      .mockResolvedValueOnce({
        result: {
          stdout: ''
        }
      })
      .mockResolvedValueOnce({
        result: {
          stdout: ''
        }
      })
      .mockResolvedValueOnce({
        result: {
          stdout: ''
        }
      });
    const invokeRole = vi.fn().mockImplementation(async (input) => ({
      output: input.schema.parse({
        believesReadyForEvaluation: true,
        commandsSuggested: [
          {
            command: 'pnpm typecheck'
          }
        ],
        filesIntendedToChange: ['packages/execution/src/runtime-loop.ts'],
        implementationNotes: ['Added the scheduler loop.'],
        issueNumber: 701,
        patch:
          'diff --git a/packages/execution/src/runtime-loop.ts b/packages/execution/src/runtime-loop.ts\nindex 1111111..2222222 100644\n--- a/packages/execution/src/runtime-loop.ts\n+++ b/packages/execution/src/runtime-loop.ts\n@@ -1 +1 @@\n-old\n+new\n',
        possibleKnownRisks: [],
        summary: 'Implemented the runtime loop.'
      })
    }));
    const detectChanges = vi.fn().mockResolvedValue({
      actualChangedFiles: ['packages/execution/src/runtime-loop.ts'],
      diffSummary: '1 file changed',
      hasChanges: true,
      intendedOnlyFiles: [],
      unexpectedChangedFiles: []
    });

    try {
      const result = await runBuilderOrchestration(
        {
          attemptId: 'att_703',
          issueNumber: 701,
          journalPath: `${worktreePath}/.evolvo/attempt-journal.json`,
          plannerOutput,
          title: 'Implement runtime loop',
          worktreeId: 'wt_703',
          worktreePath
        },
        {
          buildContext: vi.fn().mockResolvedValue([]),
          detectChanges,
          executeCommand: executeCommand as never,
          invokeRole
        }
      );

      expect(result.builderOutput.commandsSuggested).toEqual([
        {
          command: 'pnpm typecheck',
          name: 'pnpm-typecheck'
        }
      ]);
      expect(executeCommand).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          args: ['typecheck'],
          command: 'pnpm'
        })
      );
      expect(invokeRole).toHaveBeenCalledWith(
        expect.objectContaining({
          userPrompt: expect.stringContaining(
            'Each item must be an object with name, command, optional cwd, and optional timeoutMs.'
          )
        })
      );
    } finally {
      await rm(worktreePath, {
        force: true,
        recursive: true
      });
    }
  });
});
