import { resolve } from 'node:path';

import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

import { getDatabaseUrl } from './packages/api/src/database-url.js';

loadEnv({ path: resolve(process.cwd(), '.env'), quiet: true });

export default defineConfig({
  datasource: {
    url: getDatabaseUrl()
  },
  migrations: {
    path: 'packages/api/prisma/migrations'
  },
  schema: 'packages/api/prisma/'
});
