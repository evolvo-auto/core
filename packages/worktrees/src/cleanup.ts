import { access } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import {
  getWorktreeRecordById,
  updateWorktreeRecord
} from '@evolvo/api/worktree-record';

import { runCommand, type CommandExecutionResult } from './command-runner.js';

const cleanupAllowedStatuses = ['COMPLETED', 'FAILED', 'ARCHIVED', 'CLEANED'] as const;
const attemptJournalRelativePath = '.evolvo/attempt-journal.json';

export type CleanupWorktreeInput = {
  artifactManifestPath: string;
  repoRoot?: string;
  worktreeId: string;
};

export type CleanupWorktreeResult = {
  alreadyCleaned: boolean;
  archived: boolean;
  artifactManifestPath: string;
  removedPath: string;
  worktree: Awaited<ReturnType<typeof updateWorktreeRecord>>;
};

export type CleanupWorktreeDependencies = {
  getRecordById?: typeof getWorktreeRecordById;
  pathExists?: (path: string) => Promise<boolean>;
  runGitCommand?: (input: {
    args: string[];
    cwd: string;
  }) => Promise<CommandExecutionResult>;
  updateRecord?: typeof updateWorktreeRecord;
};

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`Worktree cleanup ${fieldName} is required.`);
  }

  return normalizedValue;
}

async function defaultPathExists(path: string): Promise<boolean> {
  try {
    await access(path);

    return true;
  } catch {
    return false;
  }
}

function ensureSuccessfulGitCommand(
  result: CommandExecutionResult,
  operationName: string
): void {
  if (result.exitCode === 0) {
    return;
  }

  const stderr = result.stderr.trim();
  const stdout = result.stdout.trim();
  const outputSummary = stderr || stdout || 'No command output.';

  throw new Error(
    `Git ${operationName} failed with exit code ${result.exitCode}: ${outputSummary}`
  );
}

function normalizeRepoRoot(repoRoot: string | undefined): string {
  return resolve(repoRoot?.trim() || process.cwd());
}

export async function cleanupWorktree(
  input: CleanupWorktreeInput,
  dependencies: CleanupWorktreeDependencies = {}
): Promise<CleanupWorktreeResult> {
  const getRecordById = dependencies.getRecordById ?? getWorktreeRecordById;
  const pathExists = dependencies.pathExists ?? defaultPathExists;
  const runGitCommand =
    dependencies.runGitCommand ??
    (async ({ args, cwd }) =>
      runCommand({
        args,
        command: 'git',
        cwd
      }));
  const updateRecord = dependencies.updateRecord ?? updateWorktreeRecord;
  const worktreeId = normalizeRequiredText(input.worktreeId, 'worktreeId');
  const artifactManifestPath = resolve(
    normalizeRequiredText(input.artifactManifestPath, 'artifactManifestPath')
  );
  const repoRoot = normalizeRepoRoot(input.repoRoot);
  const record = await getRecordById(worktreeId);

  if (!record) {
    throw new Error(`Worktree "${worktreeId}" was not found.`);
  }

  if (
    !cleanupAllowedStatuses.includes(record.status as (typeof cleanupAllowedStatuses)[number])
  ) {
    throw new Error(
      `Worktree "${record.id}" cannot be cleaned from status "${record.status}".`
    );
  }

  if (!(await pathExists(artifactManifestPath))) {
    throw new Error(
      `Worktree "${record.id}" cannot be cleaned before artifact persistence. Missing manifest: "${artifactManifestPath}".`
    );
  }

  const filesystemPath = resolve(
    normalizeRequiredText(record.filesystemPath, 'filesystemPath')
  );

  if (record.status === 'CLEANED') {
    return {
      alreadyCleaned: true,
      archived: true,
      artifactManifestPath,
      removedPath: filesystemPath,
      worktree: record
    };
  }

  const attemptJournalPath = join(filesystemPath, attemptJournalRelativePath);

  if (!(await pathExists(attemptJournalPath))) {
    throw new Error(
      `Worktree "${record.id}" cannot be cleaned before journaling. Missing journal: "${attemptJournalPath}".`
    );
  }

  let archived = false;

  if (record.status !== 'ARCHIVED') {
    await updateRecord({
      id: record.id,
      status: 'ARCHIVED'
    });
    archived = true;
  }

  const removeResult = await runGitCommand({
    args: ['worktree', 'remove', '--force', filesystemPath],
    cwd: repoRoot
  });

  ensureSuccessfulGitCommand(removeResult, 'worktree removal');

  const pruneResult = await runGitCommand({
    args: ['worktree', 'prune'],
    cwd: repoRoot
  });

  ensureSuccessfulGitCommand(pruneResult, 'worktree prune');

  const cleanedRecord = await updateRecord({
    cleanupEligibleAt: new Date(),
    id: record.id,
    status: 'CLEANED'
  });

  return {
    alreadyCleaned: false,
    archived,
    artifactManifestPath,
    removedPath: filesystemPath,
    worktree: cleanedRecord
  };
}
