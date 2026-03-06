import { describe, expect, it } from 'vitest';

import nextConfig from './next.config.js';

describe('nextConfig', () => {
  it('transpiles the workspace packages the dashboard is expected to consume', () => {
    expect(nextConfig.transpilePackages).toEqual([
      '@evolvo/api',
      '@evolvo/core',
      '@evolvo/observability',
      '@evolvo/query',
      '@evolvo/schemas',
      '@evolvo/tailwind-config',
      '@evolvo/ui'
    ]);
  });
});
