import { describe, expect, it, vi } from 'vitest';

import {
  createFailureRecord,
  getFailureRecordById,
  listFailureRecords,
  updateFailureRecord
} from './failure-record.js';
import type { PrismaClient } from './generated/prisma/client.js';

describe('failure record DAL', () => {
  it('creates a failure record with normalized nullable fields', async () => {
    const create = vi.fn().mockResolvedValue({
      id: 'failure_1'
    });
    const prisma = {
      failureRecord: {
        create
      }
    } as unknown as PrismaClient;

    await createFailureRecord(
      {
        attemptId: ' att_1 ',
        category: 'ENVIRONMENT_SETUP_FAILURE',
        confirmedRootCause: ' missing env ',
        issueNumber: 14,
        linkedIssueNumber: 40,
        phase: 'ENVIRONMENT',
        recurrenceCount: 2,
        recurrenceGroup: ' env/bootstrap ',
        reflectionJson: {
          phase: 'environment'
        },
        rootCauseHypotheses: [{ cause: 'Missing DATABASE_URL', confidence: 90 }],
        severity: 'HIGH',
        symptom: ' Prisma failed to connect '
      },
      prisma
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        attemptId: 'att_1',
        category: 'ENVIRONMENT_SETUP_FAILURE',
        confirmedRootCause: 'missing env',
        isSystemic: false,
        issueNumber: 14,
        linkedIssueNumber: 40,
        phase: 'ENVIRONMENT',
        recurrenceCount: 2,
        recurrenceGroup: 'env/bootstrap',
        reflectionJson: {
          phase: 'environment'
        },
        rootCauseHypotheses: [{ cause: 'Missing DATABASE_URL', confidence: 90 }],
        severity: 'HIGH',
        symptom: 'Prisma failed to connect'
      }
    });
  });

  it('updates a failure record and rejects empty updates', async () => {
    const update = vi.fn().mockResolvedValue({
      id: 'failure_2'
    });
    const prisma = {
      failureRecord: {
        update
      }
    } as unknown as PrismaClient;

    await updateFailureRecord(
      {
        confirmedRootCause: '  ',
        id: ' failure_2 ',
        isSystemic: true,
        linkedIssueNumber: 52,
        recurrenceGroup: ' structured-output/openai ',
        symptom: ' Missing required field '
      },
      prisma
    );

    expect(update).toHaveBeenCalledWith({
      data: {
        confirmedRootCause: null,
        isSystemic: true,
        linkedIssueNumber: 52,
        recurrenceGroup: 'structured-output/openai',
        symptom: 'Missing required field'
      },
      where: {
        id: 'failure_2'
      }
    });

    await expect(
      updateFailureRecord(
        {
          id: 'failure_2'
        },
        prisma
      )
    ).rejects.toThrow('Failure record update requires at least one mutable field.');
  });

  it('fetches and lists failures with normalized filters', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: 'failure_3'
    });
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'failure_3'
      }
    ]);
    const prisma = {
      failureRecord: {
        findMany,
        findUnique
      }
    } as unknown as PrismaClient;

    await expect(getFailureRecordById(' failure_3 ', prisma)).resolves.toEqual({
      id: 'failure_3'
    });

    await listFailureRecords(
      {
        attemptId: ' att_3 ',
        category: 'MODEL_QUALITY_ISSUE',
        issueNumber: 32,
        limit: 2.9,
        recurrenceGroup: ' structured-output/openai '
      },
      prisma
    );

    expect(findMany).toHaveBeenCalledWith({
      orderBy: {
        createdAt: 'desc'
      },
      take: 2,
      where: {
        attemptId: 'att_3',
        category: 'MODEL_QUALITY_ISSUE',
        isSystemic: undefined,
        issueNumber: 32,
        linkedIssueNumber: undefined,
        recurrenceGroup: 'structured-output/openai'
      }
    });
  });
});
