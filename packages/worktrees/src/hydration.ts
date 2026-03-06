import { access, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { arch, platform } from 'node:process';

import { createAttemptRecord } from '@evolvo/api/attempt-record';
import {
  getWorktreeRecordById,
  updateWorktreeRecord
} from '@evolvo/api/worktree-record';

import {
  appendAttemptJournalNote,
  appendAttemptJournalStatusTransition,
  initializeAttemptJournal
} from './attempt-journal.js';
import { runCommand, type CommandExecutionResult } from './command-runner.js';

const requiredRepositoryEntries = ['package.json', 'pnpm-workspace.yaml', 'turbo.json'];
const evolvoMetadataDirectoryName = '.evolvo';
const attemptJournalFileName = 'attempt-journal.json';
const environmentFingerprintFileName = 'environment-fingerprint.json';

export type HydrateWorktreeInput = {
  installDependencies?: boolean;
  installDependenciesArgs?: string[];
  worktreeId: string;
};

export type HydrateWorktreeResult = {
  attemptId: string;
  attemptJournalPath: string;
  environmentFingerprintPath: string;
  installPerformed: boolean;
  worktree: Awaited<ReturnType<typeof updateWorktreeRecord>>;
};

export type HydrateWorktreeDependencies = {
  appendJournalNote?: typeof appendAttemptJournalNote;
  appendJournalStatusTransition?: typeof appendAttemptJournalStatusTransition;
  createAttempt?: typeof createAttemptRecord;
  getRecordById?: typeof getWorktreeRecordById;
  initializeJournal?: typeof initializeAttemptJournal;
  pathExists?: (path: string) => Promise<boolean>;
  runToolCommand?: (input: {
    args: string[];
    command: string;
    cwd: string;
  }) => Promise<CommandExecutionResult>;
  updateRecord?: typeof updateWorktreeRecord;
};

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`Worktree hydration ${fieldName} is required.`);
  }

  return normalizedValue;
}

function normalizeInstallDependenciesArgs(
  installDependenciesArgs: string[] | undefined
): string[] {
  if (!installDependenciesArgs || installDependenciesArgs.length === 0) {
    return ['install', '--frozen-lockfile'];
  }

  return installDependenciesArgs;
}

async function defaultPathExists(path: string): Promise<boolean> {
  try {
    await access(path);

    return true;
  } catch {
    return false;
  }
}

function ensureSuccessfulCommand(
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
    `${operationName} failed with exit code ${result.exitCode}: ${outputSummary}`
  );
}

async function readToolVersion(
  command: string,
  cwd: string,
  runToolCommand: NonNullable<HydrateWorktreeDependencies['runToolCommand']>
): Promise<string> {
  const result = await runToolCommand({
    args: ['--version'],
    command,
    cwd
  });

  ensureSuccessfulCommand(result, `${command} version check`);

  return (result.stdout.trim() || result.stderr.trim()).trim();
}

async function ensureRepositoryShape(
  filesystemPath: string,
  pathExists: NonNullable<HydrateWorktreeDependencies['pathExists']>
): Promise<void> {
  for (const relativeEntry of requiredRepositoryEntries) {
    const absoluteEntryPath = join(filesystemPath, relativeEntry);

    if (!(await pathExists(absoluteEntryPath))) {
      throw new Error(
        `Worktree "${filesystemPath}" is missing required repository entry "${relativeEntry}".`
      );
    }
  }
}

export async function hydrateWorktree(
  input: HydrateWorktreeInput,
  dependencies: HydrateWorktreeDependencies = {}
): Promise<HydrateWorktreeResult> {
  const appendJournalNote = dependencies.appendJournalNote ?? appendAttemptJournalNote;
  const appendJournalStatusTransition =
    dependencies.appendJournalStatusTransition ??
    appendAttemptJournalStatusTransition;
  const createAttempt = dependencies.createAttempt ?? createAttemptRecord;
  const getRecordById = dependencies.getRecordById ?? getWorktreeRecordById;
  const initializeJournal = dependencies.initializeJournal ?? initializeAttemptJournal;
  const updateRecord = dependencies.updateRecord ?? updateWorktreeRecord;
  const pathExists = dependencies.pathExists ?? defaultPathExists;
  const runToolCommand =
    dependencies.runToolCommand ??
    (async ({ args, command, cwd }) =>
      runCommand({
        args,
        command,
        cwd
      }));
  const normalizedWorktreeId = normalizeRequiredText(input.worktreeId, 'worktreeId');
  const installDependencies = input.installDependencies ?? true;
  const installDependenciesArgs = normalizeInstallDependenciesArgs(
    input.installDependenciesArgs
  );
  const record = await getRecordById(normalizedWorktreeId);

  if (!record) {
    throw new Error(`Worktree "${normalizedWorktreeId}" was not found.`);
  }

  if (record.status !== 'READY') {
    throw new Error(
      `Worktree "${record.id}" must be in READY status before hydration (received "${record.status}").`
    );
  }

  const filesystemPath = resolve(
    normalizeRequiredText(record.filesystemPath, 'filesystemPath')
  );
  const metadataDirectoryPath = join(filesystemPath, evolvoMetadataDirectoryName);
  const attemptJournalPath = join(metadataDirectoryPath, attemptJournalFileName);
  const environmentFingerprintPath = join(
    metadataDirectoryPath,
    environmentFingerprintFileName
  );
  let markedAsHydrating = false;

  try {
    await updateRecord({
      id: record.id,
      status: 'HYDRATING'
    });
    markedAsHydrating = true;

    await ensureRepositoryShape(filesystemPath, pathExists);

    const [nodeVersion, pnpmVersion, gitVersion] = await Promise.all([
      readToolVersion('node', filesystemPath, runToolCommand),
      readToolVersion('pnpm', filesystemPath, runToolCommand),
      readToolVersion('git', filesystemPath, runToolCommand)
    ]);
    const attemptRecord = await createAttempt({
      evaluationStatus: 'PENDING',
      issueNumber: record.issueNumber,
      summary: 'Hydration started.',
      worktreeId: record.id
    });

    let installPerformed = false;

    if (installDependencies && !(await pathExists(join(filesystemPath, 'node_modules')))) {
      const installResult = await runToolCommand({
        args: installDependenciesArgs,
        command: 'pnpm',
        cwd: filesystemPath
      });

      ensureSuccessfulCommand(installResult, 'Dependency installation');
      installPerformed = true;
    }

    await mkdir(metadataDirectoryPath, {
      recursive: true
    });

    const capturedAt = new Date();
    const capturedAtIso = capturedAt.toISOString();
    await initializeJournal({
      attemptId: attemptRecord.id,
      branchName: record.branchName,
      createdAt: capturedAt,
      initialStatus: 'HYDRATING',
      initialStatusNote: 'Hydration started.',
      issueNumber: record.issueNumber,
      journalPath: attemptJournalPath,
      worktreeId: record.id
    });
    await appendJournalNote({
      journalPath: attemptJournalPath,
      message: 'Repository shape validated.',
      source: 'hydration'
    });
    await appendJournalNote({
      journalPath: attemptJournalPath,
      message: `Tooling detected (node=${nodeVersion}, pnpm=${pnpmVersion}, git=${gitVersion}).`,
      source: 'hydration'
    });
    await appendJournalNote({
      journalPath: attemptJournalPath,
      message: installPerformed
        ? 'Dependencies installed during hydration.'
        : 'Dependency installation skipped; node_modules already present.',
      source: 'hydration'
    });

    const environmentFingerprint = {
      arch,
      baseRef: record.baseRef,
      branchName: record.branchName,
      capturedAt: capturedAtIso,
      filesystemPath,
      gitVersion,
      issueNumber: record.issueNumber,
      nodeVersion,
      platform,
      pnpmVersion,
      worktreeAttemptId: attemptRecord.id,
      worktreeId: record.id
    };

    await writeFile(
      `${environmentFingerprintPath}`,
      `${JSON.stringify(environmentFingerprint, null, 2)}\n`,
      {
        encoding: 'utf-8'
      }
    );

    const activeRecord = await updateRecord({
      id: record.id,
      status: 'ACTIVE'
    });
    await appendJournalStatusTransition({
      fromStatus: 'HYDRATING',
      journalPath: attemptJournalPath,
      note: 'Hydration completed successfully.',
      toStatus: 'ACTIVE'
    });

    return {
      attemptId: attemptRecord.id,
      attemptJournalPath,
      environmentFingerprintPath,
      installPerformed,
      worktree: activeRecord
    };
  } catch (error) {
    if (markedAsHydrating) {
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
