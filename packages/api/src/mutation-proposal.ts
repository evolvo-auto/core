'use server';

import { getPrismaClient } from './client.ts';
import type {
  $Enums,
  MutationProposal,
  Prisma,
  PrismaClient
} from './generated/prisma/client.ts';

export type CreateMutationProposalInput = {
  confidenceScore?: number | null;
  implementationPlan?: string | null;
  linkedIssueNumber?: number | null;
  predictedBenefit?: string | null;
  predictedRisk?: string | null;
  priorityScore?: number | null;
  rationale: string;
  rollbackConsiderations?: string | null;
  sourceFailureIds?: string[];
  sourceIssueNumber?: number | null;
  state: $Enums.MutationState;
  targetSurface: $Enums.Surface;
  title: string;
  validationPlan: Prisma.InputJsonValue;
};

export type UpdateMutationProposalInput = {
  confidenceScore?: number | null;
  id: string;
  implementationPlan?: string | null;
  linkedIssueNumber?: number | null;
  predictedBenefit?: string | null;
  predictedRisk?: string | null;
  priorityScore?: number | null;
  rationale?: string;
  rollbackConsiderations?: string | null;
  state?: $Enums.MutationState;
  targetSurface?: $Enums.Surface;
  title?: string;
  validationPlan?: Prisma.InputJsonValue;
};

export type ListMutationProposalsOptions = {
  limit?: number;
  linkedIssueNumber?: number;
  sourceIssueNumber?: number;
  state?: $Enums.MutationState;
  targetSurface?: $Enums.Surface;
};

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`Mutation proposal ${fieldName} is required.`);
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
  issueNumber: number,
  fieldName: 'linkedIssueNumber' | 'sourceIssueNumber'
): number {
  if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
    throw new Error(`Mutation proposal ${fieldName} must be a positive integer.`);
  }

  return issueNumber;
}

function normalizeOptionalIssueNumber(
  issueNumber: number | null | undefined,
  fieldName: 'linkedIssueNumber' | 'sourceIssueNumber'
): number | null | undefined {
  if (issueNumber === null || issueNumber === undefined) {
    return issueNumber;
  }

  return normalizeIssueNumber(issueNumber, fieldName);
}

function normalizeOptionalScore(
  score: number | null | undefined,
  fieldName: 'confidenceScore' | 'priorityScore'
): number | null | undefined {
  if (score === null || score === undefined) {
    return score;
  }

  if (!Number.isInteger(score) || score < 0 || score > 100) {
    throw new Error(
      `Mutation proposal ${fieldName} must be an integer between 0 and 100.`
    );
  }

  return score;
}

function normalizeFailureIds(failureIds: string[] | undefined): string[] {
  if (!failureIds) {
    return [];
  }

  const normalizedFailureIds: string[] = [];
  const seenFailureIds = new Set<string>();

  for (const failureId of failureIds) {
    const normalizedFailureId = normalizeRequiredText(
      failureId,
      'sourceFailureIds'
    );

    if (seenFailureIds.has(normalizedFailureId)) {
      continue;
    }

    seenFailureIds.add(normalizedFailureId);
    normalizedFailureIds.push(normalizedFailureId);
  }

  return normalizedFailureIds;
}

// POST
export async function createMutationProposal(
  input: CreateMutationProposalInput,
  prisma: PrismaClient = getPrismaClient()
): Promise<MutationProposal> {
  const sourceFailureIds = normalizeFailureIds(input.sourceFailureIds);

  return prisma.mutationProposal.create({
    data: {
      confidenceScore:
        normalizeOptionalScore(input.confidenceScore, 'confidenceScore') ?? null,
      implementationPlan: normalizeOptionalText(input.implementationPlan) ?? null,
      linkedIssueNumber:
        normalizeOptionalIssueNumber(input.linkedIssueNumber, 'linkedIssueNumber') ??
        null,
      predictedBenefit: normalizeOptionalText(input.predictedBenefit) ?? null,
      predictedRisk: normalizeOptionalText(input.predictedRisk) ?? null,
      priorityScore:
        normalizeOptionalScore(input.priorityScore, 'priorityScore') ?? null,
      rationale: normalizeRequiredText(input.rationale, 'rationale'),
      rollbackConsiderations:
        normalizeOptionalText(input.rollbackConsiderations) ?? null,
      sourceFailures:
        sourceFailureIds.length === 0
          ? undefined
          : {
              create: sourceFailureIds.map((failureRecordId) => ({
                failureRecordId
              }))
            },
      sourceIssueNumber:
        normalizeOptionalIssueNumber(input.sourceIssueNumber, 'sourceIssueNumber') ??
        null,
      state: input.state,
      targetSurface: input.targetSurface,
      title: normalizeRequiredText(input.title, 'title'),
      validationPlan: input.validationPlan
    }
  });
}

// POST
export async function updateMutationProposal(
  input: UpdateMutationProposalInput,
  prisma: PrismaClient = getPrismaClient()
): Promise<MutationProposal> {
  const data: Prisma.MutationProposalUpdateInput = {};

  if (input.confidenceScore !== undefined) {
    data.confidenceScore =
      normalizeOptionalScore(input.confidenceScore, 'confidenceScore') ?? null;
  }

  if (input.implementationPlan !== undefined) {
    data.implementationPlan = normalizeOptionalText(input.implementationPlan) ?? null;
  }

  if (input.linkedIssueNumber !== undefined) {
    data.linkedIssueNumber =
      normalizeOptionalIssueNumber(input.linkedIssueNumber, 'linkedIssueNumber') ??
      null;
  }

  if (input.predictedBenefit !== undefined) {
    data.predictedBenefit = normalizeOptionalText(input.predictedBenefit) ?? null;
  }

  if (input.predictedRisk !== undefined) {
    data.predictedRisk = normalizeOptionalText(input.predictedRisk) ?? null;
  }

  if (input.priorityScore !== undefined) {
    data.priorityScore =
      normalizeOptionalScore(input.priorityScore, 'priorityScore') ?? null;
  }

  if (input.rationale !== undefined) {
    data.rationale = normalizeRequiredText(input.rationale, 'rationale');
  }

  if (input.rollbackConsiderations !== undefined) {
    data.rollbackConsiderations =
      normalizeOptionalText(input.rollbackConsiderations) ?? null;
  }

  if (input.state !== undefined) {
    data.state = input.state;
  }

  if (input.targetSurface !== undefined) {
    data.targetSurface = input.targetSurface;
  }

  if (input.title !== undefined) {
    data.title = normalizeRequiredText(input.title, 'title');
  }

  if (input.validationPlan !== undefined) {
    data.validationPlan = input.validationPlan;
  }

  if (Object.keys(data).length === 0) {
    throw new Error('Mutation proposal update requires at least one mutable field.');
  }

  return prisma.mutationProposal.update({
    data,
    where: {
      id: normalizeRequiredText(input.id, 'id')
    }
  });
}

// GET
export async function getMutationProposalById(
  id: string,
  prisma: PrismaClient = getPrismaClient()
): Promise<MutationProposal | null> {
  return prisma.mutationProposal.findUnique({
    where: {
      id: normalizeRequiredText(id, 'id')
    }
  });
}

// GET
export async function listMutationProposals(
  options: ListMutationProposalsOptions = {},
  prisma: PrismaClient = getPrismaClient()
): Promise<MutationProposal[]> {
  const limit = Math.max(1, Math.floor(options.limit ?? 100));

  return prisma.mutationProposal.findMany({
    orderBy: {
      createdAt: 'desc'
    },
    take: limit,
    where: {
      linkedIssueNumber:
        options.linkedIssueNumber === undefined
          ? undefined
          : normalizeIssueNumber(options.linkedIssueNumber, 'linkedIssueNumber'),
      sourceIssueNumber:
        options.sourceIssueNumber === undefined
          ? undefined
          : normalizeIssueNumber(options.sourceIssueNumber, 'sourceIssueNumber'),
      state: options.state,
      targetSurface: options.targetSurface
    }
  });
}
