import type { CapabilityKey } from '@evolvo/core/model-routing-config';
import {
  narratorPrompt,
  type NarratorPromptInput
} from '@evolvo/genome/prompts/narrator';
import {
  narratorOutputSchema,
  type NarratorOutput
} from '@evolvo/schemas/role-output-schemas';

import {
  invokeRoutedStructuredRole,
  type InvokeRoutedStructuredRole
} from './role-runner.js';

export type NarratorRoleInput = NarratorPromptInput & {
  attemptId?: string;
  capability?: CapabilityKey;
};

function validateNarratorOutput(
  output: NarratorOutput,
  input: NarratorRoleInput
): void {
  if (output.target !== input.target) {
    throw new Error(
      `Narrator output target "${output.target}" did not match input target "${input.target}".`
    );
  }

  if (output.targetNumber !== input.targetNumber) {
    throw new Error(
      `Narrator output targetNumber "${output.targetNumber}" did not match input targetNumber "${input.targetNumber}".`
    );
  }

  if (output.commentKind !== input.commentKind) {
    throw new Error(
      `Narrator output commentKind "${output.commentKind}" did not match input commentKind "${input.commentKind}".`
    );
  }
}

export async function runNarratorRole(
  input: NarratorRoleInput,
  invokeRole: InvokeRoutedStructuredRole = invokeRoutedStructuredRole
): Promise<NarratorOutput> {
  const result = await invokeRole<NarratorOutput>({
    attemptId: input.attemptId,
    capability: input.capability ?? 'general',
    metadata: {
      roleName: 'narrator',
      target: input.target,
      targetNumber: input.targetNumber
    },
    role: 'narrator',
    schema: narratorOutputSchema,
    systemPrompt: narratorPrompt.buildSystemPrompt(),
    taskKind: 'github-narration',
    userPrompt: narratorPrompt.buildUserPrompt(input)
  });

  validateNarratorOutput(result.output, input);

  return result.output;
}
