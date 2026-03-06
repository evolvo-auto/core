import type { RuntimeLoopStatus } from '@evolvo/execution/runtime-loop';
import runtimePackageJson from '../package.json' with { type: 'json' };

import {
  serviceHealthSchema,
  type ServiceHealth
} from '@evolvo/schemas/health-schemas';

export type BuildRuntimeHealthOptions = {
  loopStatus?: RuntimeLoopStatus;
  now?: Date;
  startedAt?: Date;
};

export function buildRuntimeHealth(
  options: BuildRuntimeHealthOptions = {}
): ServiceHealth {
  const now = options.now ?? new Date();
  const startedAt = options.startedAt ?? now;
  const runtimeLoopCheck =
    options.loopStatus === undefined
      ? {
          detail: 'Runtime issue loop status is not attached.',
          name: 'issue-loop',
          status: 'warn' as const
        }
      : options.loopStatus.state === 'error'
        ? {
            detail:
              options.loopStatus.lastErrorMessage ??
              'Runtime issue loop is in an error state.',
            name: 'issue-loop',
            status: 'fail' as const
          }
        : {
            detail: `Runtime issue loop state: ${options.loopStatus.state}.`,
            name: 'issue-loop',
            status:
              options.loopStatus.consecutiveFailures > 0 ? ('warn' as const) : ('pass' as const)
          };
  const status =
    runtimeLoopCheck.status === 'fail' ||
    runtimeLoopCheck.status === 'warn'
      ? 'degraded'
      : 'healthy';

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
      },
      runtimeLoopCheck
    ],
    observedAt: now.toISOString(),
    service: 'runtime',
    startedAt: startedAt.toISOString(),
    status,
    uptimeMs: Math.max(0, now.getTime() - startedAt.getTime()),
    version: runtimePackageJson.version
  });
}
