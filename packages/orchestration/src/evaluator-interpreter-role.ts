import type { CapabilityKey } from '@evolvo/core/model-routing-config';
import {
  evaluatorInterpreterPrompt,
  type EvaluatorInterpreterCheckPromptInput,
  type EvaluatorInterpreterPromptInput
} from '@evolvo/genome/prompts/evaluator-interpreter';
import {
  evaluatorOutputSchema,
  type EvaluatorOutput
} from '@evolvo/schemas/role-output-schemas';

import {
  invokeRoutedStructuredRole,
  type InvokeRoutedStructuredRole
} from './role-runner.js';

export type EvaluatorInterpreterRoleInput = EvaluatorInterpreterPromptInput & {
  attemptId?: string;
  capability?: CapabilityKey;
};

export type EvaluatorInterpreterCheckInput =
  EvaluatorInterpreterCheckPromptInput;

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
    promptDefinition: evaluatorInterpreterPrompt,
    role: 'evaluator-interpreter',
    schema: evaluatorOutputSchema,
    systemPrompt: evaluatorInterpreterPrompt.buildSystemPrompt(),
    taskKind: 'evaluation-interpretation',
    userPrompt: evaluatorInterpreterPrompt.buildUserPrompt(input)
  });

  if (result.output.issueNumber !== input.issueNumber) {
    throw new Error(
      `Evaluator output issueNumber "${result.output.issueNumber}" did not match input issueNumber "${input.issueNumber}".`
    );
  }

  return result.output;
}
