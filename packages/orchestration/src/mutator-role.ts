import type { CapabilityKey } from '@evolvo/core/model-routing-config';
import {
  mutatorPrompt,
  type MutatorPromptInput
} from '@evolvo/genome/prompts/mutator';
import {
  mutationProposalSchema,
  type MutationProposal
} from '@evolvo/schemas/role-output-schemas';

import {
  invokeRoutedStructuredRole,
  type InvokeRoutedStructuredRole
} from './role-runner.js';

export type MutatorRoleInput = MutatorPromptInput & {
  attemptId?: string;
  capability?: CapabilityKey;
};

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
    systemPrompt: mutatorPrompt.buildSystemPrompt(),
    taskKind: 'mutation-proposal',
    userPrompt: mutatorPrompt.buildUserPrompt(input)
  });

  validateMutatorOutput(result.output, input);

  return result.output;
}
