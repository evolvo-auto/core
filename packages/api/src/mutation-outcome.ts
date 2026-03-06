'use server';

import { getPrismaClient } from './client.ts';
import {
  Prisma
} from './generated/prisma/client.ts';
import type {
  $Enums,
  MutationOutcome,
  PrismaClient
} from './generated/prisma/client.ts';

export type CreateMutationOutcomeInput = {
  adoptedAt?: Date | null;
  benchmarkDelta?: Prisma.InputJsonValue | null;
  candidateRuntimeVersionId?: string | null;
  mutationProposalId: string;
  notes?: string | null;
  outcome: $Enums.MutationOutcomeState;
};

export type UpdateMutationOutcomeInput = {
  adoptedAt?: Date | null;
  benchmarkDelta?: Prisma.InputJsonValue | null;
  candidateRuntimeVersionId?: string | null;
  id: string;
  notes?: string | null;
  outcome?: $Enums.MutationOutcomeState;
};

export type ListMutationOutcomesOptions = {
  candidateRuntimeVersionId?: string;
  limit?: number;
  mutationProposalId?: string;
  outcome?: $Enums.MutationOutcomeState;
};

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`Mutation outcome ${fieldName} is required.`);
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

// POST
export async function createMutationOutcome(
  input: CreateMutationOutcomeInput,
  prisma: PrismaClient = getPrismaClient()
): Promise<MutationOutcome> {
  return prisma.mutationOutcome.create({
    data: {
      adoptedAt: input.adoptedAt ?? null,
      benchmarkDelta: input.benchmarkDelta ?? undefined,
      candidateRuntimeVersionId:
        normalizeOptionalText(input.candidateRuntimeVersionId) ?? null,
      mutationProposalId: normalizeRequiredText(
        input.mutationProposalId,
        'mutationProposalId'
      ),
      notes: normalizeOptionalText(input.notes) ?? null,
      outcome: input.outcome
    }
  });
}

// POST
export async function updateMutationOutcome(
  input: UpdateMutationOutcomeInput,
  prisma: PrismaClient = getPrismaClient()
): Promise<MutationOutcome> {
  const data: Prisma.MutationOutcomeUncheckedUpdateInput = {};

  if (input.adoptedAt !== undefined) {
    data.adoptedAt = input.adoptedAt;
  }

  if (input.benchmarkDelta !== undefined) {
    data.benchmarkDelta =
      input.benchmarkDelta === null ? Prisma.JsonNull : input.benchmarkDelta;
  }

  if (input.candidateRuntimeVersionId !== undefined) {
    data.candidateRuntimeVersionId =
      normalizeOptionalText(input.candidateRuntimeVersionId) ?? null;
  }

  if (input.notes !== undefined) {
    data.notes = normalizeOptionalText(input.notes) ?? null;
  }

  if (input.outcome !== undefined) {
    data.outcome = input.outcome;
  }

  if (Object.keys(data).length === 0) {
    throw new Error('Mutation outcome update requires at least one mutable field.');
  }

  return prisma.mutationOutcome.update({
    data,
    where: {
      id: normalizeRequiredText(input.id, 'id')
    }
  });
}

// GET
export async function getMutationOutcomeById(
  id: string,
  prisma: PrismaClient = getPrismaClient()
): Promise<MutationOutcome | null> {
  return prisma.mutationOutcome.findUnique({
    where: {
      id: normalizeRequiredText(id, 'id')
    }
  });
}

// GET
export async function listMutationOutcomes(
  options: ListMutationOutcomesOptions = {},
  prisma: PrismaClient = getPrismaClient()
): Promise<MutationOutcome[]> {
  const limit = Math.max(1, Math.floor(options.limit ?? 100));

  return prisma.mutationOutcome.findMany({
    orderBy: {
      createdAt: 'desc'
    },
    take: limit,
    where: {
      candidateRuntimeVersionId:
        options.candidateRuntimeVersionId === undefined
          ? undefined
          : normalizeRequiredText(
              options.candidateRuntimeVersionId,
              'candidateRuntimeVersionId'
            ),
      mutationProposalId:
        options.mutationProposalId === undefined
          ? undefined
          : normalizeRequiredText(options.mutationProposalId, 'mutationProposalId'),
      outcome: options.outcome
    }
  });
}
