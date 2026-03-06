import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadEnvConfig } from '@next/env';

loadEnvConfig(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
);

const nextConfig: NextConfig = {
  transpilePackages: [
    '@evolvo/api',
    '@evolvo/core',
    '@evolvo/observability',
    '@evolvo/query',
    '@evolvo/schemas',
    '@evolvo/tailwind-config',
    '@evolvo/ui'
  ]
};

export default nextConfig;
