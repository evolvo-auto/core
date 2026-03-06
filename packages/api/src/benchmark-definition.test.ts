import { describe, expect, it, vi } from 'vitest';

import {
  getActiveBenchmarkDefinitionByKey,
  listBenchmarkDefinitions,
  updateBenchmarkDefinition,
  upsertBenchmarkDefinition
} from './benchmark-definition.js';
import type {
  BenchmarkDefinition,
  PrismaClient
} from './generated/prisma/client.js';

describe('benchmark definition DAL', () => {
  it('creates the first active benchmark definition version', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue({
      id: 'benchmark_1',
      version: 1
    } satisfies Partial<BenchmarkDefinition>);
    const prisma = {
      benchmarkDefinition: {
        create,
        findFirst
      }
    } as unknown as PrismaClient;

    await upsertBenchmarkDefinition(
      {
        benchmarkKey: ' runtime-smoke ',
        benchmarkType: 'FIXED',
        capabilityTags: [' runtime ', 'testing', 'runtime'],
        definitionJson: {
          validationSteps: ['pnpm test']
        },
        familyKey: ' core-fixed ',
        sourceFingerprint: 'fingerprint_a',
        title: ' Runtime smoke '
      },
      prisma
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        benchmarkKey: 'runtime-smoke',
        benchmarkType: 'FIXED',
        capabilityTags: ['runtime', 'testing'],
        challengeId: null,
        definitionJson: {
          validationSteps: ['pnpm test']
        },
        familyKey: 'core-fixed',
        isActive: true,
        isHoldout: false,
        isRegressionPack: false,
        lineageReason: null,
        scoringConfigJson: undefined,
        sourceFingerprint: 'fingerprint_a',
        sourceIssueNumber: null,
        sourceMutationId: null,
        title: 'Runtime smoke',
        version: 1
      }
    });
  });

  it('updates the active version when the fingerprint is unchanged', async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: 'benchmark_1',
      sourceFingerprint: 'fingerprint_a',
      version: 1
    } satisfies Partial<BenchmarkDefinition>);
    const update = vi.fn().mockResolvedValue({
      id: 'benchmark_1'
    } satisfies Partial<BenchmarkDefinition>);
    const prisma = {
      benchmarkDefinition: {
        findFirst,
        update
      }
    } as unknown as PrismaClient;

    await upsertBenchmarkDefinition(
      {
        benchmarkKey: 'runtime-smoke',
        benchmarkType: 'FIXED',
        definitionJson: {
          validationSteps: ['pnpm lint']
        },
        sourceFingerprint: 'fingerprint_a',
        title: 'Runtime smoke'
      },
      prisma
    );

    expect(update).toHaveBeenCalledWith({
      data: {
        benchmarkType: 'FIXED',
        capabilityTags: [],
        challengeId: null,
        definitionJson: {
          validationSteps: ['pnpm lint']
        },
        familyKey: null,
        isHoldout: false,
        isRegressionPack: false,
        lineageReason: null,
        scoringConfigJson: expect.anything(),
        sourceIssueNumber: null,
        sourceMutationId: null,
        title: 'Runtime smoke'
      },
      where: {
        id: 'benchmark_1'
      }
    });
  });

  it('creates a new lineage version when the fingerprint changes', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const create = vi.fn().mockResolvedValue({
      id: 'benchmark_2',
      version: 2
    } satisfies Partial<BenchmarkDefinition>);
    const transaction = {
      benchmarkDefinition: {
        create,
        update
      }
    } as unknown as PrismaClient;
    const prisma = {
      $transaction: vi.fn().mockImplementation(async (callback) => callback(transaction)),
      benchmarkDefinition: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'benchmark_1',
          sourceFingerprint: 'fingerprint_a',
          version: 1
        } satisfies Partial<BenchmarkDefinition>)
      }
    } as unknown as PrismaClient;

    await upsertBenchmarkDefinition(
      {
        benchmarkKey: 'runtime-smoke',
        benchmarkType: 'REGRESSION_PACK',
        definitionJson: {
          validationSteps: ['pnpm typecheck']
        },
        isRegressionPack: true,
        sourceFingerprint: 'fingerprint_b',
        title: 'Runtime smoke'
      },
      prisma
    );

    expect(update).toHaveBeenCalledWith({
      data: {
        isActive: false
      },
      where: {
        id: 'benchmark_1'
      }
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        benchmarkKey: 'runtime-smoke',
        benchmarkType: 'REGRESSION_PACK',
        isRegressionPack: true,
        lineageParentId: 'benchmark_1',
        version: 2
      })
    });
  });

  it('lists, fetches, and updates benchmark definitions', async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: 'benchmark_4'
    } satisfies Partial<BenchmarkDefinition>);
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'benchmark_4'
      }
    ] satisfies Partial<BenchmarkDefinition>[]);
    const update = vi.fn().mockResolvedValue({
      id: 'benchmark_4'
    } satisfies Partial<BenchmarkDefinition>);
    const prisma = {
      benchmarkDefinition: {
        findFirst,
        findMany,
        update
      }
    } as unknown as PrismaClient;

    await getActiveBenchmarkDefinitionByKey(' runtime-smoke ', prisma);
    await listBenchmarkDefinitions(
      {
        benchmarkKey: ' runtime-smoke ',
        benchmarkType: 'FIXED',
        familyKey: ' core ',
        isActive: true,
        limit: 4.9,
        sourceIssueNumber: 22
      },
      prisma
    );
    await updateBenchmarkDefinition(
      {
        id: ' benchmark_4 ',
        isHoldout: true,
        lineageReason: ' Reduce optimization pressure on this pack '
      },
      prisma
    );

    expect(findMany).toHaveBeenCalledWith({
      orderBy: [
        {
          benchmarkKey: 'asc'
        },
        {
          version: 'desc'
        }
      ],
      take: 4,
      where: {
        benchmarkKey: 'runtime-smoke',
        benchmarkType: 'FIXED',
        challengeId: undefined,
        familyKey: 'core',
        isActive: true,
        sourceIssueNumber: 22
      }
    });
    expect(update).toHaveBeenCalledWith({
      data: {
        isHoldout: true,
        lineageReason: 'Reduce optimization pressure on this pack'
      },
      where: {
        id: 'benchmark_4'
      }
    });
  });
});
