import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@evolvo/query/worktrees', () => ({
  getWorktreeSnapshotQueryOptions: () => ({
    queryKey: ['worktree-snapshot']
  })
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: {
      generatedAt: '2026-03-06T15:40:00.000Z',
      summary: {
        active: 1,
        completed: 1,
        failed: 1,
        total: 3
      },
      worktrees: [
        {
          attemptCount: 2,
          branchName: 'issue/920-view-active-worktrees',
          bucket: 'active',
          issueNumber: 920,
          linkedPullRequestNumber: null,
          status: 'ACTIVE',
          updatedAt: '2026-03-06T15:39:00.000Z',
          worktreeId: 'wt_920'
        },
        {
          attemptCount: 1,
          branchName: 'issue/921-cleanup-failure-case',
          bucket: 'failed',
          issueNumber: 921,
          linkedPullRequestNumber: null,
          status: 'FAILED',
          updatedAt: '2026-03-06T15:38:00.000Z',
          worktreeId: 'wt_921'
        },
        {
          attemptCount: 3,
          branchName: 'issue/922-complete-workflow',
          bucket: 'completed',
          issueNumber: 922,
          linkedPullRequestNumber: 314,
          status: 'COMPLETED',
          updatedAt: '2026-03-06T15:37:00.000Z',
          worktreeId: 'wt_922'
        }
      ]
    },
    error: null,
    isFetching: false
  }))
}));

import WorktreeBoard from './worktree-board';

describe('WorktreeBoard', () => {
  it('renders active/failed/completed worktrees with attempt and PR columns', () => {
    const markup = renderToStaticMarkup(<WorktreeBoard />);
    const renderedRows = markup.match(/data-worktree-id=/g) ?? [];

    expect(renderedRows).toHaveLength(3);
    expect(markup).toContain(
      'Active, failed, and completed worktrees in one view.'
    );
    expect(markup).toContain('issue/920-view-active-worktrees');
    expect(markup).toContain('#314');
  });
});
