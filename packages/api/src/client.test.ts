import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { createPrismaClient, getPrismaClient } from './client.js';

function applyTestEnvironment() {
  process.env.POSTGRES_DB = 'evolvo';
  process.env.POSTGRES_HOST = 'localhost';
  process.env.POSTGRES_PASSWORD = 'evolvo';
  process.env.POSTGRES_PORT = '5432';
  process.env.POSTGRES_SCHEMA = 'public';
  process.env.POSTGRES_USER = 'evolvo';
}

describe('Prisma client setup', () => {
  beforeEach(() => {
    applyTestEnvironment();
  });

  afterAll(async () => {
    await getPrismaClient().$disconnect();
  });

  it('creates a Prisma client instance and caches the shared instance', async () => {
    const createdClient = createPrismaClient();
    const sharedClient = getPrismaClient();

    expect(typeof createdClient.$disconnect).toBe('function');
    expect(getPrismaClient()).toBe(sharedClient);
    expect(createdClient).not.toBe(sharedClient);

    await createdClient.$disconnect();
  });
});
