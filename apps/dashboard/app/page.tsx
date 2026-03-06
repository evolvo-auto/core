import * as React from 'react';
import {
  dehydrate,
  HydrationBoundary,
  QueryClient
} from '@tanstack/react-query';
import { platformHealthQueryKey } from '@evolvo/query/health';
import { worktreeSnapshotQueryKey } from '@evolvo/query/worktrees';
import type { PlatformHealthSnapshot } from '@evolvo/schemas/health-schemas';

import PlatformHealthBoard from './components/platform-health-board';
import WorktreeBoard from './components/worktree-board';
import { buildPlatformHealthSnapshot } from './lib/build-platform-health-snapshot';
import { buildWorktreeSnapshot } from './lib/build-worktree-snapshot';

export const dynamic = 'force-dynamic';

const panelClasses =
  'relative overflow-hidden rounded-[1.75rem] border border-evolvo-border bg-[linear-gradient(180deg,rgba(10,25,37,0.92),rgba(8,19,28,0.82))] shadow-[0_32px_80px_rgba(1,7,12,0.42)] backdrop-blur-sm';
const eyebrowClasses =
  'text-[0.72rem] uppercase tracking-[0.16em] text-evolvo-accent';
const copyClasses = 'text-base/7 text-evolvo-ink-soft';
const headingClasses = 'text-[clamp(1.55rem,2vw,2.35rem)] leading-[1.1]';

function getHealthSummary(snapshot: PlatformHealthSnapshot) {
  const healthyServices = snapshot.services.filter(
    ({ status }) => status === 'healthy'
  ).length;
  const degradedServices = snapshot.services.filter(
    ({ status }) => status === 'degraded'
  ).length;
  const unavailableServices = snapshot.services.filter(
    ({ status }) => status === 'unavailable'
  ).length;

  return {
    degradedServices,
    healthyServices,
    unavailableServices
  };
}

export default async function DashboardPage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryFn: () => buildPlatformHealthSnapshot(),
    queryKey: platformHealthQueryKey
  });
  await queryClient.prefetchQuery({
    queryFn: () => buildWorktreeSnapshot(),
    queryKey: worktreeSnapshotQueryKey
  });

  const snapshot = queryClient.getQueryData<PlatformHealthSnapshot>(
    platformHealthQueryKey
  );

  if (!snapshot) {
    throw new Error('Expected platform health snapshot to be prefetched');
  }

  const { degradedServices, healthyServices, unavailableServices } =
    getHealthSummary(snapshot);

  return (
    <main className="mx-auto grid w-[min(1200px,calc(100vw-2rem))] gap-6 py-8 sm:py-10">
      <section
        className={`${panelClasses} grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]`}
      >
        <div className="grid gap-5">
          <p className={eyebrowClasses}>Evolvo / Phase 0 / Live Health</p>
          <h1 className="max-w-[11ch] text-[clamp(2.8rem,6vw,5.2rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-evolvo-ink max-lg:max-w-none">
            Live health contracts for dashboard, runtime, and supervisor.
          </h1>
          <p className={`${copyClasses} max-w-4xl`}>
            P0-010 replaces the placeholder health copy with live contract
            probes. The dashboard now reports its own health directly and probes
            runtime and supervisor endpoints through the same shared schema.
          </p>
          <div className="grid gap-3 sm:grid-cols-3" role="list">
            <article
              className="grid gap-1 rounded-[1.15rem] border border-white/[0.08] bg-white/[0.02] px-5 py-4"
              role="listitem"
            >
              <span className="text-[2rem] font-semibold text-evolvo-accent">
                {healthyServices}
              </span>
              <span className="text-base/6 text-evolvo-ink-muted">
                services healthy
              </span>
            </article>
            <article
              className="grid gap-1 rounded-[1.15rem] border border-white/[0.08] bg-white/[0.02] px-5 py-4"
              role="listitem"
            >
              <span className="text-[2rem] font-semibold text-[#ffd07f]">
                {degradedServices}
              </span>
              <span className="text-base/6 text-evolvo-ink-muted">
                services degraded
              </span>
            </article>
            <article
              className="grid gap-1 rounded-[1.15rem] border border-white/[0.08] bg-white/[0.02] px-5 py-4"
              role="listitem"
            >
              <span className="text-[2rem] font-semibold text-evolvo-pending">
                {unavailableServices}
              </span>
              <span className="text-base/6 text-evolvo-ink-muted">
                services unavailable
              </span>
            </article>
          </div>
        </div>
        <aside className="grid content-start gap-4 rounded-[1.5rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(135,249,182,0.07),rgba(255,255,255,0.02))] p-5">
          <div
            aria-hidden="true"
            className="relative mx-auto aspect-square w-full max-w-[220px] rounded-full bg-[radial-gradient(circle_at_35%_35%,rgba(236,246,242,0.82),rgba(135,249,182,0.45),rgba(71,217,140,0.12)_64%,transparent_72%),radial-gradient(circle_at_68%_72%,rgba(255,191,105,0.18),transparent_26%)] shadow-[inset_0_0_50px_rgba(236,246,242,0.06),0_0_90px_rgba(71,217,140,0.22)] animate-pulse"
          >
            <div className="absolute -inset-[12%] rounded-full border border-evolvo-border-strong animate-[spin_9s_linear_infinite]" />
          </div>
          <div className="grid gap-2">
            <p className={eyebrowClasses}>Current mode</p>
            <h2 className={headingClasses}>Authoritative health probes</h2>
            <p className={copyClasses}>
              Dashboard health is local and authoritative. Runtime and
              supervisor are probed over HTTP and show unavailable until their
              configured endpoints are running.
            </p>
          </div>
        </aside>
      </section>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <PlatformHealthBoard />
      </HydrationBoundary>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <WorktreeBoard />
      </HydrationBoundary>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
        <article className={`${panelClasses} grid gap-5 p-5 sm:p-6`}>
          <div className="grid gap-2">
            <p className={eyebrowClasses}>What changed</p>
            <h2 className={headingClasses}>
              The shell now reports real service contracts.
            </h2>
          </div>
          <ol className="grid gap-4">
            <li className="grid gap-1 rounded-[1.2rem] border border-white/[0.08] bg-white/[0.02] px-4 py-4">
              <span className="text-sm uppercase tracking-[0.16em] text-evolvo-accent">
                01
              </span>
              <h3 className="text-xl text-evolvo-ink">
                Dashboard exposes its own health route.
              </h3>
              <p className={copyClasses}>
                The Next.js app now returns a typed health response at
                <code className="ml-1 text-evolvo-ink">/api/health</code>.
              </p>
            </li>
            <li className="grid gap-1 rounded-[1.2rem] border border-white/[0.08] bg-white/[0.02] px-4 py-4">
              <span className="text-sm uppercase tracking-[0.16em] text-evolvo-accent">
                02
              </span>
              <h3 className="text-xl text-evolvo-ink">
                Runtime and supervisor can now be probed directly.
              </h3>
              <p className={copyClasses}>
                Each service now runs as a small TypeScript process with a
                dedicated <code className="ml-1 text-evolvo-ink">/health</code>{' '}
                endpoint.
              </p>
            </li>
            <li className="grid gap-1 rounded-[1.2rem] border border-white/[0.08] bg-white/[0.02] px-4 py-4">
              <span className="text-sm uppercase tracking-[0.16em] text-evolvo-accent">
                03
              </span>
              <h3 className="text-xl text-evolvo-ink">
                The board reuses one shared query and schema.
              </h3>
              <p className={copyClasses}>
                Health responses are validated through shared Zod contracts and
                hydrated into the dashboard with React Query.
              </p>
            </li>
          </ol>
        </article>

        <article className={`${panelClasses} grid gap-4 p-5 sm:p-6`}>
          <p className={eyebrowClasses}>Next step</p>
          <h2 className={headingClasses}>
            P1 can build on these contracts instead of placeholders.
          </h2>
          <p className={copyClasses}>
            The GitHub issue loop, orchestration process, and future promotion
            checks now have concrete service endpoints to smoke-test against
            instead of only route existence.
          </p>
        </article>
      </section>
    </main>
  );
}
