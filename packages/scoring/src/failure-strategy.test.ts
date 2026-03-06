import { describe, expect, it } from 'vitest';

import { decideFailureHandlingStrategy } from './failure-strategy.js';

describe('failure strategy', () => {
  it('prefers mutation-first for repeated systemic failures', () => {
    expect(
      decideFailureHandlingStrategy({
        capabilityConfidenceScore: 38,
        directFixRecommended: false,
        isSystemic: true,
        mutationRecommended: true,
        recommendedNextAction: 'open-mutation',
        recurrenceCount: 3
      })
    ).toBe('mutation-first');
  });

  it('keeps isolated local failures in the direct-fix path', () => {
    expect(
      decideFailureHandlingStrategy({
        directFixRecommended: true,
        isSystemic: false,
        mutationRecommended: false,
        recommendedNextAction: 'patch-directly',
        recurrenceCount: 1
      })
    ).toBe('direct-fix');
  });
});
