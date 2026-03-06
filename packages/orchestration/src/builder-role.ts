import type { CapabilityKey } from '@evolvo/core/model-routing-config';
import {
  builderOutputSchema,
  type BuilderOutput
} from '@evolvo/schemas/role-output-schemas';

import {
  invokeRoutedStructuredRole,
  type InvokeRoutedStructuredRole
} from './role-runner.js';

export type BuilderRoleInput = {
  acceptanceCriteria?: string[];
  attemptId?: string;
  capability?: CapabilityKey;
  commandsSuggested?: BuilderOutput['commandsSuggested'];
  filesActuallyChanged?: string[];
  filesIntendedToChange?: string[];
  implementationNotes?: string[];
  issueNumber: number;
  objective?: string;
  planSummary?: string;
  possibleKnownRisks?: string[];
  summaryHint?: string;
};

function buildBuilderSystemPrompt(): string {
  return [
    'You are the builder role for Evolvo.',
    'Summarize the coding pass in a BuilderOutput payload.',
    'Return only valid JSON matching BuilderOutput.',
    'The builder output is a declaration of intent/result, not the source of truth for changed files.',
    'Keep the summary concise and engineering-focused.'
  ].join('\n');
}

function buildBuilderUserPrompt(input: BuilderRoleInput): string {
  return [
    'Create a BuilderOutput object for this completed coding pass.',
    '',
    'Builder context (JSON):',
    JSON.stringify(
      {
        acceptanceCriteria: input.acceptanceCriteria ?? [],
        commandsSuggested: input.commandsSuggested ?? [],
        filesActuallyChanged: input.filesActuallyChanged ?? [],
        filesIntendedToChange: input.filesIntendedToChange ?? [],
        implementationNotes: input.implementationNotes ?? [],
        issueNumber: input.issueNumber,
        objective: input.objective ?? '',
        planSummary: input.planSummary ?? '',
        possibleKnownRisks: input.possibleKnownRisks ?? [],
        summaryHint: input.summaryHint ?? ''
      },
      null,
      2
    ),
    '',
    'Hard constraints:',
    '1. issueNumber must exactly match the provided issueNumber.',
    '2. filesActuallyChanged must reflect the provided list and must not invent unrelated files.',
    '3. believesReadyForEvaluation should only be true if the coding pass appears evaluable.',
    '4. summary should be concise and concrete.'
  ].join('\n');
}

export async function runBuilderRole(
  input: BuilderRoleInput,
  invokeRole: InvokeRoutedStructuredRole = invokeRoutedStructuredRole
): Promise<BuilderOutput> {
  const result = await invokeRole<BuilderOutput>({
    attemptId: input.attemptId,
    capability: input.capability ?? 'general',
    metadata: {
      actualChangedFileCount: (input.filesActuallyChanged ?? []).length,
      intendedChangedFileCount: (input.filesIntendedToChange ?? []).length,
      inputIssueNumber: input.issueNumber,
      roleName: 'builder'
    },
    role: 'builder',
    schema: builderOutputSchema,
    systemPrompt: buildBuilderSystemPrompt(),
    taskKind: 'implementation-summary',
    userPrompt: buildBuilderUserPrompt(input)
  });

  if (result.output.issueNumber !== input.issueNumber) {
    throw new Error(
      `Builder output issueNumber "${result.output.issueNumber}" did not match input issueNumber "${input.issueNumber}".`
    );
  }

  return result.output;
}
