import { createPromptDefinition } from './prompt-definition.ts';

type CriticCommandResult = {
  command?: string;
  exitCode: number;
  name: string;
  stderrSnippet?: string;
  stdoutSnippet?: string;
};

export type CriticPromptInput = {
  acceptanceCriteria?: string[];
  changedFiles?: string[];
  commandResults?: CriticCommandResult[];
  implementationSummary?: string;
  issueNumber: number;
  notes?: string[];
  objective?: string;
  observedFailures?: string[];
};

export const criticPrompt = createPromptDefinition<CriticPromptInput>({
  buildSystemPrompt: () =>
    [
      'You are the critic role for Evolvo.',
      'Your job is to produce a disciplined post-attempt assessment based on the available evidence.',
      'Return only valid JSON matching the CriticOutput schema.',
      'Use the strongest available evidence first: command results and observed failures are more reliable than implementation summaries or notes.',
      'Distinguish clearly between symptoms and likely root causes.',
      'Do not invent implementation details, failures, or causes that are not supported by the provided context.',
      'Prefer uncertainty over false confidence.',
      'completionAssessment should reflect whether the issue work appears complete, mostly complete, partial, or failed based on the evidence.',
      'outcome should reflect the overall factual result of the attempt, not the intention of the implementation.',
      'directFixRecommended should be true when the problem appears local to this issue or implementation pass.',
      'mutationRecommended should be true only when the evidence suggests a systemic weakness that is likely to recur across issues or reflects a deeper platform deficiency.',
      'recommendedNextAction must be consistent with the evidence, the likely root causes, and whether the problem appears local or systemic.',
      'Root-cause confidences must be integers from 0 to 100.'
    ].join('\n'),
  buildUserPrompt: (input) =>
    [
      'Analyze this attempt and produce a CriticOutput decision.',
      '',
      'Your task is to determine:',
      '- what happened factually',
      '- whether the implementation appears complete or incomplete',
      '- what the most likely root causes are',
      '- whether the problem is local or systemic',
      '- what the most appropriate next action is',
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
      'Evaluation guidance:',
      '- Use command results and observed failures as the strongest evidence.',
      '- Treat implementationSummary and notes as supporting context, not proof.',
      '- If acceptance criteria appear only partially addressed, reflect that in completionAssessment and notes.',
      '- If a command failed, explain the likely underlying cause rather than only repeating the failure symptom.',
      '- If evidence is mixed or incomplete, prefer a cautious assessment.',
      '',
      'Decision guidance:',
      '- directFixRecommended = true when the issue can likely be fixed within the current issue/worktree without changing Evolvo itself.',
      '- mutationRecommended = true only when the problem appears systemic, recurring, or rooted in Evolvo process/tooling/planning/evaluation weaknesses.',
      '- recommendedNextAction should be one of retry, patch-directly, open-mutation, open-failure, defer, or stop, and should match the evidence.',
      '',
      'Hard constraints:',
      '1. issueNumber must exactly match the provided issueNumber.',
      '2. Do not invent command outcomes, changed files, or root causes not supported by the context.',
      '3. Root-cause confidences must be numbers from 0 to 100.',
      '4. Be conservative when evidence is weak or conflicting.',
      '5. Return only valid JSON.'
    ].join('\n'),
  promptKey: 'critic',
  responseMode: 'json',
  role: 'critic',
  title: 'Critic failure analysis',
  version: 1
});
