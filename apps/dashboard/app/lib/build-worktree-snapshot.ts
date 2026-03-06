import 'server-only';

import {
  listAttemptRecords,
  type ListAttemptRecordsOptions
} from '@evolvo/api/attempt-record';
import {
  listWorktreeRecords,
  type ListWorktreeRecordsOptions
} from '@evolvo/api/worktree-record';
import {
  worktreeDashboardSnapshotSchema,
  type WorktreeDashboardBucket,
  type WorktreeDashboardItem,
  type WorktreeDashboardSnapshot,
  type WorktreeStatus
} from '@evolvo/schemas/worktree-schemas';

import { loadDashboardEnv } from '../../env';

loadDashboardEnv();

const completedStatuses = new Set<WorktreeStatus>([
  'COMPLETED',
  'ARCHIVED',
  'CLEANED'
]);
const failedStatuses = new Set<WorktreeStatus>(['FAILED']);

export type BuildWorktreeSnapshotOptions = {
  listAttempts?: (
    options?: ListAttemptRecordsOptions
  ) => Promise<Awaited<ReturnType<typeof listAttemptRecords>>>;
  listWorktrees?: (
    options?: ListWorktreeRecordsOptions
  ) => Promise<Awaited<ReturnType<typeof listWorktreeRecords>>>;
  now?: Date;
};

function toDashboardBucket(status: WorktreeStatus): WorktreeDashboardBucket {
  if (failedStatuses.has(status)) {
    return 'failed';
  }

  if (completedStatuses.has(status)) {
    return 'completed';
  }

  return 'active';
}

function buildSummary(items: WorktreeDashboardItem[]): WorktreeDashboardSnapshot['summary'] {
  return {
    active: items.filter(({ bucket }) => bucket === 'active').length,
    completed: items.filter(({ bucket }) => bucket === 'completed').length,
    failed: items.filter(({ bucket }) => bucket === 'failed').length,
    total: items.length
  };
}

export async function buildWorktreeSnapshot(
  options: BuildWorktreeSnapshotOptions = {}
): Promise<WorktreeDashboardSnapshot> {
  const now = options.now ?? new Date();
  const listAttempts = options.listAttempts ?? listAttemptRecords;
  const listWorktrees = options.listWorktrees ?? listWorktreeRecords;
  const worktrees = await listWorktrees({
    limit: 50
  });
  const items = await Promise.all(
    worktrees.map(async (worktree) => {
      const attempts = await listAttempts({
        limit: 200,
        worktreeId: worktree.id
      });

      return {
        attemptCount: attempts.length,
        branchName: worktree.branchName,
        bucket: toDashboardBucket(worktree.status as WorktreeStatus),
        issueNumber: worktree.issueNumber,
        linkedPullRequestNumber: worktree.linkedPullRequestNumber ?? null,
        status: worktree.status as WorktreeStatus,
        updatedAt: worktree.updatedAt.toISOString(),
        worktreeId: worktree.id
      } satisfies WorktreeDashboardItem;
    })
  );

  return worktreeDashboardSnapshotSchema.parse({
    generatedAt: now.toISOString(),
    summary: buildSummary(items),
    worktrees: items
  });
}
