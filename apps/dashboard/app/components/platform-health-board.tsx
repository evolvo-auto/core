'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPlatformHealthQueryOptions } from '@evolvo/query/health';

const panelClasses =
  'relative overflow-hidden rounded-[1.75rem] border border-evolvo-border bg-[linear-gradient(180deg,rgba(10,25,37,0.92),rgba(8,19,28,0.82))] shadow-[0_32px_80px_rgba(1,7,12,0.42)] backdrop-blur-sm';
const eyebrowClasses =
  'text-[0.72rem] uppercase tracking-[0.16em] text-evolvo-accent';
const copyClasses = 'text-base/7 text-evolvo-ink-soft';
const headingClasses = 'text-[clamp(1.55rem,2vw,2.35rem)] leading-[1.1]';

const badgeClassesByStatus = {
  degraded: 'bg-[#ffd07f]/14 text-[#ffd07f]',
  healthy: 'bg-evolvo-accent/16 text-evolvo-accent',
  unavailable: 'bg-evolvo-pending/16 text-evolvo-pending'
} as const;

const cardBorderClassesByStatus = {
  degraded: 'border-[#ffd07f]/20',
  healthy: 'border-evolvo-accent/18',
  unavailable: 'border-evolvo-pending/18'
} as const;

export default function PlatformHealthBoard() {
  const { data, error, isFetching } = useQuery(getPlatformHealthQueryOptions());

  if (!data) {
    return (
      <section className={`${panelClasses} grid gap-3 p-5 sm:p-6`}>
        <p className={eyebrowClasses}>Platform health</p>
        <h2 className={headingClasses}>Health data is not available yet.</h2>
        <p className={copyClasses}>
          {error instanceof Error
            ? error.message
            : 'The dashboard has not received a platform health snapshot yet.'}
        </p>
      </section>
    );
  }

  return (
    <section className={`${panelClasses} grid gap-5 p-5 sm:p-6`}>
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="grid gap-2">
          <p className={eyebrowClasses}>Platform health</p>
          <h2 className={headingClasses}>
            One board backed by three service contracts.
          </h2>
          <p className={copyClasses}>
            Each card below is driven by the shared health schema. Runtime and
            supervisor are remote probes; dashboard health is produced locally
            by the Next.js app itself.
          </p>
        </div>
        <div className="justify-self-start rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-evolvo-ink-muted lg:justify-self-end">
          {isFetching ? 'Refreshing probes' : 'Latest probe'}{' '}
          {new Date(data.generatedAt).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {data.services.map((service) => (
          <article
            key={service.service}
            className={`grid min-h-[280px] gap-4 rounded-[1.35rem] border bg-white/[0.02] p-5 ${cardBorderClassesByStatus[service.status]}`}
            data-service-name={service.service}
            data-service-status={service.status}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className={eyebrowClasses}>{service.service}</p>
              <span
                className={`rounded-full px-3 py-1 text-[0.72rem] uppercase tracking-[0.14em] ${badgeClassesByStatus[service.status]}`}
              >
                {service.status}
              </span>
            </div>

            <div className="grid gap-1">
              <h3 className="text-[1.3rem] capitalize text-evolvo-ink">
                {service.service}
              </h3>
              <p className="text-base/6 text-evolvo-ink-soft">
                Uptime {Math.floor(service.uptimeMs / 1000)}s
              </p>
            </div>

            {service.endpoint ? (
              <p className="rounded-[1rem] border border-white/[0.06] bg-black/20 px-3 py-2 text-sm text-evolvo-ink-soft">
                {service.endpoint}
              </p>
            ) : null}

            <ul className="grid gap-3">
              {service.checks.map((check) => (
                <li
                  key={`${service.service}:${check.name}`}
                  className="grid gap-1 rounded-[1rem] border border-white/[0.06] bg-black/20 px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm uppercase tracking-[0.12em] text-evolvo-ink-soft">
                      {check.name}
                    </span>
                    <span className="text-sm uppercase tracking-[0.12em] text-evolvo-accent">
                      {check.status}
                    </span>
                  </div>
                  <p className="text-sm/6 text-evolvo-ink-muted">
                    {check.detail}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/[0.08] pt-3 text-sm text-evolvo-ink-muted">
              <span>v{service.version}</span>
              <span>
                {service.responseTimeMs !== undefined
                  ? `${String(service.responseTimeMs)}ms`
                  : 'local'}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
