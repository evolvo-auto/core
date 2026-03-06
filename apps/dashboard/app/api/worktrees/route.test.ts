import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/build-worktree-snapshot', () => ({
  buildWorktreeSnapshot: vi.fn().mockResolvedValue({
    generatedAt: '2026-03-06T15:35:00.000Z',
    summary: {
      active: 1,
      completed: 1,
      failed: 0,
      total: 2
    },
    worktrees: [
      {
        attemptCount: 2,
        branchName: 'issue/910-worktree-view',
        bucket: 'active',
        issueNumber: 910,
        linkedPullRequestNumber: null,
        status: 'ACTIVE',
        updatedAt: '2026-03-06T15:34:00.000Z',
        worktreeId: 'wt_910'
      },
      {
        attemptCount: 1,
        branchName: 'issue/911-completed',
        bucket: 'completed',
        issueNumber: 911,
        linkedPullRequestNumber: 101,
        status: 'COMPLETED',
        updatedAt: '2026-03-06T15:33:00.000Z',
        worktreeId: 'wt_911'
      }
    ]
  })
}));

import { GET } from './route';

describe('GET /api/worktrees', () => {
  it('returns the aggregated worktree dashboard snapshot', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      generatedAt: '2026-03-06T15:35:00.000Z',
      summary: {
        total: 2
      }
    });
  });
});
