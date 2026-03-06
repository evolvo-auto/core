import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { hydrateWorktree } from './hydration.js';
import type { CommandExecutionResult } from './command-runner.js';

async function createWorktreeDirectory(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'evolvo-worktree-hydrate-'));
}

async function seedRepositoryShape(worktreePath: string): Promise<void> {
  await writeFile(join(worktreePath, 'package.json'), '{ "name": "fixture" }\n', {
    encoding: 'utf-8'
  });
  await writeFile(join(worktreePath, 'pnpm-workspace.yaml'), 'packages:\n  - .\n', {
    encoding: 'utf-8'
  });
  await writeFile(join(worktreePath, 'turbo.json'), '{ "tasks": {} }\n', {
    encoding: 'utf-8'
  });
}

function okResult(
  command: string,
  args: string[],
  stdout: string
): CommandExecutionResult {
  return {
    args,
    command,
    cwd: '/tmp',
    durationMs: 0,
    exitCode: 0,
    stderr: '',
    stdout,
    timedOut: false
  };
}

describe('hydrateWorktree', () => {
  const createdDirectories: string[] = [];

  afterEach(async () => {
    vi.clearAllMocks();

    while (createdDirectories.length > 0) {
      const directory = createdDirectories.pop();

      if (!directory) {
        continue;
      }

      await rm(directory, {
        force: true,
        recursive: true
      });
    }
  });

  it('hydrates a ready worktree, installs dependencies when missing, and writes metadata files', async () => {
    const worktreePath = await createWorktreeDirectory();
    createdDirectories.push(worktreePath);
    await seedRepositoryShape(worktreePath);
    const getRecordById = vi.fn().mockResolvedValue({
      baseRef: 'main',
      branchName: 'issue/500-improve-hydration',
      filesystemPath: worktreePath,
      id: 'wt_500',
      issueNumber: 500,
      status: 'READY'
    });
    const updateRecord = vi
      .fn()
      .mockResolvedValueOnce({
        id: 'wt_500',
        status: 'HYDRATING'
      })
      .mockResolvedValueOnce({
        id: 'wt_500',
        status: 'ACTIVE'
      });
    const runToolCommand = vi.fn(async ({ args, command }) => {
      if (command === 'node' && args[0] === '--version') {
        return okResult(command, args, 'v22.19.0\n');
      }

      if (command === 'pnpm' && args[0] === '--version') {
        return okResult(command, args, '10.28.1\n');
      }

      if (command === 'git' && args[0] === '--version') {
        return okResult(command, args, 'git version 2.43.0\n');
      }

      if (command === 'pnpm' && args[0] === 'install') {
        return okResult(command, args, 'installed\n');
      }

      throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
    });

    const result = await hydrateWorktree(
      {
        worktreeId: 'wt_500'
      },
      {
        getRecordById,
        runToolCommand,
        updateRecord
      }
    );

    expect(result.installPerformed).toBe(true);
    expect(updateRecord).toHaveBeenNthCalledWith(1, {
      id: 'wt_500',
      status: 'HYDRATING'
    });
    expect(updateRecord).toHaveBeenNthCalledWith(2, {
      id: 'wt_500',
      status: 'ACTIVE'
    });
    expect(runToolCommand).toHaveBeenCalledWith({
      args: ['install', '--frozen-lockfile'],
      command: 'pnpm',
      cwd: worktreePath
    });

    const attemptJournal = JSON.parse(
      await readFile(result.attemptJournalPath, 'utf-8')
    ) as {
      stage: string;
      steps: Array<{ name: string; status: string }>;
      worktreeId: string;
    };
    const environmentFingerprint = JSON.parse(
      await readFile(result.environmentFingerprintPath, 'utf-8')
    ) as {
      branchName: string;
      nodeVersion: string;
      pnpmVersion: string;
      worktreeId: string;
    };

    expect(attemptJournal.worktreeId).toBe('wt_500');
    expect(attemptJournal.stage).toBe('hydrating');
    expect(attemptJournal.steps.at(-1)?.name).toBe('install-dependencies');
    expect(environmentFingerprint.worktreeId).toBe('wt_500');
    expect(environmentFingerprint.branchName).toBe('issue/500-improve-hydration');
    expect(environmentFingerprint.nodeVersion).toBe('v22.19.0');
    expect(environmentFingerprint.pnpmVersion).toBe('10.28.1');
  });

  it('skips installation when node_modules already exists', async () => {
    const worktreePath = await createWorktreeDirectory();
    createdDirectories.push(worktreePath);
    await seedRepositoryShape(worktreePath);
    await mkdir(join(worktreePath, 'node_modules'), {
      recursive: true
    });
    const getRecordById = vi.fn().mockResolvedValue({
      baseRef: 'main',
      branchName: 'issue/501-skip-install',
      filesystemPath: worktreePath,
      id: 'wt_501',
      issueNumber: 501,
      status: 'READY'
    });
    const updateRecord = vi
      .fn()
      .mockResolvedValueOnce({
        id: 'wt_501',
        status: 'HYDRATING'
      })
      .mockResolvedValueOnce({
        id: 'wt_501',
        status: 'ACTIVE'
      });
    const runToolCommand = vi.fn(async ({ args, command }) => {
      if (command === 'node' && args[0] === '--version') {
        return okResult(command, args, 'v22.19.0\n');
      }

      if (command === 'pnpm' && args[0] === '--version') {
        return okResult(command, args, '10.28.1\n');
      }

      if (command === 'git' && args[0] === '--version') {
        return okResult(command, args, 'git version 2.43.0\n');
      }

      throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
    });

    const result = await hydrateWorktree(
      {
        worktreeId: 'wt_501'
      },
      {
        getRecordById,
        runToolCommand,
        updateRecord
      }
    );

    expect(result.installPerformed).toBe(false);
    expect(
      runToolCommand.mock.calls.some(
        ([call]) =>
          call.command === 'pnpm' && Array.isArray(call.args) && call.args[0] === 'install'
      )
    ).toBe(false);
  });

  it('marks the worktree as failed when hydration cannot verify repository shape', async () => {
    const worktreePath = await createWorktreeDirectory();
    createdDirectories.push(worktreePath);
    await writeFile(join(worktreePath, 'package.json'), '{ "name": "fixture" }\n', {
      encoding: 'utf-8'
    });
    const getRecordById = vi.fn().mockResolvedValue({
      baseRef: 'main',
      branchName: 'issue/502-invalid-shape',
      filesystemPath: worktreePath,
      id: 'wt_502',
      issueNumber: 502,
      status: 'READY'
    });
    const updateRecord = vi
      .fn()
      .mockResolvedValueOnce({
        id: 'wt_502',
        status: 'HYDRATING'
      })
      .mockResolvedValueOnce({
        id: 'wt_502',
        status: 'FAILED'
      });
    const runToolCommand = vi.fn();

    await expect(
      hydrateWorktree(
        {
          worktreeId: 'wt_502'
        },
        {
          getRecordById,
          runToolCommand,
          updateRecord
        }
      )
    ).rejects.toThrow(
      `Worktree "${worktreePath}" is missing required repository entry "pnpm-workspace.yaml".`
    );

    expect(updateRecord).toHaveBeenNthCalledWith(2, {
      id: 'wt_502',
      status: 'FAILED'
    });
    expect(runToolCommand).not.toHaveBeenCalled();
  });
});
