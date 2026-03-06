import type { CapabilityKey } from '@evolvo/core/model-routing-config';
import {
  mutationProposalSchema,
  type MutationProposal
} from '@evolvo/schemas/role-output-schemas';

import {
  invokeRoutedStructuredRole,
  type InvokeRoutedStructuredRole
} from './role-runner.js';

export type MutatorRoleInput = {
  attemptId?: string;
  benchmarkIds?: string[];
  candidateSurfaces?: MutationProposal['targetSurface'][];
  capability?: CapabilityKey;
  failureSummary: string;
  likelyRootCauses?: string[];
  recurrenceHints?: string[];
  replayIssueNumbers?: number[];
  sourceFailureIds: string[];
  sourceIssueNumber: number;
};

function buildMutatorSystemPrompt(): string {
  return [
    'You are the mutator role for Evolvo.',
    'Propose a single structured mutation for systemic improvement.',
    'Return only valid JSON matching MutationProposal.',
    'Use evidence from failures and recurrence hints.',
    'Confidence and priority scores must be in the 0-100 range.'
  ].join('\n');
}

function buildMutatorUserPrompt(input: MutatorRoleInput): string {
  return [
    'Generate one MutationProposal.',
    '',
    'Mutation context (JSON):',
    JSON.stringify(
      {
        benchmarkIds: input.benchmarkIds ?? [],
        candidateSurfaces: input.candidateSurfaces ?? [],
        failureSummary: input.failureSummary,
        likelyRootCauses: input.likelyRootCauses ?? [],
        recurrenceHints: input.recurrenceHints ?? [],
        replayIssueNumbers: input.replayIssueNumbers ?? [],
        sourceFailureIds: input.sourceFailureIds,
        sourceIssueNumber: input.sourceIssueNumber
      },
      null,
      2
    ),
    '',
    'Hard constraints:',
    '1. sourceIssueNumber must match the provided sourceIssueNumber exactly.',
    '2. sourceFailureIds should be grounded in provided failure IDs.',
    '3. targetSurface should be one of candidateSurfaces when candidateSurfaces are provided.'
  ].join('\n');
}

function validateMutatorOutput(
  output: MutationProposal,
  input: MutatorRoleInput
): void {
  if (output.sourceIssueNumber !== input.sourceIssueNumber) {
    throw new Error(
      `Mutator output sourceIssueNumber "${output.sourceIssueNumber}" did not match input sourceIssueNumber "${input.sourceIssueNumber}".`
    );
  }

  if (input.sourceFailureIds.length > 0) {
    const validFailureIds = new Set(input.sourceFailureIds);

    for (const failureId of output.sourceFailureIds) {
      if (!validFailureIds.has(failureId)) {
        throw new Error(
          `Mutator output referenced failure id "${failureId}" that was not provided in sourceFailureIds.`
        );
      }
    }
  }

  const constrainedSurfaces = input.candidateSurfaces ?? [];

  if (
    constrainedSurfaces.length > 0 &&
    !constrainedSurfaces.includes(output.targetSurface)
  ) {
    throw new Error(
      `Mutator output targetSurface "${output.targetSurface}" was outside the provided candidate surfaces.`
    );
  }
}

export async function runMutatorRole(
  input: MutatorRoleInput,
  invokeRole: InvokeRoutedStructuredRole = invokeRoutedStructuredRole
): Promise<MutationProposal> {
  const result = await invokeRole<MutationProposal>({
    attemptId: input.attemptId,
    capability: input.capability ?? 'prompt-mutation',
    metadata: {
      inputSourceFailureCount: input.sourceFailureIds.length,
      inputSourceIssueNumber: input.sourceIssueNumber,
      roleName: 'mutator'
    },
    role: 'mutator',
    schema: mutationProposalSchema,
    systemPrompt: buildMutatorSystemPrompt(),
    taskKind: 'mutation-proposal',
    userPrompt: buildMutatorUserPrompt(input)
  });

  validateMutatorOutput(result.output, input);

  return result.output;
}
