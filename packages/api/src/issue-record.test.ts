import { describe, expect, it, vi } from 'vitest';

import {
  listIssueRecords,
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

  it('lists cached issues ordered by issue number', async () => {
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

    const issues = await listIssueRecords(prisma);

    expect(issues).toEqual([
      {
        githubIssueNumber: 1
      }
    ]);
    expect(findMany).toHaveBeenCalledWith({
      orderBy: {
        githubIssueNumber: 'asc'
      }
    });
  });
});
