import { access, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import {
  getWorktreeRecordById,
  updateWorktreeRecord
} from '@evolvo/api/worktree-record';

import { runCommand, type CommandExecutionResult } from './command-runner.js';

export type CreateReservedWorktreeInput = {
  filesystemPath?: string;
  repoRoot?: string;
  worktreeId: string;
};

export type CreateReservedWorktreeResult = {
  branchCreated: boolean;
  gitOperation: 'attach-existing-branch-worktree' | 'create-branch-and-worktree';
  worktree: Awaited<ReturnType<typeof updateWorktreeRecord>>;
};

export type CreateReservedWorktreeDependencies = {
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
    throw new Error(`Worktree creation ${fieldName} is required.`);
  }

  return normalizedValue;
}

function normalizeRepoRoot(repoRoot: string | undefined): string {
  return resolve(repoRoot?.trim() || process.cwd());
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

export async function createReservedWorktree(
  input: CreateReservedWorktreeInput,
  dependencies: CreateReservedWorktreeDependencies = {}
): Promise<CreateReservedWorktreeResult> {
  const getRecordById = dependencies.getRecordById ?? getWorktreeRecordById;
  const updateRecord = dependencies.updateRecord ?? updateWorktreeRecord;
  const pathExists = dependencies.pathExists ?? defaultPathExists;
  const runGitCommand =
    dependencies.runGitCommand ??
    (async ({ args, cwd }) =>
      runCommand({
        args,
        command: 'git',
        cwd
      }));
  const normalizedWorktreeId = normalizeRequiredText(input.worktreeId, 'worktreeId');
  const repoRoot = normalizeRepoRoot(input.repoRoot);
  const record = await getRecordById(normalizedWorktreeId);

  if (!record) {
    throw new Error(`Worktree "${normalizedWorktreeId}" was not found.`);
  }

  if (record.status !== 'RESERVED') {
    throw new Error(
      `Worktree "${record.id}" must be in RESERVED status before creation (received "${record.status}").`
    );
  }

  const filesystemPath = resolve(
    normalizeRequiredText(
      input.filesystemPath ?? record.filesystemPath,
      'filesystemPath'
    )
  );
  let markedAsCreating = false;

  try {
    await updateRecord({
      filesystemPath,
      id: record.id,
      status: 'CREATING'
    });
    markedAsCreating = true;

    await mkdir(dirname(filesystemPath), {
      recursive: true
    });

    const branchExistsResult = await runGitCommand({
      args: ['show-ref', '--verify', '--quiet', `refs/heads/${record.branchName}`],
      cwd: repoRoot
    });

    if (branchExistsResult.exitCode !== 0 && branchExistsResult.exitCode !== 1) {
      ensureSuccessfulGitCommand(branchExistsResult, 'branch lookup');
    }

    const branchAlreadyExists = branchExistsResult.exitCode === 0;
    const worktreeAddArgs = branchAlreadyExists
      ? ['worktree', 'add', filesystemPath, record.branchName]
      : ['worktree', 'add', '-b', record.branchName, filesystemPath, record.baseRef];
    const worktreeCreationResult = await runGitCommand({
      args: worktreeAddArgs,
      cwd: repoRoot
    });

    ensureSuccessfulGitCommand(worktreeCreationResult, 'worktree creation');

    if (!(await pathExists(filesystemPath))) {
      throw new Error(
        `Worktree directory "${filesystemPath}" does not exist after git worktree creation.`
      );
    }

    const readyRecord = await updateRecord({
      filesystemPath,
      id: record.id,
      status: 'READY'
    });

    return {
      branchCreated: !branchAlreadyExists,
      gitOperation: branchAlreadyExists
        ? 'attach-existing-branch-worktree'
        : 'create-branch-and-worktree',
      worktree: readyRecord
    };
  } catch (error) {
    if (markedAsCreating) {
      await updateRecord({
        id: record.id,
        status: 'FAILED'
      }).catch(() => {
        // Failure marking is best effort.
      });
    }

    throw error;
  }
}
