import { describe, expect, it, vi } from 'vitest';

import {
  narratorOutputSchema,
  type NarratorOutput
} from '@evolvo/schemas/role-output-schemas';

import { runNarratorRole } from './narrator-role.js';

describe('runNarratorRole', () => {
  it('returns a github-ready narrator payload matching the target context', async () => {
    const narratorOutput: NarratorOutput = {
      body: 'Implemented planner and selector roles with full schema validation.',
      commentKind: 'progress',
      target: 'issue',
      targetNumber: 701,
      title: 'Role implementation progress'
    };
    const invokeRole = vi.fn().mockResolvedValue({
      output: narratorOutput
    });

    await expect(
      runNarratorRole(
        {
          commentKind: 'progress',
          summary: 'Planner and selector roles are complete.',
          target: 'issue',
          targetNumber: 701
        },
        invokeRole
      )
    ).resolves.toEqual(narratorOutput);

    expect(invokeRole).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'narrator',
        schema: narratorOutputSchema,
        taskKind: 'github-narration'
      })
    );
  });

  it('throws when output target metadata diverges from requested target metadata', async () => {
    const invokeRole = vi.fn().mockResolvedValue({
      output: {
        body: 'Body',
        commentKind: 'progress',
        target: 'pull-request',
        targetNumber: 55,
        title: 'Wrong target'
      } satisfies NarratorOutput
    });

    await expect(
      runNarratorRole(
        {
          commentKind: 'progress',
          summary: 'Summary',
          target: 'issue',
          targetNumber: 702
        },
        invokeRole
      )
    ).rejects.toThrow(
      'Narrator output target "pull-request" did not match input target "issue".'
    );
  });
});
