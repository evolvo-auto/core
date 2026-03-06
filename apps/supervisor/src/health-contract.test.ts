import { describe, expect, it } from 'vitest';

import { buildSupervisorHealth } from './health-contract.js';

describe('buildSupervisorHealth', () => {
  it('builds a valid supervisor health payload', () => {
    const startedAt = new Date('2026-03-06T12:00:00.000Z');
    const now = new Date('2026-03-06T12:01:00.000Z');

    expect(buildSupervisorHealth({ now, startedAt })).toEqual({
      checks: [
        {
          detail: 'Supervisor process is accepting HTTP requests.',
          name: 'http-listener',
          status: 'pass'
        },
        {
          detail:
            'Supervisor authority loop is available for future promotion checks.',
          name: 'supervision-loop',
          status: 'pass'
        }
      ],
      observedAt: '2026-03-06T12:01:00.000Z',
      service: 'supervisor',
      startedAt: '2026-03-06T12:00:00.000Z',
      status: 'healthy',
      uptimeMs: 60_000,
      version: '0.0.0'
    });
  });
});
