import type { CapabilityKey } from '@evolvo/core/model-routing-config';
import {
  criticOutputSchema,
  type CriticOutput
} from '@evolvo/schemas/role-output-schemas';

import {
  invokeRoutedStructuredRole,
  type InvokeRoutedStructuredRole
} from './role-runner.js';

type CriticCommandResult = {
  command?: string;
  exitCode: number;
  name: string;
  stderrSnippet?: string;
  stdoutSnippet?: string;
};

export type CriticRoleInput = {
  acceptanceCriteria?: string[];
  attemptId?: string;
  capability?: CapabilityKey;
  changedFiles?: string[];
  commandResults?: CriticCommandResult[];
  implementationSummary?: string;
  issueNumber: number;
  notes?: string[];
  objective?: string;
  observedFailures?: string[];
};

function buildCriticSystemPrompt(): string {
  return [
    'You are the critic role for Evolvo.',
    'Interpret execution logs and assess whether the issue work is complete.',
    'Return only valid JSON matching CriticOutput.',
    'Root-cause confidences must be numbers from 0 to 100.'
  ].join('\n');
}

function buildCriticUserPrompt(input: CriticRoleInput): string {
  return [
    'Analyze this attempt and produce a CriticOutput decision.',
    '',
    'Attempt context (JSON):',
    JSON.stringify(
      {
        acceptanceCriteria: input.acceptanceCriteria ?? [],
        changedFiles: input.changedFiles ?? [],
        commandResults: input.commandResults ?? [],
        implementationSummary: input.implementationSummary ?? '',
        issueNumber: input.issueNumber,
        notes: input.notes ?? [],
        objective: input.objective ?? '',
        observedFailures: input.observedFailures ?? []
      },
      null,
      2
    ),
    '',
    'Guidance:',
    '1. outcome should reflect factual evidence from command results and symptoms.',
    '2. directFixRecommended means the issue can be fixed locally without system mutation.',
    '3. mutationRecommended should only be true when failure appears systemic.',
    '4. recommendedNextAction must match the evidence.'
  ].join('\n');
}

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
    systemPrompt: buildCriticSystemPrompt(),
    taskKind: 'failure-analysis',
    userPrompt: buildCriticUserPrompt(input)
  });

  if (result.output.issueNumber !== input.issueNumber) {
    throw new Error(
      `Critic output issueNumber "${result.output.issueNumber}" did not match input issueNumber "${input.issueNumber}".`
    );
  }

  return result.output;
}
