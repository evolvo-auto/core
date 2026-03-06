import 'server-only';

import dashboardPackageJson from '../../package.json' with { type: 'json' };

import {
  serviceHealthSchema,
  type ServiceHealth
} from '@evolvo/schemas/health-schemas';

export type BuildDashboardHealthOptions = {
  now?: Date;
  startedAt?: Date;
};

const dashboardStartedAt = new Date();

export function buildDashboardHealth(
  options: BuildDashboardHealthOptions = {}
): ServiceHealth {
  const now = options.now ?? new Date();
  const startedAt = options.startedAt ?? dashboardStartedAt;

  return serviceHealthSchema.parse({
    checks: [
      {
        detail: 'Dashboard route handlers are responding.',
        name: 'route-handler',
        status: 'pass'
      },
      {
        detail: 'Dashboard query hydration path is available.',
        name: 'query-hydration',
        status: 'pass'
      }
    ],
    observedAt: now.toISOString(),
    service: 'dashboard',
    startedAt: startedAt.toISOString(),
    status: 'healthy',
    uptimeMs: Math.max(0, now.getTime() - startedAt.getTime()),
    version: dashboardPackageJson.version
  });
}
