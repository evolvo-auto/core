'use server';

import { getPrismaClient } from './client.ts';
import type {
  GitHubAuditEvent,
  Prisma,
  PrismaClient
} from './generated/prisma/client.ts';

export type CreateGitHubAuditEventInput = {
  action: string;
  issueNumber?: number;
  metadataJson?: Prisma.InputJsonValue;
  pullRequestNumber?: number;
  repositoryName: string;
  repositoryOwner: string;
};

export type CreateGitHubAuditEventsInput = {
  events: CreateGitHubAuditEventInput[];
};

export type ListGitHubAuditEventsOptions = {
  action?: string;
  issueNumber?: number;
  limit?: number;
  pullRequestNumber?: number;
  repositoryName?: string;
  repositoryOwner?: string;
};

function normalizeActionName(action: string): string {
  const normalizedAction = action.trim();

  if (!normalizedAction) {
    throw new Error('GitHub audit event action is required.');
  }

  return normalizedAction;
}

function normalizeRepositoryField(
  fieldValue: string,
  fieldName: 'name' | 'owner'
): string {
  const normalizedFieldValue = fieldValue.trim();

  if (!normalizedFieldValue) {
    throw new Error(`GitHub repository ${fieldName} is required.`);
  }

  return normalizedFieldValue;
}

function buildFindManyWhereClause(options: ListGitHubAuditEventsOptions) {
  return {
    action: options.action ? normalizeActionName(options.action) : undefined,
    issueNumber: options.issueNumber,
    pullRequestNumber: options.pullRequestNumber,
    repositoryName: options.repositoryName?.trim() || undefined,
    repositoryOwner: options.repositoryOwner?.trim() || undefined
  };
}

// POST
export async function createGitHubAuditEvent(
  input: CreateGitHubAuditEventInput,
  prisma: PrismaClient = getPrismaClient()
): Promise<GitHubAuditEvent> {
  return prisma.gitHubAuditEvent.create({
    data: {
      action: normalizeActionName(input.action),
      issueNumber: input.issueNumber,
      metadataJson: input.metadataJson ?? undefined,
      pullRequestNumber: input.pullRequestNumber,
      repositoryName: normalizeRepositoryField(input.repositoryName, 'name'),
      repositoryOwner: normalizeRepositoryField(input.repositoryOwner, 'owner')
    }
  });
}

// POST
export async function createGitHubAuditEvents(
  input: CreateGitHubAuditEventsInput,
  prisma: PrismaClient = getPrismaClient()
): Promise<number> {
  for (const event of input.events) {
    await createGitHubAuditEvent(event, prisma);
  }

  return input.events.length;
}

// GET
export async function listGitHubAuditEvents(
  options: ListGitHubAuditEventsOptions = {},
  prisma: PrismaClient = getPrismaClient()
): Promise<GitHubAuditEvent[]> {
  const limit = Math.max(1, Math.floor(options.limit ?? 50));

  return prisma.gitHubAuditEvent.findMany({
    orderBy: {
      createdAt: 'desc'
    },
    take: limit,
    where: buildFindManyWhereClause(options)
  });
}
