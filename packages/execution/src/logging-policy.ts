import type { LogLevel } from '@evolvo/observability/structured-event';

export const runtimeLogVerbosityValues = [
  'quiet',
  'normal',
  'verbose',
  'debug'
] as const;

export type RuntimeLogVerbosity = (typeof runtimeLogVerbosityValues)[number];

export type ExecutionLoggingConfig = {
  verbosity: RuntimeLogVerbosity;
};

const defaultExecutionLoggingConfig: ExecutionLoggingConfig = {
  verbosity: 'normal'
};

export function parseRuntimeLogVerbosity(
  value: string | undefined
): RuntimeLogVerbosity {
  const normalizedValue = value?.trim().toLowerCase();

  if (!normalizedValue) {
    return defaultExecutionLoggingConfig.verbosity;
  }

  if (
    runtimeLogVerbosityValues.includes(
      normalizedValue as RuntimeLogVerbosity
    )
  ) {
    return normalizedValue as RuntimeLogVerbosity;
  }

  throw new Error(
    `RUNTIME_LOG_VERBOSITY must be one of: ${runtimeLogVerbosityValues.join(', ')}`
  );
}

export function resolveExecutionLoggingConfig(
  config: Partial<ExecutionLoggingConfig> | undefined
): ExecutionLoggingConfig {
  return {
    ...defaultExecutionLoggingConfig,
    ...config
  };
}

export function shouldPostIssueProgressComments(
  verbosity: RuntimeLogVerbosity
): boolean {
  return verbosity === 'verbose' || verbosity === 'debug';
}

export function shouldIncludeVerboseTerminalData(
  verbosity: RuntimeLogVerbosity
): boolean {
  return verbosity === 'verbose' || verbosity === 'debug';
}

export function toTerminalLogLevel(
  verbosity: RuntimeLogVerbosity
): LogLevel {
  switch (verbosity) {
    case 'quiet':
      return 'warn';
    case 'debug':
      return 'debug';
    case 'normal':
    case 'verbose':
    default:
      return 'info';
  }
}
