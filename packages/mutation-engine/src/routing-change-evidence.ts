import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type { MutationEvaluationSummary } from './mutation-evaluation.ts';

const execFileAsync = promisify(execFile);

export type BuildRoutingChangeEvidenceInput = {
  baseRef?: string;
  evaluation: MutationEvaluationSummary;
  rationale: string;
  worktreePath: string;
};

export type BuildRoutingChangeEvidenceDependencies = {
  exec?: typeof execFileAsync;
};

function collectDiffLines(diff: string, prefix: '+' | '-'): string[] {
  return diff
    .split('\n')
    .filter(
      (line) =>
        line.startsWith(prefix) &&
        !line.startsWith(`${prefix}${prefix}${prefix}`)
    )
    .map((line) => line.slice(1).trim())
    .filter((line) => line.length > 0);
}

export async function buildRoutingChangeEvidence(
  input: BuildRoutingChangeEvidenceInput,
  dependencies: BuildRoutingChangeEvidenceDependencies = {}
): Promise<string | undefined> {
  const exec = dependencies.exec ?? execFileAsync;
  const { stdout } = await exec(
    'git',
    [
      'diff',
      '--unified=0',
      input.baseRef ?? 'main',
      '--',
      'genome/routing/model-routing.ts'
    ],
    {
      cwd: input.worktreePath
    }
  );
  const addedLines = collectDiffLines(stdout, '+').slice(0, 6);
  const removedLines = collectDiffLines(stdout, '-').slice(0, 6);

  if (addedLines.length === 0 && removedLines.length === 0) {
    return undefined;
  }

  return [
    '## Routing Change Evidence',
    '',
    input.rationale,
    '',
    `- Required benchmarks: ${input.evaluation.benchmarkDelta.requiredBenchmarkKeys.join(', ') || 'none'}`,
    `- Executed benchmarks: ${input.evaluation.benchmarkDelta.executedBenchmarkKeys.join(', ') || 'none'}`,
    `- Average benchmark delta: ${
      input.evaluation.benchmarkDelta.averageScoreDelta === null
        ? 'n/a'
        : input.evaluation.benchmarkDelta.averageScoreDelta.toFixed(2)
    }`,
    `- Evidence satisfied: ${input.evaluation.benchmarkDelta.benchmarkEvidenceSatisfied ? 'yes' : 'no'}`,
    '',
    '### Removed routing lines',
    ...removedLines.map((line) => `- ${line}`),
    '',
    '### Added routing lines',
    ...addedLines.map((line) => `- ${line}`)
  ].join('\n');
}
