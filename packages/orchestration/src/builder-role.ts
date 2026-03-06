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
    'Your job is to produce a precise implementation handoff for a completed coding pass.',
    'Return only valid JSON matching the BuilderOutput schema.',
    'Do not invent files, commands, implementation details, or risks that are not supported by the provided context.',
    'Prefer explicit uncertainty over guessing.',
    'Treat filesActuallyChanged as factual input, not something to reinterpret creatively.',
    'Treat filesIntendedToChange as intent, which may differ from what actually changed.',
    'Use implementationNotes and acceptanceCriteria to infer what was implemented, what may still be incomplete, and whether evaluation is appropriate.',
    'believesReadyForEvaluation should be true only when the pass appears concrete enough to validate with commands/tests/build/run checks.',
    'If important acceptance criteria appear unaddressed, reflect that in possibleKnownRisks and be conservative about believesReadyForEvaluation.',
    'The summary should read like an engineering handoff: concise, concrete, and specific about what changed.',
    'The output is a declaration of implementation state for downstream evaluation, not the source of truth for diffs.'
  ].join('\n');
}

function buildBuilderUserPrompt(input: BuilderRoleInput): string {
  return [
    'Produce a BuilderOutput object for this coding pass.',
    '',
    'Your task:',
    '- summarize what was implemented in this pass',
    '- reflect the provided changed files accurately',
    '- suggest only commands that are useful for validating this pass',
    '- identify meaningful remaining risks or incompleteness',
    '- decide whether this pass appears ready for evaluation',
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
    'Output guidance:',
    '- summary: 1-3 sentences, concrete, implementation-focused, no fluff',
    '- filesIntendedToChange: reflect intended scope from context, do not invent extra files',
    '- filesActuallyChanged: must exactly reflect the provided changed files',
    '- commandsSuggested: include only useful validation commands for this pass',
    '- implementationNotes: include the most important implementation outcomes or limitations',
    '- possibleKnownRisks: include meaningful residual risks, gaps, or uncertainty',
    '- believesReadyForEvaluation: true only if this pass appears ready for evaluator checks',
    '',
    'Readiness guidance:',
    '- true if the pass appears sufficiently implemented and testable/buildable/runnable',
    '- false if the pass looks obviously incomplete, contradictory, or missing key implementation evidence',
    '',
    'Hard constraints:',
    '1. issueNumber must exactly match the provided issueNumber.',
    '2. filesActuallyChanged must exactly match the provided list.',
    '3. Do not invent unrelated files, commands, or implementation claims.',
    '4. Be conservative when judging readiness for evaluation.',
    '5. Return only valid JSON.'
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
