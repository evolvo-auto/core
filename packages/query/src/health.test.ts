import { describe, expect, it, vi } from 'vitest';

import {
  getPlatformHealth,
  getPlatformHealthQueryOptions,
  platformHealthQueryKey
} from './health.js';

const snapshot = {
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
          detail: 'Supervisor health endpoint responded.',
          name: 'http-probe',
          status: 'pass'
        }
      ],
      endpoint: 'http://127.0.0.1:3200/health',
      observedAt: '2026-03-06T12:00:00.000Z',
      responseTimeMs: 17,
      service: 'supervisor',
      startedAt: '2026-03-06T11:57:00.000Z',
      status: 'healthy',
      uptimeMs: 180_000,
      version: '0.0.0'
    }
  ]
} as const;

describe('getPlatformHealth', () => {
  it('parses a valid platform health response', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(snapshot), {
        headers: {
          'content-type': 'application/json'
        },
        status: 200
      })
    );

    await expect(
      getPlatformHealth({
        endpoint: 'http://127.0.0.1:3000/api/platform-health',
        fetcher
      })
    ).resolves.toEqual(snapshot);
  });

  it('throws when the health endpoint does not return success', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('boom', {
        status: 503
      })
    );

    await expect(getPlatformHealth({ fetcher })).rejects.toThrow(/status 503/);
  });
});

describe('getPlatformHealthQueryOptions', () => {
  it('returns the shared platform health query key', () => {
    const options = getPlatformHealthQueryOptions();

    expect(options.queryKey).toEqual(platformHealthQueryKey);
    expect(options.refetchInterval).toBe(30_000);
    expect(options.staleTime).toBe(15_000);
  });
});
