import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { buildDashboardHealth } from './build-dashboard-health';

describe('buildDashboardHealth', () => {
  it('builds a valid dashboard health response', () => {
    const startedAt = new Date('2026-03-06T12:00:00.000Z');
    const now = new Date('2026-03-06T12:00:15.000Z');

    expect(buildDashboardHealth({ now, startedAt })).toEqual({
      checks: [
        {
          detail: 'Dashboard route handlers are responding.',
          name: 'route-handler',
          status: 'pass'
        },
        {
          detail: 'Dashboard query hydration path is available.',
          name: 'query-hydration',
          status: 'pass'
        }
      ],
      observedAt: '2026-03-06T12:00:15.000Z',
      service: 'dashboard',
      startedAt: '2026-03-06T12:00:00.000Z',
      status: 'healthy',
      uptimeMs: 15_000,
      version: '0.0.0'
    });
  });
});
