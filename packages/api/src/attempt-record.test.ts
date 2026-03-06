import { describe, expect, it, vi } from 'vitest';

import {
  createAttemptRecord,
  getAttemptRecordById,
  listAttemptRecords,
  updateAttemptRecord
} from './attempt-record.js';
import type { PrismaClient } from './generated/prisma/client.js';

describe('attempt record DAL', () => {
  it('creates an attempt record with normalized text fields', async () => {
    const create = vi.fn().mockResolvedValue({
      id: 'att_1'
    });
    const prisma = {
      attempt: {
        create
      }
    } as unknown as PrismaClient;

    await createAttemptRecord(
      {
        evaluationStatus: 'PENDING',
        issueNumber: 211,
        runtimeVersionId: ' runtime_v12 ',
        summary: ' initial hydration ',
        worktreeId: ' wt_211 '
      },
      prisma
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        evaluationStatus: 'PENDING',
        issueNumber: 211,
        runtimeVersionId: 'runtime_v12',
        summary: 'initial hydration',
        worktreeId: 'wt_211'
      }
    });
  });

  it('updates mutable attempt fields and rejects empty updates', async () => {
    const endedAt = new Date('2026-03-06T15:00:00.000Z');
    const update = vi.fn().mockResolvedValue({
      id: 'att_2'
    });
    const prisma = {
      attempt: {
        update
      }
    } as unknown as PrismaClient;

    await updateAttemptRecord(
      {
        endedAt,
        evaluationStatus: 'FAILED',
        id: ' att_2 ',
        outcome: 'BLOCKED',
        summary: '   '
      },
      prisma
    );

    expect(update).toHaveBeenCalledWith({
      data: {
        endedAt,
        evaluationStatus: 'FAILED',
        outcome: 'BLOCKED',
        summary: null
      },
      where: {
        id: 'att_2'
      }
    });

    await expect(
      updateAttemptRecord(
        {
          id: 'att_2'
        },
        prisma
      )
    ).rejects.toThrow('Attempt record update requires at least one mutable field.');
  });

  it('fetches and lists attempts with normalized filtering and limit handling', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: 'att_3'
    });
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'att_3'
      }
    ]);
    const prisma = {
      attempt: {
        findMany,
        findUnique
      }
    } as unknown as PrismaClient;

    await expect(getAttemptRecordById(' att_3 ', prisma)).resolves.toEqual({
      id: 'att_3'
    });
    await listAttemptRecords(
      {
        issueNumber: 402,
        limit: 2.9,
        worktreeId: ' wt_402 '
      },
      prisma
    );

    expect(findMany).toHaveBeenCalledWith({
      orderBy: {
        startedAt: 'desc'
      },
      take: 2,
      where: {
        issueNumber: 402,
        worktreeId: 'wt_402'
      }
    });
  });
});
