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

export default function DashboardPage() {
  const readySignals = systemSignals.filter(({ tone }) => tone !== 'pending');
  const pendingSignals = systemSignals.filter(({ tone }) => tone === 'pending');

  return (
    <main className="dashboard-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Evolvo / Phase 0 / Operator Surface</p>
          <h1>Operator shell for an autonomous engineering system.</h1>
          <p className="hero-description">
            This dashboard is the first visible control surface for Evolvo. It
            shows which platform layers are already in place and where live
            health contracts still need to be wired.
          </p>
          <div className="summary-strip" role="list">
            <article className="summary-chip" role="listitem">
              <span className="summary-value">{readySignals.length}</span>
              <span className="summary-label">foundational signals</span>
            </article>
            <article className="summary-chip" role="listitem">
              <span className="summary-value">{pendingSignals.length}</span>
              <span className="summary-label">contracts pending</span>
            </article>
            <article className="summary-chip" role="listitem">
              <span className="summary-value">1</span>
              <span className="summary-label">dashboard route online</span>
            </article>
          </div>
        </div>
        <aside className="hero-status-panel">
          <div className="status-orb" aria-hidden="true" />
          <div className="status-copy">
            <p className="panel-kicker">Current mode</p>
            <h2>Capability overview</h2>
            <p>
              This screen is intentionally non-authoritative. It reflects known
              repo capability until P0-010 adds live health contracts.
            </p>
          </div>
        </aside>
      </section>

      <section className="section-panel">
        <div className="section-heading">
          <p className="panel-kicker">Health overview</p>
          <h2>Static signals until runtime endpoints exist.</h2>
          <p>
            Each card names a system surface, what is already true, and which
            phase owns the next honest upgrade.
          </p>
        </div>
        <div className="signal-grid">
          {systemSignals.map((signal) => (
            <article
              key={signal.name}
              className="signal-card"
              data-signal-tone={signal.tone}
            >
              <div className="signal-head">
                <p className="signal-phase">{signal.phase}</p>
                <span className="signal-pill">
                  {toneLabelBySignal[signal.tone]}
                </span>
              </div>
              <h3>{signal.name}</h3>
              <p className="signal-summary">{signal.summary}</p>
              <p className="signal-detail">{signal.detail}</p>
              <p className="signal-evidence">{signal.evidence}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="runway-grid">
        <article className="section-panel">
          <div className="section-heading">
            <p className="panel-kicker">Execution runway</p>
            <h2>What this shell unlocks right now.</h2>
          </div>
          <ol className="runway-list">
            {runwaySteps.map((step) => (
              <li key={step.label} className="runway-item">
                <span className="runway-state">{step.state}</span>
                <div>
                  <h3>{step.label}</h3>
                  <p>{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </article>
        <article className="section-panel emphasis-panel">
          <p className="panel-kicker">Next step</p>
          <h2>P0-010 turns this from a shell into a real status board.</h2>
          <p>
            Once the supervisor, runtime, and dashboard expose contract-based
            health endpoints, this page can switch from static capability
            signals to authoritative live system health.
          </p>
        </article>
      </section>
    </main>
  );
}
