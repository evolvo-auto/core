'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getWorktreeSnapshotQueryOptions } from '@evolvo/query/worktrees';

const panelClasses =
  'relative overflow-hidden rounded-[1.75rem] border border-evolvo-border bg-[linear-gradient(180deg,rgba(10,25,37,0.92),rgba(8,19,28,0.82))] shadow-[0_32px_80px_rgba(1,7,12,0.42)] backdrop-blur-sm';
const eyebrowClasses =
  'text-[0.72rem] uppercase tracking-[0.16em] text-evolvo-accent';
const copyClasses = 'text-base/7 text-evolvo-ink-soft';
const headingClasses = 'text-[clamp(1.55rem,2vw,2.35rem)] leading-[1.1]';

const badgeClassesByBucket = {
  active: 'bg-evolvo-accent/16 text-evolvo-accent',
  completed: 'bg-[#8cc9ff]/14 text-[#8cc9ff]',
  failed: 'bg-evolvo-pending/16 text-evolvo-pending'
} as const;

export default function WorktreeBoard() {
  const { data, error, isFetching } = useQuery(getWorktreeSnapshotQueryOptions());

  if (!data) {
    return (
      <section className={`${panelClasses} grid gap-3 p-5 sm:p-6`}>
        <p className={eyebrowClasses}>Worktree execution</p>
        <h2 className={headingClasses}>Worktree data is not available yet.</h2>
        <p className={copyClasses}>
          {error instanceof Error
            ? error.message
            : 'The dashboard has not received a worktree snapshot yet.'}
        </p>
      </section>
    );
  }

  return (
    <section className={`${panelClasses} grid gap-5 p-5 sm:p-6`}>
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="grid gap-2">
          <p className={eyebrowClasses}>Worktree execution</p>
          <h2 className={headingClasses}>
            Active, failed, and completed worktrees in one view.
          </h2>
          <p className={copyClasses}>
            Each row represents one issue-linked worktree with its lifecycle status
            and attempt count.
          </p>
        </div>
        <div className="justify-self-start rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-evolvo-ink-muted lg:justify-self-end">
          {isFetching ? 'Refreshing snapshot' : 'Latest snapshot'}{' '}
          {new Date(data.generatedAt).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <article className="grid gap-1 rounded-[1.15rem] border border-white/[0.08] bg-white/[0.02] px-4 py-4">
          <span className="text-[2rem] font-semibold text-evolvo-accent">
            {data.summary.active}
          </span>
          <span className="text-base/6 text-evolvo-ink-muted">active</span>
        </article>
        <article className="grid gap-1 rounded-[1.15rem] border border-white/[0.08] bg-white/[0.02] px-4 py-4">
          <span className="text-[2rem] font-semibold text-evolvo-pending">
            {data.summary.failed}
          </span>
          <span className="text-base/6 text-evolvo-ink-muted">failed</span>
        </article>
        <article className="grid gap-1 rounded-[1.15rem] border border-white/[0.08] bg-white/[0.02] px-4 py-4">
          <span className="text-[2rem] font-semibold text-[#8cc9ff]">
            {data.summary.completed}
          </span>
          <span className="text-base/6 text-evolvo-ink-muted">completed</span>
        </article>
      </div>

      <div className="overflow-x-auto rounded-[1.2rem] border border-white/[0.08]">
        <table className="min-w-full border-collapse text-left">
          <thead className="bg-white/[0.03]">
            <tr className="text-xs uppercase tracking-[0.14em] text-evolvo-ink-muted">
              <th className="px-4 py-3 font-medium">Issue</th>
              <th className="px-4 py-3 font-medium">Branch</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Attempts</th>
              <th className="px-4 py-3 font-medium">Linked PR</th>
            </tr>
          </thead>
          <tbody>
            {data.worktrees.map((worktree) => (
              <tr
                key={worktree.worktreeId}
                className="border-t border-white/[0.06]"
                data-worktree-id={worktree.worktreeId}
              >
                <td className="px-4 py-3 text-evolvo-ink">#{worktree.issueNumber}</td>
                <td className="px-4 py-3 text-evolvo-ink-soft">{worktree.branchName}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-[0.7rem] uppercase tracking-[0.12em] ${badgeClassesByBucket[worktree.bucket]}`}
                  >
                    {worktree.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-evolvo-ink-soft">
                  {worktree.attemptCount}
                </td>
                <td className="px-4 py-3 text-evolvo-ink-soft">
                  {worktree.linkedPullRequestNumber
                    ? `#${worktree.linkedPullRequestNumber}`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
