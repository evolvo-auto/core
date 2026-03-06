import { describe, expect, it } from 'vitest';

import { worktreeDashboardSnapshotSchema } from './worktree-schemas.js';

describe('worktree dashboard schemas', () => {
  it('parses a valid dashboard snapshot payload', () => {
    expect(
      worktreeDashboardSnapshotSchema.parse({
        generatedAt: '2026-03-06T15:20:00.000Z',
        summary: {
          active: 2,
          completed: 1,
          failed: 1,
          total: 4
        },
        worktrees: [
          {
            attemptCount: 1,
            branchName: 'issue/710-add-worktree-board',
            bucket: 'active',
            issueNumber: 710,
            linkedPullRequestNumber: null,
            status: 'ACTIVE',
            updatedAt: '2026-03-06T15:20:00.000Z',
            worktreeId: 'wt_710'
          },
          {
            attemptCount: 3,
            branchName: 'issue/711-failed-hydration',
            bucket: 'failed',
            issueNumber: 711,
            linkedPullRequestNumber: null,
            status: 'FAILED',
            updatedAt: '2026-03-06T15:19:00.000Z',
            worktreeId: 'wt_711'
          }
        ]
      })
    ).toMatchObject({
      summary: {
        total: 4
      },
      worktrees: expect.any(Array)
    });
  });

  it('rejects invalid bucket values', () => {
    expect(() =>
      worktreeDashboardSnapshotSchema.parse({
        generatedAt: '2026-03-06T15:20:00.000Z',
        summary: {
          active: 0,
          completed: 0,
          failed: 0,
          total: 0
        },
        worktrees: [
          {
            attemptCount: 1,
            branchName: 'issue/712-invalid-bucket',
            bucket: 'queued',
            issueNumber: 712,
            linkedPullRequestNumber: null,
            status: 'READY',
            updatedAt: '2026-03-06T15:20:00.000Z',
            worktreeId: 'wt_712'
          }
        ]
      })
    ).toThrow();
  });
});
