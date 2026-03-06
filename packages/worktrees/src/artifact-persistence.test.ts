import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import { persistWorktreeArtifacts } from './artifact-persistence.js';

describe('persistWorktreeArtifacts', () => {
  const createdDirectories: string[] = [];

  afterEach(async () => {
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

  it('persists artifacts and writes a manifest outside the worktree path', async () => {
    const artifactsRoot = await mkdtemp(join(tmpdir(), 'evolvo-artifacts-'));
    createdDirectories.push(artifactsRoot);

    const result = await persistWorktreeArtifacts({
      artifacts: [
        {
          artifactType: 'command-log',
          content: 'pnpm run test\n'
        },
        {
          artifactType: 'evaluation-report',
          content: '{"outcome":"passed"}\n',
          fileName: 'evaluation report.json'
        }
      ],
      artifactsRoot,
      attemptId: 'att_500',
      worktreeId: 'wt_500'
    });

    expect(result.persistedArtifacts).toHaveLength(2);
    expect(result.artifactsDirectoryPath).toContain(
      'worktrees/wt_500/attempts/att_500'
    );
    await expect(readFile(result.persistedArtifacts[0].path, 'utf-8')).resolves.toBe(
      'pnpm run test\n'
    );
    await expect(readFile(result.persistedArtifacts[1].path, 'utf-8')).resolves.toBe(
      '{"outcome":"passed"}\n'
    );
    await expect(readFile(result.manifestPath, 'utf-8')).resolves.toContain(
      '"attemptId": "att_500"'
    );
    expect(result.persistedArtifacts[1].fileName).toBe('evaluation-report.json');
  });

  it('rejects empty artifact batches', async () => {
    await expect(
      persistWorktreeArtifacts({
        artifacts: [],
        attemptId: 'att_501',
        worktreeId: 'wt_501'
      })
    ).rejects.toThrow('Artifact persistence requires at least one artifact.');
  });
});
