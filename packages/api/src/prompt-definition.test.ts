import { describe, expect, it, vi } from 'vitest';

import {
  listPromptDefinitions,
  updatePromptDefinition,
  upsertPromptDefinition
} from './prompt-definition.ts';

describe('prompt definition DAL', () => {
  it('creates the first active version and updates in place when the fingerprint is unchanged', async () => {
    const create = vi.fn().mockResolvedValue({
      id: 'prompt_1',
      version: 1
    });
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'prompt_1',
        sourceFingerprint: 'fingerprint_1',
        version: 1
      });
    const update = vi.fn().mockResolvedValue({
      id: 'prompt_1',
      version: 1
    });
    const prisma = {
      promptDefinition: {
        create,
        findFirst,
        update
      }
    } as never;

    await expect(
      upsertPromptDefinition(
        {
          promptKey: 'planner',
          responseMode: 'json',
          role: 'planner',
          sampleInputJson: {
            issueNumber: 1
          },
          sampleUserPrompt: ' sample user prompt ',
          sourceFingerprint: ' fingerprint_1 ',
          systemPrompt: ' system prompt ',
          title: ' Planner prompt '
        },
        prisma
      )
    ).resolves.toMatchObject({
      id: 'prompt_1',
      version: 1
    });

    await expect(
      upsertPromptDefinition(
        {
          promptKey: 'planner',
          responseMode: 'json',
          role: 'planner',
          sampleInputJson: {
            issueNumber: 1
          },
          sampleUserPrompt: ' next user prompt ',
          sourceFingerprint: ' fingerprint_1 ',
          systemPrompt: ' next system prompt ',
          title: ' Planner prompt '
        },
        prisma
      )
    ).resolves.toMatchObject({
      id: 'prompt_1',
      version: 1
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        promptKey: 'planner',
        responseMode: 'json',
        role: 'planner',
        sampleUserPrompt: 'sample user prompt',
        sourceFingerprint: 'fingerprint_1',
        systemPrompt: 'system prompt',
        title: 'Planner prompt',
        version: 1
      })
    });
    expect(update).toHaveBeenCalledWith({
      data: expect.objectContaining({
        responseMode: 'json',
        role: 'planner',
        sampleUserPrompt: 'next user prompt',
        systemPrompt: 'next system prompt'
      }),
      where: {
        id: 'prompt_1'
      }
    });
  });

  it('creates a lineage version when the fingerprint changes', async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: 'prompt_1',
      sourceFingerprint: 'fingerprint_1',
      version: 2
    });
    const update = vi.fn().mockResolvedValue(undefined);
    const create = vi.fn().mockResolvedValue({
      id: 'prompt_2',
      version: 3
    });
    const transaction = {
      promptDefinition: {
        create,
        update
      }
    };
    const prisma = {
      $transaction: vi.fn().mockImplementation((callback) => callback(transaction)),
      promptDefinition: {
        findFirst
      }
    } as never;

    await expect(
      upsertPromptDefinition(
        {
          lineageReason: ' Improve planner schema reliability ',
          promptKey: 'planner',
          responseMode: 'json',
          role: 'planner',
          sampleInputJson: {
            issueNumber: 2
          },
          sampleUserPrompt: 'new prompt',
          sourceFingerprint: 'fingerprint_2',
          sourceMutationId: ' mutation_1 ',
          systemPrompt: 'new system prompt',
          title: 'Planner prompt'
        },
        prisma
      )
    ).resolves.toMatchObject({
      id: 'prompt_2',
      version: 3
    });

    expect(update).toHaveBeenCalledWith({
      data: {
        isActive: false
      },
      where: {
        id: 'prompt_1'
      }
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        lineageParentId: 'prompt_1',
        lineageReason: 'Improve planner schema reliability',
        sourceMutationId: 'mutation_1',
        version: 3
      })
    });
  });

  it('updates and lists prompt definitions with normalized values', async () => {
    const update = vi.fn().mockResolvedValue({
      id: 'prompt_3'
    });
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'prompt_4'
      }
    ]);
    const prisma = {
      promptDefinition: {
        findMany,
        update
      }
    } as never;

    await expect(
      updatePromptDefinition(
        {
          id: ' prompt_3 ',
          sourceMutationId: ' mutation_2 ',
          title: ' Updated planner prompt '
        },
        prisma
      )
    ).resolves.toMatchObject({
      id: 'prompt_3'
    });

    expect(update).toHaveBeenCalledWith({
      data: {
        sourceMutationId: 'mutation_2',
        title: 'Updated planner prompt'
      },
      where: {
        id: 'prompt_3'
      }
    });

    await expect(
      listPromptDefinitions(
        {
          isActive: true,
          promptKey: ' planner ',
          role: ' planner ',
          sourceMutationId: ' mutation_2 '
        },
        prisma
      )
    ).resolves.toEqual([
      {
        id: 'prompt_4'
      }
    ]);

    expect(findMany).toHaveBeenCalledWith({
      orderBy: [
        {
          promptKey: 'asc'
        },
        {
          version: 'desc'
        }
      ],
      take: 100,
      where: {
        isActive: true,
        promptKey: 'planner',
        role: 'planner',
        sourceMutationId: 'mutation_2'
      }
    });
  });
});
