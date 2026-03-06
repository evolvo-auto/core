import * as React from 'react';

type SignalTone = 'ready' | 'foundation' | 'pending';

type SystemSignal = {
  detail: string;
  evidence: string;
  name: string;
  phase: string;
  summary: string;
  tone: SignalTone;
};

type RunwayStep = {
  detail: string;
  label: string;
  state: string;
};

const systemSignals: SystemSignal[] = [
  {
    detail:
      'A dedicated Next.js workspace now owns a visible operator surface for the repo.',
    evidence: 'App router, root layout, and static shell are in place.',
    name: 'Dashboard shell',
    phase: 'P0-009',
    summary: 'Route and UI scaffold are online.',
    tone: 'ready'
  },
  {
    detail:
      'Local Docker services and Prisma migrations already exist underneath this UI layer.',
    evidence:
      'Postgres and Adminer landed in P0-003, schema management in P0-005.',
    name: 'Local database stack',
    phase: 'P0-005',
    summary: 'State storage foundations are available.',
    tone: 'foundation'
  },
  {
    detail:
      'Runtime role payloads can already be validated against shared Zod contracts.',
    evidence: 'Shared schemas landed in the dedicated workspace package.',
    name: 'Role output schemas',
    phase: 'P0-006',
    summary: 'Machine-readable contracts are ready for wiring.',
    tone: 'foundation'
  },
  {
    detail:
      'Model selection defaults are centralized and can be surfaced here once runtime reads are connected.',
    evidence: 'Canonical routing policy config exists in the genome layer.',
    name: 'Routing policy',
    phase: 'P0-008',
    summary: 'Configuration source of truth is already defined.',
    tone: 'foundation'
  },
  {
    detail:
      'The runtime does not expose an authoritative health contract to the dashboard yet.',
    evidence: 'P0-010 is the next ticket that adds live health endpoints.',
    name: 'Runtime health endpoint',
    phase: 'P0-010',
    summary: 'Live probe still pending.',
    tone: 'pending'
  },
  {
    detail:
      'Supervisor lifecycle and promotion logic are specified, but not yet queryable from the UI.',
    evidence: 'Dashboard awaits the first supervisor health contract.',
    name: 'Supervisor health endpoint',
    phase: 'P0-010',
    summary: 'Live probe still pending.',
    tone: 'pending'
  }
];

const runwaySteps: RunwayStep[] = [
  {
    detail:
      'The monorepo now has a real Next.js application instead of a placeholder package.',
    label: 'Shell the operator surface',
    state: 'complete'
  },
  {
    detail:
      'Foundational subsystems are represented here without pretending they are live-polled.',
    label: 'Expose platform readiness honestly',
    state: 'complete'
  },
  {
    detail:
      'Health contracts for runtime, supervisor, and dashboard can be plugged into this shell next.',
    label: 'Wire authoritative probes',
    state: 'next'
  }
];

const toneLabelBySignal: Record<SignalTone, string> = {
  foundation: 'Foundation ready',
  pending: 'Contract pending',
  ready: 'Live route ready'
};

const panelClasses =
  'relative overflow-hidden rounded-[1.75rem] border border-evolvo-border bg-[linear-gradient(180deg,rgba(10,25,37,0.92),rgba(8,19,28,0.82))] shadow-[0_32px_80px_rgba(1,7,12,0.42)] backdrop-blur-sm';
const eyebrowClasses =
  'text-[0.72rem] uppercase tracking-[0.16em] text-evolvo-accent';
const copyClasses = 'text-base/7 text-evolvo-ink-soft';
const headingClasses = 'text-[clamp(1.55rem,2vw,2.35rem)] leading-[1.1]';
const toneClassesBySignal: Record<SignalTone, string> = {
  foundation: 'bg-evolvo-accent/12 text-evolvo-ink',
  pending: 'bg-evolvo-pending/16 text-evolvo-pending',
  ready: 'bg-evolvo-accent/18 text-evolvo-accent'
};

export default function DashboardPage() {
  const readySignals = systemSignals.filter(({ tone }) => tone !== 'pending');
  const pendingSignals = systemSignals.filter(({ tone }) => tone === 'pending');

  return (
    <main className="mx-auto grid w-[min(1200px,calc(100vw-2rem))] gap-6 py-8 sm:py-10">
      <section
        className={`${panelClasses} grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.9fr)]`}
      >
        <div className="grid gap-5">
          <p className={eyebrowClasses}>Evolvo / Phase 0 / Operator Surface</p>
          <h1 className="max-w-[12ch] text-[clamp(2.8rem,6vw,5.2rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-evolvo-ink max-lg:max-w-none">
            Operator shell for an autonomous engineering system.
          </h1>
          <p className={`${copyClasses} max-w-4xl`}>
            This dashboard is the first visible control surface for Evolvo. It
            shows which platform layers are already in place and where live
            health contracts still need to be wired.
          </p>
          <div className="grid gap-3 sm:grid-cols-3" role="list">
            <article
              className="grid gap-1 rounded-[1.15rem] border border-white/[0.08] bg-white/[0.02] px-5 py-4"
              role="listitem"
            >
              <span className="text-[2rem] font-semibold text-evolvo-ink">
                {readySignals.length}
              </span>
              <span className="text-base/6 text-evolvo-ink-muted">
                foundational signals
              </span>
            </article>
            <article
              className="grid gap-1 rounded-[1.15rem] border border-white/[0.08] bg-white/[0.02] px-5 py-4"
              role="listitem"
            >
              <span className="text-[2rem] font-semibold text-evolvo-ink">
                {pendingSignals.length}
              </span>
              <span className="text-base/6 text-evolvo-ink-muted">
                contracts pending
              </span>
            </article>
            <article
              className="grid gap-1 rounded-[1.15rem] border border-white/[0.08] bg-white/[0.02] px-5 py-4"
              role="listitem"
            >
              <span className="text-[2rem] font-semibold text-evolvo-ink">
                1
              </span>
              <span className="text-base/6 text-evolvo-ink-muted">
                dashboard route online
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
            <h2 className={headingClasses}>Capability overview</h2>
            <p className={copyClasses}>
              This screen is intentionally non-authoritative. It reflects known
              repo capability until P0-010 adds live health contracts.
            </p>
          </div>
        </aside>
      </section>

      <section className={`${panelClasses} grid gap-5 p-5 sm:p-6`}>
        <div className="grid gap-2">
          <p className={eyebrowClasses}>Health overview</p>
          <h2 className={headingClasses}>
            Static signals until runtime endpoints exist.
          </h2>
          <p className={copyClasses}>
            Each card names a system surface, what is already true, and which
            phase owns the next honest upgrade.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {systemSignals.map((signal) => (
            <article
              key={signal.name}
              className="grid min-h-[250px] gap-3 rounded-[1.35rem] border border-white/[0.08] bg-white/[0.02] p-[1.15rem]"
              data-signal-tone={signal.tone}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className={eyebrowClasses}>{signal.phase}</p>
                <span
                  className={`rounded-full px-3 py-1 text-[0.72rem] ${toneClassesBySignal[signal.tone]}`}
                >
                  {toneLabelBySignal[signal.tone]}
                </span>
              </div>
              <h3 className="text-[1.2rem] leading-[1.15] text-evolvo-ink">
                {signal.name}
              </h3>
              <p className="text-base/6 text-evolvo-ink">{signal.summary}</p>
              <p className={copyClasses}>{signal.detail}</p>
              <p className="mt-auto border-t border-white/[0.08] pt-3 text-base/6 text-evolvo-ink-muted">
                {signal.evidence}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <article className={`${panelClasses} grid gap-5 p-5 sm:p-6`}>
          <div className="grid gap-2">
            <p className={eyebrowClasses}>Execution runway</p>
            <h2 className={headingClasses}>
              What this shell unlocks right now.
            </h2>
          </div>
          <ol className="grid gap-4">
            {runwaySteps.map((step) => (
              <li
                key={step.label}
                className="grid gap-3 border-t border-white/[0.08] pt-4 first:border-t-0 first:pt-0 md:grid-cols-[auto_1fr]"
              >
                <span className={`${eyebrowClasses} min-w-[108px] pt-0.5`}>
                  {step.state}
                </span>
                <div>
                  <h3 className="text-[1.2rem] leading-[1.15] text-evolvo-ink">
                    {step.label}
                  </h3>
                  <p className={`${copyClasses} mt-2`}>{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </article>
        <article
          className={`${panelClasses} grid overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(135,249,182,0.18),transparent_28%),linear-gradient(180deg,rgba(12,28,41,0.96),rgba(6,14,21,0.95))] p-5 sm:p-6`}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[40%] bottom-[-30%] h-[240px] rounded-full bg-[radial-gradient(circle,rgba(71,217,140,0.18),transparent_62%)] blur-lg"
          />
          <p className={eyebrowClasses}>Next step</p>
          <h2 className={`${headingClasses} mt-2`}>
            P0-010 turns this from a shell into a real status board.
          </h2>
          <p className={`${copyClasses} mt-3`}>
            Once the supervisor, runtime, and dashboard expose contract-based
            health endpoints, this page can switch from static capability
            signals to authoritative live system health.
          </p>
        </article>
      </section>
    </main>
  );
}
