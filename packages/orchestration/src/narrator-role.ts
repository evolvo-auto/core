import type { CapabilityKey } from '@evolvo/core/model-routing-config';
import {
  narratorOutputSchema,
  type NarratorOutput
} from '@evolvo/schemas/role-output-schemas';

import {
  invokeRoutedStructuredRole,
  type InvokeRoutedStructuredRole
} from './role-runner.js';

export type NarratorRoleInput = {
  attemptId?: string;
  capability?: CapabilityKey;
  commentKind: NarratorOutput['commentKind'];
  evidence?: string[];
  nextStep?: string;
  status?: string;
  summary: string;
  target: NarratorOutput['target'];
  targetNumber: number;
  titleHint?: string;
  whatChanged?: string[];
};

function buildNarratorSystemPrompt(): string {
  return [
    'You are the narrator role for Evolvo.',
    'Produce concise GitHub-ready communication.',
    'Return only valid JSON matching NarratorOutput.',
    'The body should be practical, factual, and action oriented.'
  ].join('\n');
}

function buildNarratorUserPrompt(input: NarratorRoleInput): string {
  return [
    'Create a GitHub comment payload.',
    '',
    'Narration context (JSON):',
    JSON.stringify(
      {
        commentKind: input.commentKind,
        evidence: input.evidence ?? [],
        nextStep: input.nextStep,
        status: input.status,
        summary: input.summary,
        target: input.target,
        targetNumber: input.targetNumber,
        titleHint: input.titleHint,
        whatChanged: input.whatChanged ?? []
      },
      null,
      2
    ),
    '',
    'Hard constraints:',
    '1. target, targetNumber, and commentKind must exactly match the requested values.',
    '2. title should be short and specific.',
    '3. body should be directly postable to GitHub without extra wrapping.'
  ].join('\n');
}

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
    systemPrompt: buildNarratorSystemPrompt(),
    taskKind: 'github-narration',
    userPrompt: buildNarratorUserPrompt(input)
  });

  validateNarratorOutput(result.output, input);

  return result.output;
}
