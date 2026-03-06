import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

describe('prisma config', () => {
  it('points Prisma at the shared api package paths', async () => {
    process.env.POSTGRES_DB = 'evolvo';
    process.env.POSTGRES_HOST = 'localhost';
    process.env.POSTGRES_PASSWORD = 'evolvo';
    process.env.POSTGRES_PORT = '5432';
    process.env.POSTGRES_SCHEMA = 'public';
    process.env.POSTGRES_USER = 'evolvo';

    vi.resetModules();

    const { default: config } = await import('../../prisma.config.ts');
    const source = await readFile(
      resolve(process.cwd(), 'prisma.config.ts'),
      'utf8'
    );

    expect(config.datasource.url).toBe(
      'postgresql://evolvo:evolvo@localhost:5432/evolvo?schema=public'
    );
    expect(source).toContain("schema: 'packages/api/prisma/'");
    expect(config.migrations.path).toBe('packages/api/prisma/migrations');
    expect(config.schema).toBe('packages/api/prisma/');
  });
});
