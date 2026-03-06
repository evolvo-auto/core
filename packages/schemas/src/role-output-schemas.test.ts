import { describe, expect, it } from 'vitest';

import {
  builderOutputSchema,
  criticOutputSchema,
  evaluatorOutputSchema,
  failureReflectionSchema,
  mutationProposalSchema,
  narratorOutputSchema,
  plannerOutputSchema,
  promotionDecisionSchema,
  selectorDecisionSchema
} from './role-output-schemas.js';

describe('role output schemas', () => {
  it('parses valid outputs for every documented role contract', () => {
    expect(
      plannerOutputSchema.parse({
        issueNumber: 6,
        kind: 'feature',
        title: 'Create schema package',
        objective: 'Publish the shared runtime schema contract.',
        constraints: ['Do not use barrel files.'],
        assumptions: ['The package is internal to the monorepo.'],
        acceptanceCriteria: ['Consumers can validate planner output.'],
        relevantSurfaces: ['runtime', 'memory'],
        capabilityTags: ['zod', 'contracts'],
        dependencies: [5],
        recommendedApproach: 'direct-execution',
        reasoningSummary:
          'The package is a direct follow-on from the Prisma work.',
        evaluationPlan: {
          requireInstall: true,
          requireTypecheck: true,
          requireLint: true,
          requireTests: true,
          requireBuild: true,
          requireRun: false,
          requireSmoke: false,
          extraChecks: ['Validate schema parse failures.']
        },
        riskLevel: 'medium',
        expectedValueScore: 88,
        confidenceScore: 91
      })
    ).toMatchObject({
      issueNumber: 6,
      recommendedApproach: 'direct-execution'
    });

    expect(
      selectorDecisionSchema.parse({
        decisionType: 'select-issue',
        targetIssueNumber: 6,
        reason: 'The shared contracts unblock multiple packages.',
        priorityScore: 90,
        urgencyScore: 72,
        strategicValueScore: 95,
        expectedLeverageScore: 92,
        riskPenaltyScore: 18,
        nextStep: 'Implement the package.'
      })
    ).toMatchObject({
      decisionType: 'select-issue',
      targetIssueNumber: 6
    });

    expect(
      builderOutputSchema.parse({
        issueNumber: 6,
        summary: 'Added the schema package and tests.',
        filesIntendedToChange: ['packages/schemas/src/role-output-schemas.ts'],
        filesActuallyChanged: ['packages/schemas/src/role-output-schemas.ts'],
        commandsSuggested: [
          {
            name: 'test',
            command: 'pnpm test',
            cwd: '/home/paddy/core',
            timeoutMs: 60000
          }
        ],
        implementationNotes: ['Shared enums are split from role schemas.'],
        possibleKnownRisks: ['Future schema drift if docs change.'],
        believesReadyForEvaluation: true
      })
    ).toMatchObject({
      issueNumber: 6,
      believesReadyForEvaluation: true
    });

    expect(
      criticOutputSchema.parse({
        issueNumber: 6,
        outcome: 'partial',
        completionAssessment: 'mostly-complete',
        primarySymptoms: ['One schema still needs tightening.'],
        likelyRootCauses: [
          { cause: 'Missing validation branch.', confidence: 72 }
        ],
        isSystemic: false,
        directFixRecommended: true,
        mutationRecommended: false,
        recommendedNextAction: 'patch-directly',
        notes: ['Add another schema test.']
      })
    ).toMatchObject({
      recommendedNextAction: 'patch-directly'
    });

    expect(
      evaluatorOutputSchema.parse({
        issueNumber: 6,
        outcome: 'success',
        checks: {
          install: 'passed',
          typecheck: 'passed',
          lint: 'passed',
          tests: 'passed',
          build: 'passed',
          run: 'skipped',
          smoke: 'skipped'
        },
        extraChecks: [
          {
            name: 'schema contract review',
            result: 'passed',
            notes: 'Matches the system document.'
          }
        ],
        regressionRisk: 'low',
        summary: 'All schema package checks passed.',
        shouldOpenPR: true,
        shouldMergeIfPRExists: false
      })
    ).toMatchObject({
      outcome: 'success',
      regressionRisk: 'low'
    });

    expect(
      failureReflectionSchema.parse({
        issueNumber: 6,
        attemptId: 'attempt_123',
        phase: 'evaluation',
        symptom: 'One schema did not parse as expected.',
        likelyRootCauses: [
          { cause: 'The field range was too loose.', confidence: 66 }
        ],
        recurrenceHints: ['Score fields tend to drift without shared helpers.'],
        localVsSystemic: 'local',
        immediateFollowups: [
          {
            type: 'fix',
            title: 'Tighten score validation',
            summary: 'Clamp the score to the documented range.'
          }
        ],
        shouldCreateFailureIssue: false,
        shouldCreateMutationIssue: false
      })
    ).toMatchObject({
      phase: 'evaluation'
    });

    expect(
      mutationProposalSchema.parse({
        id: 'mutation_123',
        sourceIssueNumber: 6,
        sourceFailureIds: ['failure_123'],
        targetSurface: 'runtime',
        title: 'Tighten planner validation',
        rationale: 'Planner outputs should reject empty acceptance criteria.',
        evidence: ['Issue replay showed inconsistent planner results.'],
        proposedChangeSummary: 'Add a refinement to the planner schema.',
        expectedBenefits: ['Fewer invalid plans reach execution.'],
        expectedRisks: ['Overconstraining future planner behavior.'],
        validationPlan: {
          benchmarkIds: ['planner-baseline'],
          replayIssueNumbers: [6, 7],
          requireShadowMode: false,
          minimumPassRateDelta: 5,
          maxAllowedRegressionCount: 0
        },
        promotionImpact: 'low',
        confidenceScore: 74,
        priorityScore: 61
      })
    ).toMatchObject({
      targetSurface: 'runtime'
    });

    expect(
      promotionDecisionSchema.parse({
        candidateRuntimeVersionId: 'runtime_123',
        decision: 'shadow-first',
        reason: 'The candidate is healthy but needs more evidence.',
        healthCheckPassed: true,
        benchmarkSummary: {
          totalBenchmarks: 12,
          passed: 11,
          failed: 0,
          regressed: 1
        },
        confidenceScore: 68,
        requiredNextAction: 'run-shadow'
      })
    ).toMatchObject({
      decision: 'shadow-first'
    });

    expect(
      narratorOutputSchema.parse({
        target: 'issue',
        targetNumber: 6,
        commentKind: 'progress',
        title: 'Schema package added',
        body: 'The shared schema package now validates the internal role contracts.'
      })
    ).toMatchObject({
      commentKind: 'progress'
    });
  });

  it('rejects planner outputs with empty acceptance criteria unless they reject the work item', () => {
    expect(() =>
      plannerOutputSchema.parse({
        issueNumber: 6,
        kind: 'feature',
        title: 'Create schema package',
        objective: 'Publish the shared runtime schema contract.',
        constraints: [],
        assumptions: [],
        acceptanceCriteria: [],
        relevantSurfaces: ['runtime'],
        capabilityTags: [],
        dependencies: [],
        recommendedApproach: 'direct-execution',
        reasoningSummary: 'The work should proceed immediately.',
        evaluationPlan: {
          requireInstall: true,
          requireTypecheck: true,
          requireLint: true,
          requireTests: true,
          requireBuild: true,
          requireRun: false,
          requireSmoke: false,
          extraChecks: []
        },
        riskLevel: 'low',
        expectedValueScore: 80,
        confidenceScore: 80
      })
    ).toThrowError(
      'acceptanceCriteria must contain at least one item unless recommendedApproach is reject'
    );
  });

  it('allows empty acceptance criteria when the planner recommends rejection', () => {
    expect(
      plannerOutputSchema.parse({
        issueNumber: 6,
        kind: 'idea',
        title: 'Reject vague issue',
        objective: 'Reject the under-specified request.',
        constraints: [],
        assumptions: [],
        acceptanceCriteria: [],
        relevantSurfaces: ['runtime'],
        capabilityTags: [],
        dependencies: [],
        recommendedApproach: 'reject',
        reasoningSummary: 'The issue is too vague to plan safely.',
        evaluationPlan: {
          requireInstall: false,
          requireTypecheck: false,
          requireLint: false,
          requireTests: false,
          requireBuild: false,
          requireRun: false,
          requireSmoke: false,
          extraChecks: []
        },
        riskLevel: 'low',
        expectedValueScore: 0,
        confidenceScore: 95
      })
    ).toMatchObject({
      recommendedApproach: 'reject'
    });
  });

  it('rejects score fields outside the documented range', () => {
    expect(() =>
      selectorDecisionSchema.parse({
        decisionType: 'select-issue',
        targetIssueNumber: 6,
        reason: 'The package should be built next.',
        priorityScore: 101,
        urgencyScore: 72,
        strategicValueScore: 95,
        expectedLeverageScore: 92,
        riskPenaltyScore: 18,
        nextStep: 'Implement the package.'
      })
    ).toThrow();
  });
});
