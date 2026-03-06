import { describe, expect, it, vi } from 'vitest';

import {
  createMutationOutcome,
  getMutationOutcomeById,
  listMutationOutcomes,
  updateMutationOutcome
} from './mutation-outcome.js';
import type { PrismaClient } from './generated/prisma/client.js';

describe('mutation outcome DAL', () => {
  it('creates a mutation outcome with normalized nullable fields', async () => {
    const create = vi.fn().mockResolvedValue({
      id: 'outcome_1'
    });
    const prisma = {
      mutationOutcome: {
        create
      }
    } as unknown as PrismaClient;

    await createMutationOutcome(
      {
        benchmarkDelta: {
          passRateDelta: 7
        },
        candidateRuntimeVersionId: ' runtime_12 ',
        mutationProposalId: ' mutation_1 ',
        notes: ' benchmark pack improved ',
        outcome: 'ADOPTED'
      },
      prisma
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        adoptedAt: null,
        benchmarkDelta: {
          passRateDelta: 7
        },
        candidateRuntimeVersionId: 'runtime_12',
        mutationProposalId: 'mutation_1',
        notes: 'benchmark pack improved',
        outcome: 'ADOPTED'
      }
    });
  });

  it('updates a mutation outcome and rejects empty updates', async () => {
    const update = vi.fn().mockResolvedValue({
      id: 'outcome_2'
    });
    const prisma = {
      mutationOutcome: {
        update
      }
    } as unknown as PrismaClient;

    await updateMutationOutcome(
      {
        id: ' outcome_2 ',
        notes: '  ',
        outcome: 'REJECTED'
      },
      prisma
    );

    expect(update).toHaveBeenCalledWith({
      data: {
        notes: null,
        outcome: 'REJECTED'
      },
      where: {
        id: 'outcome_2'
      }
    });

    await expect(
      updateMutationOutcome(
        {
          id: 'outcome_2'
        },
        prisma
      )
    ).rejects.toThrow('Mutation outcome update requires at least one mutable field.');
  });

  it('fetches and lists mutation outcomes with normalized filters', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: 'outcome_3'
    });
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'outcome_3'
      }
    ]);
    const prisma = {
      mutationOutcome: {
        findMany,
        findUnique
      }
    } as unknown as PrismaClient;

    await expect(getMutationOutcomeById(' outcome_3 ', prisma)).resolves.toEqual({
      id: 'outcome_3'
    });

    await listMutationOutcomes(
      {
        candidateRuntimeVersionId: ' runtime_14 ',
        limit: 5.7,
        mutationProposalId: ' mutation_1 ',
        outcome: 'INCONCLUSIVE'
      },
      prisma
    );

    expect(findMany).toHaveBeenCalledWith({
      orderBy: {
        createdAt: 'desc'
      },
      take: 5,
      where: {
        candidateRuntimeVersionId: 'runtime_14',
        mutationProposalId: 'mutation_1',
        outcome: 'INCONCLUSIVE'
      }
    });
  });
});
