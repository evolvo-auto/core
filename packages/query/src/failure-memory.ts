import { queryOptions } from '@tanstack/react-query';

import {
  failureMemoryDashboardSnapshotSchema,
  type FailureMemoryDashboardSnapshot
} from '@evolvo/schemas/failure-memory-schemas';

const defaultFailureMemoryEndpoint = '/api/failure-memory';

export const failureMemorySnapshotQueryKey = ['failure-memory-snapshot'] as const;

export type GetFailureMemorySnapshotOptions = {
  endpoint?: string;
  fetcher?: typeof fetch;
};

export async function getFailureMemorySnapshot(
  options: GetFailureMemorySnapshotOptions = {}
): Promise<FailureMemoryDashboardSnapshot> {
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(
    options.endpoint ?? defaultFailureMemoryEndpoint,
    {
      headers: {
        accept: 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failure memory snapshot request failed with status ${response.status}`
    );
  }

  return failureMemoryDashboardSnapshotSchema.parse(await response.json());
}

export function getFailureMemorySnapshotQueryOptions(
  options: GetFailureMemorySnapshotOptions = {}
) {
  return queryOptions({
    queryFn: () => getFailureMemorySnapshot(options),
    queryKey: failureMemorySnapshotQueryKey,
    refetchInterval: 30_000,
    staleTime: 15_000
  });
}
