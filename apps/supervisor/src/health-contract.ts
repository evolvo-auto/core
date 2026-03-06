import supervisorPackageJson from '../package.json' with { type: 'json' };

import {
  serviceHealthSchema,
  type ServiceHealth
} from '@evolvo/schemas/health-schemas';

export type BuildSupervisorHealthOptions = {
  now?: Date;
  startedAt?: Date;
};

export function buildSupervisorHealth(
  options: BuildSupervisorHealthOptions = {}
): ServiceHealth {
  const now = options.now ?? new Date();
  const startedAt = options.startedAt ?? now;

  return serviceHealthSchema.parse({
    checks: [
      {
        detail: 'Supervisor process is accepting HTTP requests.',
        name: 'http-listener',
        status: 'pass'
      },
      {
        detail:
          'Supervisor authority loop is available for future promotion checks.',
        name: 'supervision-loop',
        status: 'pass'
      }
    ],
    observedAt: now.toISOString(),
    service: 'supervisor',
    startedAt: startedAt.toISOString(),
    status: 'healthy',
    uptimeMs: Math.max(0, now.getTime() - startedAt.getTime()),
    version: supervisorPackageJson.version
  });
}
