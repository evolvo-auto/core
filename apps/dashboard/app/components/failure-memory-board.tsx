'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFailureMemorySnapshotQueryOptions } from '@evolvo/query/failure-memory';

const panelClasses =
  'relative overflow-hidden rounded-[1.75rem] border border-evolvo-border bg-[linear-gradient(180deg,rgba(10,25,37,0.92),rgba(8,19,28,0.82))] shadow-[0_32px_80px_rgba(1,7,12,0.42)] backdrop-blur-sm';
const eyebrowClasses =
  'text-[0.72rem] uppercase tracking-[0.16em] text-evolvo-accent';
const copyClasses = 'text-base/7 text-evolvo-ink-soft';
const headingClasses = 'text-[clamp(1.55rem,2vw,2.35rem)] leading-[1.1]';

export default function FailureMemoryBoard() {
  const { data, error, isFetching } = useQuery(
    getFailureMemorySnapshotQueryOptions()
  );

  if (!data) {
    return (
      <section className={`${panelClasses} grid gap-3 p-5 sm:p-6`}>
        <p className={eyebrowClasses}>Failure memory</p>
        <h2 className={headingClasses}>Failure memory is not available yet.</h2>
        <p className={copyClasses}>
          {error instanceof Error
            ? error.message
            : 'The dashboard has not received any failure memory data yet.'}
        </p>
      </section>
    );
  }

  return (
    <section className={`${panelClasses} grid gap-5 p-5 sm:p-6`}>
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="grid gap-2">
          <p className={eyebrowClasses}>Failure memory</p>
          <h2 className={headingClasses}>
            Recurring failures, proposal queue, and weak capabilities in one board.
          </h2>
          <p className={copyClasses}>
            Phase 5 turns failed attempts into structured memory, follow-up issues,
            and mutation candidates.
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

      <div className="grid gap-3 sm:grid-cols-4">
        <article className="grid gap-1 rounded-[1.15rem] border border-white/[0.08] bg-white/[0.02] px-4 py-4">
          <span className="text-[2rem] font-semibold text-evolvo-pending">
            {data.summary.totalFailures}
          </span>
          <span className="text-base/6 text-evolvo-ink-muted">failures</span>
        </article>
        <article className="grid gap-1 rounded-[1.15rem] border border-white/[0.08] bg-white/[0.02] px-4 py-4">
          <span className="text-[2rem] font-semibold text-evolvo-accent">
            {data.summary.recurringClusters}
          </span>
          <span className="text-base/6 text-evolvo-ink-muted">clusters</span>
        </article>
        <article className="grid gap-1 rounded-[1.15rem] border border-white/[0.08] bg-white/[0.02] px-4 py-4">
          <span className="text-[2rem] font-semibold text-[#8cc9ff]">
            {data.summary.openMutationProposals}
          </span>
          <span className="text-base/6 text-evolvo-ink-muted">mutation queue</span>
        </article>
        <article className="grid gap-1 rounded-[1.15rem] border border-white/[0.08] bg-white/[0.02] px-4 py-4">
          <span className="text-[2rem] font-semibold text-[#ffd07f]">
            {data.summary.weakCapabilities}
          </span>
          <span className="text-base/6 text-evolvo-ink-muted">weak capabilities</span>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)]">
        <article className="grid gap-3 rounded-[1.2rem] border border-white/[0.08] bg-white/[0.02] p-4">
          <h3 className="text-xl text-evolvo-ink">Recurring failure themes</h3>
          <div className="grid gap-3">
            {data.clusters.slice(0, 4).map((cluster) => (
              <div
                key={cluster.recurrenceGroup}
                className="grid gap-1 rounded-[1rem] border border-white/[0.06] bg-black/10 px-4 py-3"
              >
                <p className="text-sm uppercase tracking-[0.12em] text-evolvo-accent">
                  {cluster.category}
                </p>
                <p className="text-base text-evolvo-ink">
                  {cluster.recurrenceGroup}
                </p>
                <p className="text-sm text-evolvo-ink-muted">
                  {cluster.totalFailures} failures across issues{' '}
                  {cluster.issueNumbers.map((issueNumber) => `#${issueNumber}`).join(', ')}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="grid gap-3 rounded-[1.2rem] border border-white/[0.08] bg-white/[0.02] p-4">
          <h3 className="text-xl text-evolvo-ink">Mutation proposal queue</h3>
          <div className="grid gap-3">
            {data.mutations.slice(0, 4).map((mutation) => (
              <div
                key={mutation.id}
                className="grid gap-1 rounded-[1rem] border border-white/[0.06] bg-black/10 px-4 py-3"
              >
                <p className="text-sm uppercase tracking-[0.12em] text-[#8cc9ff]">
                  {mutation.state}
                </p>
                <p className="text-base text-evolvo-ink">{mutation.title}</p>
                <p className="text-sm text-evolvo-ink-muted">
                  surface:{mutation.targetSurface} · priority{' '}
                  {mutation.priorityScore ?? 'n/a'} · issue{' '}
                  {mutation.linkedIssueNumber ? `#${mutation.linkedIssueNumber}` : 'pending'}
                </p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="grid gap-3 rounded-[1.2rem] border border-white/[0.08] bg-white/[0.02] p-4">
        <h3 className="text-xl text-evolvo-ink">Capability confidence</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {data.capabilities.slice(0, 6).map((capability) => (
            <div
              key={capability.capabilityKey}
              className="grid gap-2 rounded-[1rem] border border-white/[0.06] bg-black/10 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-base text-evolvo-ink">
                  {capability.capabilityKey}
                </span>
                <span className="text-sm text-evolvo-accent">
                  {capability.confidenceScore}/100
                </span>
              </div>
              <p className="text-sm text-evolvo-ink-muted">
                attempts {capability.attempts} · successes {capability.successes} ·
                failures {capability.failures}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
