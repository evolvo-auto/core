'use server';

import { getPrismaClient } from './client.ts';
import {
  Prisma
} from './generated/prisma/client.ts';
import type {
  $Enums,
  FailureRecord,
  PrismaClient
} from './generated/prisma/client.ts';

export type CreateFailureRecordInput = {
  attemptId: string;
  category: $Enums.FailureCategory;
  confirmedRootCause?: string | null;
  isSystemic?: boolean;
  issueNumber: number;
  linkedIssueNumber?: number | null;
  phase: $Enums.FailurePhase;
  recurrenceCount?: number;
  recurrenceGroup?: string | null;
  reflectionJson?: Prisma.InputJsonValue | null;
  rootCauseHypotheses: Prisma.InputJsonValue;
  severity: $Enums.RiskLevel;
  symptom: string;
};

export type UpdateFailureRecordInput = {
  category?: $Enums.FailureCategory;
  confirmedRootCause?: string | null;
  id: string;
  isSystemic?: boolean;
  linkedIssueNumber?: number | null;
  phase?: $Enums.FailurePhase;
  recurrenceCount?: number;
  recurrenceGroup?: string | null;
  reflectionJson?: Prisma.InputJsonValue | null;
  rootCauseHypotheses?: Prisma.InputJsonValue;
  severity?: $Enums.RiskLevel;
  symptom?: string;
};

export type ListFailureRecordsOptions = {
  attemptId?: string;
  category?: $Enums.FailureCategory;
  isSystemic?: boolean;
  issueNumber?: number;
  limit?: number;
  linkedIssueNumber?: number;
  recurrenceGroup?: string;
};

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`Failure record ${fieldName} is required.`);
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
  fieldName: 'issueNumber' | 'linkedIssueNumber'
): number {
  if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
    throw new Error(`Failure record ${fieldName} must be a positive integer.`);
  }

  return issueNumber;
}

function normalizeOptionalIssueNumber(
  issueNumber: number | null | undefined,
  fieldName: 'linkedIssueNumber'
): number | null | undefined {
  if (issueNumber === null || issueNumber === undefined) {
    return issueNumber;
  }

  return normalizeIssueNumber(issueNumber, fieldName);
}

function normalizeRecurrenceCount(recurrenceCount: number): number {
  if (!Number.isInteger(recurrenceCount) || recurrenceCount <= 0) {
    throw new Error('Failure record recurrenceCount must be a positive integer.');
  }

  return recurrenceCount;
}

// POST
export async function createFailureRecord(
  input: CreateFailureRecordInput,
  prisma: PrismaClient = getPrismaClient()
): Promise<FailureRecord> {
  return prisma.failureRecord.create({
    data: {
      attemptId: normalizeRequiredText(input.attemptId, 'attemptId'),
      category: input.category,
      confirmedRootCause: normalizeOptionalText(input.confirmedRootCause) ?? null,
      isSystemic: input.isSystemic ?? false,
      issueNumber: normalizeIssueNumber(input.issueNumber, 'issueNumber'),
      linkedIssueNumber:
        normalizeOptionalIssueNumber(input.linkedIssueNumber, 'linkedIssueNumber') ??
        null,
      phase: input.phase,
      recurrenceCount:
        input.recurrenceCount === undefined
          ? 1
          : normalizeRecurrenceCount(input.recurrenceCount),
      recurrenceGroup: normalizeOptionalText(input.recurrenceGroup) ?? null,
      reflectionJson: input.reflectionJson ?? undefined,
      rootCauseHypotheses: input.rootCauseHypotheses,
      severity: input.severity,
      symptom: normalizeRequiredText(input.symptom, 'symptom')
    }
  });
}

// POST
export async function updateFailureRecord(
  input: UpdateFailureRecordInput,
  prisma: PrismaClient = getPrismaClient()
): Promise<FailureRecord> {
  const data: Prisma.FailureRecordUpdateInput = {};

  if (input.category !== undefined) {
    data.category = input.category;
  }

  if (input.confirmedRootCause !== undefined) {
    data.confirmedRootCause =
      normalizeOptionalText(input.confirmedRootCause) ?? null;
  }

  if (input.isSystemic !== undefined) {
    data.isSystemic = input.isSystemic;
  }

  if (input.linkedIssueNumber !== undefined) {
    data.linkedIssueNumber =
      normalizeOptionalIssueNumber(input.linkedIssueNumber, 'linkedIssueNumber') ??
      null;
  }

  if (input.phase !== undefined) {
    data.phase = input.phase;
  }

  if (input.recurrenceCount !== undefined) {
    data.recurrenceCount = normalizeRecurrenceCount(input.recurrenceCount);
  }

  if (input.recurrenceGroup !== undefined) {
    data.recurrenceGroup = normalizeOptionalText(input.recurrenceGroup) ?? null;
  }

  if (input.reflectionJson !== undefined) {
    data.reflectionJson =
      input.reflectionJson === null ? Prisma.JsonNull : input.reflectionJson;
  }

  if (input.rootCauseHypotheses !== undefined) {
    data.rootCauseHypotheses = input.rootCauseHypotheses;
  }

  if (input.severity !== undefined) {
    data.severity = input.severity;
  }

  if (input.symptom !== undefined) {
    data.symptom = normalizeRequiredText(input.symptom, 'symptom');
  }

  if (Object.keys(data).length === 0) {
    throw new Error('Failure record update requires at least one mutable field.');
  }

  return prisma.failureRecord.update({
    data,
    where: {
      id: normalizeRequiredText(input.id, 'id')
    }
  });
}

// GET
export async function getFailureRecordById(
  id: string,
  prisma: PrismaClient = getPrismaClient()
): Promise<FailureRecord | null> {
  return prisma.failureRecord.findUnique({
    where: {
      id: normalizeRequiredText(id, 'id')
    }
  });
}

// GET
export async function listFailureRecords(
  options: ListFailureRecordsOptions = {},
  prisma: PrismaClient = getPrismaClient()
): Promise<FailureRecord[]> {
  const limit = Math.max(1, Math.floor(options.limit ?? 100));

  return prisma.failureRecord.findMany({
    orderBy: {
      createdAt: 'desc'
    },
    take: limit,
    where: {
      attemptId:
        options.attemptId === undefined
          ? undefined
          : normalizeRequiredText(options.attemptId, 'attemptId'),
      category: options.category,
      isSystemic: options.isSystemic,
      issueNumber:
        options.issueNumber === undefined
          ? undefined
          : normalizeIssueNumber(options.issueNumber, 'issueNumber'),
      linkedIssueNumber:
        options.linkedIssueNumber === undefined
          ? undefined
          : normalizeIssueNumber(options.linkedIssueNumber, 'linkedIssueNumber'),
      recurrenceGroup:
        options.recurrenceGroup === undefined
          ? undefined
          : normalizeRequiredText(options.recurrenceGroup, 'recurrenceGroup')
    }
  });
}
