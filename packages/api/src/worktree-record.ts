'use server';

import { getPrismaClient } from './client.ts';
import type {
  $Enums,
  Prisma,
  PrismaClient,
  WorktreeRecord
} from './generated/prisma/client.ts';

const activeWorktreeStatuses = [
  'RESERVED',
  'CREATING',
  'READY',
  'HYDRATING',
  'ACTIVE',
  'AWAITING_EVAL'
] as const;

export type ReserveWorktreeRecordInput = {
  baseRef: string;
  branchName: string;
  filesystemPath?: string;
  issueNumber: number;
};

export type UpdateWorktreeRecordInput = {
  baseRef?: string;
  branchName?: string;
  cleanupEligibleAt?: Date | null;
  filesystemPath?: string;
  id: string;
  lastCommandAt?: Date | null;
  linkedPullRequestNumber?: number | null;
  status?: $Enums.WorktreeStatus;
};

export type ListWorktreeRecordsOptions = {
  issueNumber?: number;
  limit?: number;
  statuses?: $Enums.WorktreeStatus[];
};

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`Worktree record ${fieldName} is required.`);
  }

  return normalizedValue;
}

function normalizeIssueNumber(issueNumber: number): number {
  if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
    throw new Error('Worktree record issueNumber must be a positive integer.');
  }

  return issueNumber;
}

function normalizeOptionalFilesystemPath(
  filesystemPath: string | undefined,
  issueNumber: number
): string {
  const normalizedFilesystemPath = filesystemPath?.trim();

  if (normalizedFilesystemPath) {
    return normalizedFilesystemPath;
  }

  return `__reserved__/issue-${issueNumber}`;
}

function buildFindManyWhereClause(options: ListWorktreeRecordsOptions) {
  return {
    issueNumber:
      options.issueNumber === undefined
        ? undefined
        : normalizeIssueNumber(options.issueNumber),
    status:
      options.statuses && options.statuses.length > 0
        ? {
            in: options.statuses
          }
        : undefined
  };
}

// GET
export async function getWorktreeRecordById(
  id: string,
  prisma: PrismaClient = getPrismaClient()
): Promise<WorktreeRecord | null> {
  return prisma.worktreeRecord.findUnique({
    where: {
      id: normalizeRequiredText(id, 'id')
    }
  });
}

// GET
export async function findActiveWorktreeForIssue(
  issueNumber: number,
  prisma: PrismaClient = getPrismaClient()
): Promise<WorktreeRecord | null> {
  return prisma.worktreeRecord.findFirst({
    orderBy: {
      createdAt: 'desc'
    },
    where: {
      issueNumber: normalizeIssueNumber(issueNumber),
      status: {
        in: [...activeWorktreeStatuses]
      }
    }
  });
}

// POST
export async function reserveWorktreeRecord(
  input: ReserveWorktreeRecordInput,
  prisma: PrismaClient = getPrismaClient()
): Promise<WorktreeRecord> {
  const issueNumber = normalizeIssueNumber(input.issueNumber);
  const activeWorktree = await findActiveWorktreeForIssue(issueNumber, prisma);

  if (activeWorktree) {
    throw new Error(
      `Active worktree already exists for issue "${issueNumber}" (worktreeId "${activeWorktree.id}", status "${activeWorktree.status}").`
    );
  }

  return prisma.worktreeRecord.create({
    data: {
      baseRef: normalizeRequiredText(input.baseRef, 'baseRef'),
      branchName: normalizeRequiredText(input.branchName, 'branchName'),
      filesystemPath: normalizeOptionalFilesystemPath(
        input.filesystemPath,
        issueNumber
      ),
      issueNumber,
      status: 'RESERVED'
    }
  });
}

// POST
export async function updateWorktreeRecord(
  input: UpdateWorktreeRecordInput,
  prisma: PrismaClient = getPrismaClient()
): Promise<WorktreeRecord> {
  const normalizedId = normalizeRequiredText(input.id, 'id');
  const updateData: Prisma.WorktreeRecordUpdateInput = {};

  if (input.baseRef !== undefined) {
    updateData.baseRef = normalizeRequiredText(input.baseRef, 'baseRef');
  }

  if (input.branchName !== undefined) {
    updateData.branchName = normalizeRequiredText(input.branchName, 'branchName');
  }

  if (input.filesystemPath !== undefined) {
    updateData.filesystemPath = normalizeRequiredText(
      input.filesystemPath,
      'filesystemPath'
    );
  }

  if (input.status !== undefined) {
    updateData.status = input.status;
  }

  if (input.lastCommandAt !== undefined) {
    updateData.lastCommandAt = input.lastCommandAt;
  }

  if (input.cleanupEligibleAt !== undefined) {
    updateData.cleanupEligibleAt = input.cleanupEligibleAt;
  }

  if (input.linkedPullRequestNumber !== undefined) {
    updateData.linkedPullRequestNumber = input.linkedPullRequestNumber;
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error(
      'Worktree record update requires at least one mutable field.'
    );
  }

  return prisma.worktreeRecord.update({
    data: updateData,
    where: {
      id: normalizedId
    }
  });
}

// GET
export async function listWorktreeRecords(
  options: ListWorktreeRecordsOptions = {},
  prisma: PrismaClient = getPrismaClient()
): Promise<WorktreeRecord[]> {
  const limit = Math.max(1, Math.floor(options.limit ?? 100));

  return prisma.worktreeRecord.findMany({
    orderBy: {
      createdAt: 'desc'
    },
    take: limit,
    where: buildFindManyWhereClause(options)
  });
}
