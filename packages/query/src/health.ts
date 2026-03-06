import { queryOptions } from '@tanstack/react-query';

import {
  platformHealthSnapshotSchema,
  type PlatformHealthSnapshot
} from '@evolvo/schemas/health-schemas';

const defaultPlatformHealthEndpoint = '/api/platform-health';

export const platformHealthQueryKey = ['platform-health'] as const;

export type GetPlatformHealthOptions = {
  endpoint?: string;
  fetcher?: typeof fetch;
};

export async function getPlatformHealth(
  options: GetPlatformHealthOptions = {}
): Promise<PlatformHealthSnapshot> {
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(
    options.endpoint ?? defaultPlatformHealthEndpoint,
    {
      headers: {
        accept: 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(
      `Platform health request failed with status ${response.status}`
    );
  }

  return platformHealthSnapshotSchema.parse(await response.json());
}

export function getPlatformHealthQueryOptions(
  options: GetPlatformHealthOptions = {}
) {
  return queryOptions({
    queryFn: () => getPlatformHealth(options),
    queryKey: platformHealthQueryKey,
    refetchInterval: 30_000,
    staleTime: 15_000
  });
}
