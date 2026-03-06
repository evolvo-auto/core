'use server';

import { getPrismaClient } from './client.ts';
import {
  Prisma
} from './generated/prisma/client.ts';
import type {
  CapabilityRecord,
  PrismaClient
} from './generated/prisma/client.ts';

export type UpsertCapabilityRecordInput = {
  attempts?: number;
  capabilityKey: string;
  confidenceScore?: number;
  failures?: number;
  lastIssueNumber?: number | null;
  recurringFailureModes?: Prisma.InputJsonValue | null;
  successes?: number;
};

export type UpdateCapabilityRecordInput = {
  attempts?: number;
  capabilityKey: string;
  confidenceScore?: number;
  failures?: number;
  lastIssueNumber?: number | null;
  recurringFailureModes?: Prisma.InputJsonValue | null;
  successes?: number;
};

export type ListCapabilityRecordsOptions = {
  capabilityKey?: string;
  limit?: number;
};

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`Capability record ${fieldName} is required.`);
  }

  return normalizedValue;
}

function normalizeOptionalIssueNumber(
  issueNumber: number | null | undefined
): number | null | undefined {
  if (issueNumber === null || issueNumber === undefined) {
    return issueNumber;
  }

  if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
    throw new Error('Capability record lastIssueNumber must be a positive integer.');
  }

  return issueNumber;
}

function normalizeScore(score: number | undefined): number | undefined {
  if (score === undefined) {
    return score;
  }

  if (!Number.isInteger(score) || score < 0 || score > 100) {
    throw new Error(
      'Capability record confidenceScore must be an integer between 0 and 100.'
    );
  }

  return score;
}

function normalizeCounter(
  value: number | undefined,
  fieldName: 'attempts' | 'failures' | 'successes'
): number | undefined {
  if (value === undefined) {
    return value;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Capability record ${fieldName} must be a non-negative integer.`);
  }

  return value;
}

function buildCapabilityData(
  input: UpsertCapabilityRecordInput | UpdateCapabilityRecordInput
): Prisma.CapabilityRecordCreateInput {
  return {
    attempts: normalizeCounter(input.attempts, 'attempts') ?? 0,
    capabilityKey: normalizeRequiredText(input.capabilityKey, 'capabilityKey'),
    confidenceScore: normalizeScore(input.confidenceScore) ?? 50,
    failures: normalizeCounter(input.failures, 'failures') ?? 0,
    lastIssueNumber: normalizeOptionalIssueNumber(input.lastIssueNumber) ?? null,
    recurringFailureModes: input.recurringFailureModes ?? undefined,
    successes: normalizeCounter(input.successes, 'successes') ?? 0
  };
}

// POST
export async function upsertCapabilityRecord(
  input: UpsertCapabilityRecordInput,
  prisma: PrismaClient = getPrismaClient()
): Promise<CapabilityRecord> {
  const data = buildCapabilityData(input);

  return prisma.capabilityRecord.upsert({
    create: data,
    update: {
      attempts: data.attempts,
      confidenceScore: data.confidenceScore,
      failures: data.failures,
      lastIssueNumber: data.lastIssueNumber,
      recurringFailureModes: data.recurringFailureModes,
      successes: data.successes
    },
    where: {
      capabilityKey: data.capabilityKey
    }
  });
}

// POST
export async function updateCapabilityRecord(
  input: UpdateCapabilityRecordInput,
  prisma: PrismaClient = getPrismaClient()
): Promise<CapabilityRecord> {
  const data: Prisma.CapabilityRecordUpdateInput = {};

  if (input.attempts !== undefined) {
    data.attempts = normalizeCounter(input.attempts, 'attempts');
  }

  if (input.confidenceScore !== undefined) {
    data.confidenceScore = normalizeScore(input.confidenceScore);
  }

  if (input.failures !== undefined) {
    data.failures = normalizeCounter(input.failures, 'failures');
  }

  if (input.lastIssueNumber !== undefined) {
    data.lastIssueNumber = normalizeOptionalIssueNumber(input.lastIssueNumber) ?? null;
  }

  if (input.recurringFailureModes !== undefined) {
    data.recurringFailureModes =
      input.recurringFailureModes === null
        ? Prisma.JsonNull
        : input.recurringFailureModes;
  }

  if (input.successes !== undefined) {
    data.successes = normalizeCounter(input.successes, 'successes');
  }

  if (Object.keys(data).length === 0) {
    throw new Error('Capability record update requires at least one mutable field.');
  }

  return prisma.capabilityRecord.update({
    data,
    where: {
      capabilityKey: normalizeRequiredText(input.capabilityKey, 'capabilityKey')
    }
  });
}

// GET
export async function getCapabilityRecordByKey(
  capabilityKey: string,
  prisma: PrismaClient = getPrismaClient()
): Promise<CapabilityRecord | null> {
  return prisma.capabilityRecord.findUnique({
    where: {
      capabilityKey: normalizeRequiredText(capabilityKey, 'capabilityKey')
    }
  });
}

// GET
export async function listCapabilityRecords(
  options: ListCapabilityRecordsOptions = {},
  prisma: PrismaClient = getPrismaClient()
): Promise<CapabilityRecord[]> {
  const limit = Math.max(1, Math.floor(options.limit ?? 100));

  return prisma.capabilityRecord.findMany({
    orderBy: [
      {
        confidenceScore: 'asc'
      },
      {
        capabilityKey: 'asc'
      }
    ],
    take: limit,
    where: {
      capabilityKey:
        options.capabilityKey === undefined
          ? undefined
          : normalizeRequiredText(options.capabilityKey, 'capabilityKey')
    }
  });
}
