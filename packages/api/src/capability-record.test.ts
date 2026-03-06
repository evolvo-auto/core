import { describe, expect, it, vi } from 'vitest';

import {
  getCapabilityRecordByKey,
  listCapabilityRecords,
  updateCapabilityRecord,
  upsertCapabilityRecord
} from './capability-record.js';
import type { PrismaClient } from './generated/prisma/client.js';

describe('capability record DAL', () => {
  it('upserts a capability record with normalized counters and scores', async () => {
    const upsert = vi.fn().mockResolvedValue({
      capabilityKey: 'nextjs'
    });
    const prisma = {
      capabilityRecord: {
        upsert
      }
    } as unknown as PrismaClient;

    await upsertCapabilityRecord(
      {
        attempts: 12,
        capabilityKey: ' nextjs ',
        confidenceScore: 63,
        failures: 4,
        lastIssueNumber: 32,
        recurringFailureModes: ['hydration', 'env'],
        successes: 8
      },
      prisma
    );

    expect(upsert).toHaveBeenCalledWith({
      create: {
        attempts: 12,
        capabilityKey: 'nextjs',
        confidenceScore: 63,
        failures: 4,
        lastIssueNumber: 32,
        recurringFailureModes: ['hydration', 'env'],
        successes: 8
      },
      update: {
        attempts: 12,
        confidenceScore: 63,
        failures: 4,
        lastIssueNumber: 32,
        recurringFailureModes: ['hydration', 'env'],
        successes: 8
      },
      where: {
        capabilityKey: 'nextjs'
      }
    });
  });

  it('updates a capability record and rejects empty updates', async () => {
    const update = vi.fn().mockResolvedValue({
      capabilityKey: 'debugging'
    });
    const prisma = {
      capabilityRecord: {
        update
      }
    } as unknown as PrismaClient;

    await updateCapabilityRecord(
      {
        capabilityKey: ' debugging ',
        confidenceScore: 58,
        failures: 6
      },
      prisma
    );

    expect(update).toHaveBeenCalledWith({
      data: {
        confidenceScore: 58,
        failures: 6
      },
      where: {
        capabilityKey: 'debugging'
      }
    });

    await expect(
      updateCapabilityRecord(
        {
          capabilityKey: 'debugging'
        },
        prisma
      )
    ).rejects.toThrow('Capability record update requires at least one mutable field.');
  });

  it('fetches and lists capability records with normalized filters', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      capabilityKey: 'typescript'
    });
    const findMany = vi.fn().mockResolvedValue([
      {
        capabilityKey: 'typescript'
      }
    ]);
    const prisma = {
      capabilityRecord: {
        findMany,
        findUnique
      }
    } as unknown as PrismaClient;

    await expect(
      getCapabilityRecordByKey(' typescript ', prisma)
    ).resolves.toEqual({
      capabilityKey: 'typescript'
    });

    await listCapabilityRecords(
      {
        capabilityKey: ' nextjs ',
        limit: 3.9
      },
      prisma
    );

    expect(findMany).toHaveBeenCalledWith({
      orderBy: [
        {
          confidenceScore: 'asc'
        },
        {
          capabilityKey: 'asc'
        }
      ],
      take: 3,
      where: {
        capabilityKey: 'nextjs'
      }
    });
  });
});
