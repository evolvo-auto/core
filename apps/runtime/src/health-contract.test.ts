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
        }
      ],
      observedAt: '2026-03-06T12:00:30.000Z',
      service: 'runtime',
      startedAt: '2026-03-06T12:00:00.000Z',
      status: 'healthy',
      uptimeMs: 30_000,
      version: '0.0.0'
    });
  });
});
