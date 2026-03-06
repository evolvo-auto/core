import { describe, expect, it } from 'vitest';

import {
  failureCategories,
  failureCategorySchema,
  failurePhaseSchema,
  failurePhases,
  issueKindSchema,
  issueKinds,
  mutationStateSchema,
  mutationStates,
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

    for (const failurePhase of failurePhases) {
      expect(failurePhaseSchema.parse(failurePhase)).toBe(failurePhase);
    }

    for (const failureCategory of failureCategories) {
      expect(failureCategorySchema.parse(failureCategory)).toBe(failureCategory);
    }

    for (const outcome of outcomes) {
      expect(outcomeSchema.parse(outcome)).toBe(outcome);
    }

    for (const surface of surfaces) {
      expect(surfaceSchema.parse(surface)).toBe(surface);
    }

    for (const mutationState of mutationStates) {
      expect(mutationStateSchema.parse(mutationState)).toBe(mutationState);
    }
  });

  it('rejects values outside the shared enum contract', () => {
    expect(() => riskLevelSchema.parse('critical')).toThrow();
    expect(() => issueKindSchema.parse('task')).toThrow();
    expect(() => failurePhaseSchema.parse('repair')).toThrow();
    expect(() => failureCategorySchema.parse('ci-flake')).toThrow();
    expect(() => mutationStateSchema.parse('queued')).toThrow();
    expect(() => outcomeSchema.parse('passed')).toThrow();
    expect(() => surfaceSchema.parse('database')).toThrow();
  });
});
