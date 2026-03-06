import {
  parseRuntimeLogVerbosity,
  type RuntimeLogVerbosity
} from '@evolvo/execution/logging-policy';

export type RuntimeServerConfig = {
  host: string;
  port: number;
};

export type RuntimeWorkerConfig = {
  baseRef: string;
  gitRemote: string;
  loopIntervalMs: number;
  logVerbosity: RuntimeLogVerbosity;
  maxRepairAttempts: number;
  smokeBaseUrl?: string;
  smokeUsePlaywright: boolean;
  worktreesRoot?: string;
};

function parsePositiveInteger(
  value: string | undefined,
  fieldName: string,
  fallback: number
): number {
  if (!value?.trim()) {
    return fallback;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  return parsedValue;
}

function parseNonNegativeInteger(
  value: string | undefined,
  fieldName: string,
  fallback: number
): number {
  if (!value?.trim()) {
    return fallback;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }

  return parsedValue;
}

function parseBoolean(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

export function getRuntimeServerConfig(
  env: NodeJS.ProcessEnv = process.env
): RuntimeServerConfig {
  const portValue = env.RUNTIME_PORT?.trim();

  if (!portValue) {
    throw new Error('RUNTIME_PORT is required');
  }

  const port = Number(portValue);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('RUNTIME_PORT must be a positive integer');
  }

  return {
    host: env.RUNTIME_HOST?.trim() || '127.0.0.1',
    port
  };
}

export function getRuntimeWorkerConfig(
  env: NodeJS.ProcessEnv = process.env
): RuntimeWorkerConfig {
  return {
    baseRef: env.RUNTIME_BASE_REF?.trim() || 'main',
    gitRemote: env.RUNTIME_GIT_REMOTE?.trim() || 'origin',
    loopIntervalMs: parsePositiveInteger(
      env.RUNTIME_LOOP_INTERVAL_MS,
      'RUNTIME_LOOP_INTERVAL_MS',
      60_000
    ),
    logVerbosity: parseRuntimeLogVerbosity(env.RUNTIME_LOG_VERBOSITY),
    maxRepairAttempts: parseNonNegativeInteger(
      env.RUNTIME_MAX_REPAIR_ATTEMPTS,
      'RUNTIME_MAX_REPAIR_ATTEMPTS',
      2
    ),
    smokeBaseUrl: env.RUNTIME_SMOKE_BASE_URL?.trim() || undefined,
    smokeUsePlaywright: parseBoolean(env.RUNTIME_SMOKE_USE_PLAYWRIGHT),
    worktreesRoot: env.RUNTIME_WORKTREES_ROOT?.trim() || undefined
  };
}
