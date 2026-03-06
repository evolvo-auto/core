import 'server-only';

import {
  platformHealthSnapshotSchema,
  serviceHealthSchema,
  type PlatformHealthSnapshot,
  type ServiceHealth,
  type ServiceName
} from '@evolvo/schemas/health-schemas';

import { loadDashboardEnv } from '../../env';

import { buildDashboardHealth } from './build-dashboard-health';

loadDashboardEnv();

type ProbeableServiceName = Extract<ServiceName, 'runtime' | 'supervisor'>;

export type BuildPlatformHealthSnapshotOptions = {
  fetcher?: typeof fetch;
  now?: Date;
  runtimeHealthUrl?: string | undefined;
  supervisorHealthUrl?: string | undefined;
};

function buildUnavailableServiceHealth(
  service: ProbeableServiceName,
  detail: string,
  options: {
    endpoint?: string;
    now: Date;
    responseTimeMs?: number;
  }
): ServiceHealth {
  return serviceHealthSchema.parse({
    checks: [
      {
        detail,
        name: 'http-probe',
        status: 'fail'
      }
    ],
    endpoint: options.endpoint,
    observedAt: options.now.toISOString(),
    responseTimeMs: options.responseTimeMs,
    service,
    startedAt: options.now.toISOString(),
    status: 'unavailable',
    uptimeMs: 0,
    version: '0.0.0'
  });
}

async function probeServiceHealth(
  service: ProbeableServiceName,
  endpoint: string | undefined,
  fetcher: typeof fetch,
  now: Date
): Promise<ServiceHealth> {
  if (!endpoint) {
    return buildUnavailableServiceHealth(
      service,
      `Set ${service.toUpperCase()}_HEALTH_URL to enable probing.`,
      { now }
    );
  }

  const startedAt = Date.now();

  try {
    const response = await fetcher(endpoint, {
      cache: 'no-store',
      headers: {
        accept: 'application/json'
      }
    });

    const responseTimeMs = Date.now() - startedAt;

    if (!response.ok) {
      return buildUnavailableServiceHealth(
        service,
        `${service} health endpoint responded with status ${response.status}.`,
        {
          endpoint,
          now,
          responseTimeMs
        }
      );
    }

    const payload = serviceHealthSchema.parse(await response.json());

    if (payload.service !== service) {
      return buildUnavailableServiceHealth(
        service,
        `${service} health endpoint returned the wrong service identity.`,
        {
          endpoint,
          now,
          responseTimeMs
        }
      );
    }

    return serviceHealthSchema.parse({
      ...payload,
      endpoint,
      responseTimeMs
    });
  } catch (error) {
    return buildUnavailableServiceHealth(
      service,
      error instanceof Error
        ? error.message
        : `${service} health probe failed unexpectedly.`,
      {
        endpoint,
        now,
        responseTimeMs: Date.now() - startedAt
      }
    );
  }
}

export async function buildPlatformHealthSnapshot(
  options: BuildPlatformHealthSnapshotOptions = {}
): Promise<PlatformHealthSnapshot> {
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? new Date();
  const runtimeHealthUrl =
    options.runtimeHealthUrl ?? process.env.RUNTIME_HEALTH_URL;
  const supervisorHealthUrl =
    options.supervisorHealthUrl ?? process.env.SUPERVISOR_HEALTH_URL;
  const services = await Promise.all([
    Promise.resolve(buildDashboardHealth({ now })),
    probeServiceHealth('runtime', runtimeHealthUrl, fetcher, now),
    probeServiceHealth('supervisor', supervisorHealthUrl, fetcher, now)
  ]);

  return platformHealthSnapshotSchema.parse({
    generatedAt: now.toISOString(),
    services
  });
}
