import { queryOptions } from '@tanstack/react-query';

import {
  worktreeDashboardSnapshotSchema,
  type WorktreeDashboardSnapshot
} from '@evolvo/schemas/worktree-schemas';

const defaultWorktreesEndpoint = '/api/worktrees';

export const worktreeSnapshotQueryKey = ['worktree-snapshot'] as const;

export type GetWorktreeSnapshotOptions = {
  endpoint?: string;
  fetcher?: typeof fetch;
};

export async function getWorktreeSnapshot(
  options: GetWorktreeSnapshotOptions = {}
): Promise<WorktreeDashboardSnapshot> {
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(options.endpoint ?? defaultWorktreesEndpoint, {
    headers: {
      accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Worktree snapshot request failed with status ${response.status}`);
  }

  return worktreeDashboardSnapshotSchema.parse(await response.json());
}

export function getWorktreeSnapshotQueryOptions(
  options: GetWorktreeSnapshotOptions = {}
) {
  return queryOptions({
    queryFn: () => getWorktreeSnapshot(options),
    queryKey: worktreeSnapshotQueryKey,
    refetchInterval: 30_000,
    staleTime: 15_000
  });
}
