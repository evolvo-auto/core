import { describe, expect, it, vi } from 'vitest';

import { detectChangedFiles } from './changed-files.js';

describe('detectChangedFiles', () => {
  it('reads git diff output and compares intended files to actual changes', async () => {
    const executeCommand = vi
      .fn()
      .mockResolvedValueOnce({
        result: {
          stdout: 'packages/execution/src/runtime-loop.ts\npackages/github/src/issues.ts\n'
        }
      })
      .mockResolvedValueOnce({
        result: {
          stdout: ' 2 files changed, 20 insertions(+), 3 deletions(-)\n'
        }
      });

    const result = await detectChangedFiles(
      {
        intendedFiles: [
          'packages/execution/src/runtime-loop.ts',
          'packages/execution/src/issue-executor.ts'
        ],
        journalPath: '/repo/worktree/.evolvo/attempt-journal.json',
        worktreeId: 'wt_1',
        worktreePath: '/repo/worktree'
      },
      {
        executeCommand: executeCommand as never
      }
    );

    expect(result).toEqual({
      actualChangedFiles: [
        'packages/execution/src/runtime-loop.ts',
        'packages/github/src/issues.ts'
      ],
      diffSummary: '2 files changed, 20 insertions(+), 3 deletions(-)',
      hasChanges: true,
      intendedOnlyFiles: ['packages/execution/src/issue-executor.ts'],
      unexpectedChangedFiles: ['packages/github/src/issues.ts']
    });
    expect(executeCommand).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        args: ['diff', '--name-only', '--relative=.', 'HEAD'],
        command: 'git'
      })
    );
    expect(executeCommand).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        args: ['diff', '--stat', '--relative=.', 'HEAD'],
        command: 'git'
      })
    );
  });
});
