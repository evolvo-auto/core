import { describe, expect, it } from 'vitest';

import {
  issueKindSchema,
  issueKinds,
  outcomeSchema,
  outcomes,
  riskLevelSchema,
  riskLevels,
  surfaceSchema,
  surfaces
} from './shared-enums.js';

describe('shared enum schemas', () => {
  it('accepts every documented enum value', () => {
    for (const riskLevel of riskLevels) {
      expect(riskLevelSchema.parse(riskLevel)).toBe(riskLevel);
    }

    for (const issueKind of issueKinds) {
      expect(issueKindSchema.parse(issueKind)).toBe(issueKind);
    }

    for (const outcome of outcomes) {
      expect(outcomeSchema.parse(outcome)).toBe(outcome);
    }

    for (const surface of surfaces) {
      expect(surfaceSchema.parse(surface)).toBe(surface);
    }
  });

  it('rejects values outside the shared enum contract', () => {
    expect(() => riskLevelSchema.parse('critical')).toThrow();
    expect(() => issueKindSchema.parse('task')).toThrow();
    expect(() => outcomeSchema.parse('passed')).toThrow();
    expect(() => surfaceSchema.parse('database')).toThrow();
  });
});
