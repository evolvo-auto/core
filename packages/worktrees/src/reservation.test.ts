import { resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { reserveWorktree } from './reservation.js';

describe('reserveWorktree', () => {
  it('derives branch name and filesystem path deterministically from issue context', async () => {
    const reserveRecord = vi.fn().mockResolvedValue({
      id: 'wt_1'
    });

    const result = await reserveWorktree(
      {
        issueNumber: 142,
        issueTitle: 'Improve planner routing',
        worktreesRoot: '/tmp/evolvo-worktrees'
      },
      {
        reserveRecord
      }
    );

    expect(reserveRecord).toHaveBeenCalledWith({
      baseRef: 'main',
      branchName: 'issue/142-improve-planner-routing',
      filesystemPath: resolve(
        '/tmp/evolvo-worktrees',
        'issue/142-improve-planner-routing'
      ),
      issueNumber: 142
    });
    expect(result.branchName).toBe('issue/142-improve-planner-routing');
  });

  it('honors explicitly provided branch metadata', async () => {
    const reserveRecord = vi.fn().mockResolvedValue({
      id: 'wt_2'
    });

    const result = await reserveWorktree(
      {
        baseRef: 'release/next',
        branchName: 'issue/211-nextjs-challenge-bootstrap',
        filesystemPath: '/tmp/custom-worktree',
        issueNumber: 211,
        issueTitle: 'ignored because branch is explicit'
      },
      {
        reserveRecord
      }
    );

    expect(reserveRecord).toHaveBeenCalledWith({
      baseRef: 'release/next',
      branchName: 'issue/211-nextjs-challenge-bootstrap',
      filesystemPath: '/tmp/custom-worktree',
      issueNumber: 211
    });
    expect(result.filesystemPath).toBe('/tmp/custom-worktree');
  });

  it('rejects blank filesystemPath and worktreesRoot values when explicitly supplied', async () => {
    const reserveRecord = vi.fn();

    await expect(
      reserveWorktree(
        {
          filesystemPath: '   ',
          issueNumber: 300,
          issueTitle: 'Title'
        },
        {
          reserveRecord
        }
      )
    ).rejects.toThrow('Worktree reservation filesystemPath is required.');

    await expect(
      reserveWorktree(
        {
          issueNumber: 301,
          issueTitle: 'Title',
          worktreesRoot: '  '
        },
        {
          reserveRecord
        }
      )
    ).rejects.toThrow('Worktree reservation worktreesRoot is required.');

    expect(reserveRecord).not.toHaveBeenCalled();
  });
});
