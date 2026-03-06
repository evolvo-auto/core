import { describe, expect, it } from 'vitest';

import { getRuntimeServerConfig } from './server-config.js';

describe('getRuntimeServerConfig', () => {
  it('parses the configured runtime host and port', () => {
    expect(
      getRuntimeServerConfig({
        RUNTIME_HOST: '0.0.0.0',
        RUNTIME_PORT: '3100'
      })
    ).toEqual({
      host: '0.0.0.0',
      port: 3100
    });
  });

  it('requires an explicit runtime port', () => {
    expect(() => getRuntimeServerConfig({})).toThrow(/RUNTIME_PORT/);
  });
});
