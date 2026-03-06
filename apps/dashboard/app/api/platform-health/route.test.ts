import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/build-platform-health-snapshot', () => ({
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

import { GET } from './route';

describe('GET /api/platform-health', () => {
  it('returns the aggregated platform health snapshot', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      generatedAt: '2026-03-06T12:00:00.000Z',
      services: expect.any(Array)
    });
  });
});
