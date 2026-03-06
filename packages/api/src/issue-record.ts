'use server';

import { getPrismaClient } from './client.ts';
import type {
  $Enums,
  IssueRecord,
  PrismaClient
} from './generated/prisma/client.ts';

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

export type UpdateIssueRecordInput = {
  currentLabels?: string[];
  githubIssueNumber: number;
  lastSyncedAt?: Date;
  linkedBranch?: string | null;
  linkedWorktreeId?: string | null;
  priorityScore?: number | null;
  riskLevel?: $Enums.RiskLevel | null;
  source?: $Enums.IssueSource;
  state?: $Enums.IssueWorkflowState;
  title?: string;
};

export type ListIssueRecordsOptions = {
  kind?: $Enums.IssueKind;
  limit?: number;
  source?: $Enums.IssueSource;
  state?: $Enums.IssueWorkflowState;
  states?: $Enums.IssueWorkflowState[];
};

function normalizeIssueNumber(issueNumber: number): number {
  if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
    throw new Error('Issue record githubIssueNumber must be a positive integer.');
  }

  return issueNumber;
}

function normalizeTitle(title: string): string {
  const normalizedTitle = title.trim();

  if (!normalizedTitle) {
    throw new Error('Issue record title is required.');
  }

  return normalizedTitle;
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

function normalizeLabelNames(labelNames: string[]): string[] {
  const normalizedLabelNames: string[] = [];
  const seenLabelNames = new Set<string>();

  for (const labelName of labelNames) {
    const normalizedLabelName = normalizeOptionalText(labelName)?.toLowerCase();

    if (!normalizedLabelName || seenLabelNames.has(normalizedLabelName)) {
      continue;
    }

    seenLabelNames.add(normalizedLabelName);
    normalizedLabelNames.push(normalizedLabelName);
  }

  return normalizedLabelNames;
}

function normalizeOptionalScore(
  score: number | null | undefined,
  fieldName: 'priorityScore'
): number | null | undefined {
  if (score === null || score === undefined) {
    return score;
  }

  if (!Number.isFinite(score) || score < 0) {
    throw new Error(`Issue record ${fieldName} must be a non-negative number.`);
  }

  return score;
}

function buildUpsertPayload(input: UpsertIssueRecordInput) {
  const lastSyncedAt = input.lastSyncedAt ?? new Date();

  return {
    create: {
      currentLabels: normalizeLabelNames(input.currentLabels),
      githubIssueNumber: normalizeIssueNumber(input.githubIssueNumber),
      kind: input.kind,
      lastSyncedAt,
      priorityScore: normalizeOptionalScore(input.priorityScore, 'priorityScore') ?? null,
      riskLevel: input.riskLevel ?? null,
      source: input.source,
      state: input.state,
      title: normalizeTitle(input.title)
    },
    update: {
      currentLabels: normalizeLabelNames(input.currentLabels),
      kind: input.kind,
      lastSyncedAt,
      priorityScore: normalizeOptionalScore(input.priorityScore, 'priorityScore') ?? null,
      riskLevel: input.riskLevel ?? null,
      source: input.source,
      state: input.state,
      title: normalizeTitle(input.title)
    },
    where: {
      githubIssueNumber: normalizeIssueNumber(input.githubIssueNumber)
    }
  };
}

function buildIssueRecordWhereClause(options: ListIssueRecordsOptions) {
  return {
    kind: options.kind,
    source: options.source,
    state:
      options.states && options.states.length > 0
        ? {
            in: options.states
          }
        : options.state
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
export async function getIssueRecordByGitHubIssueNumber(
  githubIssueNumber: number,
  prisma: PrismaClient = getPrismaClient()
): Promise<IssueRecord | null> {
  return prisma.issueRecord.findUnique({
    where: {
      githubIssueNumber: normalizeIssueNumber(githubIssueNumber)
    }
  });
}

// POST
export async function updateIssueRecord(
  input: UpdateIssueRecordInput,
  prisma: PrismaClient = getPrismaClient()
): Promise<IssueRecord> {
  const data: {
    currentLabels?: string[];
    lastSyncedAt?: Date;
    linkedBranch?: string | null;
    linkedWorktreeId?: string | null;
    priorityScore?: number | null;
    riskLevel?: $Enums.RiskLevel | null;
    source?: $Enums.IssueSource;
    state?: $Enums.IssueWorkflowState;
    title?: string;
  } = {};

  if (input.currentLabels !== undefined) {
    data.currentLabels = normalizeLabelNames(input.currentLabels);
  }

  if (input.lastSyncedAt !== undefined) {
    data.lastSyncedAt = input.lastSyncedAt;
  }

  if (input.linkedBranch !== undefined) {
    data.linkedBranch = normalizeOptionalText(input.linkedBranch) ?? null;
  }

  if (input.linkedWorktreeId !== undefined) {
    data.linkedWorktreeId = normalizeOptionalText(input.linkedWorktreeId) ?? null;
  }

  if (input.priorityScore !== undefined) {
    data.priorityScore =
      normalizeOptionalScore(input.priorityScore, 'priorityScore') ?? null;
  }

  if (input.riskLevel !== undefined) {
    data.riskLevel = input.riskLevel;
  }

  if (input.source !== undefined) {
    data.source = input.source;
  }

  if (input.state !== undefined) {
    data.state = input.state;
  }

  if (input.title !== undefined) {
    data.title = normalizeTitle(input.title);
  }

  if (Object.keys(data).length === 0) {
    throw new Error('Issue record update requires at least one mutable field.');
  }

  return prisma.issueRecord.update({
    data,
    where: {
      githubIssueNumber: normalizeIssueNumber(input.githubIssueNumber)
    }
  });
}

// GET
export async function listIssueRecords(
  options: ListIssueRecordsOptions | PrismaClient = {},
  prisma: PrismaClient = getPrismaClient()
): Promise<IssueRecord[]> {
  if ('issueRecord' in options) {
    return listIssueRecords({}, options);
  }

  const limit = Math.max(1, Math.floor(options.limit ?? 100));

  return prisma.issueRecord.findMany({
    orderBy: {
      githubIssueNumber: 'asc'
    },
    take: limit,
    where: buildIssueRecordWhereClause(options)
  });
}
