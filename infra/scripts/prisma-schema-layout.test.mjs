import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('split Prisma schema layout', () => {
  it('keeps schema.prisma limited to generator and datasource blocks', async () => {
    const schemaPath = resolve(
      process.cwd(),
      'packages/api/prisma/schema.prisma'
    );
    const source = await readFile(schemaPath, 'utf8');

    expect(source).toContain('generator client');
    expect(source).toContain('datasource db');
    expect(source).not.toContain('model ');
    expect(source).not.toContain('enum ');
  });

  it('stores schema models under packages/api/prisma/models', async () => {
    const modelsRoot = resolve(process.cwd(), 'packages/api/prisma/models');
    const topLevelEntries = await readdir(modelsRoot, { withFileTypes: true });

    expect(topLevelEntries.some((entry) => entry.isDirectory())).toBe(true);

    const expectedFiles = [
      'benchmarks/benchmark-run.prisma',
      'execution/attempt.prisma',
      'failures/failure-record.prisma',
      'github/github-audit-event.prisma',
      'invocations/model-invocation.prisma',
      'issues/issue-record.prisma',
      'mutations/mutation-outcome.prisma',
      'mutations/mutation-proposal-failure.prisma',
      'mutations/mutation-proposal.prisma',
      'runtime/runtime-version.prisma',
      'shared/enums.prisma',
      'worktrees/worktree-record.prisma'
    ];

    for (const file of expectedFiles) {
      const content = await readFile(resolve(modelsRoot, file), 'utf8');
      expect(content.length).toBeGreaterThan(0);
    }
  });
});
