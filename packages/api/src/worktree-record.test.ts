import { describe, expect, it, vi } from 'vitest';

import {
  findActiveWorktreeForIssue,
  listWorktreeRecords,
  reserveWorktreeRecord,
  updateWorktreeRecord
} from './worktree-record.js';
import type { PrismaClient } from './generated/prisma/client.js';

describe('worktree record DAL', () => {
  it('reserves a worktree record and applies a deterministic placeholder path when omitted', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue({
      id: 'wt_1'
    });
    const prisma = {
      worktreeRecord: {
        create,
        findFirst
      }
    } as unknown as PrismaClient;

    await reserveWorktreeRecord(
      {
        baseRef: ' main ',
        branchName: ' issue/142-improve-planner-routing ',
        issueNumber: 142
      },
      prisma
    );

    expect(findFirst).toHaveBeenCalledWith({
      orderBy: {
        createdAt: 'desc'
      },
      where: {
        issueNumber: 142,
        status: {
          in: ['RESERVED', 'CREATING', 'READY', 'HYDRATING', 'ACTIVE', 'AWAITING_EVAL']
        }
      }
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        baseRef: 'main',
        branchName: 'issue/142-improve-planner-routing',
        filesystemPath: '__reserved__/issue-142',
        issueNumber: 142,
        status: 'RESERVED'
      }
    });
  });

  it('rejects reservation when an active worktree already exists for the issue', async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: 'wt_active',
      status: 'ACTIVE'
    });
    const create = vi.fn();
    const prisma = {
      worktreeRecord: {
        create,
        findFirst
      }
    } as unknown as PrismaClient;

    await expect(
      reserveWorktreeRecord(
        {
          baseRef: 'main',
          branchName: 'issue/211-nextjs-challenge-bootstrap',
          issueNumber: 211
        },
        prisma
      )
    ).rejects.toThrow(
      'Active worktree already exists for issue "211" (worktreeId "wt_active", status "ACTIVE").'
    );

    expect(create).not.toHaveBeenCalled();
  });

  it('updates mutable worktree fields and status', async () => {
    const updatedAt = new Date('2026-03-06T12:00:00.000Z');
    const update = vi.fn().mockResolvedValue({
      id: 'wt_2'
    });
    const prisma = {
      worktreeRecord: {
        update
      }
    } as unknown as PrismaClient;

    await updateWorktreeRecord(
      {
        filesystemPath: ' /tmp/worktrees/issue/211-nextjs-challenge-bootstrap ',
        id: ' wt_2 ',
        lastCommandAt: updatedAt,
        status: 'READY'
      },
      prisma
    );

    expect(update).toHaveBeenCalledWith({
      data: {
        filesystemPath: '/tmp/worktrees/issue/211-nextjs-challenge-bootstrap',
        lastCommandAt: updatedAt,
        status: 'READY'
      },
      where: {
        id: 'wt_2'
      }
    });
  });

  it('lists worktree records with issue/status filtering and limit normalization', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'wt_3'
      }
    ]);
    const prisma = {
      worktreeRecord: {
        findMany
      }
    } as unknown as PrismaClient;

    await listWorktreeRecords(
      {
        issueNumber: 402,
        limit: 2.9,
        statuses: ['READY', 'ACTIVE']
      },
      prisma
    );

    expect(findMany).toHaveBeenCalledWith({
      orderBy: {
        createdAt: 'desc'
      },
      take: 2,
      where: {
        issueNumber: 402,
        status: {
          in: ['READY', 'ACTIVE']
        }
      }
    });
  });

  it('finds the newest active worktree for an issue', async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: 'wt_4'
    });
    const prisma = {
      worktreeRecord: {
        findFirst
      }
    } as unknown as PrismaClient;

    expect(await findActiveWorktreeForIssue(500, prisma)).toEqual({
      id: 'wt_4'
    });
  });
});
