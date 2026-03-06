import { describe, expect, it, vi } from 'vitest';

import {
  getChallengeRecordBySourceIssueNumber,
  listChallengeRecords,
  updateChallengeRecord,
  upsertChallengeRecord
} from './challenge-record.js';
import type { PrismaClient } from './generated/prisma/client.js';

describe('challenge record DAL', () => {
  it('upserts a normalized challenge record', async () => {
    const upsert = vi.fn().mockResolvedValue({
      id: 'challenge_1'
    });
    const prisma = {
      challengeRecord: {
        upsert
      }
    } as unknown as PrismaClient;

    await upsertChallengeRecord(
      {
        artifactExpectationsJson: ['pr', 'tests'],
        capabilityTags: [' NextJS ', 'testing', 'nextjs'],
        category: 'FEATURE_IMPLEMENTATION',
        constraintsJson: ['no inline styles'],
        intent: ' Build the dashboard feature ',
        issueSource: 'HUMAN',
        scoringNotesJson: ['prefer SSR-safe data loading'],
        sourceFingerprint: 'fingerprint_1',
        sourceIssueNumber: 14,
        successSignal: ' Dashboard page renders cleanly ',
        title: ' Improve dashboard ',
        validationStepsJson: ['pnpm lint', 'pnpm test']
      },
      prisma
    );

    expect(upsert).toHaveBeenCalledWith({
      create: {
        artifactExpectationsJson: ['pr', 'tests'],
        capabilityTags: ['nextjs', 'testing'],
        category: 'FEATURE_IMPLEMENTATION',
        constraintsJson: ['no inline styles'],
        intent: 'Build the dashboard feature',
        issueSource: 'HUMAN',
        scoringNotesJson: ['prefer SSR-safe data loading'],
        sourceFingerprint: 'fingerprint_1',
        sourceIssueNumber: 14,
        successSignal: 'Dashboard page renders cleanly',
        title: 'Improve dashboard',
        validationStepsJson: ['pnpm lint', 'pnpm test']
      },
      update: {
        artifactExpectationsJson: ['pr', 'tests'],
        capabilityTags: ['nextjs', 'testing'],
        category: 'FEATURE_IMPLEMENTATION',
        constraintsJson: ['no inline styles'],
        intent: 'Build the dashboard feature',
        issueSource: 'HUMAN',
        scoringNotesJson: ['prefer SSR-safe data loading'],
        sourceFingerprint: 'fingerprint_1',
        successSignal: 'Dashboard page renders cleanly',
        title: 'Improve dashboard',
        validationStepsJson: ['pnpm lint', 'pnpm test']
      },
      where: {
        sourceIssueNumber: 14
      }
    });
  });

  it('updates a challenge record and rejects empty updates', async () => {
    const update = vi.fn().mockResolvedValue({
      id: 'challenge_1'
    });
    const prisma = {
      challengeRecord: {
        update
      }
    } as unknown as PrismaClient;

    await updateChallengeRecord(
      {
        capabilityTags: ['runtime', 'Benchmark-Design '],
        sourceIssueNumber: 21,
        title: ' Refine runtime benchmark '
      },
      prisma
    );

    expect(update).toHaveBeenCalledWith({
      data: {
        capabilityTags: ['runtime', 'benchmark-design'],
        title: 'Refine runtime benchmark'
      },
      where: {
        sourceIssueNumber: 21
      }
    });

    await expect(
      updateChallengeRecord(
        {
          sourceIssueNumber: 21
        },
        prisma
      )
    ).rejects.toThrow('Challenge record update requires at least one mutable field.');
  });

  it('gets and lists challenge records with normalized filters', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: 'challenge_2'
    });
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'challenge_2'
      }
    ]);
    const prisma = {
      challengeRecord: {
        findMany,
        findUnique
      }
    } as unknown as PrismaClient;

    await getChallengeRecordBySourceIssueNumber(32, prisma);
    await listChallengeRecords(
      {
        category: 'BUG_FIXING',
        issueSource: 'EVOLVO',
        limit: 3.7,
        sourceIssueNumber: 32
      },
      prisma
    );

    expect(findUnique).toHaveBeenCalledWith({
      where: {
        sourceIssueNumber: 32
      }
    });
    expect(findMany).toHaveBeenCalledWith({
      orderBy: [
        {
          updatedAt: 'desc'
        },
        {
          sourceIssueNumber: 'desc'
        }
      ],
      take: 3,
      where: {
        category: 'BUG_FIXING',
        issueSource: 'EVOLVO',
        sourceIssueNumber: 32
      }
    });
  });
});
