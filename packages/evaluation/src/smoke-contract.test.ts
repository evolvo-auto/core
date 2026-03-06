import { describe, expect, it, vi } from 'vitest';

import { runSmokeContract } from './smoke-contract.js';

describe('runSmokeContract', () => {
  it('runs default route checks and skips browser smoke when not requested', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ service: 'dashboard' }), {
          status: 200
        })
      )
      .mockResolvedValueOnce(
        new Response('<html><body>ok</body></html>', {
          status: 200
        })
      );

    const result = await runSmokeContract(
      {
        baseUrl: 'http://127.0.0.1:3000'
      },
      {
        fetchImpl
      }
    );

    expect(result.passed).toBe(true);
    expect(result.browserCheck).toEqual({
      notes: ['Playwright smoke was not requested.'],
      path: '/',
      result: 'skipped'
    });
    expect(result.routeChecks).toHaveLength(2);
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      'http://127.0.0.1:3000/api/health',
      expect.any(Object)
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      'http://127.0.0.1:3000/',
      expect.any(Object)
    );
  });

  it('marks the smoke contract as failed when route checks or browser checks fail', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response('missing expected text', {
        status: 500
      })
    );
    const runPlaywrightCheck = vi.fn().mockResolvedValue({
      notes: ['Browser failed to load route.'],
      passed: false
    });

    const result = await runSmokeContract(
      {
        baseUrl: 'http://127.0.0.1:3000',
        routeChecks: [
          {
            expectedStatus: 200,
            expectedText: 'dashboard',
            path: '/api/health'
          }
        ],
        usePlaywright: true
      },
      {
        fetchImpl,
        runPlaywrightCheck
      }
    );

    expect(result.passed).toBe(false);
    expect(result.routeChecks[0]).toEqual({
      name: '/api/health',
      notes: [
        'Received status 500.',
        'Expected text "dashboard" was not present.'
      ],
      path: '/api/health',
      result: 'failed',
      statusCode: 500,
      url: 'http://127.0.0.1:3000/api/health'
    });
    expect(result.browserCheck).toEqual({
      notes: ['Browser failed to load route.'],
      path: '/',
      result: 'failed'
    });
    expect(runPlaywrightCheck).toHaveBeenCalledWith('http://127.0.0.1:3000/');
  });
});
