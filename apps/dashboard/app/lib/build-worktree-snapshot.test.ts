import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { buildWorktreeSnapshot } from './build-worktree-snapshot';

describe('buildWorktreeSnapshot', () => {
  it('builds dashboard buckets for active, failed, and completed worktrees', async () => {
    const listWorktrees = vi.fn().mockResolvedValue([
      {
        branchName: 'issue/900-active',
        id: 'wt_900',
        issueNumber: 900,
        linkedPullRequestNumber: null,
        status: 'ACTIVE',
        updatedAt: new Date('2026-03-06T15:30:00.000Z')
      },
      {
        branchName: 'issue/901-failed',
        id: 'wt_901',
        issueNumber: 901,
        linkedPullRequestNumber: null,
        status: 'FAILED',
        updatedAt: new Date('2026-03-06T15:29:00.000Z')
      },
      {
        branchName: 'issue/902-completed',
        id: 'wt_902',
        issueNumber: 902,
        linkedPullRequestNumber: 77,
        status: 'COMPLETED',
        updatedAt: new Date('2026-03-06T15:28:00.000Z')
      }
    ]);
    const listAttempts = vi
      .fn()
      .mockResolvedValueOnce([{ id: 'att_1' }])
      .mockResolvedValueOnce([{ id: 'att_2' }, { id: 'att_3' }])
      .mockResolvedValueOnce([]);

    const snapshot = await buildWorktreeSnapshot({
      listAttempts,
      listWorktrees,
      now: new Date('2026-03-06T15:31:00.000Z')
    });

    expect(snapshot.summary).toEqual({
      active: 1,
      completed: 1,
      failed: 1,
      total: 3
    });
    expect(snapshot.worktrees[0]).toMatchObject({
      attemptCount: 1,
      bucket: 'active',
      status: 'ACTIVE',
      worktreeId: 'wt_900'
    });
    expect(snapshot.worktrees[1]).toMatchObject({
      attemptCount: 2,
      bucket: 'failed',
      status: 'FAILED',
      worktreeId: 'wt_901'
    });
    expect(snapshot.worktrees[2]).toMatchObject({
      attemptCount: 0,
      bucket: 'completed',
      linkedPullRequestNumber: 77,
      status: 'COMPLETED',
      worktreeId: 'wt_902'
    });
  });
});
