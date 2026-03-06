'use server';

import { getPrismaClient } from './client.ts';
import type {
  $Enums,
  ModelInvocation,
  Prisma,
  PrismaClient
} from './generated/prisma/client.ts';

export type ModelProvider = 'openai' | 'ollama';

export type CreateModelInvocationInput = {
  attemptId?: string;
  costEstimate?: number | null;
  durationMs: number;
  fallbackUsed?: boolean;
  metadataJson?: Prisma.InputJsonValue;
  model: string;
  promptHash?: string;
  provider: ModelProvider;
  role: string;
  schemaValid?: boolean | null;
  success: boolean;
  taskKind: string;
};

export type CreateModelInvocationsInput = {
  invocations: CreateModelInvocationInput[];
};

export type ListModelInvocationsOptions = {
  attemptId?: string;
  limit?: number;
  provider?: ModelProvider;
  role?: string;
  success?: boolean;
  taskKind?: string;
};

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`Model invocation ${fieldName} is required.`);
  }

  return normalizedValue;
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return undefined;
  }

  return normalizedValue;
}

function normalizeDurationMs(durationMs: number): number {
  if (!Number.isInteger(durationMs) || durationMs < 0) {
    throw new Error(
      'Model invocation durationMs must be a non-negative integer.'
    );
  }

  return durationMs;
}

function normalizeCostEstimate(
  costEstimate: number | null | undefined
): number | null | undefined {
  if (costEstimate === undefined || costEstimate === null) {
    return costEstimate;
  }

  if (!Number.isFinite(costEstimate) || costEstimate < 0) {
    throw new Error('Model invocation costEstimate must be non-negative.');
  }

  return costEstimate;
}

function mapModelProvider(provider: ModelProvider): $Enums.ModelProvider {
  return provider === 'openai' ? 'OPENAI' : 'OLLAMA';
}

function buildFindManyWhereClause(options: ListModelInvocationsOptions) {
  return {
    attemptId: normalizeOptionalText(options.attemptId),
    provider: options.provider ? mapModelProvider(options.provider) : undefined,
    role: options.role ? normalizeRequiredText(options.role, 'role') : undefined,
    success: options.success,
    taskKind: options.taskKind
      ? normalizeRequiredText(options.taskKind, 'taskKind')
      : undefined
  };
}

// POST
export async function createModelInvocation(
  input: CreateModelInvocationInput,
  prisma: PrismaClient = getPrismaClient()
): Promise<ModelInvocation> {
  return prisma.modelInvocation.create({
    data: {
      attemptId: normalizeOptionalText(input.attemptId),
      costEstimate: normalizeCostEstimate(input.costEstimate),
      durationMs: normalizeDurationMs(input.durationMs),
      fallbackUsed: input.fallbackUsed ?? false,
      metadataJson: input.metadataJson ?? undefined,
      model: normalizeRequiredText(input.model, 'model'),
      promptHash: normalizeOptionalText(input.promptHash),
      provider: mapModelProvider(input.provider),
      role: normalizeRequiredText(input.role, 'role'),
      schemaValid: input.schemaValid ?? null,
      success: input.success,
      taskKind: normalizeRequiredText(input.taskKind, 'taskKind')
    }
  });
}

// POST
export async function createModelInvocations(
  input: CreateModelInvocationsInput,
  prisma: PrismaClient = getPrismaClient()
): Promise<number> {
  for (const invocation of input.invocations) {
    await createModelInvocation(invocation, prisma);
  }

  return input.invocations.length;
}

// GET
export async function listModelInvocations(
  options: ListModelInvocationsOptions = {},
  prisma: PrismaClient = getPrismaClient()
): Promise<ModelInvocation[]> {
  const limit = Math.max(1, Math.floor(options.limit ?? 100));

  return prisma.modelInvocation.findMany({
    orderBy: {
      createdAt: 'desc'
    },
    take: limit,
    where: buildFindManyWhereClause(options)
  });
}
