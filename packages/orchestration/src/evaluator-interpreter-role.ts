import type { CapabilityKey } from '@evolvo/core/model-routing-config';
import {
  evaluatorOutputSchema,
  type EvaluatorOutput
} from '@evolvo/schemas/role-output-schemas';

import {
  invokeRoutedStructuredRole,
  type InvokeRoutedStructuredRole
} from './role-runner.js';

export type EvaluatorInterpreterCheckInput = {
  exitCode?: number;
  name: string;
  notes?: string;
  result: 'failed' | 'passed' | 'skipped';
};

export type EvaluatorInterpreterRoleInput = {
  acceptanceCriteria?: string[];
  attemptId?: string;
  builderSummary?: string;
  capability?: CapabilityKey;
  changedFiles?: string[];
  checks: EvaluatorInterpreterCheckInput[];
  issueNumber: number;
  objective?: string;
  observedFailures?: string[];
};

function buildEvaluatorInterpreterSystemPrompt(): string {
  return [
    'You are the evaluator-interpreter role for Evolvo.',
    'Your job is to convert raw evaluation evidence into a disciplined EvaluatorOutput decision.',
    'Return only valid JSON matching EvaluatorOutput.',
    'Ground all judgments in the supplied check results and observed failures.',
    'Use check evidence as the strongest source of truth; builder summaries and changed files are supporting context, not proof of success.',
    'Distinguish clearly between technical validity, objective completeness, and release readiness.',
    'A passing result requires more than good intent; it requires strong supporting evidence.',
    'Use outcome carefully:',
    '- success when the evidence clearly supports a successful result',
    '- partial when there is meaningful progress but incomplete or failing evidence',
    '- failure when the evidence clearly shows the attempt did not succeed',
    '- blocked when progress is prevented by an external or structural blocker',
    '- inconclusive when the evidence is too incomplete or ambiguous to judge reliably.',
    'Treat skipped checks cautiously: they are not failures, but they may reduce confidence.',
    'shouldOpenPR should be true only when there is meaningful implemented work worth surfacing for review.',
    'shouldMergeIfPRExists should only be true when the evaluation is clearly successful and there is no meaningful evidence against merge readiness.',
    'Do not invent checks, outcomes, or failures not present in the input.'
  ].join('\n');
}

function buildEvaluatorInterpreterUserPrompt(
  input: EvaluatorInterpreterRoleInput
): string {
  return [
    'Produce an EvaluatorOutput object from this evaluation evidence.',
    '',
    'Your task is to determine:',
    '- what the factual evaluation result is',
    '- which checks passed, failed, or were skipped',
    '- whether the issue appears successful, partial, failed, blocked, or inconclusive',
    '- whether there is meaningful implemented work worth opening in a PR',
    '- whether an existing PR appears merge-ready',
    '',
    'Evaluation evidence (JSON):',
    JSON.stringify(
      {
        acceptanceCriteria: input.acceptanceCriteria ?? [],
        builderSummary: input.builderSummary ?? '',
        changedFiles: input.changedFiles ?? [],
        checks: input.checks,
        issueNumber: input.issueNumber,
        objective: input.objective ?? '',
        observedFailures: input.observedFailures ?? []
      },
      null,
      2
    ),
    '',
    'Evaluation guidance:',
    '- Use check results and observed failures as the strongest evidence.',
    '- Treat builderSummary as supporting context, not proof.',
    '- Passing technical checks supports success, but does not automatically prove the objective was met.',
    '- Failed important checks should usually prevent a success outcome.',
    '- Skipped checks should be reflected accurately and considered in overall confidence.',
    '- If meaningful work appears present but evidence is mixed, prefer partial over success.',
    '- If evidence is too weak or contradictory, prefer inconclusive over overclaiming.',
    '',
    'PR decision guidance:',
    '- shouldOpenPR = true only when there is meaningful changed work worth review.',
    '- shouldOpenPR = false when evaluation failed badly or no meaningful code change is evident.',
    '- shouldMergeIfPRExists = true only for clearly successful results with no meaningful red flags.',
    '- If there are failed core checks, shouldMergeIfPRExists should usually be false.',
    '',
    'Hard constraints:',
    '1. issueNumber must exactly match the provided issueNumber.',
    '2. checks in the output must reflect the supplied check evidence.',
    '3. Do not invent extra checks, failures, or implementation claims.',
    '4. Be conservative when evidence is incomplete or mixed.',
    '5. Return only valid JSON.'
  ].join('\n');
}

export async function runEvaluatorInterpreterRole(
  input: EvaluatorInterpreterRoleInput,
  invokeRole: InvokeRoutedStructuredRole = invokeRoutedStructuredRole
): Promise<EvaluatorOutput> {
  const result = await invokeRole<EvaluatorOutput>({
    attemptId: input.attemptId,
    capability: input.capability ?? 'debugging',
    metadata: {
      checkCount: input.checks.length,
      inputIssueNumber: input.issueNumber,
      roleName: 'evaluator-interpreter'
    },
    role: 'evaluator-interpreter',
    schema: evaluatorOutputSchema,
    systemPrompt: buildEvaluatorInterpreterSystemPrompt(),
    taskKind: 'evaluation-interpretation',
    userPrompt: buildEvaluatorInterpreterUserPrompt(input)
  });

  if (result.output.issueNumber !== input.issueNumber) {
    throw new Error(
      `Evaluator output issueNumber "${result.output.issueNumber}" did not match input issueNumber "${input.issueNumber}".`
    );
  }

  return result.output;
}
