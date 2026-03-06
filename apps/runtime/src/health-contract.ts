import runtimePackageJson from '../package.json' with { type: 'json' };

import {
  serviceHealthSchema,
  type ServiceHealth
} from '@evolvo/schemas/health-schemas';

export type BuildRuntimeHealthOptions = {
  now?: Date;
  startedAt?: Date;
};

export function buildRuntimeHealth(
  options: BuildRuntimeHealthOptions = {}
): ServiceHealth {
  const now = options.now ?? new Date();
  const startedAt = options.startedAt ?? now;

  return serviceHealthSchema.parse({
    checks: [
      {
        detail: 'Runtime process is accepting HTTP requests.',
        name: 'http-listener',
        status: 'pass'
      },
      {
        detail: 'Runtime process is online and able to report health.',
        name: 'process',
        status: 'pass'
      }
    ],
    observedAt: now.toISOString(),
    service: 'runtime',
    startedAt: startedAt.toISOString(),
    status: 'healthy',
    uptimeMs: Math.max(0, now.getTime() - startedAt.getTime()),
    version: runtimePackageJson.version
  });
}
