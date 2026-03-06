import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from './generated/prisma/client.ts';
import { getDatabaseUrl } from './database-url.ts';

let prismaClient: PrismaClient | undefined;

export function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: getDatabaseUrl()
  });

  return new PrismaClient({ adapter });
}

export function getPrismaClient(): PrismaClient {
  prismaClient ??= createPrismaClient();

  return prismaClient;
}
