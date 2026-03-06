import { describe, expect, it } from 'vitest';

import { createLogger } from './logger.js';

describe('structured logger', () => {
  it('writes structured JSON lines for shortcut methods', () => {
    const entries: string[] = [];
    const logger = createLogger({
      source: 'runtime.main',
      sink: {
        write(entry) {
          entries.push(entry);
        }
      },
      correlationIds: {
        runtimeVersionId: 'runtime_123'
      },
      now: () => new Date('2026-03-06T10:35:00.000Z')
    });

    const event = logger.info({
      eventName: 'runtime.started',
      message: 'Runtime started successfully.',
      correlationIds: {
        issueNumber: 7
      },
      data: {
        branch: 'main'
      }
    });

    expect(event).toMatchObject({
      level: 'info',
      source: 'runtime.main',
      correlationIds: {
        issueNumber: 7,
        runtimeVersionId: 'runtime_123'
      }
    });
    expect(entries).toHaveLength(1);
    expect(JSON.parse(entries[0])).toMatchObject({
      level: 'info',
      source: 'runtime.main',
      eventName: 'runtime.started',
      message: 'Runtime started successfully.'
    });
  });

  it('supports child loggers with merged correlation context', () => {
    const entries: string[] = [];
    const logger = createLogger({
      source: 'runtime.main',
      sink: {
        write(entry) {
          entries.push(entry);
        }
      },
      correlationIds: {
        runtimeVersionId: 'runtime_123'
      },
      now: () => new Date('2026-03-06T10:36:00.000Z')
    });

    const childLogger = logger.child({
      source: 'runtime.worker',
      correlationIds: {
        issueNumber: 7,
        worktreeId: 'worktree_123'
      }
    });

    const event = childLogger.error({
      eventName: 'attempt.failed',
      message: 'Attempt failed during evaluation.',
      correlationIds: {
        attemptId: 'attempt_123'
      },
      error: new Error('Typecheck failed')
    });

    expect(event).toMatchObject({
      source: 'runtime.worker',
      correlationIds: {
        issueNumber: 7,
        attemptId: 'attempt_123',
        runtimeVersionId: 'runtime_123',
        worktreeId: 'worktree_123'
      },
      error: {
        message: 'Typecheck failed'
      }
    });
    expect(entries).toHaveLength(1);
  });

  it('allows full event logging with explicit source overrides', () => {
    const entries: string[] = [];
    const logger = createLogger({
      source: 'runtime.main',
      sink: {
        write(entry) {
          entries.push(entry);
        }
      },
      now: () => new Date('2026-03-06T10:37:00.000Z')
    });

    const event = logger.log({
      level: 'debug',
      source: 'runtime.selector',
      eventName: 'issue.selected',
      message: 'Issue selected for execution.',
      correlationIds: {
        issueNumber: 9
      }
    });

    expect(event).toMatchObject({
      level: 'debug',
      source: 'runtime.selector',
      correlationIds: {
        issueNumber: 9
      }
    });
    expect(entries).toHaveLength(1);
  });

  it('rejects blank logger sources', () => {
    expect(() =>
      createLogger({
        source: '   '
      })
    ).toThrowError('Logger source must be a non-empty string');
  });
});
