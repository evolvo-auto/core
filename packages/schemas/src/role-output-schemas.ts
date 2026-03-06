import { z } from 'zod';

import {
  issueKindSchema,
  outcomeSchema,
  riskLevelSchema,
  surfaceSchema
} from './shared-enums.js';

const nonEmptyStringSchema = z.string().trim().min(1);
const scoreSchema = z.number().min(0).max(100);
const positiveIntegerSchema = z.number().int().positive();
const nonNegativeIntegerSchema = z.number().int().min(0);
const checkResultSchema = z.enum(['passed', 'failed', 'skipped']);

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function slugifyCommandPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function deriveCommandSuggestionName(command: string): string {
  const normalizedCommand = command.trim();

  if (!normalizedCommand) {
    return 'suggested-command';
  }

  const derivedParts = normalizedCommand
    .split(/\s+/)
    .slice(0, 2)
    .map(slugifyCommandPart)
    .filter((part) => part.length > 0);

  if (derivedParts.length === 0) {
    return 'suggested-command';
  }

  return derivedParts.join('-');
}

const rootCauseSchema = z.object({
  cause: nonEmptyStringSchema,
  confidence: scoreSchema
});

const commandSuggestionObjectSchema = z.object({
  name: nonEmptyStringSchema,
  command: nonEmptyStringSchema,
  cwd: nonEmptyStringSchema.optional(),
  timeoutMs: positiveIntegerSchema.optional()
});

export const commandSuggestionSchema = z.preprocess((value) => {
  if (!isRecord(value)) {
    return value;
  }

  const command =
    typeof value.command === 'string' ? value.command.trim() : '';
  const name = typeof value.name === 'string' ? value.name.trim() : '';

  if (!command || name) {
    return value;
  }

  return {
    ...value,
    name: deriveCommandSuggestionName(command)
  };
}, commandSuggestionObjectSchema);

export const plannerOutputSchema = z
  .object({
    issueNumber: positiveIntegerSchema,
    kind: issueKindSchema,
    title: nonEmptyStringSchema,
    objective: nonEmptyStringSchema,
    constraints: z.array(nonEmptyStringSchema),
    assumptions: z.array(nonEmptyStringSchema),
    acceptanceCriteria: z.array(nonEmptyStringSchema),
    relevantSurfaces: z.array(surfaceSchema),
    capabilityTags: z.array(nonEmptyStringSchema),
    dependencies: z.array(positiveIntegerSchema),
    recommendedApproach: z.enum([
      'direct-execution',
      'system-mutation-first',
      'experiment-first',
      'defer',
      'reject'
    ]),
    reasoningSummary: nonEmptyStringSchema,
    evaluationPlan: z.object({
      requireInstall: z.boolean(),
      requireTypecheck: z.boolean(),
      requireLint: z.boolean(),
      requireTests: z.boolean(),
      requireBuild: z.boolean(),
      requireRun: z.boolean(),
      requireSmoke: z.boolean(),
      extraChecks: z.array(nonEmptyStringSchema)
    }),
    riskLevel: riskLevelSchema,
    expectedValueScore: scoreSchema,
    confidenceScore: scoreSchema
  })
  .superRefine((value, context) => {
    if (
      value.recommendedApproach !== 'reject' &&
      value.acceptanceCriteria.length === 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'acceptanceCriteria must contain at least one item unless recommendedApproach is reject',
        path: ['acceptanceCriteria']
      });
    }
  });
export type PlannerOutput = z.infer<typeof plannerOutputSchema>;

export const selectorDecisionSchema = z.object({
  decisionType: z.enum([
    'select-issue',
    'defer-issue',
    'reject-issue',
    'select-mutation',
    'select-experiment',
    'promote-runtime',
    'reject-promotion'
  ]),
  targetIssueNumber: positiveIntegerSchema.optional(),
  targetMutationId: nonEmptyStringSchema.optional(),
  targetRuntimeVersionId: nonEmptyStringSchema.optional(),
  reason: nonEmptyStringSchema,
  priorityScore: scoreSchema,
  urgencyScore: scoreSchema,
  strategicValueScore: scoreSchema,
  expectedLeverageScore: scoreSchema,
  riskPenaltyScore: scoreSchema,
  nextStep: nonEmptyStringSchema
});
export type SelectorDecision = z.infer<typeof selectorDecisionSchema>;

export const builderOutputSchema = z.object({
  issueNumber: positiveIntegerSchema,
  summary: nonEmptyStringSchema,
  filesIntendedToChange: z.array(nonEmptyStringSchema),
  filesActuallyChanged: z.array(nonEmptyStringSchema),
  commandsSuggested: z.array(commandSuggestionSchema),
  implementationNotes: z.array(nonEmptyStringSchema),
  possibleKnownRisks: z.array(nonEmptyStringSchema),
  believesReadyForEvaluation: z.boolean()
});
export type BuilderOutput = z.infer<typeof builderOutputSchema>;

export const criticOutputSchema = z.object({
  issueNumber: positiveIntegerSchema,
  outcome: outcomeSchema,
  completionAssessment: z.enum([
    'complete',
    'mostly-complete',
    'partial',
    'failed'
  ]),
  primarySymptoms: z.array(nonEmptyStringSchema),
  likelyRootCauses: z.array(rootCauseSchema),
  isSystemic: z.boolean(),
  directFixRecommended: z.boolean(),
  mutationRecommended: z.boolean(),
  recommendedNextAction: z.enum([
    'retry',
    'patch-directly',
    'open-mutation',
    'open-failure',
    'defer',
    'stop'
  ]),
  notes: z.array(nonEmptyStringSchema)
});
export type CriticOutput = z.infer<typeof criticOutputSchema>;

export const evaluatorOutputSchema = z.object({
  issueNumber: positiveIntegerSchema,
  outcome: outcomeSchema,
  checks: z.object({
    install: checkResultSchema.optional(),
    typecheck: checkResultSchema.optional(),
    lint: checkResultSchema.optional(),
    tests: checkResultSchema.optional(),
    build: checkResultSchema.optional(),
    run: checkResultSchema.optional(),
    smoke: checkResultSchema.optional()
  }),
  extraChecks: z.array(
    z.object({
      name: nonEmptyStringSchema,
      result: checkResultSchema,
      notes: nonEmptyStringSchema.optional()
    })
  ),
  regressionRisk: z.enum(['none', 'low', 'medium', 'high']),
  summary: nonEmptyStringSchema,
  shouldOpenPR: z.boolean(),
  shouldMergeIfPRExists: z.boolean()
});
export type EvaluatorOutput = z.infer<typeof evaluatorOutputSchema>;

export const failureReflectionSchema = z.object({
  issueNumber: positiveIntegerSchema,
  attemptId: nonEmptyStringSchema,
  phase: z.enum([
    'planning',
    'implementation',
    'environment',
    'evaluation',
    'promotion',
    'runtime'
  ]),
  symptom: nonEmptyStringSchema,
  likelyRootCauses: z.array(rootCauseSchema),
  recurrenceHints: z.array(nonEmptyStringSchema),
  localVsSystemic: z.enum(['local', 'systemic', 'unclear']),
  immediateFollowups: z.array(
    z.object({
      type: z.enum([
        'retry',
        'fix',
        'mutation',
        'experiment',
        'approval-request'
      ]),
      title: nonEmptyStringSchema,
      summary: nonEmptyStringSchema
    })
  ),
  shouldCreateFailureIssue: z.boolean(),
  shouldCreateMutationIssue: z.boolean()
});
export type FailureReflection = z.infer<typeof failureReflectionSchema>;

export const mutationProposalSchema = z.object({
  id: nonEmptyStringSchema.optional(),
  sourceIssueNumber: positiveIntegerSchema,
  sourceFailureIds: z.array(nonEmptyStringSchema),
  targetSurface: surfaceSchema,
  title: nonEmptyStringSchema,
  rationale: nonEmptyStringSchema,
  evidence: z.array(nonEmptyStringSchema),
  proposedChangeSummary: nonEmptyStringSchema,
  expectedBenefits: z.array(nonEmptyStringSchema),
  expectedRisks: z.array(nonEmptyStringSchema),
  validationPlan: z.object({
    benchmarkIds: z.array(nonEmptyStringSchema),
    replayIssueNumbers: z.array(positiveIntegerSchema),
    requireShadowMode: z.boolean(),
    minimumPassRateDelta: scoreSchema.optional(),
    maxAllowedRegressionCount: nonNegativeIntegerSchema.optional()
  }),
  promotionImpact: z.enum(['none', 'low', 'medium', 'high']),
  confidenceScore: scoreSchema,
  priorityScore: scoreSchema
});
export type MutationProposal = z.infer<typeof mutationProposalSchema>;

export const promotionDecisionSchema = z.object({
  candidateRuntimeVersionId: nonEmptyStringSchema,
  decision: z.enum(['promote', 'reject', 'shadow-first', 'rollback']),
  reason: nonEmptyStringSchema,
  healthCheckPassed: z.boolean(),
  benchmarkSummary: z.object({
    totalBenchmarks: nonNegativeIntegerSchema,
    passed: nonNegativeIntegerSchema,
    failed: nonNegativeIntegerSchema,
    regressed: nonNegativeIntegerSchema
  }),
  confidenceScore: scoreSchema,
  requiredNextAction: z.enum([
    'activate-now',
    'run-shadow',
    'collect-more-evidence',
    'rollback-candidate'
  ])
});
export type PromotionDecision = z.infer<typeof promotionDecisionSchema>;

export const narratorOutputSchema = z.object({
  target: z.enum(['issue', 'pull-request']),
  targetNumber: positiveIntegerSchema,
  commentKind: z.enum([
    'work-started',
    'progress',
    'blocker',
    'evaluation-result',
    'mutation-rationale',
    'promotion-update',
    'defer',
    'reject'
  ]),
  title: nonEmptyStringSchema,
  body: nonEmptyStringSchema
});
export type NarratorOutput = z.infer<typeof narratorOutputSchema>;
