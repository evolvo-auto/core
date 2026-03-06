'use server';

import { getPrismaClient } from './client.ts';
import {
  Prisma
} from './generated/prisma/client.ts';
import type {
  $Enums,
  BenchmarkDefinition,
  PrismaClient
} from './generated/prisma/client.ts';

export type UpsertBenchmarkDefinitionInput = {
  benchmarkKey: string;
  benchmarkType: $Enums.BenchmarkType;
  capabilityTags?: string[];
  challengeId?: string | null;
  definitionJson: Prisma.InputJsonValue;
  familyKey?: string | null;
  isHoldout?: boolean;
  isRegressionPack?: boolean;
  lineageReason?: string | null;
  scoringConfigJson?: Prisma.InputJsonValue | null;
  sourceFingerprint: string;
  sourceIssueNumber?: number | null;
  sourceMutationId?: string | null;
  title: string;
};

export type UpdateBenchmarkDefinitionInput = {
  benchmarkKey?: string;
  benchmarkType?: $Enums.BenchmarkType;
  capabilityTags?: string[];
  challengeId?: string | null;
  definitionJson?: Prisma.InputJsonValue;
  familyKey?: string | null;
  id: string;
  isActive?: boolean;
  isHoldout?: boolean;
  isRegressionPack?: boolean;
  lineageReason?: string | null;
  scoringConfigJson?: Prisma.InputJsonValue | null;
  sourceFingerprint?: string;
  sourceIssueNumber?: number | null;
  sourceMutationId?: string | null;
  title?: string;
};

export type ListBenchmarkDefinitionsOptions = {
  benchmarkKey?: string;
  benchmarkType?: $Enums.BenchmarkType;
  challengeId?: string;
  familyKey?: string;
  isActive?: boolean;
  limit?: number;
  sourceIssueNumber?: number;
};

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`Benchmark definition ${fieldName} is required.`);
  }

  return normalizedValue;
}

function normalizeOptionalText(
  value: string | null | undefined
): string | null | undefined {
  if (value === null || value === undefined) {
    return value;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue;
}

function normalizeIssueNumber(
  issueNumber: number | null | undefined
): number | null | undefined {
  if (issueNumber === null || issueNumber === undefined) {
    return issueNumber;
  }

  if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
    throw new Error(
      'Benchmark definition sourceIssueNumber must be a positive integer.'
    );
  }

  return issueNumber;
}

function normalizeCapabilityTags(capabilityTags: string[] | undefined): string[] {
  if (!capabilityTags) {
    return [];
  }

  const normalizedTags: string[] = [];
  const seenTags = new Set<string>();

  for (const capabilityTag of capabilityTags) {
    const normalizedTag = normalizeOptionalText(capabilityTag)?.toLowerCase();

    if (!normalizedTag || seenTags.has(normalizedTag)) {
      continue;
    }

    seenTags.add(normalizedTag);
    normalizedTags.push(normalizedTag);
  }

  return normalizedTags;
}

function buildDefinitionData(
  input: UpsertBenchmarkDefinitionInput
): Omit<Prisma.BenchmarkDefinitionUncheckedCreateInput, 'version'> {
  return {
    benchmarkKey: normalizeRequiredText(input.benchmarkKey, 'benchmarkKey'),
    benchmarkType: input.benchmarkType,
    capabilityTags: normalizeCapabilityTags(input.capabilityTags),
    challengeId: normalizeOptionalText(input.challengeId) ?? null,
    definitionJson: input.definitionJson,
    familyKey: normalizeOptionalText(input.familyKey) ?? null,
    isActive: true,
    isHoldout: input.isHoldout ?? false,
    isRegressionPack: input.isRegressionPack ?? false,
    lineageReason: normalizeOptionalText(input.lineageReason) ?? null,
    scoringConfigJson: input.scoringConfigJson ?? undefined,
    sourceFingerprint: normalizeRequiredText(
      input.sourceFingerprint,
      'sourceFingerprint'
    ),
    sourceIssueNumber: normalizeIssueNumber(input.sourceIssueNumber) ?? null,
    sourceMutationId: normalizeOptionalText(input.sourceMutationId) ?? null,
    title: normalizeRequiredText(input.title, 'title')
  };
}

async function createDefinitionVersion(
  data: Omit<Prisma.BenchmarkDefinitionUncheckedCreateInput, 'version'> & {
    lineageParentId?: string | null;
    version: number;
  },
  prisma: {
    benchmarkDefinition: Pick<PrismaClient['benchmarkDefinition'], 'create'>;
  }
): Promise<BenchmarkDefinition> {
  return prisma.benchmarkDefinition.create({
    data
  });
}

// POST
export async function upsertBenchmarkDefinition(
  input: UpsertBenchmarkDefinitionInput,
  prisma: PrismaClient = getPrismaClient()
): Promise<BenchmarkDefinition> {
  const data = buildDefinitionData(input);
  const activeDefinition = await prisma.benchmarkDefinition.findFirst({
    orderBy: {
      version: 'desc'
    },
    where: {
      benchmarkKey: data.benchmarkKey,
      isActive: true
    }
  });

  if (!activeDefinition) {
    return createDefinitionVersion(
      {
        ...data,
        version: 1
      },
      prisma
    );
  }

  if (activeDefinition.sourceFingerprint === data.sourceFingerprint) {
    return prisma.benchmarkDefinition.update({
      data: {
        benchmarkType: data.benchmarkType,
        capabilityTags: data.capabilityTags,
        challengeId: data.challengeId,
        definitionJson: data.definitionJson,
        familyKey: data.familyKey,
        isHoldout: data.isHoldout,
        isRegressionPack: data.isRegressionPack,
        lineageReason: data.lineageReason,
        scoringConfigJson: data.scoringConfigJson ?? Prisma.JsonNull,
        sourceIssueNumber: data.sourceIssueNumber,
        sourceMutationId: data.sourceMutationId,
        title: data.title
      },
      where: {
        id: activeDefinition.id
      }
    });
  }

  return prisma.$transaction(async (transaction) => {
    await transaction.benchmarkDefinition.update({
      data: {
        isActive: false
      },
      where: {
        id: activeDefinition.id
      }
    });

    return createDefinitionVersion(
      {
        ...data,
        lineageParentId: activeDefinition.id,
        lineageReason:
          data.lineageReason ??
          `Definition fingerprint changed from version ${String(activeDefinition.version)}.`,
        version: activeDefinition.version + 1
      },
      transaction
    );
  });
}

// POST
export async function updateBenchmarkDefinition(
  input: UpdateBenchmarkDefinitionInput,
  prisma: PrismaClient = getPrismaClient()
): Promise<BenchmarkDefinition> {
  const data: Prisma.BenchmarkDefinitionUncheckedUpdateInput = {};

  if (input.benchmarkKey !== undefined) {
    data.benchmarkKey = normalizeRequiredText(input.benchmarkKey, 'benchmarkKey');
  }

  if (input.benchmarkType !== undefined) {
    data.benchmarkType = input.benchmarkType;
  }

  if (input.capabilityTags !== undefined) {
    data.capabilityTags = normalizeCapabilityTags(input.capabilityTags);
  }

  if (input.challengeId !== undefined) {
    data.challengeId = normalizeOptionalText(input.challengeId) ?? null;
  }

  if (input.definitionJson !== undefined) {
    data.definitionJson = input.definitionJson;
  }

  if (input.familyKey !== undefined) {
    data.familyKey = normalizeOptionalText(input.familyKey) ?? null;
  }

  if (input.isActive !== undefined) {
    data.isActive = input.isActive;
  }

  if (input.isHoldout !== undefined) {
    data.isHoldout = input.isHoldout;
  }

  if (input.isRegressionPack !== undefined) {
    data.isRegressionPack = input.isRegressionPack;
  }

  if (input.lineageReason !== undefined) {
    data.lineageReason = normalizeOptionalText(input.lineageReason) ?? null;
  }

  if (input.scoringConfigJson !== undefined) {
    data.scoringConfigJson =
      input.scoringConfigJson === null
        ? Prisma.JsonNull
        : input.scoringConfigJson;
  }

  if (input.sourceFingerprint !== undefined) {
    data.sourceFingerprint = normalizeRequiredText(
      input.sourceFingerprint,
      'sourceFingerprint'
    );
  }

  if (input.sourceIssueNumber !== undefined) {
    data.sourceIssueNumber = normalizeIssueNumber(input.sourceIssueNumber) ?? null;
  }

  if (input.sourceMutationId !== undefined) {
    data.sourceMutationId = normalizeOptionalText(input.sourceMutationId) ?? null;
  }

  if (input.title !== undefined) {
    data.title = normalizeRequiredText(input.title, 'title');
  }

  if (Object.keys(data).length === 0) {
    throw new Error(
      'Benchmark definition update requires at least one mutable field.'
    );
  }

  return prisma.benchmarkDefinition.update({
    data,
    where: {
      id: normalizeRequiredText(input.id, 'id')
    }
  });
}

// GET
export async function getBenchmarkDefinitionById(
  id: string,
  prisma: PrismaClient = getPrismaClient()
): Promise<BenchmarkDefinition | null> {
  return prisma.benchmarkDefinition.findUnique({
    where: {
      id: normalizeRequiredText(id, 'id')
    }
  });
}

// GET
export async function getActiveBenchmarkDefinitionByKey(
  benchmarkKey: string,
  prisma: PrismaClient = getPrismaClient()
): Promise<BenchmarkDefinition | null> {
  return prisma.benchmarkDefinition.findFirst({
    orderBy: {
      version: 'desc'
    },
    where: {
      benchmarkKey: normalizeRequiredText(benchmarkKey, 'benchmarkKey'),
      isActive: true
    }
  });
}

// GET
export async function listBenchmarkDefinitions(
  options: ListBenchmarkDefinitionsOptions = {},
  prisma: PrismaClient = getPrismaClient()
): Promise<BenchmarkDefinition[]> {
  const limit = Math.max(1, Math.floor(options.limit ?? 100));

  return prisma.benchmarkDefinition.findMany({
    orderBy: [
      {
        benchmarkKey: 'asc'
      },
      {
        version: 'desc'
      }
    ],
    take: limit,
    where: {
      benchmarkKey:
        options.benchmarkKey === undefined
          ? undefined
          : normalizeRequiredText(options.benchmarkKey, 'benchmarkKey'),
      benchmarkType: options.benchmarkType,
      challengeId:
        options.challengeId === undefined
          ? undefined
          : normalizeRequiredText(options.challengeId, 'challengeId'),
      familyKey:
        options.familyKey === undefined
          ? undefined
          : normalizeRequiredText(options.familyKey, 'familyKey'),
      isActive: options.isActive,
      sourceIssueNumber: normalizeIssueNumber(options.sourceIssueNumber)
    }
  });
}
