import { describe, expect, it } from 'vitest';

import {
  classifyFailureTaxonomy,
  toPrismaFailureCategory,
  toPrismaFailurePhase
} from './failure-taxonomy.js';

describe('failure taxonomy', () => {
  it('classifies dependency and environment failures distinctly', () => {
    expect(
      classifyFailureTaxonomy({
        criticOutput: {
          completionAssessment: 'failed',
          isSystemic: false,
          notes: ['pnpm install failed because the lockfile was missing'],
          recommendedNextAction: 'patch-directly'
        },
        observedFailures: ['ERR_PNPM_OUTDATED_LOCKFILE']
      })
    ).toEqual(
      expect.objectContaining({
        category: 'dependency-configuration-issue',
        phase: 'environment'
      })
    );
  });

  it('classifies model and structured-output failures as runtime/model-quality issues', () => {
    expect(
      classifyFailureTaxonomy({
        criticOutput: {
          completionAssessment: 'failed',
          isSystemic: true,
          notes: ['Structured output schema validation failed repeatedly'],
          recommendedNextAction: 'open-mutation'
        },
        observedFailures: ['Model invocation schema validation failed']
      })
    ).toEqual(
      expect.objectContaining({
        category: 'model-quality-issue',
        phase: 'runtime'
      })
    );
  });

  it('converts taxonomy values into prisma enum strings', () => {
    expect(toPrismaFailureCategory('smoke-e2e-failure')).toBe('SMOKE_E2E_FAILURE');
    expect(toPrismaFailurePhase('evaluation')).toBe('EVALUATION');
  });
});
