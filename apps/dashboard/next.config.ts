import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@evolvo/api',
    '@evolvo/core',
    '@evolvo/observability',
    '@evolvo/schemas',
    '@evolvo/ui'
  ]
};

export default nextConfig;
