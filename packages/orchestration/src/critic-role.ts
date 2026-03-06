import type { CapabilityKey } from '@evolvo/core/model-routing-config';
import {
  criticPrompt,
  type CriticPromptInput
} from '@evolvo/genome/prompts/critic';
import {
  criticOutputSchema,
  type CriticOutput
} from '@evolvo/schemas/role-output-schemas';

import {
  invokeRoutedStructuredRole,
  type InvokeRoutedStructuredRole
} from './role-runner.js';

export type CriticRoleInput = CriticPromptInput & {
  attemptId?: string;
  capability?: CapabilityKey;
};

export async function runCriticRole(
  input: CriticRoleInput,
  invokeRole: InvokeRoutedStructuredRole = invokeRoutedStructuredRole
): Promise<CriticOutput> {
  const result = await invokeRole<CriticOutput>({
    attemptId: input.attemptId,
    capability: input.capability ?? 'debugging',
    metadata: {
      inputIssueNumber: input.issueNumber,
      observedFailureCount: (input.observedFailures ?? []).length,
      roleName: 'critic'
    },
    role: 'critic',
    schema: criticOutputSchema,
    systemPrompt: criticPrompt.buildSystemPrompt(),
    taskKind: 'failure-analysis',
    userPrompt: criticPrompt.buildUserPrompt(input)
  });

  if (result.output.issueNumber !== input.issueNumber) {
    throw new Error(
      `Critic output issueNumber "${result.output.issueNumber}" did not match input issueNumber "${input.issueNumber}".`
    );
  }

  return result.output;
}
