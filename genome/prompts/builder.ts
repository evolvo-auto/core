import { createPromptDefinition } from './prompt-definition.ts';
import type { BuilderOutput } from '@evolvo/schemas/role-output-schemas';

export type BuilderPromptInput = {
  acceptanceCriteria?: string[];
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

export const builderPrompt = createPromptDefinition<BuilderPromptInput>({
  buildSystemPrompt: () =>
    [
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
    ].join('\n'),
  buildUserPrompt: (input) =>
    [
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
    ].join('\n'),
  promptKey: 'builder',
  responseMode: 'json',
  role: 'builder',
  title: 'Builder structured handoff',
  version: 1
});
