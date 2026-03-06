import { describe, expect, it, vi } from 'vitest';

import {
  getIssueRecordByGitHubIssueNumber,
  listIssueRecords,
  updateIssueRecord,
  upsertIssueRecord,
  upsertIssueRecords
} from './issue-record.js';
import type { PrismaClient } from './generated/prisma/client.js';

describe('issue record DAL', () => {
  it('upserts a single issue record with nullable fields normalized', async () => {
    const upsert = vi.fn().mockResolvedValue({
      githubIssueNumber: 11
    });
    const prisma = {
      issueRecord: {
        upsert
      }
    } as unknown as PrismaClient;

    await upsertIssueRecord(
      {
        currentLabels: ['state:triage', 'kind:idea'],
        githubIssueNumber: 11,
        kind: 'IDEA',
        source: 'HUMAN',
        state: 'TRIAGE',
        title: 'Seed issue'
      },
      prisma
    );

    expect(upsert).toHaveBeenCalledTimes(1);

    const payload = upsert.mock.calls[0][0];

    expect(payload.where).toEqual({
      githubIssueNumber: 11
    });
    expect(payload.create.currentLabels).toEqual(['state:triage', 'kind:idea']);
    expect(payload.create.priorityScore).toBeNull();
    expect(payload.create.riskLevel).toBeNull();
    expect(payload.update.priorityScore).toBeNull();
    expect(payload.update.riskLevel).toBeNull();
    expect(payload.create.lastSyncedAt).toBeInstanceOf(Date);
    expect(payload.update.lastSyncedAt).toBeInstanceOf(Date);
  });

  it('upserts records in sequence and returns the processed count', async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const prisma = {
      issueRecord: {
        upsert
      }
    } as unknown as PrismaClient;

    const processed = await upsertIssueRecords(
      {
        records: [
          {
            currentLabels: ['state:triage'],
            githubIssueNumber: 1,
            kind: 'IDEA',
            source: 'HUMAN',
            state: 'TRIAGE',
            title: 'One'
          },
          {
            currentLabels: ['state:planned'],
            githubIssueNumber: 2,
            kind: 'FEATURE',
            source: 'EVOLVO',
            state: 'PLANNED',
            title: 'Two'
          }
        ]
      },
      prisma
    );

    expect(processed).toBe(2);
    expect(upsert).toHaveBeenCalledTimes(2);
  });

  it('updates a cached issue record and rejects empty updates', async () => {
    const update = vi.fn().mockResolvedValue({
      githubIssueNumber: 22
    });
    const prisma = {
      issueRecord: {
        update
      }
    } as unknown as PrismaClient;

    await updateIssueRecord(
      {
        currentLabels: [' state:selected ', 'eval:pending', 'state:selected'],
        githubIssueNumber: 22,
        linkedBranch: ' issue/22-builder-loop ',
        linkedWorktreeId: ' wt_22 ',
        priorityScore: 88,
        state: 'IN_PROGRESS',
        title: ' Implement builder loop '
      },
      prisma
    );

    expect(update).toHaveBeenCalledWith({
      data: {
        currentLabels: ['state:selected', 'eval:pending'],
        linkedBranch: 'issue/22-builder-loop',
        linkedWorktreeId: 'wt_22',
        priorityScore: 88,
        state: 'IN_PROGRESS',
        title: 'Implement builder loop'
      },
      where: {
        githubIssueNumber: 22
      }
    });

    await expect(
      updateIssueRecord(
        {
          githubIssueNumber: 22
        },
        prisma
      )
    ).rejects.toThrow('Issue record update requires at least one mutable field.');
  });

  it('lists cached issues ordered by issue number with optional filters', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        githubIssueNumber: 1
      }
    ]);
    const prisma = {
      issueRecord: {
        findMany
      }
    } as unknown as PrismaClient;

    const issues = await listIssueRecords(
      {
        limit: 5.8,
        states: ['TRIAGE', 'PLANNED']
      },
      prisma
    );

    expect(issues).toEqual([
      {
        githubIssueNumber: 1
      }
    ]);
    expect(findMany).toHaveBeenCalledWith({
      orderBy: {
        githubIssueNumber: 'asc'
      },
      take: 5,
      where: {
        kind: undefined,
        source: undefined,
        state: {
          in: ['TRIAGE', 'PLANNED']
        }
      }
    });
  });

  it('fetches a single cached issue by GitHub issue number', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      githubIssueNumber: 30
    });
    const prisma = {
      issueRecord: {
        findUnique
      }
    } as unknown as PrismaClient;

    await expect(
      getIssueRecordByGitHubIssueNumber(30, prisma)
    ).resolves.toEqual({
      githubIssueNumber: 30
    });

    expect(findUnique).toHaveBeenCalledWith({
      where: {
        githubIssueNumber: 30
      }
    });
  });
});
