import { describe, expect, it, vi } from 'vitest';

import {
  createGitHubAuditEvent,
  createGitHubAuditEvents,
  listGitHubAuditEvents
} from './github-audit-event.js';
import type { PrismaClient } from './generated/prisma/client.js';

describe('github audit event DAL', () => {
  it('creates an audit event with normalized action and repository fields', async () => {
    const create = vi.fn().mockResolvedValue({
      id: 'evt_1'
    });
    const prisma = {
      gitHubAuditEvent: {
        create
      }
    } as unknown as PrismaClient;

    await createGitHubAuditEvent(
      {
        action: '  issue-state.transitioned  ',
        issueNumber: 104,
        metadataJson: {
          from: 'PLANNED',
          to: 'IN_PROGRESS'
        },
        repositoryName: '  core ',
        repositoryOwner: ' evolvo-auto '
      },
      prisma
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        action: 'issue-state.transitioned',
        issueNumber: 104,
        metadataJson: {
          from: 'PLANNED',
          to: 'IN_PROGRESS'
        },
        pullRequestNumber: undefined,
        repositoryName: 'core',
        repositoryOwner: 'evolvo-auto'
      }
    });
  });

  it('creates multiple audit events in sequence and returns processed count', async () => {
    const create = vi.fn().mockResolvedValue({});
    const prisma = {
      gitHubAuditEvent: {
        create
      }
    } as unknown as PrismaClient;

    const processedCount = await createGitHubAuditEvents(
      {
        events: [
          {
            action: 'issue-comment.created',
            issueNumber: 1,
            repositoryName: 'core',
            repositoryOwner: 'evolvo-auto'
          },
          {
            action: 'pull-request.created',
            pullRequestNumber: 10,
            repositoryName: 'core',
            repositoryOwner: 'evolvo-auto'
          }
        ]
      },
      prisma
    );

    expect(processedCount).toBe(2);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('lists audit events with descending order, filter mapping, and limit normalization', async () => {
    const events = [
      { id: 'evt_3' },
      { id: 'evt_2' }
    ];
    const findMany = vi.fn().mockResolvedValue(events);
    const prisma = {
      gitHubAuditEvent: {
        findMany
      }
    } as unknown as PrismaClient;

    expect(
      await listGitHubAuditEvents(
        {
          action: '  pull-request.updated ',
          issueNumber: 91,
          limit: 2.8,
          pullRequestNumber: 21,
          repositoryName: ' core ',
          repositoryOwner: ' evolvo-auto '
        },
        prisma
      )
    ).toBe(events);
    expect(findMany).toHaveBeenCalledWith({
      orderBy: {
        createdAt: 'desc'
      },
      take: 2,
      where: {
        action: 'pull-request.updated',
        issueNumber: 91,
        pullRequestNumber: 21,
        repositoryName: 'core',
        repositoryOwner: 'evolvo-auto'
      }
    });
  });

  it('rejects blank action values for create and list operations', async () => {
    const create = vi.fn();
    const findMany = vi.fn();
    const prisma = {
      gitHubAuditEvent: {
        create,
        findMany
      }
    } as unknown as PrismaClient;

    await expect(
      createGitHubAuditEvent(
        {
          action: '   ',
          repositoryName: 'core',
          repositoryOwner: 'evolvo-auto'
        },
        prisma
      )
    ).rejects.toThrow('GitHub audit event action is required.');
    await expect(
      createGitHubAuditEvent(
        {
          action: 'issue-comment.created',
          repositoryName: '   ',
          repositoryOwner: 'evolvo-auto'
        },
        prisma
      )
    ).rejects.toThrow('GitHub repository name is required.');
    await expect(
      createGitHubAuditEvent(
        {
          action: 'issue-comment.created',
          repositoryName: 'core',
          repositoryOwner: '   '
        },
        prisma
      )
    ).rejects.toThrow('GitHub repository owner is required.');
    await expect(
      listGitHubAuditEvents(
        {
          action: '  '
        },
        prisma
      )
    ).rejects.toThrow('GitHub audit event action is required.');
    expect(create).not.toHaveBeenCalled();
    expect(findMany).not.toHaveBeenCalled();
  });
});
