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
  createMutationProposal,
  listMutationProposals,
  updateMutationProposal
} from '@evolvo/api/mutation-proposal';
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
  createFailure?: typeof createFailureRecord;
  createIssue?: typeof createRepositoryIssue;
  createMutation?: typeof createMutationProposal;
  generateMutation?: typeof generateMutationProposal;
  getCapability?: typeof getCapabilityRecordByKey;
  listFailures?: typeof listFailureRecords;
  listMutations?: typeof listMutationProposals;
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
  const createFailure = dependencies.createFailure ?? createFailureRecord;
  const createIssue = dependencies.createIssue ?? createRepositoryIssue;
  const createMutation = dependencies.createMutation ?? createMutationProposal;
  const generateMutation =
    dependencies.generateMutation ?? generateMutationProposal;
  const getCapability = dependencies.getCapability ?? getCapabilityRecordByKey;
  const listFailures = dependencies.listFailures ?? listFailureRecords;
  const listMutations = dependencies.listMutations ?? listMutationProposals;
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

  return {
    capabilitySnapshot,
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
