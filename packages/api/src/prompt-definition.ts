'use server';

import { getPrismaClient } from './client.ts';
import {
  Prisma
} from './generated/prisma/client.ts';
import type {
  PromptDefinition,
  PrismaClient
} from './generated/prisma/client.ts';

export type UpsertPromptDefinitionInput = {
  lineageReason?: string | null;
  promptKey: string;
  responseMode: string;
  role: string;
  sampleInputJson: Prisma.InputJsonValue;
  sampleUserPrompt: string;
  sourceFingerprint: string;
  sourceMutationId?: string | null;
  systemPrompt: string;
  title: string;
};

export type UpdatePromptDefinitionInput = {
  id: string;
  isActive?: boolean;
  lineageReason?: string | null;
  promptKey?: string;
  responseMode?: string;
  role?: string;
  sampleInputJson?: Prisma.InputJsonValue;
  sampleUserPrompt?: string;
  sourceFingerprint?: string;
  sourceMutationId?: string | null;
  systemPrompt?: string;
  title?: string;
};

export type ListPromptDefinitionsOptions = {
  isActive?: boolean;
  limit?: number;
  promptKey?: string;
  role?: string;
  sourceMutationId?: string;
};

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`Prompt definition ${fieldName} is required.`);
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

function buildDefinitionData(
  input: UpsertPromptDefinitionInput
): Omit<Prisma.PromptDefinitionUncheckedCreateInput, 'version'> {
  return {
    isActive: true,
    lineageReason: normalizeOptionalText(input.lineageReason) ?? null,
    promptKey: normalizeRequiredText(input.promptKey, 'promptKey'),
    responseMode: normalizeRequiredText(input.responseMode, 'responseMode'),
    role: normalizeRequiredText(input.role, 'role'),
    sampleInputJson: input.sampleInputJson,
    sampleUserPrompt: normalizeRequiredText(
      input.sampleUserPrompt,
      'sampleUserPrompt'
    ),
    sourceFingerprint: normalizeRequiredText(
      input.sourceFingerprint,
      'sourceFingerprint'
    ),
    sourceMutationId: normalizeOptionalText(input.sourceMutationId) ?? null,
    systemPrompt: normalizeRequiredText(input.systemPrompt, 'systemPrompt'),
    title: normalizeRequiredText(input.title, 'title')
  };
}

async function createPromptDefinitionVersion(
  data: Omit<Prisma.PromptDefinitionUncheckedCreateInput, 'version'> & {
    lineageParentId?: string | null;
    version: number;
  },
  prisma: {
    promptDefinition: Pick<PrismaClient['promptDefinition'], 'create'>;
  }
): Promise<PromptDefinition> {
  return prisma.promptDefinition.create({
    data
  });
}

// POST
export async function upsertPromptDefinition(
  input: UpsertPromptDefinitionInput,
  prisma: PrismaClient = getPrismaClient()
): Promise<PromptDefinition> {
  const data = buildDefinitionData(input);
  const activeDefinition = await prisma.promptDefinition.findFirst({
    orderBy: {
      version: 'desc'
    },
    where: {
      isActive: true,
      promptKey: data.promptKey
    }
  });

  if (!activeDefinition) {
    return createPromptDefinitionVersion(
      {
        ...data,
        version: 1
      },
      prisma
    );
  }

  if (activeDefinition.sourceFingerprint === data.sourceFingerprint) {
    return prisma.promptDefinition.update({
      data: {
        lineageReason: data.lineageReason,
        responseMode: data.responseMode,
        role: data.role,
        sampleInputJson: data.sampleInputJson,
        sampleUserPrompt: data.sampleUserPrompt,
        sourceMutationId: data.sourceMutationId,
        systemPrompt: data.systemPrompt,
        title: data.title
      },
      where: {
        id: activeDefinition.id
      }
    });
  }

  return prisma.$transaction(async (transaction) => {
    await transaction.promptDefinition.update({
      data: {
        isActive: false
      },
      where: {
        id: activeDefinition.id
      }
    });

    return createPromptDefinitionVersion(
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
export async function updatePromptDefinition(
  input: UpdatePromptDefinitionInput,
  prisma: PrismaClient = getPrismaClient()
): Promise<PromptDefinition> {
  const data: Prisma.PromptDefinitionUncheckedUpdateInput = {};

  if (input.isActive !== undefined) {
    data.isActive = input.isActive;
  }

  if (input.lineageReason !== undefined) {
    data.lineageReason = normalizeOptionalText(input.lineageReason) ?? null;
  }

  if (input.promptKey !== undefined) {
    data.promptKey = normalizeRequiredText(input.promptKey, 'promptKey');
  }

  if (input.responseMode !== undefined) {
    data.responseMode = normalizeRequiredText(input.responseMode, 'responseMode');
  }

  if (input.role !== undefined) {
    data.role = normalizeRequiredText(input.role, 'role');
  }

  if (input.sampleInputJson !== undefined) {
    data.sampleInputJson = input.sampleInputJson;
  }

  if (input.sampleUserPrompt !== undefined) {
    data.sampleUserPrompt = normalizeRequiredText(
      input.sampleUserPrompt,
      'sampleUserPrompt'
    );
  }

  if (input.sourceFingerprint !== undefined) {
    data.sourceFingerprint = normalizeRequiredText(
      input.sourceFingerprint,
      'sourceFingerprint'
    );
  }

  if (input.sourceMutationId !== undefined) {
    data.sourceMutationId = normalizeOptionalText(input.sourceMutationId) ?? null;
  }

  if (input.systemPrompt !== undefined) {
    data.systemPrompt = normalizeRequiredText(input.systemPrompt, 'systemPrompt');
  }

  if (input.title !== undefined) {
    data.title = normalizeRequiredText(input.title, 'title');
  }

  if (Object.keys(data).length === 0) {
    throw new Error('Prompt definition update requires at least one mutable field.');
  }

  return prisma.promptDefinition.update({
    data,
    where: {
      id: normalizeRequiredText(input.id, 'id')
    }
  });
}

// GET
export async function listPromptDefinitions(
  options: ListPromptDefinitionsOptions = {},
  prisma: PrismaClient = getPrismaClient()
): Promise<PromptDefinition[]> {
  const limit = Math.max(1, Math.floor(options.limit ?? 100));

  return prisma.promptDefinition.findMany({
    orderBy: [
      {
        promptKey: 'asc'
      },
      {
        version: 'desc'
      }
    ],
    take: limit,
    where: {
      isActive: options.isActive,
      promptKey:
        options.promptKey === undefined
          ? undefined
          : normalizeRequiredText(options.promptKey, 'promptKey'),
      role:
        options.role === undefined
          ? undefined
          : normalizeRequiredText(options.role, 'role'),
      sourceMutationId:
        options.sourceMutationId === undefined
          ? undefined
          : normalizeRequiredText(options.sourceMutationId, 'sourceMutationId')
    }
  });
}
