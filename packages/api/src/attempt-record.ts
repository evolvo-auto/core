'use server';

import { getPrismaClient } from './client.js';
import type { $Enums, Attempt, PrismaClient } from './generated/prisma/client.js';

export type CreateAttemptRecordInput = {
  evaluationStatus?: $Enums.EvaluationStatus | null;
  issueNumber: number;
  runtimeVersionId?: string | null;
  summary?: string | null;
  worktreeId: string;
};

export type UpdateAttemptRecordInput = {
  endedAt?: Date | null;
  evaluationStatus?: $Enums.EvaluationStatus | null;
  id: string;
  outcome?: $Enums.AttemptOutcome | null;
  summary?: string | null;
};

export type ListAttemptRecordsOptions = {
  issueNumber?: number;
  limit?: number;
  worktreeId?: string;
};

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`Attempt record ${fieldName} is required.`);
  }

  return normalizedValue;
}

function normalizeIssueNumber(issueNumber: number): number {
  if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
    throw new Error('Attempt record issueNumber must be a positive integer.');
  }

  return issueNumber;
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
export async function createAttemptRecord(
  input: CreateAttemptRecordInput,
  prisma: PrismaClient = getPrismaClient()
): Promise<Attempt> {
  return prisma.attempt.create({
    data: {
      evaluationStatus: input.evaluationStatus ?? null,
      issueNumber: normalizeIssueNumber(input.issueNumber),
      runtimeVersionId: normalizeOptionalText(input.runtimeVersionId),
      summary: normalizeOptionalText(input.summary),
      worktreeId: normalizeRequiredText(input.worktreeId, 'worktreeId')
    }
  });
}

// POST
export async function updateAttemptRecord(
  input: UpdateAttemptRecordInput,
  prisma: PrismaClient = getPrismaClient()
): Promise<Attempt> {
  const data: {
    endedAt?: Date | null;
    evaluationStatus?: $Enums.EvaluationStatus | null;
    outcome?: $Enums.AttemptOutcome | null;
    summary?: string | null;
  } = {};

  if (input.endedAt !== undefined) {
    data.endedAt = input.endedAt;
  }

  if (input.evaluationStatus !== undefined) {
    data.evaluationStatus = input.evaluationStatus;
  }

  if (input.outcome !== undefined) {
    data.outcome = input.outcome;
  }

  if (input.summary !== undefined) {
    data.summary = normalizeOptionalText(input.summary) ?? null;
  }

  if (Object.keys(data).length === 0) {
    throw new Error('Attempt record update requires at least one mutable field.');
  }

  return prisma.attempt.update({
    data,
    where: {
      id: normalizeRequiredText(input.id, 'id')
    }
  });
}

// GET
export async function getAttemptRecordById(
  id: string,
  prisma: PrismaClient = getPrismaClient()
): Promise<Attempt | null> {
  return prisma.attempt.findUnique({
    where: {
      id: normalizeRequiredText(id, 'id')
    }
  });
}

// GET
export async function listAttemptRecords(
  options: ListAttemptRecordsOptions = {},
  prisma: PrismaClient = getPrismaClient()
): Promise<Attempt[]> {
  const limit = Math.max(1, Math.floor(options.limit ?? 100));

  return prisma.attempt.findMany({
    orderBy: {
      startedAt: 'desc'
    },
    take: limit,
    where: {
      issueNumber:
        options.issueNumber === undefined
          ? undefined
          : normalizeIssueNumber(options.issueNumber),
      worktreeId:
        options.worktreeId === undefined
          ? undefined
          : normalizeRequiredText(options.worktreeId, 'worktreeId')
    }
  });
}
