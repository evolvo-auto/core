import type { NextConfig } from 'next';

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
