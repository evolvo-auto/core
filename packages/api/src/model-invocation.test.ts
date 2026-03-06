import { describe, expect, it, vi } from 'vitest';

import {
  createModelInvocation,
  createModelInvocations,
  listModelInvocations
} from './model-invocation.js';
import type { PrismaClient } from './generated/prisma/client.js';

describe('model invocation DAL', () => {
  it('creates an invocation with normalized text values and defaults', async () => {
    const create = vi.fn().mockResolvedValue({
      id: 'inv_1'
    });
    const prisma = {
      modelInvocation: {
        create
      }
    } as unknown as PrismaClient;

    await createModelInvocation(
      {
        attemptId: '  attempt_1  ',
        durationMs: 252,
        metadataJson: {
          attempts: 2,
          repairAttempted: true
        },
        model: '  gpt-5.3-codex ',
        promptHash: '  abc123  ',
        provider: 'openai',
        role: '  builder  ',
        schemaValid: true,
        success: true,
        taskKind: '  debugging '
      },
      prisma
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        attemptId: 'attempt_1',
        costEstimate: undefined,
        durationMs: 252,
        fallbackUsed: false,
        metadataJson: {
          attempts: 2,
          repairAttempted: true
        },
        model: 'gpt-5.3-codex',
        promptHash: 'abc123',
        provider: 'OPENAI',
        role: 'builder',
        schemaValid: true,
        success: true,
        taskKind: 'debugging'
      }
    });
  });

  it('creates multiple model invocations and returns processed count', async () => {
    const create = vi.fn().mockResolvedValue({});
    const prisma = {
      modelInvocation: {
        create
      }
    } as unknown as PrismaClient;

    const processedCount = await createModelInvocations(
      {
        invocations: [
          {
            durationMs: 100,
            model: 'gpt-5.3-codex',
            provider: 'openai',
            role: 'builder',
            success: true,
            taskKind: 'general'
          },
          {
            durationMs: 210,
            model: 'qwen3:14b-q4_K_M',
            provider: 'ollama',
            role: 'critic',
            success: false,
            taskKind: 'debugging'
          }
        ]
      },
      prisma
    );

    expect(processedCount).toBe(2);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('lists invocations with filter mapping and limit normalization', async () => {
    const records = [{ id: 'inv_2' }, { id: 'inv_1' }];
    const findMany = vi.fn().mockResolvedValue(records);
    const prisma = {
      modelInvocation: {
        findMany
      }
    } as unknown as PrismaClient;

    expect(
      await listModelInvocations(
        {
          attemptId: '  attempt_7 ',
          limit: 2.9,
          provider: 'openai',
          role: '  builder ',
          success: true,
          taskKind: '  debugging '
        },
        prisma
      )
    ).toBe(records);

    expect(findMany).toHaveBeenCalledWith({
      orderBy: {
        createdAt: 'desc'
      },
      take: 2,
      where: {
        attemptId: 'attempt_7',
        provider: 'OPENAI',
        role: 'builder',
        success: true,
        taskKind: 'debugging'
      }
    });
  });

  it('rejects invalid required and numeric fields', async () => {
    const create = vi.fn();
    const prisma = {
      modelInvocation: {
        create
      }
    } as unknown as PrismaClient;

    await expect(
      createModelInvocation(
        {
          durationMs: -1,
          model: 'gpt-5.3-codex',
          provider: 'openai',
          role: 'builder',
          success: true,
          taskKind: 'general'
        },
        prisma
      )
    ).rejects.toThrow(
      'Model invocation durationMs must be a non-negative integer.'
    );
    await expect(
      createModelInvocation(
        {
          costEstimate: -0.2,
          durationMs: 1,
          model: 'gpt-5.3-codex',
          provider: 'openai',
          role: 'builder',
          success: true,
          taskKind: 'general'
        },
        prisma
      )
    ).rejects.toThrow('Model invocation costEstimate must be non-negative.');
    await expect(
      createModelInvocation(
        {
          durationMs: 1,
          model: '   ',
          provider: 'openai',
          role: 'builder',
          success: true,
          taskKind: 'general'
        },
        prisma
      )
    ).rejects.toThrow('Model invocation model is required.');
    await expect(
      createModelInvocation(
        {
          durationMs: 1,
          model: 'gpt-5.3-codex',
          provider: 'openai',
          role: 'builder',
          success: true,
          taskKind: '   '
        },
        prisma
      )
    ).rejects.toThrow('Model invocation taskKind is required.');
    expect(create).not.toHaveBeenCalled();
  });
});
