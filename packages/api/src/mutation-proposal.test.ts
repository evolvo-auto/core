import { describe, expect, it, vi } from 'vitest';

import {
  createMutationProposal,
  getMutationProposalById,
  listMutationProposals,
  updateMutationProposal
} from './mutation-proposal.js';
import type { PrismaClient } from './generated/prisma/client.js';

describe('mutation proposal DAL', () => {
  it('creates a mutation proposal with normalized text, scores, and source failure links', async () => {
    const create = vi.fn().mockResolvedValue({
      id: 'mutation_1'
    });
    const prisma = {
      mutationProposal: {
        create
      }
    } as unknown as PrismaClient;

    await createMutationProposal(
      {
        confidenceScore: 71,
        implementationPlan: ' tighten planner output prompts ',
        linkedIssueNumber: 75,
        predictedBenefit: ' fewer invalid planner objects ',
        predictedRisk: ' overconstrain planner creativity ',
        priorityScore: 64,
        rationale: ' repeated schema failures point to weak prompt guidance ',
        rollbackConsiderations: ' revert prompt template changes ',
        sourceFailureIds: [' failure_1 ', 'failure_1', ' failure_2 '],
        sourceIssueNumber: 14,
        state: 'PROPOSED',
        targetSurface: 'PROMPTS',
        title: ' Mutation: tighten planner prompt contracts ',
        validationPlan: {
          replayIssueNumbers: [14, 32]
        }
      },
      prisma
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        confidenceScore: 71,
        implementationPlan: 'tighten planner output prompts',
        linkedIssueNumber: 75,
        predictedBenefit: 'fewer invalid planner objects',
        predictedRisk: 'overconstrain planner creativity',
        priorityScore: 64,
        rationale: 'repeated schema failures point to weak prompt guidance',
        rollbackConsiderations: 'revert prompt template changes',
        sourceFailures: {
          create: [
            {
              failureRecordId: 'failure_1'
            },
            {
              failureRecordId: 'failure_2'
            }
          ]
        },
        sourceIssueNumber: 14,
        state: 'PROPOSED',
        targetSurface: 'PROMPTS',
        title: 'Mutation: tighten planner prompt contracts',
        validationPlan: {
          replayIssueNumbers: [14, 32]
        }
      }
    });
  });

  it('updates a mutation proposal and rejects empty updates', async () => {
    const update = vi.fn().mockResolvedValue({
      id: 'mutation_2'
    });
    const prisma = {
      mutationProposal: {
        update
      }
    } as unknown as PrismaClient;

    await updateMutationProposal(
      {
        id: ' mutation_2 ',
        linkedIssueNumber: 80,
        predictedBenefit: ' reduced recurrence ',
        predictedRisk: '  ',
        priorityScore: 82,
        state: 'SELECTED'
      },
      prisma
    );

    expect(update).toHaveBeenCalledWith({
      data: {
        linkedIssueNumber: 80,
        predictedBenefit: 'reduced recurrence',
        predictedRisk: null,
        priorityScore: 82,
        state: 'SELECTED'
      },
      where: {
        id: 'mutation_2'
      }
    });

    await expect(
      updateMutationProposal(
        {
          id: 'mutation_2'
        },
        prisma
      )
    ).rejects.toThrow('Mutation proposal update requires at least one mutable field.');
  });

  it('fetches and lists mutation proposals with normalized filters', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: 'mutation_3'
    });
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'mutation_3'
      }
    ]);
    const prisma = {
      mutationProposal: {
        findMany,
        findUnique
      }
    } as unknown as PrismaClient;

    await expect(getMutationProposalById(' mutation_3 ', prisma)).resolves.toEqual({
      id: 'mutation_3'
    });

    await listMutationProposals(
      {
        limit: 4.2,
        linkedIssueNumber: 80,
        sourceIssueNumber: 14,
        state: 'PROPOSED',
        targetSurface: 'PROMPTS'
      },
      prisma
    );

    expect(findMany).toHaveBeenCalledWith({
      orderBy: {
        createdAt: 'desc'
      },
      take: 4,
      where: {
        linkedIssueNumber: 80,
        sourceIssueNumber: 14,
        state: 'PROPOSED',
        targetSurface: 'PROMPTS'
      }
    });
  });
});
