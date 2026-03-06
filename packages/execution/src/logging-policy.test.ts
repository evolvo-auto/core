import { describe, expect, it } from 'vitest';

import {
  parseRuntimeLogVerbosity,
  resolveExecutionLoggingConfig,
  shouldIncludeVerboseTerminalData,
  shouldPostIssueProgressComments,
  toTerminalLogLevel
} from './logging-policy.js';

describe('logging policy', () => {
  it('defaults to normal verbosity when the env value is absent', () => {
    expect(parseRuntimeLogVerbosity(undefined)).toBe('normal');
  });

  it('rejects unsupported verbosity values', () => {
    expect(() => parseRuntimeLogVerbosity('loud')).toThrow(
      /RUNTIME_LOG_VERBOSITY/
    );
  });

  it('resolves logging config defaults', () => {
    expect(resolveExecutionLoggingConfig(undefined)).toEqual({
      verbosity: 'normal'
    });
  });

  it('maps verbosity to terminal log levels and issue progress behavior', () => {
    expect(toTerminalLogLevel('quiet')).toBe('warn');
    expect(toTerminalLogLevel('normal')).toBe('info');
    expect(toTerminalLogLevel('verbose')).toBe('info');
    expect(toTerminalLogLevel('debug')).toBe('debug');

    expect(shouldPostIssueProgressComments('normal')).toBe(false);
    expect(shouldPostIssueProgressComments('verbose')).toBe(true);
    expect(shouldIncludeVerboseTerminalData('normal')).toBe(false);
    expect(shouldIncludeVerboseTerminalData('debug')).toBe(true);
  });
});
