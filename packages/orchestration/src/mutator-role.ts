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
    'Your job is to propose a single high-leverage systemic mutation that could reduce future failures or improve Evolvo across multiple issues.',
    'Return only valid JSON matching the MutationProposal schema.',
    'A mutation is not a direct local repair for one issue. It is a reusable improvement to Evolvo behaviour, architecture, configuration, evaluation, routing, prompts, templates, memory, or process.',
    'Use evidence from failure summaries, likely root causes, recurrence hints, replay issues, benchmark context, and candidate surfaces.',
    'Prefer the smallest mutation with the highest likely leverage.',
    'Do not propose vague, generic, or weakly justified changes.',
    'Do not invent evidence, recurrence patterns, or failure IDs that are not supported by the provided context.',
    'If recurrence evidence is weak, be more conservative in confidence and priority.',
    'Choose a targetSurface that best matches the likely systemic weakness.',
    'The validation plan should make it possible to tell whether the mutation helped.',
    'Confidence and priority scores must be integers from 0 to 100.'
  ].join('\n');
}

function buildMutatorUserPrompt(input: MutatorRoleInput): string {
  return [
    'Generate one MutationProposal.',
    '',
    'Your task is to propose a single systemic improvement, not a one-off local repair.',
    '',
    'You should determine:',
    '- what recurring or systemic weakness is most likely present',
    '- which Evolvo surface is the best place to intervene',
    '- what specific change would be the highest-leverage mutation',
    '- what benefits are expected if the mutation works',
    '- what risks the mutation introduces',
    '- how the mutation should be validated',
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
    'Mutation guidance:',
    '- Prefer a mutation that could improve future outcomes across multiple issues, not just the source issue.',
    '- Prefer the smallest high-leverage mutation over a broad or vague redesign.',
    '- Use candidateSurfaces when provided and choose the best-fitting one.',
    '- Ground rationale and evidence in the provided failure summary, root causes, recurrence hints, replay issues, and benchmarks.',
    '- Expected benefits should be concrete and testable where possible.',
    '- Expected risks should mention likely regressions, overfitting, or unintended effects.',
    '- Validation should use benchmarkIds and replayIssueNumbers when relevant and available.',
    '',
    'Scoring guidance:',
    '- confidenceScore should reflect how strong the evidence is that this mutation addresses the real weakness.',
    '- priorityScore should reflect expected leverage, recurrence, and likely value.',
    '- Be conservative if the evidence is sparse or the mutation is speculative.',
    '',
    'Hard constraints:',
    '1. sourceIssueNumber must exactly match the provided sourceIssueNumber.',
    '2. sourceFailureIds must only reference provided failure IDs.',
    '3. targetSurface must be one of candidateSurfaces when candidateSurfaces are provided.',
    '4. Do not propose a direct one-off fix disguised as a mutation.',
    '5. Return only valid JSON.'
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
