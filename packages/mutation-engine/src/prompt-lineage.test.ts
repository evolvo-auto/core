import { describe, expect, it, vi } from 'vitest';

import { applyPromptLineage } from './prompt-lineage.ts';

describe('prompt lineage', () => {
  it('bumps prompt metadata for changed genome prompt files', async () => {
    const read = vi.fn().mockResolvedValue(`
export const plannerPrompt = createPromptDefinition({
  promptKey: 'planner',
  responseMode: 'json',
  role: 'planner',
  title: 'Planner issue decomposition',
  version: 1
});
`);
    const write = vi.fn().mockResolvedValue(undefined);

    await expect(
      applyPromptLineage(
        {
          changedFiles: ['genome/prompts/planner.ts'],
          lineageReason: 'Improve planner schema output reliability.',
          mutationProposalId: 'mutation_1',
          worktreePath: '/repo/worktree'
        },
        {
          read: read as never,
          write: write as never
        }
      )
    ).resolves.toEqual(['genome/prompts/planner.ts']);

    expect(write).toHaveBeenCalledWith(
      '/repo/worktree/genome/prompts/planner.ts',
      expect.stringContaining('sourceMutationId: "mutation_1"'),
      'utf-8'
    );
    expect(write).toHaveBeenCalledWith(
      '/repo/worktree/genome/prompts/planner.ts',
      expect.stringContaining('lineageParentVersion: 1'),
      'utf-8'
    );
    expect(write).toHaveBeenCalledWith(
      '/repo/worktree/genome/prompts/planner.ts',
      expect.stringContaining('version: 2'),
      'utf-8'
    );
  });
});
