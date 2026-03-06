import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-query', () => ({
  HydrationBoundary: ({ children }: { children: React.ReactNode }) => children,
  QueryClient: class {
    #dataByKey = new Map<string, unknown>();

    async prefetchQuery({
      queryFn,
      queryKey
    }: {
      queryFn: () => Promise<unknown>;
      queryKey: readonly unknown[];
    }) {
      this.#dataByKey.set(JSON.stringify(queryKey), await queryFn());
    }

    getQueryData<T>(queryKey: readonly unknown[]) {
      return this.#dataByKey.get(JSON.stringify(queryKey)) as T;
    }
  },
  dehydrate: () => ({})
}));

vi.mock('./components/platform-health-board', () => ({
  default: () => <section>Platform health board</section>
}));

vi.mock('./components/worktree-board', () => ({
  default: () => <section>Worktree board</section>
}));

vi.mock('./lib/build-platform-health-snapshot', () => ({
  buildPlatformHealthSnapshot: vi.fn().mockResolvedValue({
    generatedAt: '2026-03-06T12:00:00.000Z',
    services: [
      {
        checks: [
          {
            detail: 'Dashboard route handlers are responding.',
            name: 'route-handler',
            status: 'pass'
          }
        ],
        observedAt: '2026-03-06T12:00:00.000Z',
        service: 'dashboard',
        startedAt: '2026-03-06T11:59:00.000Z',
        status: 'healthy',
        uptimeMs: 60_000,
        version: '0.0.0'
      },
      {
        checks: [
          {
            detail: 'Runtime health endpoint responded.',
            name: 'http-probe',
            status: 'pass'
          }
        ],
        endpoint: 'http://127.0.0.1:3100/health',
        observedAt: '2026-03-06T12:00:00.000Z',
        responseTimeMs: 12,
        service: 'runtime',
        startedAt: '2026-03-06T11:58:00.000Z',
        status: 'healthy',
        uptimeMs: 120_000,
        version: '0.0.0'
      },
      {
        checks: [
          {
            detail: 'Supervisor health endpoint did not respond.',
            name: 'http-probe',
            status: 'fail'
          }
        ],
        endpoint: 'http://127.0.0.1:3200/health',
        observedAt: '2026-03-06T12:00:00.000Z',
        responseTimeMs: 0,
        service: 'supervisor',
        startedAt: '2026-03-06T12:00:00.000Z',
        status: 'unavailable',
        uptimeMs: 0,
        version: '0.0.0'
      }
    ]
  })
}));

vi.mock('./lib/build-worktree-snapshot', () => ({
  buildWorktreeSnapshot: vi.fn().mockResolvedValue({
    generatedAt: '2026-03-06T12:00:00.000Z',
    summary: {
      active: 1,
      completed: 1,
      failed: 0,
      total: 2
    },
    worktrees: [
      {
        attemptCount: 1,
        branchName: 'issue/930-add-worktree-board',
        bucket: 'active',
        issueNumber: 930,
        linkedPullRequestNumber: null,
        status: 'ACTIVE',
        updatedAt: '2026-03-06T12:00:00.000Z',
        worktreeId: 'wt_930'
      },
      {
        attemptCount: 2,
        branchName: 'issue/931-cleanup-complete',
        bucket: 'completed',
        issueNumber: 931,
        linkedPullRequestNumber: 88,
        status: 'COMPLETED',
        updatedAt: '2026-03-06T11:59:00.000Z',
        worktreeId: 'wt_931'
      }
    ]
  })
}));

import DashboardPage from './page';

describe('DashboardPage', () => {
  it('renders live health messaging instead of placeholder copy', async () => {
    const markup = renderToStaticMarkup(await DashboardPage());

    expect(markup).toContain(
      'Live health contracts for dashboard, runtime, and supervisor.'
    );
    expect(markup).toContain('Authoritative health probes');
    expect(markup).toContain('Platform health board');
    expect(markup).toContain('Worktree board');
    expect(markup).not.toContain('style=');
  });

  it('renders summary counts for the prefetched snapshot', async () => {
    const markup = renderToStaticMarkup(await DashboardPage());

    expect(markup).toContain('services healthy');
    expect(markup).toContain('services unavailable');
    expect(markup).toContain('The shell now reports real service contracts.');
  });
});
