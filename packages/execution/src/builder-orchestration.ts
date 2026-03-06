import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import type { CapabilityKey } from '@evolvo/core/model-routing-config';
import { invokeRoutedStructuredRole } from '@evolvo/orchestration/role-runner';
import type {
  BuilderOutput,
  PlannerOutput
} from '@evolvo/schemas/role-output-schemas';
import { executeWorktreeCommand } from '@evolvo/worktrees/execution-engine';
import { z } from 'zod';

import { detectChangedFiles } from './changed-files.js';
import { buildRepositoryContext } from './repository-context.js';

const nonEmptyStringSchema = z.string().trim().min(1);
const positiveIntegerSchema = z.number().int().positive();

const commandSuggestionSchema = z.object({
  command: nonEmptyStringSchema,
  cwd: nonEmptyStringSchema.optional(),
  name: nonEmptyStringSchema,
  timeoutMs: positiveIntegerSchema.optional()
});

const builderPatchPlanSchema = z.object({
  believesReadyForEvaluation: z.boolean(),
  commandsSuggested: z.array(commandSuggestionSchema),
  filesIntendedToChange: z.array(nonEmptyStringSchema),
  implementationNotes: z.array(nonEmptyStringSchema),
  issueNumber: positiveIntegerSchema,
  patch: nonEmptyStringSchema,
  possibleKnownRisks: z.array(nonEmptyStringSchema),
  summary: nonEmptyStringSchema
});

type BuilderPatchPlan = z.infer<typeof builderPatchPlanSchema>;

export type RunBuilderOrchestrationInput = {
  attemptId: string;
  body?: string;
  capability?: CapabilityKey;
  issueNumber: number;
  journalPath: string;
  plannerOutput: PlannerOutput;
  title: string;
  worktreeId: string;
  worktreePath: string;
};

export type RunBuilderOrchestrationResult = {
  builderOutput: BuilderOutput;
  diffSummary: string;
  intendedOnlyFiles: string[];
  patchPath: string;
  unexpectedChangedFiles: string[];
};

export type RunBuilderOrchestrationDependencies = {
  buildContext?: typeof buildRepositoryContext;
  detectChanges?: typeof detectChangedFiles;
  executeCommand?: typeof executeWorktreeCommand;
  invokeRole?: typeof invokeRoutedStructuredRole;
};

const disallowedShellCharacterPattern = /[|&;><`$]/;
const allowedSuggestedCommands = new Set(['git', 'node', 'npm', 'pnpm']);

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`Builder orchestration ${fieldName} is required.`);
  }

  return normalizedValue;
}

function buildBuilderSystemPrompt(): string {
  return [
    'You are the builder role for Evolvo.',
    'Implement the plan by returning a JSON object that matches BuilderPatchPlan.',
    'The patch must be a valid unified diff against the current worktree rooted at the repository root.',
    'Do not wrap the patch in markdown fences.',
    'Only suggest commands that are safe local developer commands such as pnpm, npm, node, git diff, or git status.'
  ].join('\n');
}

function buildBuilderUserPrompt(input: {
  body?: string;
  plannerOutput: PlannerOutput;
  repositoryContext: Awaited<ReturnType<typeof buildRepositoryContext>>;
  repositoryFilePaths: string[];
  repositoryStatus: string;
  title: string;
}): string {
  return [
    'Implement this GitHub issue in the repository worktree.',
    '',
    'Issue:',
    JSON.stringify(
      {
        body: input.body ?? '',
        title: input.title
      },
      null,
      2
    ),
    '',
    'Planner output:',
    JSON.stringify(input.plannerOutput, null, 2),
    '',
    'Repository status:',
    input.repositoryStatus || '[clean working tree]',
    '',
    'Repository file list:',
    input.repositoryFilePaths.join('\n'),
    '',
    'Selected file contents:',
    input.repositoryContext
      .map(
        (file) =>
          `### ${file.path}\n~~~ts\n${file.content.replace(/~~~/g, '~ ~ ~')}\n~~~`
      )
      .join('\n\n'),
    '',
    'Return JSON with:',
    '1. issueNumber matching the requested issue number.',
    '2. summary, implementationNotes, and possibleKnownRisks.',
    '3. filesIntendedToChange listing the files you plan to touch.',
    '4. patch as a unified diff that can be applied with git apply.',
    '5. commandsSuggested for any safe follow-up commands that should run after patch application.'
  ].join('\n');
}

function parseRepositoryFileList(stdout: string): string[] {
  return stdout
    .split('\n')
    .map((filePath) => filePath.trim())
    .filter((filePath) => filePath.length > 0);
}

function parseSuggestedCommand(command: string): {
  args: string[];
  command: string;
} {
  const normalizedCommand = normalizeRequiredText(command, 'commandsSuggested.command');

  if (disallowedShellCharacterPattern.test(normalizedCommand)) {
    throw new Error(
      `Builder suggested command "${normalizedCommand}" contains unsupported shell control characters.`
    );
  }

  const commandParts = normalizedCommand.split(/\s+/).filter(Boolean);
  const commandName = commandParts[0];

  if (!allowedSuggestedCommands.has(commandName)) {
    throw new Error(
      `Builder suggested command "${normalizedCommand}" is not in the safe allowlist.`
    );
  }

  if (
    commandName === 'git' &&
    !['diff', 'status'].includes(commandParts[1] ?? '')
  ) {
    throw new Error(
      `Builder suggested git command "${normalizedCommand}" is not permitted.`
    );
  }

  return {
    args: commandParts.slice(1),
    command: commandName
  };
}

async function writePatchFile(
  worktreePath: string,
  patch: string
): Promise<string> {
  const patchPath = resolve(worktreePath, '.evolvo', 'builder.patch');

  await mkdir(dirname(patchPath), {
    recursive: true
  });
  await writeFile(patchPath, patch.endsWith('\n') ? patch : `${patch}\n`, 'utf-8');

  return patchPath;
}

export async function runBuilderOrchestration(
  input: RunBuilderOrchestrationInput,
  dependencies: RunBuilderOrchestrationDependencies = {}
): Promise<RunBuilderOrchestrationResult> {
  const buildContext = dependencies.buildContext ?? buildRepositoryContext;
  const detectChanges = dependencies.detectChanges ?? detectChangedFiles;
  const executeCommand =
    dependencies.executeCommand ?? executeWorktreeCommand;
  const invokeRole = dependencies.invokeRole ?? invokeRoutedStructuredRole;
  const worktreePath = resolve(normalizeRequiredText(input.worktreePath, 'worktreePath'));
  const repositoryFilesResult = await executeCommand({
    args: ['ls-files'],
    classification: 'inspect',
    command: 'git',
    cwd: worktreePath,
    journalPath: input.journalPath,
    throwOnNonZeroExit: true,
    worktreeId: input.worktreeId
  });
  const repositoryStatusResult = await executeCommand({
    args: ['status', '--short'],
    classification: 'inspect',
    command: 'git',
    cwd: worktreePath,
    journalPath: input.journalPath,
    throwOnNonZeroExit: true,
    worktreeId: input.worktreeId
  });
  const repositoryFilePaths = parseRepositoryFileList(
    repositoryFilesResult.result.stdout
  );
  const repositoryContext = await buildContext({
    body: input.body,
    filePaths: repositoryFilePaths,
    plannerOutput: input.plannerOutput,
    title: input.title,
    worktreePath
  });
  const builderPlanResult = await invokeRole<BuilderPatchPlan>({
    attemptId: input.attemptId,
    capability: input.capability ?? 'general',
    metadata: {
      inputIssueNumber: input.issueNumber,
      repositoryContextFileCount: repositoryContext.length,
      roleName: 'builder'
    },
    role: 'builder',
    schema: builderPatchPlanSchema,
    systemPrompt: buildBuilderSystemPrompt(),
    taskKind: 'implementation-patch',
    userPrompt: buildBuilderUserPrompt({
      body: input.body,
      plannerOutput: input.plannerOutput,
      repositoryContext,
      repositoryFilePaths,
      repositoryStatus: repositoryStatusResult.result.stdout.trim(),
      title: input.title
    })
  });
  const builderPlan = builderPlanResult.output;

  if (builderPlan.issueNumber !== input.issueNumber) {
    throw new Error(
      `Builder patch issueNumber "${builderPlan.issueNumber}" did not match input issueNumber "${input.issueNumber}".`
    );
  }

  const patchPath = await writePatchFile(worktreePath, builderPlan.patch);

  await executeCommand({
    args: ['apply', '--whitespace=nowarn', patchPath],
    command: 'git',
    cwd: worktreePath,
    journalPath: input.journalPath,
    throwOnNonZeroExit: true,
    worktreeId: input.worktreeId
  });

  for (const commandSuggestion of builderPlan.commandsSuggested) {
    const parsedCommand = parseSuggestedCommand(commandSuggestion.command);

    await executeCommand({
      args: parsedCommand.args,
      command: parsedCommand.command,
      cwd: resolve(worktreePath, commandSuggestion.cwd?.trim() || '.'),
      journalPath: input.journalPath,
      throwOnNonZeroExit: true,
      timeoutMs: commandSuggestion.timeoutMs,
      worktreeId: input.worktreeId
    });
  }

  const changedFilesResult = await detectChanges({
    intendedFiles: builderPlan.filesIntendedToChange,
    journalPath: input.journalPath,
    worktreeId: input.worktreeId,
    worktreePath
  });

  return {
    builderOutput: {
      believesReadyForEvaluation:
        builderPlan.believesReadyForEvaluation && changedFilesResult.hasChanges,
      commandsSuggested: builderPlan.commandsSuggested,
      filesActuallyChanged: changedFilesResult.actualChangedFiles,
      filesIntendedToChange: builderPlan.filesIntendedToChange,
      implementationNotes: builderPlan.implementationNotes,
      issueNumber: builderPlan.issueNumber,
      possibleKnownRisks: builderPlan.possibleKnownRisks,
      summary: builderPlan.summary
    },
    diffSummary: changedFilesResult.diffSummary,
    intendedOnlyFiles: changedFilesResult.intendedOnlyFiles,
    patchPath,
    unexpectedChangedFiles: changedFilesResult.unexpectedChangedFiles
  };
}
