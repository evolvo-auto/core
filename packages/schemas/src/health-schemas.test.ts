import { describe, expect, it } from 'vitest';

import {
  platformHealthSnapshotSchema,
  serviceHealthSchema
} from './health-schemas.js';

const dashboardHealth = {
  checks: [
    {
      detail: 'Dashboard route handlers are responding.',
      name: 'route-handler',
      status: 'pass'
    }
  ],
  observedAt: '2026-03-06T12:00:00.000Z',
  service: 'dashboard',
  startedAt: '2026-03-06T11:59:30.000Z',
  status: 'healthy',
  uptimeMs: 30_000,
  version: '0.0.0'
} as const;

describe('serviceHealthSchema', () => {
  it('parses a valid service health response', () => {
    expect(serviceHealthSchema.parse(dashboardHealth)).toEqual(dashboardHealth);
  });

  it('rejects invalid service names', () => {
    expect(() =>
      serviceHealthSchema.parse({
        ...dashboardHealth,
        service: 'builder'
      })
    ).toThrow(/Invalid option/);
  });
});

describe('platformHealthSnapshotSchema', () => {
  it('parses a snapshot with one entry per service', () => {
    const snapshot = {
      generatedAt: '2026-03-06T12:00:00.000Z',
      services: [
        dashboardHealth,
        {
          ...dashboardHealth,
          service: 'runtime'
        },
        {
          ...dashboardHealth,
          service: 'supervisor'
        }
      ]
    } as const;

    expect(platformHealthSnapshotSchema.parse(snapshot)).toEqual(snapshot);
  });

  it('rejects duplicate service entries', () => {
    expect(() =>
      platformHealthSnapshotSchema.parse({
        generatedAt: '2026-03-06T12:00:00.000Z',
        services: [dashboardHealth, dashboardHealth, dashboardHealth]
      })
    ).toThrow(/unique service names/);
  });
});
