import { describe, expect, it, vi } from 'vitest';

import {
  getWorktreeSnapshot,
  getWorktreeSnapshotQueryOptions,
  worktreeSnapshotQueryKey
} from './worktrees.js';

const snapshot = {
  generatedAt: '2026-03-06T15:20:00.000Z',
  summary: {
    active: 1,
    completed: 1,
    failed: 1,
    total: 3
  },
  worktrees: [
    {
      attemptCount: 2,
      branchName: 'issue/800-worktree-view',
      bucket: 'active',
      issueNumber: 800,
      linkedPullRequestNumber: null,
      status: 'ACTIVE',
      updatedAt: '2026-03-06T15:20:00.000Z',
      worktreeId: 'wt_800'
    }
  ]
} as const;

describe('getWorktreeSnapshot', () => {
  it('parses a valid worktree snapshot response', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(snapshot), {
        headers: {
          'content-type': 'application/json'
        },
        status: 200
      })
    );

    await expect(
      getWorktreeSnapshot({
        endpoint: 'http://127.0.0.1:3000/api/worktrees',
        fetcher
      })
    ).resolves.toEqual(snapshot);
  });

  it('throws when the endpoint returns a failure status', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('boom', {
        status: 503
      })
    );

    await expect(getWorktreeSnapshot({ fetcher })).rejects.toThrow(/status 503/);
  });
});

describe('getWorktreeSnapshotQueryOptions', () => {
  it('returns the shared query key and refresh policy', () => {
    const options = getWorktreeSnapshotQueryOptions();

    expect(options.queryKey).toEqual(worktreeSnapshotQueryKey);
    expect(options.refetchInterval).toBe(30_000);
    expect(options.staleTime).toBe(15_000);
  });
});
