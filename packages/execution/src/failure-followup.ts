import {
  upsertBenchmarkDefinition
} from '@evolvo/api/benchmark-definition';
import {
  createFailureRecord,
  listFailureRecords,
  updateFailureRecord
} from '@evolvo/api/failure-record';
import {
  getCapabilityRecordByKey,
  upsertCapabilityRecord
} from '@evolvo/api/capability-record';
import {
  listChallengeRecords,
  upsertChallengeRecord
} from '@evolvo/api/challenge-record';
import {
  createMutationProposal,
  listMutationProposals,
  updateMutationProposal
} from '@evolvo/api/mutation-proposal';
import {
  buildChallengeBenchmarkDefinitionInput
} from '@evolvo/benchmarks/registry';
import {
  buildGeneratedChallengeIssueDraft
} from '@evolvo/challenges/challenge-issue-draft';
import {
  normalizeChallenge
} from '@evolvo/challenges/normalize-challenge';
import { upsertIssueRecord } from '@evolvo/api/issue-record';
import { classifyIssue } from '@evolvo/github/issue-classification';
import { createRepositoryIssue } from '@evolvo/github/issues';
import {
  buildCapabilitySnapshot
} from '@evolvo/memory/capability-tracking';
import {
  classifyFailureTaxonomy,
  toPrismaFailureCategory,
  toPrismaFailurePhase
} from '@evolvo/memory/failure-taxonomy';
import {
  buildFailureRecurrenceGroup
} from '@evolvo/memory/recurrence-clustering';
import {
  buildFailureIssueDraft
} from '@evolvo/mutation-engine/failure-issue-draft';
import {
  buildFailureReflection
} from '@evolvo/mutation-engine/failure-reflection';
import {
  buildMutationIssueDraft
} from '@evolvo/mutation-engine/mutation-issue-draft';
import {
  generateMutationProposal
} from '@evolvo/mutation-engine/mutation-proposal-generator';
import { decideFailureHandlingStrategy } from '@evolvo/scoring/failure-strategy';
import type {
  CapabilitySnapshot
} from '@evolvo/memory/capability-tracking';
import type {
  CriticOutput,
  FailureReflection,
  PlannerOutput
} from '@evolvo/schemas/role-output-schemas';

export type ProcessFailureFollowupInput = {
  attemptId: string;
  capabilityKey: string;
  criticOutput: CriticOutput;
  issueNumber: number;
  observedFailures: string[];
  plannerOutput: PlannerOutput;
};

export type ProcessFailureFollowupResult = {
  capabilitySnapshot: CapabilitySnapshot;
  createdChallengeIssueNumber?: number;
  createdFailureIssueNumber?: number;
  createdMutationIssueNumber?: number;
  failureRecordId: string;
  followupErrors: string[];
  mutationProposalId?: string;
  reflection: FailureReflection;
  recurrenceCount: number;
  recurrenceGroup: string;
  strategy: ReturnType<typeof decideFailureHandlingStrategy>;
};

export type ProcessFailureFollowupDependencies = {
  buildChallengeDraft?: typeof buildGeneratedChallengeIssueDraft;
  createFailure?: typeof createFailureRecord;
  createIssue?: typeof createRepositoryIssue;
  createMutation?: typeof createMutationProposal;
  generateMutation?: typeof generateMutationProposal;
  getCapability?: typeof getCapabilityRecordByKey;
  listChallenges?: typeof listChallengeRecords;
  listFailures?: typeof listFailureRecords;
  listMutations?: typeof listMutationProposals;
  normalizeChallengeDefinition?: typeof normalizeChallenge;
  upsertBenchmark?: typeof upsertBenchmarkDefinition;
  upsertChallenge?: typeof upsertChallengeRecord;
  updateCapability?: typeof upsertCapabilityRecord;
  updateFailure?: typeof updateFailureRecord;
  updateMutation?: typeof updateMutationProposal;
  upsertIssue?: typeof upsertIssueRecord;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function toPrismaRiskLevel(
  riskLevel: PlannerOutput['riskLevel'],
  isSystemic: boolean
): 'HIGH' | 'LOW' | 'MEDIUM' | 'SYSTEMIC' {
  if (isSystemic) {
    return 'SYSTEMIC';
  }

  return riskLevel.toUpperCase() as 'HIGH' | 'LOW' | 'MEDIUM';
}

function toPrismaSurface(
  surface: PlannerOutput['relevantSurfaces'][number]
): 'BENCHMARKS' | 'DASHBOARD' | 'EVALUATOR' | 'EXTERNAL_REPO' | 'GITHUB_OPS' | 'MEMORY' | 'PROMPTS' | 'ROUTING' | 'RUNTIME' | 'SUPERVISOR' | 'TEMPLATES' | 'WORKTREES' {
  return surface.toUpperCase().replace(/-/g, '_') as
    | 'BENCHMARKS'
    | 'DASHBOARD'
    | 'EVALUATOR'
    | 'EXTERNAL_REPO'
    | 'GITHUB_OPS'
    | 'MEMORY'
    | 'PROMPTS'
    | 'ROUTING'
    | 'RUNTIME'
    | 'SUPERVISOR'
    | 'TEMPLATES'
    | 'WORKTREES';
}

function buildSymptom(
  criticOutput: CriticOutput,
  observedFailures: string[]
): string {
  const symptom =
    observedFailures[0]?.trim() ||
    criticOutput.primarySymptoms[0]?.trim() ||
    criticOutput.notes[0]?.trim() ||
    `${criticOutput.outcome} failure`;

  return symptom;
}

function buildFailureSummary(input: {
  criticOutput: CriticOutput;
  recurrenceCount: number;
  recurrenceGroup: string;
  symptom: string;
}): string {
  return [
    input.symptom,
    `Recurrence group: ${input.recurrenceGroup}`,
    `Recurrence count: ${String(input.recurrenceCount)}`,
    ...input.criticOutput.notes
  ]
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

function toPrismaChallengeCategory(
  category:
    | 'bug-fixing'
    | 'ci-setup'
    | 'feature-implementation'
    | 'fresh-repo-generation'
    | 'general'
    | 'model-routing-quality'
    | 'prompt-mutation-impact'
    | 'refactor'
    | 'runtime-upgrade-stability'
    | 'test-generation'
): 'BUG_FIXING' | 'CI_SETUP' | 'FEATURE_IMPLEMENTATION' | 'FRESH_REPO_GENERATION' | 'GENERAL' | 'MODEL_ROUTING_QUALITY' | 'PROMPT_MUTATION_IMPACT' | 'REFACTOR' | 'RUNTIME_UPGRADE_STABILITY' | 'TEST_GENERATION' {
  return category.toUpperCase().replace(/-/g, '_') as
    | 'BUG_FIXING'
    | 'CI_SETUP'
    | 'FEATURE_IMPLEMENTATION'
    | 'FRESH_REPO_GENERATION'
    | 'GENERAL'
    | 'MODEL_ROUTING_QUALITY'
    | 'PROMPT_MUTATION_IMPACT'
    | 'REFACTOR'
    | 'RUNTIME_UPGRADE_STABILITY'
    | 'TEST_GENERATION';
}

function shouldCreateChallenge(input: {
  capabilitySnapshot: CapabilitySnapshot;
  criticOutput: CriticOutput;
  recurrenceCount: number;
  strategy: ReturnType<typeof decideFailureHandlingStrategy>;
}): boolean {
  return (
    input.criticOutput.isSystemic ||
    input.strategy === 'mutation-first' ||
    input.recurrenceCount >= 3 ||
    input.capabilitySnapshot.confidenceScore < 45
  );
}

async function createAndCacheIssue(
  input: {
    body: string;
    labels: string[];
    title: string;
  },
  dependencies: {
    createIssue: typeof createRepositoryIssue;
    upsertIssue: typeof upsertIssueRecord;
  }
): Promise<number> {
  const issue = await dependencies.createIssue(input);
  const classification = classifyIssue(issue as never);

  await dependencies.upsertIssue({
    currentLabels: classification.currentLabels,
    githubIssueNumber: classification.githubIssueNumber,
    kind: classification.kind,
    priorityScore: classification.priorityScore,
    riskLevel: classification.riskLevel,
    source: classification.source,
    state: classification.state,
    title: classification.title
  });

  return issue.number;
}

export async function processFailureFollowup(
  input: ProcessFailureFollowupInput,
  dependencies: ProcessFailureFollowupDependencies = {}
): Promise<ProcessFailureFollowupResult> {
  const buildChallengeDraft =
    dependencies.buildChallengeDraft ?? buildGeneratedChallengeIssueDraft;
  const createFailure = dependencies.createFailure ?? createFailureRecord;
  const createIssue = dependencies.createIssue ?? createRepositoryIssue;
  const createMutation = dependencies.createMutation ?? createMutationProposal;
  const generateMutation =
    dependencies.generateMutation ?? generateMutationProposal;
  const getCapability = dependencies.getCapability ?? getCapabilityRecordByKey;
  const listChallenges = dependencies.listChallenges ?? listChallengeRecords;
  const listFailures = dependencies.listFailures ?? listFailureRecords;
  const listMutations = dependencies.listMutations ?? listMutationProposals;
  const normalizeChallengeDefinition =
    dependencies.normalizeChallengeDefinition ?? normalizeChallenge;
  const upsertBenchmark =
    dependencies.upsertBenchmark ?? upsertBenchmarkDefinition;
  const upsertChallenge = dependencies.upsertChallenge ?? upsertChallengeRecord;
  const updateCapability =
    dependencies.updateCapability ?? upsertCapabilityRecord;
  const updateFailure = dependencies.updateFailure ?? updateFailureRecord;
  const updateMutation =
    dependencies.updateMutation ?? updateMutationProposal;
  const upsertIssue = dependencies.upsertIssue ?? upsertIssueRecord;
  const taxonomy = classifyFailureTaxonomy({
    criticOutput: input.criticOutput,
    observedFailures: input.observedFailures
  });
  const symptom = buildSymptom(input.criticOutput, input.observedFailures);
  const recurrenceGroup = buildFailureRecurrenceGroup({
    capabilityKey: input.capabilityKey,
    category: taxonomy.category,
    likelyRootCauses: input.criticOutput.likelyRootCauses.map(
      (rootCause) => rootCause.cause
    ),
    phase: taxonomy.phase,
    symptom
  });
  const existingFailures = await listFailures({
    limit: 200,
    recurrenceGroup
  });
  const recurrenceCount = existingFailures.length + 1;
  const reflection = buildFailureReflection({
    attemptId: input.attemptId,
    criticOutput: input.criticOutput,
    issueNumber: input.issueNumber,
    recurrenceCount,
    recurrenceGroup,
    symptom
  });
  const failureRecord = await createFailure({
    attemptId: input.attemptId,
    category: toPrismaFailureCategory(taxonomy.category) as never,
    confirmedRootCause: null,
    isSystemic: input.criticOutput.isSystemic,
    issueNumber: input.issueNumber,
    phase: toPrismaFailurePhase(taxonomy.phase) as never,
    recurrenceCount,
    recurrenceGroup,
    reflectionJson: reflection,
    rootCauseHypotheses: input.criticOutput.likelyRootCauses,
    severity: toPrismaRiskLevel(
      input.plannerOutput.riskLevel,
      input.criticOutput.isSystemic
    ) as never,
    symptom
  });
  const existingCapability = await getCapability(input.capabilityKey);
  const capabilitySnapshot = buildCapabilitySnapshot({
    capabilityKey: input.capabilityKey,
    existing:
      existingCapability === null
        ? undefined
        : {
            attempts: existingCapability.attempts,
            capabilityKey: existingCapability.capabilityKey,
            confidenceScore: existingCapability.confidenceScore,
            failures: existingCapability.failures,
            lastIssueNumber: existingCapability.lastIssueNumber,
            recurringFailureModes:
              (existingCapability.recurringFailureModes as string[] | null) ?? [],
            successes: existingCapability.successes
          },
    issueNumber: input.issueNumber,
    outcome: input.criticOutput.outcome,
    recurrenceGroup
  });

  await updateCapability({
    attempts: capabilitySnapshot.attempts,
    capabilityKey: capabilitySnapshot.capabilityKey,
    confidenceScore: capabilitySnapshot.confidenceScore,
    failures: capabilitySnapshot.failures,
    lastIssueNumber: capabilitySnapshot.lastIssueNumber,
    recurringFailureModes: capabilitySnapshot.recurringFailureModes,
    successes: capabilitySnapshot.successes
  });

  const strategy = decideFailureHandlingStrategy({
    capabilityConfidenceScore: capabilitySnapshot.confidenceScore,
    directFixRecommended: input.criticOutput.directFixRecommended,
    isSystemic: input.criticOutput.isSystemic,
    mutationRecommended: input.criticOutput.mutationRecommended,
    recommendedNextAction: input.criticOutput.recommendedNextAction,
    recurrenceCount
  });
  const followupErrors: string[] = [];
  let createdChallengeIssueNumber: number | undefined;
  let createdFailureIssueNumber: number | undefined;
  let createdMutationIssueNumber: number | undefined;
  let mutationProposalId: string | undefined;
  const existingLinkedFailureIssue = existingFailures.find(
    (existingFailure) => existingFailure.linkedIssueNumber !== null
  );

  if (existingLinkedFailureIssue?.linkedIssueNumber) {
    createdFailureIssueNumber = existingLinkedFailureIssue.linkedIssueNumber;
  } else if (reflection.shouldCreateFailureIssue) {
    try {
      createdFailureIssueNumber = await createAndCacheIssue(
        buildFailureIssueDraft({
          capabilityKey: input.capabilityKey,
          category: taxonomy.category,
          reflection,
          recurrenceCount,
          severity: input.criticOutput.isSystemic
            ? 'systemic'
            : input.plannerOutput.riskLevel,
          sourceIssueNumber: input.issueNumber,
          surface: input.plannerOutput.relevantSurfaces[0] ?? 'memory'
        }),
        {
          createIssue,
          upsertIssue
        }
      );

      await updateFailure({
        id: failureRecord.id,
        linkedIssueNumber: createdFailureIssueNumber
      });
    } catch (error) {
      followupErrors.push(
        `Failure issue creation failed: ${toErrorMessage(error)}`
      );
    }
  }

  if (reflection.shouldCreateMutationIssue || strategy === 'mutation-first') {
    const existingMutation = (
      await listMutations({
        limit: 50,
        sourceIssueNumber: input.issueNumber
      })
    ).find((proposal) => !['REJECTED', 'REVERTED'].includes(proposal.state));

    if (existingMutation) {
      createdMutationIssueNumber = existingMutation.linkedIssueNumber ?? undefined;
      mutationProposalId = existingMutation.id;
    } else {
      try {
        const mutationProposal = await generateMutation({
          candidateSurfaces:
            input.plannerOutput.relevantSurfaces.length > 0
              ? input.plannerOutput.relevantSurfaces
              : ['memory'],
          failureSummary: buildFailureSummary({
            criticOutput: input.criticOutput,
            recurrenceCount,
            recurrenceGroup,
            symptom
          }),
          likelyRootCauses: input.criticOutput.likelyRootCauses.map(
            (rootCause) => rootCause.cause
          ),
          recurrenceHints: reflection.recurrenceHints,
          replayIssueNumbers: [input.issueNumber],
          sourceFailureIds: [failureRecord.id],
          sourceIssueNumber: input.issueNumber
        });
        const persistedMutationProposal = await createMutation({
          confidenceScore: mutationProposal.confidenceScore,
          implementationPlan: mutationProposal.proposedChangeSummary,
          predictedBenefit: mutationProposal.expectedBenefits.join('\n'),
          predictedRisk: mutationProposal.expectedRisks.join('\n'),
          priorityScore: mutationProposal.priorityScore,
          rationale: mutationProposal.rationale,
          rollbackConsiderations: mutationProposal.expectedRisks.join('\n'),
          sourceFailureIds: mutationProposal.sourceFailureIds,
          sourceIssueNumber: mutationProposal.sourceIssueNumber,
          state: 'PROPOSED',
          targetSurface: toPrismaSurface(mutationProposal.targetSurface) as never,
          title: mutationProposal.title,
          validationPlan: mutationProposal.validationPlan
        });

        mutationProposalId = persistedMutationProposal.id;
        createdMutationIssueNumber = await createAndCacheIssue(
          buildMutationIssueDraft(mutationProposal),
          {
            createIssue,
            upsertIssue
          }
        );

        await updateMutation({
          id: persistedMutationProposal.id,
          linkedIssueNumber: createdMutationIssueNumber
        });
      } catch (error) {
        followupErrors.push(
          `Mutation proposal generation failed: ${toErrorMessage(error)}`
        );
      }
    }
  }

  if (
    shouldCreateChallenge({
      capabilitySnapshot,
      criticOutput: input.criticOutput,
      recurrenceCount,
      strategy
    })
  ) {
    try {
      const challengeDraft = buildChallengeDraft({
        capabilityKey: input.capabilityKey,
        evidence: [
          `source-issue=#${String(input.issueNumber)}`,
          `recurrence-group=${recurrenceGroup}`,
          ...input.observedFailures.slice(0, 3)
        ],
        recurrenceCount,
        recurrenceGroup,
        sourceIssueNumber: input.issueNumber,
        weaknessSummary: buildFailureSummary({
          criticOutput: input.criticOutput,
          recurrenceCount,
          recurrenceGroup,
          symptom
        })
      });
      const existingChallenge = (
        await listChallenges({
          issueSource: 'EVOLVO',
          limit: 100
        })
      ).find(
        (challengeRecord) =>
          challengeRecord.sourceFingerprint === challengeDraft.dedupeFingerprint
      );

      if (existingChallenge) {
        createdChallengeIssueNumber = existingChallenge.sourceIssueNumber;
      } else {
        createdChallengeIssueNumber = await createAndCacheIssue(
          challengeDraft.issue,
          {
            createIssue,
            upsertIssue
          }
        );

        const normalizedChallenge = normalizeChallengeDefinition({
          body: challengeDraft.issue.body,
          labels: challengeDraft.issue.labels,
          source: 'evolvo',
          sourceIssueNumber: createdChallengeIssueNumber,
          title: challengeDraft.issue.title
        });
        const challengeRecord = await upsertChallenge({
          artifactExpectationsJson: normalizedChallenge.artifactExpectations,
          capabilityTags: normalizedChallenge.capabilityTags,
          category: toPrismaChallengeCategory(normalizedChallenge.category),
          constraintsJson: normalizedChallenge.constraints,
          intent: normalizedChallenge.intent,
          issueSource: 'EVOLVO',
          scoringNotesJson: normalizedChallenge.scoringNotes,
          sourceFingerprint: normalizedChallenge.sourceFingerprint,
          sourceIssueNumber: normalizedChallenge.sourceIssueNumber,
          successSignal: normalizedChallenge.successSignal,
          title: normalizedChallenge.title,
          validationStepsJson: normalizedChallenge.validationSteps
        });

        await upsertBenchmark(
          buildChallengeBenchmarkDefinitionInput(
            normalizedChallenge,
            challengeRecord.id
          )
        );
      }
    } catch (error) {
      followupErrors.push(
        `Challenge generation failed: ${toErrorMessage(error)}`
      );
    }
  }

  return {
    capabilitySnapshot,
    createdChallengeIssueNumber,
    createdFailureIssueNumber,
    createdMutationIssueNumber,
    failureRecordId: failureRecord.id,
    followupErrors,
    mutationProposalId,
    reflection,
    recurrenceCount,
    recurrenceGroup,
    strategy
  };
}
