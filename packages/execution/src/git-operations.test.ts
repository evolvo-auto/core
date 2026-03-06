import { describe, expect, it, vi } from 'vitest';

import {
  buildIssueCommitMessage,
  commitAndPushWorktree
} from './git-operations.js';

describe('git operations', () => {
  it('builds conventional commit messages from issue metadata', () => {
    expect(buildIssueCommitMessage('bug', 123, 'repair runtime loop')).toBe(
      'fix(issue-123): repair runtime loop'
    );
    expect(buildIssueCommitMessage('feature', 124, 'implement evaluator')).toBe(
      'feat(issue-124): implement evaluator'
    );
    expect(buildIssueCommitMessage('upgrade', 125, 'promote runtime')).toBe(
      'chore(issue-125): promote runtime'
    );
  });

  it('stages, commits, and pushes the worktree branch', async () => {
    const executeCommand = vi.fn().mockResolvedValue({
      result: {
        exitCode: 0
      }
    });

    await expect(
      commitAndPushWorktree(
        {
          branchName: 'issue/123-runtime-loop',
          commitMessage: 'feat(issue-123): implement runtime loop',
          journalPath: '/repo/worktree/.evolvo/attempt-journal.json',
          worktreeId: 'wt_123',
          worktreePath: '/repo/worktree'
        },
        {
          executeCommand: executeCommand as never
        }
      )
    ).resolves.toEqual({
      branchName: 'issue/123-runtime-loop',
      commitMessage: 'feat(issue-123): implement runtime loop',
      remoteName: 'origin'
    });

    expect(executeCommand).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        args: ['add', '-A'],
        command: 'git'
      })
    );
    expect(executeCommand).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        args: ['commit', '-m', 'feat(issue-123): implement runtime loop'],
        command: 'git'
      })
    );
    expect(executeCommand).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        args: ['push', '-u', 'origin', 'issue/123-runtime-loop'],
        command: 'git'
      })
    );
  });
});
