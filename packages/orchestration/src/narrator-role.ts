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
    'Your job is to produce concise, GitHub-ready engineering communication.',
    'Return only valid JSON matching NarratorOutput.',
    'Write comments that are practical, factual, specific, and directly useful to someone scanning the issue or pull request.',
    'Do not be chatty, dramatic, repetitive, or overly polished.',
    'Do not invent evidence, status, changes, or next steps that are not supported by the input.',
    'Prefer compact communication over long summaries.',
    'Use evidence and whatChanged selectively to improve clarity, not to dump raw detail.',
    'The title should be short, specific, and appropriate for the comment kind.',
    'The body should be directly postable to GitHub and should help a reader understand status, what changed, evidence, and next step.'
  ].join('\n');
}

function buildNarratorUserPrompt(input: NarratorRoleInput): string {
  return [
    'Create a GitHub comment payload.',
    '',
    'Your comment should help a reader quickly understand the current state of the work.',
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
    'Comment guidance by kind:',
    '- work-started: state what is being started and the immediate next step',
    '- progress: summarize meaningful progress and what changed',
    '- blocker: explain the blocker clearly and state the next intended move if known',
    '- evaluation-result: summarize the result, relevant evidence, and what happens next',
    '- mutation-rationale: explain why the mutation is being proposed or made and what it is expected to improve',
    '- promotion-update: explain the runtime promotion status and outcome',
    '- defer: explain briefly why work is being deferred',
    '- reject: explain briefly why work is being rejected',
    '',
    'Writing guidance:',
    '- keep the title short and specific',
    '- keep the body concise and directly useful',
    '- prefer plain engineering language',
    '- mention only the most relevant evidence',
    '- mention what changed only when it materially helps understanding',
    '- include nextStep when it improves clarity',
    '- avoid filler, repetition, and unnecessary formatting',
    '',
    'Hard constraints:',
    '1. target, targetNumber, and commentKind must exactly match the requested values.',
    '2. title should be short and specific.',
    '3. body should be directly postable to GitHub without extra wrapping.',
    '4. Do not invent evidence or changes not present in the input.',
    '5. Return only valid JSON.'
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
