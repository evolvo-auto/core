import { describe, expect, it, vi } from 'vitest';

import {
  builderOutputSchema,
  type BuilderOutput
} from '@evolvo/schemas/role-output-schemas';

import { runBuilderRole } from './builder-role.js';

describe('runBuilderRole', () => {
  it('invokes the builder route and returns validated builder output', async () => {
    const builderOutput: BuilderOutput = {
      believesReadyForEvaluation: true,
      commandsSuggested: [
        {
          command: 'pnpm typecheck',
          name: 'typecheck'
        }
      ],
      filesActuallyChanged: ['packages/execution/src/runtime-loop.ts'],
      filesIntendedToChange: ['packages/execution/src/runtime-loop.ts'],
      implementationNotes: ['Added the autonomous runtime loop wiring.'],
      issueNumber: 401,
      possibleKnownRisks: ['GitHub API rate limiting may require backoff tuning.'],
      summary: 'Implemented the runtime loop and execution pipeline glue.'
    };
    const invokeRole = vi.fn().mockResolvedValue({
      output: builderOutput
    });

    await expect(
      runBuilderRole(
        {
          filesActuallyChanged: ['packages/execution/src/runtime-loop.ts'],
          filesIntendedToChange: ['packages/execution/src/runtime-loop.ts'],
          issueNumber: 401,
          objective: 'Implement the runtime loop.'
        },
        invokeRole
      )
    ).resolves.toEqual(builderOutput);

    expect(invokeRole).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'builder',
        schema: builderOutputSchema,
        taskKind: 'implementation-summary'
      })
    );
  });

  it('throws when the builder output issue number does not match the input', async () => {
    const invokeRole = vi.fn().mockResolvedValue({
      output: {
        believesReadyForEvaluation: false,
        commandsSuggested: [],
        filesActuallyChanged: [],
        filesIntendedToChange: [],
        implementationNotes: [],
        issueNumber: 999,
        possibleKnownRisks: [],
        summary: 'Wrong issue number.'
      } satisfies BuilderOutput
    });

    await expect(
      runBuilderRole(
        {
          issueNumber: 402
        },
        invokeRole
      )
    ).rejects.toThrow(
      'Builder output issueNumber "999" did not match input issueNumber "402".'
    );
  });
});
