import { describe, expect, it } from 'vitest';

import { getSupervisorServerConfig } from './server-config.js';

describe('getSupervisorServerConfig', () => {
  it('parses the configured supervisor host and port', () => {
    expect(
      getSupervisorServerConfig({
        SUPERVISOR_HOST: '0.0.0.0',
        SUPERVISOR_PORT: '3200'
      })
    ).toEqual({
      host: '0.0.0.0',
      port: 3200
    });
  });

  it('requires an explicit supervisor port', () => {
    expect(() => getSupervisorServerConfig({})).toThrow(/SUPERVISOR_PORT/);
  });
});
