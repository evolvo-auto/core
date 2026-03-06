import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@evolvo/query/health', () => ({
  getPlatformHealthQueryOptions: () => ({
    queryKey: ['platform-health']
  })
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: {
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
          responseTimeMs: 14,
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
    },
    error: null,
    isFetching: false
  }))
}));

import PlatformHealthBoard from './platform-health-board';

describe('PlatformHealthBoard', () => {
  it('renders one card per platform service', () => {
    const markup = renderToStaticMarkup(<PlatformHealthBoard />);
    const renderedCards = markup.match(/data-service-name=/g) ?? [];

    expect(renderedCards).toHaveLength(3);
    expect(markup).toContain('One board backed by three service contracts.');
    expect(markup).toContain('http://127.0.0.1:3100/health');
    expect(markup).toContain('supervisor');
  });
});
