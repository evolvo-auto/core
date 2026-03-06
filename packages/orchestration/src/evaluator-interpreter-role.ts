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
    'Convert raw evaluation evidence into a structured EvaluatorOutput payload.',
    'Return only valid JSON matching EvaluatorOutput.',
    'Ground the outcome in the provided check results and failure evidence.'
  ].join('\n');
}

function buildEvaluatorInterpreterUserPrompt(
  input: EvaluatorInterpreterRoleInput
): string {
  return [
    'Produce an EvaluatorOutput object from this evaluation evidence.',
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
    'Hard constraints:',
    '1. issueNumber must exactly match the provided issueNumber.',
    '2. checks in the output must reflect the supplied check evidence.',
    '3. shouldOpenPR should be false when evaluation failed or no meaningful code change is evident.',
    '4. shouldMergeIfPRExists should only be true for a clearly successful evaluation.'
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
