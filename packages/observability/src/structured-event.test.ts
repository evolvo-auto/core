import { describe, expect, it } from 'vitest';

import {
  createStructuredEvent,
  normalizeStructuredEventError,
  serializeStructuredEvent
} from './structured-event.js';

describe('structured event helpers', () => {
  it('creates validated structured events with correlation ids', () => {
    const event = createStructuredEvent(
      {
        level: 'info',
        eventName: 'issue.selected',
        source: 'runtime.selector',
        message: 'Issue selected for execution.',
        correlationIds: {
          issueNumber: 7,
          attemptId: ' attempt_123 '
        },
        data: {
          state: 'selected'
        }
      },
      {
        now: () => new Date('2026-03-06T10:30:00.000Z')
      }
    );

    expect(event).toEqual({
      timestamp: '2026-03-06T10:30:00.000Z',
      level: 'info',
      eventName: 'issue.selected',
      source: 'runtime.selector',
      message: 'Issue selected for execution.',
      correlationIds: {
        issueNumber: 7,
        attemptId: 'attempt_123'
      },
      data: {
        state: 'selected'
      }
    });
  });

  it('normalizes error payloads from different sources', () => {
    expect(
      normalizeStructuredEventError(
        Object.assign(new Error('Database unavailable'), {
          code: 'ECONNREFUSED'
        })
      )
    ).toMatchObject({
      name: 'Error',
      message: 'Database unavailable',
      code: 'ECONNREFUSED'
    });

    expect(
      normalizeStructuredEventError({
        name: 'PgError',
        message: 'Connection lost',
        code: 500
      })
    ).toEqual({
      name: 'PgError',
      message: 'Connection lost',
      code: '500'
    });

    expect(normalizeStructuredEventError(' plain failure ')).toEqual({
      name: 'Error',
      message: 'plain failure'
    });

    const circularObject: { self?: unknown } = {};
    circularObject.self = circularObject;

    expect(normalizeStructuredEventError(circularObject)).toEqual({
      name: 'Error',
      message: '[unserializable error payload]'
    });
  });

  it('serializes validated structured events to JSON lines', () => {
    const serialized = serializeStructuredEvent({
      timestamp: '2026-03-06T10:30:00.000Z',
      level: 'warn',
      eventName: 'attempt.failed',
      source: 'runtime.builder',
      message: 'Attempt failed during evaluation.',
      correlationIds: {
        issueNumber: 7
      }
    });

    expect(JSON.parse(serialized)).toEqual({
      timestamp: '2026-03-06T10:30:00.000Z',
      level: 'warn',
      eventName: 'attempt.failed',
      source: 'runtime.builder',
      message: 'Attempt failed during evaluation.',
      correlationIds: {
        issueNumber: 7
      }
    });
  });

  it('rejects invalid structured event payloads', () => {
    expect(() =>
      createStructuredEvent({
        level: 'debug',
        eventName: 'issue.selected',
        source: 'runtime.selector',
        message: 'Invalid correlation ids.',
        correlationIds: {
          issueNumber: -1
        }
      })
    ).toThrowError('issueNumber must be a positive integer');
  });
});
