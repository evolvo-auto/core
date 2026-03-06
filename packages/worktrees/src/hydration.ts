import { access, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { arch, platform } from 'node:process';

import {
  getWorktreeRecordById,
  updateWorktreeRecord
} from '@evolvo/api/worktree-record';

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
  attemptJournalPath: string;
  environmentFingerprintPath: string;
  installPerformed: boolean;
  worktree: Awaited<ReturnType<typeof updateWorktreeRecord>>;
};

export type HydrateWorktreeDependencies = {
  getRecordById?: typeof getWorktreeRecordById;
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
  const getRecordById = dependencies.getRecordById ?? getWorktreeRecordById;
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

    const createdAt = new Date().toISOString();
    const attemptJournal = {
      branchName: record.branchName,
      createdAt,
      issueNumber: record.issueNumber,
      stage: 'hydrating',
      steps: [
        {
          name: 'verify-repo-shape',
          status: 'passed'
        },
        {
          name: 'confirm-required-tools',
          status: 'passed'
        },
        {
          name: installPerformed
            ? 'install-dependencies'
            : 'install-dependencies-skipped',
          status: 'passed'
        }
      ],
      worktreeId: record.id
    };
    const environmentFingerprint = {
      arch,
      baseRef: record.baseRef,
      branchName: record.branchName,
      capturedAt: createdAt,
      filesystemPath,
      gitVersion,
      issueNumber: record.issueNumber,
      nodeVersion,
      platform,
      pnpmVersion,
      worktreeId: record.id
    };

    await writeFile(`${attemptJournalPath}`, `${JSON.stringify(attemptJournal, null, 2)}\n`, {
      encoding: 'utf-8'
    });
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

    return {
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
