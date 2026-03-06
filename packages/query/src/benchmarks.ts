import { queryOptions } from '@tanstack/react-query';

import {
  benchmarkDashboardSnapshotSchema,
  type BenchmarkDashboardSnapshot
} from '@evolvo/schemas/benchmark-schemas';

const defaultBenchmarksEndpoint = '/api/benchmarks';

export const benchmarkSnapshotQueryKey = ['benchmark-snapshot'] as const;

export type GetBenchmarkSnapshotOptions = {
  endpoint?: string;
  fetcher?: typeof fetch;
};

export async function getBenchmarkSnapshot(
  options: GetBenchmarkSnapshotOptions = {}
): Promise<BenchmarkDashboardSnapshot> {
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(options.endpoint ?? defaultBenchmarksEndpoint, {
    headers: {
      accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(
      `Benchmark snapshot request failed with status ${response.status}`
    );
  }

  return benchmarkDashboardSnapshotSchema.parse(await response.json());
}

export function getBenchmarkSnapshotQueryOptions(
  options: GetBenchmarkSnapshotOptions = {}
) {
  return queryOptions({
    queryFn: () => getBenchmarkSnapshot(options),
    queryKey: benchmarkSnapshotQueryKey,
    refetchInterval: 30_000,
    staleTime: 15_000
  });
}
