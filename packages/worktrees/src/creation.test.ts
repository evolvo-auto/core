import { describe, expect, it, vi } from 'vitest';

import { createReservedWorktree } from './creation.js';

describe('createReservedWorktree', () => {
  it('creates a worktree with a new branch when the branch does not already exist', async () => {
    const getRecordById = vi.fn().mockResolvedValue({
      baseRef: 'main',
      branchName: 'issue/300-branch-name',
      filesystemPath: '/tmp/planned-path',
      id: 'wt_300',
      status: 'RESERVED'
    });
    const updateRecord = vi
      .fn()
      .mockResolvedValueOnce({
        id: 'wt_300',
        status: 'CREATING'
      })
      .mockResolvedValueOnce({
        id: 'wt_300',
        status: 'READY'
      });
    const runGitCommand = vi
      .fn()
      .mockResolvedValueOnce({
        exitCode: 1,
        stderr: '',
        stdout: '',
        timedOut: false
      })
      .mockResolvedValueOnce({
        exitCode: 0,
        stderr: '',
        stdout: '',
        timedOut: false
      });
    const pathExists = vi.fn().mockResolvedValue(true);

    const result = await createReservedWorktree(
      {
        filesystemPath: '/tmp/worktrees/issue/300-branch-name',
        repoRoot: '/repo',
        worktreeId: 'wt_300'
      },
      {
        getRecordById,
        pathExists,
        runGitCommand,
        updateRecord
      }
    );

    expect(runGitCommand).toHaveBeenNthCalledWith(1, {
      args: ['show-ref', '--verify', '--quiet', 'refs/heads/issue/300-branch-name'],
      cwd: '/repo'
    });
    expect(runGitCommand).toHaveBeenNthCalledWith(2, {
      args: [
        'worktree',
        'add',
        '-b',
        'issue/300-branch-name',
        '/tmp/worktrees/issue/300-branch-name',
        'main'
      ],
      cwd: '/repo'
    });
    expect(updateRecord).toHaveBeenNthCalledWith(1, {
      filesystemPath: '/tmp/worktrees/issue/300-branch-name',
      id: 'wt_300',
      status: 'CREATING'
    });
    expect(updateRecord).toHaveBeenNthCalledWith(2, {
      filesystemPath: '/tmp/worktrees/issue/300-branch-name',
      id: 'wt_300',
      status: 'READY'
    });
    expect(result.branchCreated).toBe(true);
    expect(result.gitOperation).toBe('create-branch-and-worktree');
  });

  it('attaches to an existing branch when the branch already exists', async () => {
    const getRecordById = vi.fn().mockResolvedValue({
      baseRef: 'main',
      branchName: 'issue/301-existing-branch',
      filesystemPath: '/tmp/planned-path',
      id: 'wt_301',
      status: 'RESERVED'
    });
    const updateRecord = vi
      .fn()
      .mockResolvedValueOnce({
        id: 'wt_301',
        status: 'CREATING'
      })
      .mockResolvedValueOnce({
        id: 'wt_301',
        status: 'READY'
      });
    const runGitCommand = vi
      .fn()
      .mockResolvedValueOnce({
        exitCode: 0,
        stderr: '',
        stdout: '',
        timedOut: false
      })
      .mockResolvedValueOnce({
        exitCode: 0,
        stderr: '',
        stdout: '',
        timedOut: false
      });
    const pathExists = vi.fn().mockResolvedValue(true);

    const result = await createReservedWorktree(
      {
        filesystemPath: '/tmp/worktrees/issue/301-existing-branch',
        repoRoot: '/repo',
        worktreeId: 'wt_301'
      },
      {
        getRecordById,
        pathExists,
        runGitCommand,
        updateRecord
      }
    );

    expect(runGitCommand).toHaveBeenNthCalledWith(2, {
      args: [
        'worktree',
        'add',
        '/tmp/worktrees/issue/301-existing-branch',
        'issue/301-existing-branch'
      ],
      cwd: '/repo'
    });
    expect(result.branchCreated).toBe(false);
    expect(result.gitOperation).toBe('attach-existing-branch-worktree');
  });

  it('marks worktree as failed when git worktree creation fails', async () => {
    const getRecordById = vi.fn().mockResolvedValue({
      baseRef: 'main',
      branchName: 'issue/302-failing-worktree',
      filesystemPath: '/tmp/planned-path',
      id: 'wt_302',
      status: 'RESERVED'
    });
    const updateRecord = vi
      .fn()
      .mockResolvedValueOnce({
        id: 'wt_302',
        status: 'CREATING'
      })
      .mockResolvedValueOnce({
        id: 'wt_302',
        status: 'FAILED'
      });
    const runGitCommand = vi
      .fn()
      .mockResolvedValueOnce({
        exitCode: 1,
        stderr: '',
        stdout: '',
        timedOut: false
      })
      .mockResolvedValueOnce({
        exitCode: 128,
        stderr: 'fatal: invalid reference',
        stdout: '',
        timedOut: false
      });

    await expect(
      createReservedWorktree(
        {
          filesystemPath: '/tmp/worktrees/issue/302-failing-worktree',
          repoRoot: '/repo',
          worktreeId: 'wt_302'
        },
        {
          getRecordById,
          runGitCommand,
          updateRecord
        }
      )
    ).rejects.toThrow(
      'Git worktree creation failed with exit code 128: fatal: invalid reference'
    );

    expect(updateRecord).toHaveBeenNthCalledWith(2, {
      id: 'wt_302',
      status: 'FAILED'
    });
  });
});
