'use server';

import { getPrismaClient } from './client.js';
import type {
  $Enums,
  IssueRecord,
  PrismaClient
} from './generated/prisma/client.js';

export type UpsertIssueRecordInput = {
  currentLabels: string[];
  githubIssueNumber: number;
  kind: $Enums.IssueKind;
  lastSyncedAt?: Date;
  priorityScore?: number;
  riskLevel?: $Enums.RiskLevel;
  source: $Enums.IssueSource;
  state: $Enums.IssueWorkflowState;
  title: string;
};

export type UpsertIssueRecordsInput = {
  records: UpsertIssueRecordInput[];
};

function buildUpsertPayload(input: UpsertIssueRecordInput) {
  const lastSyncedAt = input.lastSyncedAt ?? new Date();

  return {
    create: {
      currentLabels: input.currentLabels,
      githubIssueNumber: input.githubIssueNumber,
      kind: input.kind,
      lastSyncedAt,
      priorityScore: input.priorityScore ?? null,
      riskLevel: input.riskLevel ?? null,
      source: input.source,
      state: input.state,
      title: input.title
    },
    update: {
      currentLabels: input.currentLabels,
      kind: input.kind,
      lastSyncedAt,
      priorityScore: input.priorityScore ?? null,
      riskLevel: input.riskLevel ?? null,
      source: input.source,
      state: input.state,
      title: input.title
    },
    where: {
      githubIssueNumber: input.githubIssueNumber
    }
  };
}

// POST
export async function upsertIssueRecord(
  input: UpsertIssueRecordInput,
  prisma: PrismaClient = getPrismaClient()
): Promise<IssueRecord> {
  return prisma.issueRecord.upsert(buildUpsertPayload(input));
}

// POST
export async function upsertIssueRecords(
  input: UpsertIssueRecordsInput,
  prisma: PrismaClient = getPrismaClient()
): Promise<number> {
  for (const record of input.records) {
    await upsertIssueRecord(record, prisma);
  }

  return input.records.length;
}

// GET
export async function listIssueRecords(
  prisma: PrismaClient = getPrismaClient()
): Promise<IssueRecord[]> {
  return prisma.issueRecord.findMany({
    orderBy: {
      githubIssueNumber: 'asc'
    }
  });
}
