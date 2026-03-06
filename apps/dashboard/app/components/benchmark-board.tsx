'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBenchmarkSnapshotQueryOptions } from '@evolvo/query/benchmarks';

const panelClasses =
  'relative overflow-hidden rounded-[1.75rem] border border-evolvo-border bg-[linear-gradient(180deg,rgba(10,25,37,0.92),rgba(8,19,28,0.82))] shadow-[0_32px_80px_rgba(1,7,12,0.42)] backdrop-blur-sm';
const eyebrowClasses =
  'text-[0.72rem] uppercase tracking-[0.16em] text-evolvo-accent';
const copyClasses = 'text-base/7 text-evolvo-ink-soft';
const headingClasses = 'text-[clamp(1.55rem,2vw,2.35rem)] leading-[1.1]';

export default function BenchmarkBoard() {
  const { data, error, isFetching } = useQuery(
    getBenchmarkSnapshotQueryOptions()
  );

  if (!data) {
    return (
      <section className={`${panelClasses} grid gap-3 p-5 sm:p-6`}>
        <p className={eyebrowClasses}>Benchmark engine</p>
        <h2 className={headingClasses}>Benchmark data is not available yet.</h2>
        <p className={copyClasses}>
          {error instanceof Error
            ? error.message
            : 'The dashboard has not received any benchmark data yet.'}
        </p>
      </section>
    );
  }

  return (
    <section className={`${panelClasses} grid gap-5 p-5 sm:p-6`}>
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="grid gap-2">
          <p className={eyebrowClasses}>Benchmark engine</p>
          <h2 className={headingClasses}>
            Fixed packs, holdouts, and challenge pressure are now visible together.
          </h2>
          <p className={copyClasses}>
            Phase 6 turns evaluation cycles into comparable benchmark evidence and
            tracks which challenge families are exercising the system.
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
          <span className="text-[2rem] font-semibold text-evolvo-accent">
            {data.summary.activeBenchmarks}
          </span>
          <span className="text-base/6 text-evolvo-ink-muted">active benchmarks</span>
        </article>
        <article className="grid gap-1 rounded-[1.15rem] border border-white/[0.08] bg-white/[0.02] px-4 py-4">
          <span className="text-[2rem] font-semibold text-[#8cc9ff]">
            {data.summary.averageScore === null
              ? 'n/a'
              : Math.round(data.summary.averageScore)}
          </span>
          <span className="text-base/6 text-evolvo-ink-muted">average score</span>
        </article>
        <article className="grid gap-1 rounded-[1.15rem] border border-white/[0.08] bg-white/[0.02] px-4 py-4">
          <span className="text-[2rem] font-semibold text-[#ffd07f]">
            {data.summary.regressionPacks}
          </span>
          <span className="text-base/6 text-evolvo-ink-muted">regression packs</span>
        </article>
        <article className="grid gap-1 rounded-[1.15rem] border border-white/[0.08] bg-white/[0.02] px-4 py-4">
          <span className="text-[2rem] font-semibold text-evolvo-pending">
            {data.summary.holdoutBenchmarks}
          </span>
          <span className="text-base/6 text-evolvo-ink-muted">holdout packs</span>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)]">
        <article className="grid gap-3 rounded-[1.2rem] border border-white/[0.08] bg-white/[0.02] p-4">
          <h3 className="text-xl text-evolvo-ink">Benchmark trends</h3>
          <div className="grid gap-3">
            {data.trends.slice(0, 5).map((trend) => (
              <div
                key={trend.benchmarkKey}
                className="grid gap-1 rounded-[1rem] border border-white/[0.06] bg-black/10 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-base text-evolvo-ink">{trend.title}</p>
                  <span className="text-sm uppercase tracking-[0.12em] text-evolvo-accent">
                    {trend.benchmarkType}
                  </span>
                </div>
                <p className="text-sm text-evolvo-ink-muted">
                  avg score {trend.averageScore === null ? 'n/a' : Math.round(trend.averageScore)} ·
                  runs {trend.runCount} · latest {trend.latestOutcome ?? 'pending'}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="grid gap-3 rounded-[1.2rem] border border-white/[0.08] bg-white/[0.02] p-4">
          <h3 className="text-xl text-evolvo-ink">Recent benchmark runs</h3>
          <div className="grid gap-3">
            {data.recentRuns.slice(0, 5).map((benchmarkRun) => (
              <div
                key={`${benchmarkRun.benchmarkKey}-${benchmarkRun.startedAt}`}
                className="grid gap-1 rounded-[1rem] border border-white/[0.06] bg-black/10 px-4 py-3"
              >
                <p className="text-sm uppercase tracking-[0.12em] text-[#8cc9ff]">
                  {benchmarkRun.outcome}
                </p>
                <p className="text-base text-evolvo-ink">{benchmarkRun.benchmarkKey}</p>
                <p className="text-sm text-evolvo-ink-muted">
                  score {benchmarkRun.score === null ? 'n/a' : Math.round(benchmarkRun.score)} ·
                  retries {benchmarkRun.retryCount} · issue{' '}
                  {benchmarkRun.issueNumber ? `#${benchmarkRun.issueNumber}` : 'n/a'}
                </p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="grid gap-3 rounded-[1.2rem] border border-white/[0.08] bg-white/[0.02] p-4">
        <h3 className="text-xl text-evolvo-ink">Challenge registry</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {data.challenges.slice(0, 6).map((challenge) => (
            <div
              key={challenge.sourceIssueNumber}
              className="grid gap-2 rounded-[1rem] border border-white/[0.06] bg-black/10 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-base text-evolvo-ink">{challenge.title}</span>
                <span className="text-sm uppercase tracking-[0.12em] text-[#ffd07f]">
                  {challenge.issueSource}
                </span>
              </div>
              <p className="text-sm text-evolvo-ink-muted">
                #{challenge.sourceIssueNumber} · {challenge.category}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
