import type { CapabilityKey } from '@evolvo/core/model-routing-config';
import {
  builderPrompt,
  type BuilderPromptInput
} from '@evolvo/genome/prompts/builder';
import {
  builderOutputSchema,
  type BuilderOutput
} from '@evolvo/schemas/role-output-schemas';

import {
  invokeRoutedStructuredRole,
  type InvokeRoutedStructuredRole
} from './role-runner.js';

export type BuilderRoleInput = BuilderPromptInput & {
  attemptId?: string;
  capability?: CapabilityKey;
};

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
    systemPrompt: builderPrompt.buildSystemPrompt(),
    taskKind: 'implementation-summary',
    userPrompt: builderPrompt.buildUserPrompt(input)
  });

  if (result.output.issueNumber !== input.issueNumber) {
    throw new Error(
      `Builder output issueNumber "${result.output.issueNumber}" did not match input issueNumber "${input.issueNumber}".`
    );
  }

  return result.output;
}
