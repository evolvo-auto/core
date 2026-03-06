import { describe, expect, it } from 'vitest';

import {
  getRuntimeServerConfig,
  getRuntimeWorkerConfig
} from './server-config.js';

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

  it('parses runtime worker loop configuration with sane defaults', () => {
    expect(
      getRuntimeWorkerConfig({
        DASHBOARD_PORT: '3000',
        RUNTIME_BASE_REF: 'develop',
        RUNTIME_GIT_REMOTE: 'upstream',
        RUNTIME_LOOP_INTERVAL_MS: '15000',
        RUNTIME_MAX_REPAIR_ATTEMPTS: '4',
        RUNTIME_SMOKE_BASE_URL: 'http://127.0.0.1:3400',
        RUNTIME_SMOKE_USE_PLAYWRIGHT: 'true',
        RUNTIME_WORKTREES_ROOT: '/tmp/worktrees'
      })
    ).toEqual({
      baseRef: 'develop',
      gitRemote: 'upstream',
      loopIntervalMs: 15000,
      maxRepairAttempts: 4,
      smokeBaseUrl: 'http://127.0.0.1:3400',
      smokeUsePlaywright: true,
      worktreesRoot: '/tmp/worktrees'
    });
  });
});
