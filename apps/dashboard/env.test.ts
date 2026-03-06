import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

describe('loadDashboardEnv', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('@next/env');
  });

  it('loads environment variables from the monorepo root once', async () => {
    const loadEnvConfig = vi.fn();

    vi.doMock('@next/env', () => ({
      loadEnvConfig
    }));

    const module = await import('./env.js');
    const expectedWorkspaceRoot = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../..'
    );

    expect(module.dashboardWorkspaceRoot).toBe(expectedWorkspaceRoot);

    module.loadDashboardEnv();
    module.loadDashboardEnv();

    expect(loadEnvConfig).toHaveBeenCalledTimes(1);
    expect(loadEnvConfig).toHaveBeenCalledWith(expectedWorkspaceRoot);
  });
});
