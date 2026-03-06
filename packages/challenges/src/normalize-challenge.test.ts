import { describe, expect, it } from 'vitest';

import { normalizeChallenge } from './normalize-challenge.js';

describe('normalizeChallenge', () => {
  it('extracts structured challenge sections from a human issue body', () => {
    const normalized = normalizeChallenge({
      body: `
## Goal

Improve the Next.js dashboard loading path.

## Constraints

- No inline styles
- Keep React Query SSR prefetching

## Success signal

Dashboard renders with fresh platform data.

## Validation steps

- pnpm lint
- pnpm test

## Scoring notes

- Prefer smaller surface area changes
      `,
      labels: ['kind:challenge', 'source:human', 'capability:nextjs'],
      source: 'human',
      sourceIssueNumber: 32,
      title: 'Improve dashboard loading'
    });

    expect(normalized).toEqual(
      expect.objectContaining({
        benchmarkType: 'human-challenge',
        capabilityTags: ['nextjs'],
        category: 'feature-implementation',
        constraints: ['No inline styles', 'Keep React Query SSR prefetching'],
        intent: 'Improve the Next.js dashboard loading path.',
        scoringNotes: ['Prefer smaller surface area changes'],
        successSignal: 'Dashboard renders with fresh platform data.',
        title: 'Improve dashboard loading',
        validationSteps: ['pnpm lint', 'pnpm test']
      })
    );
    expect(normalized.sourceFingerprint).toHaveLength(64);
  });

  it('infers capability tags and category when headings are sparse', () => {
    const normalized = normalizeChallenge({
      body: 'Stress the CI pipeline and benchmark holdout selection after a regression.',
      labels: ['kind:challenge', 'source:evolvo'],
      source: 'evolvo',
      sourceIssueNumber: 41,
      title: 'Challenge: Probe CI holdout quality'
    });

    expect(normalized.capabilityTags).toEqual(['ci', 'benchmark-design', 'debugging']);
    expect(normalized.category).toBe('ci-setup');
    expect(normalized.benchmarkType).toBe('evolvo-challenge');
    expect(normalized.intent).toBe(
      'Stress the CI pipeline and benchmark holdout selection after a regression.'
    );
  });
});
