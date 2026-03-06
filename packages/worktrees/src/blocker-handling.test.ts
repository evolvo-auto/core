import { describe, expect, it, vi } from 'vitest';

import { handleWorktreeBlocker } from './blocker-handling.js';

describe('handleWorktreeBlocker', () => {
  it('marks worktree failed, posts blocker comment, and transitions issue state', async () => {
    const getRecordById = vi.fn().mockResolvedValue({
      branchName: 'issue/700-hydration-failure',
      id: 'wt_700',
      issueNumber: 700
    });
    const updateWorktree = vi.fn().mockResolvedValue({
      id: 'wt_700',
      status: 'FAILED'
    });
    const transitionIssue = vi.fn().mockResolvedValue({
      changed: true
    });
    const updateAttempt = vi.fn().mockResolvedValue({
      id: 'att_700'
    });
    const writeComment = vi.fn().mockResolvedValue({
      body: 'blocker comment'
    });

    const result = await handleWorktreeBlocker(
      {
        attemptId: 'att_700',
        error: new Error('pnpm install failed'),
        evidence: ['pnpm returned exit code 1'],
        phase: 'hydration',
        worktreeId: 'wt_700'
      },
      {
        getRecordById,
        transitionIssue,
        updateAttempt,
        updateWorktree,
        writeComment
      }
    );

    expect(updateWorktree).toHaveBeenCalledWith({
      id: 'wt_700',
      status: 'FAILED'
    });
    expect(updateAttempt).toHaveBeenCalledWith({
      endedAt: expect.any(Date),
      id: 'att_700',
      outcome: 'BLOCKED',
      summary: 'Hydration blocked worktree execution: pnpm install failed'
    });
    expect(writeComment).toHaveBeenCalledWith(
      700,
      expect.objectContaining({
        commentKind: 'blocker',
        status:
          'Hydration failed while preparing worktree `issue/700-hydration-failure`.'
      })
    );
    expect(transitionIssue).toHaveBeenCalledWith(700, 'BLOCKED', {
      dryRun: false
    });
    expect(result).toEqual({
      commentBody: 'blocker comment',
      issueNumber: 700,
      message: 'pnpm install failed',
      stateChanged: true,
      worktree: {
        id: 'wt_700',
        status: 'FAILED'
      }
    });
  });

  it('falls back to record issue number and ignores attempt update errors', async () => {
    const getRecordById = vi.fn().mockResolvedValue({
      branchName: 'issue/701-creation-failure',
      id: 'wt_701',
      issueNumber: 701
    });
    const updateAttempt = vi.fn().mockRejectedValue(new Error('attempt missing'));
    const updateWorktree = vi.fn().mockResolvedValue({
      id: 'wt_701',
      status: 'FAILED'
    });
    const transitionIssue = vi.fn().mockResolvedValue({
      changed: false
    });
    const writeComment = vi.fn().mockResolvedValue({
      body: 'blocker comment'
    });

    const result = await handleWorktreeBlocker(
      {
        attemptId: 'att_701',
        error: 'git worktree add failed',
        phase: 'creation',
        worktreeId: 'wt_701'
      },
      {
        getRecordById,
        transitionIssue,
        updateAttempt,
        updateWorktree,
        writeComment
      }
    );

    expect(result.issueNumber).toBe(701);
    expect(updateAttempt).toHaveBeenCalledTimes(1);
    expect(result.stateChanged).toBe(false);
  });
});
