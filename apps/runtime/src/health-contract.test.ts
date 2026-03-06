import { describe, expect, it } from 'vitest';

import { buildRuntimeHealth } from './health-contract.js';

describe('buildRuntimeHealth', () => {
  it('builds a valid runtime health payload', () => {
    const startedAt = new Date('2026-03-06T12:00:00.000Z');
    const now = new Date('2026-03-06T12:00:30.000Z');

    expect(buildRuntimeHealth({ now, startedAt })).toEqual({
      checks: [
        {
          detail: 'Runtime process is accepting HTTP requests.',
          name: 'http-listener',
          status: 'pass'
        },
        {
          detail: 'Runtime process is online and able to report health.',
          name: 'process',
          status: 'pass'
        },
        {
          detail: 'Runtime issue loop status is not attached.',
          name: 'issue-loop',
          status: 'warn'
        }
      ],
      observedAt: '2026-03-06T12:00:30.000Z',
      service: 'runtime',
      startedAt: '2026-03-06T12:00:00.000Z',
      status: 'degraded',
      uptimeMs: 30_000,
      version: '0.0.0'
    });
  });

  it('marks runtime health as degraded when the autonomous loop reports an error', () => {
    const health = buildRuntimeHealth({
      loopStatus: {
        consecutiveFailures: 1,
        lastErrorMessage: 'GitHub unavailable',
        lastOutcome: 'failed',
        state: 'error'
      }
    });

    expect(health.status).toBe('degraded');
    expect(health.checks).toContainEqual({
      detail: 'GitHub unavailable',
      name: 'issue-loop',
      status: 'fail'
    });
  });
});
