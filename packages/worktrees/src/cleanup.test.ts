import { describe, expect, it, vi } from 'vitest';

import { cleanupWorktree } from './cleanup.js';

describe('cleanupWorktree', () => {
  it('archives and cleans a completed worktree after artifact persistence is confirmed', async () => {
    const getRecordById = vi.fn().mockResolvedValue({
      filesystemPath: '/tmp/worktrees/issue-600',
      id: 'wt_600',
      status: 'COMPLETED'
    });
    const pathExists = vi.fn(async (path: string) => {
      if (path === '/artifacts/wt_600/manifest.json') {
        return true;
      }

      if (path === '/tmp/worktrees/issue-600/.evolvo/attempt-journal.json') {
        return true;
      }

      return false;
    });
    const runGitCommand = vi
      .fn()
      .mockResolvedValueOnce({
        args: ['worktree', 'remove'],
        command: 'git',
        cwd: '/repo',
        durationMs: 0,
        exitCode: 0,
        stderr: '',
        stdout: '',
        timedOut: false
      })
      .mockResolvedValueOnce({
        args: ['worktree', 'prune'],
        command: 'git',
        cwd: '/repo',
        durationMs: 0,
        exitCode: 0,
        stderr: '',
        stdout: '',
        timedOut: false
      });
    const updateRecord = vi
      .fn()
      .mockResolvedValueOnce({
        id: 'wt_600',
        status: 'ARCHIVED'
      })
      .mockResolvedValueOnce({
        id: 'wt_600',
        status: 'CLEANED'
      });

    const result = await cleanupWorktree(
      {
        artifactManifestPath: '/artifacts/wt_600/manifest.json',
        repoRoot: '/repo',
        worktreeId: 'wt_600'
      },
      {
        getRecordById,
        pathExists,
        runGitCommand,
        updateRecord
      }
    );

    expect(updateRecord).toHaveBeenNthCalledWith(1, {
      id: 'wt_600',
      status: 'ARCHIVED'
    });
    expect(runGitCommand).toHaveBeenNthCalledWith(1, {
      args: ['worktree', 'remove', '--force', '/tmp/worktrees/issue-600'],
      cwd: '/repo'
    });
    expect(runGitCommand).toHaveBeenNthCalledWith(2, {
      args: ['worktree', 'prune'],
      cwd: '/repo'
    });
    expect(updateRecord).toHaveBeenNthCalledWith(2, {
      cleanupEligibleAt: expect.any(Date),
      id: 'wt_600',
      status: 'CLEANED'
    });
    expect(result.archived).toBe(true);
    expect(result.alreadyCleaned).toBe(false);
  });

  it('rejects cleanup when artifact persistence has not been completed', async () => {
    const getRecordById = vi.fn().mockResolvedValue({
      filesystemPath: '/tmp/worktrees/issue-601',
      id: 'wt_601',
      status: 'FAILED'
    });
    const pathExists = vi.fn().mockResolvedValue(false);

    await expect(
      cleanupWorktree(
        {
          artifactManifestPath: '/artifacts/wt_601/manifest.json',
          worktreeId: 'wt_601'
        },
        {
          getRecordById,
          pathExists
        }
      )
    ).rejects.toThrow(
      'Worktree "wt_601" cannot be cleaned before artifact persistence. Missing manifest: "/artifacts/wt_601/manifest.json".'
    );
  });

  it('returns early when the worktree was already cleaned', async () => {
    const getRecordById = vi.fn().mockResolvedValue({
      filesystemPath: '/tmp/worktrees/issue-602',
      id: 'wt_602',
      status: 'CLEANED'
    });
    const pathExists = vi.fn().mockResolvedValue(true);
    const runGitCommand = vi.fn();
    const updateRecord = vi.fn();

    const result = await cleanupWorktree(
      {
        artifactManifestPath: '/artifacts/wt_602/manifest.json',
        worktreeId: 'wt_602'
      },
      {
        getRecordById,
        pathExists,
        runGitCommand,
        updateRecord
      }
    );

    expect(result.alreadyCleaned).toBe(true);
    expect(runGitCommand).not.toHaveBeenCalled();
    expect(updateRecord).not.toHaveBeenCalled();
  });

  it('rejects cleanup for active statuses', async () => {
    const getRecordById = vi.fn().mockResolvedValue({
      filesystemPath: '/tmp/worktrees/issue-603',
      id: 'wt_603',
      status: 'ACTIVE'
    });

    await expect(
      cleanupWorktree(
        {
          artifactManifestPath: '/artifacts/wt_603/manifest.json',
          worktreeId: 'wt_603'
        },
        {
          getRecordById
        }
      )
    ).rejects.toThrow(
      'Worktree "wt_603" cannot be cleaned from status "ACTIVE".'
    );
  });
});
