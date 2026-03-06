import { describe, expect, it } from 'vitest';

import {
  mergeCorrelationContexts,
  normalizeCorrelationContext
} from './correlation-context.js';

describe('correlation context helpers', () => {
  it('normalizes and trims correlation ids', () => {
    expect(
      normalizeCorrelationContext({
        issueNumber: 7,
        attemptId: ' attempt_123 ',
        runtimeVersionId: ' runtime_123 ',
        worktreeId: ' worktree_123 '
      })
    ).toEqual({
      issueNumber: 7,
      attemptId: 'attempt_123',
      runtimeVersionId: 'runtime_123',
      worktreeId: 'worktree_123'
    });
  });

  it('rejects invalid issue and correlation ids', () => {
    expect(() =>
      normalizeCorrelationContext({
        issueNumber: 0
      })
    ).toThrowError('issueNumber must be a positive integer');

    expect(() =>
      normalizeCorrelationContext({
        attemptId: '   '
      })
    ).toThrowError('attemptId must be a non-empty string');
  });

  it('merges multiple contexts with later values taking precedence', () => {
    expect(
      mergeCorrelationContexts(
        {
          issueNumber: 7,
          attemptId: 'attempt_123'
        },
        undefined,
        {
          worktreeId: 'worktree_123'
        },
        {
          attemptId: 'attempt_456',
          runtimeVersionId: 'runtime_123'
        }
      )
    ).toEqual({
      issueNumber: 7,
      attemptId: 'attempt_456',
      runtimeVersionId: 'runtime_123',
      worktreeId: 'worktree_123'
    });
  });
});
