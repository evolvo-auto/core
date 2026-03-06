import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { buildPlatformHealthSnapshot } from './build-platform-health-snapshot';

const now = new Date('2026-03-06T12:00:00.000Z');

describe('buildPlatformHealthSnapshot', () => {
  it('marks probe targets unavailable when the URLs are not configured', async () => {
    const snapshot = await buildPlatformHealthSnapshot({
      now,
      runtimeHealthUrl: undefined,
      supervisorHealthUrl: undefined
    });

    expect(snapshot.services).toMatchObject([
      {
        service: 'dashboard',
        status: 'healthy'
      },
      {
        service: 'runtime',
        status: 'unavailable'
      },
      {
        service: 'supervisor',
        status: 'unavailable'
      }
    ]);
  });

  it('parses successful remote probes', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const endpoint = String(input);
      const service = endpoint.includes('3100') ? 'runtime' : 'supervisor';

      return new Response(
        JSON.stringify({
          checks: [
            {
              detail: `${service} health endpoint responded.`,
              name: 'http-probe',
              status: 'pass'
            }
          ],
          observedAt: now.toISOString(),
          service,
          startedAt: '2026-03-06T11:58:00.000Z',
          status: 'healthy',
          uptimeMs: 120_000,
          version: '0.0.0'
        }),
        {
          headers: {
            'content-type': 'application/json'
          },
          status: 200
        }
      );
    });

    const snapshot = await buildPlatformHealthSnapshot({
      fetcher,
      now,
      runtimeHealthUrl: 'http://127.0.0.1:3100/health',
      supervisorHealthUrl: 'http://127.0.0.1:3200/health'
    });

    expect(snapshot.services).toMatchObject([
      {
        service: 'dashboard',
        status: 'healthy'
      },
      {
        endpoint: 'http://127.0.0.1:3100/health',
        service: 'runtime',
        status: 'healthy'
      },
      {
        endpoint: 'http://127.0.0.1:3200/health',
        service: 'supervisor',
        status: 'healthy'
      }
    ]);
  });
});
