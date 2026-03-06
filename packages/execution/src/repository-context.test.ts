import { describe, expect, it } from 'vitest';

import { selectRepositoryContextPaths } from './repository-context.js';

describe('selectRepositoryContextPaths', () => {
  it('prioritizes repository files that match planner and issue keywords', () => {
    const selectedPaths = selectRepositoryContextPaths({
      body: 'The runtime loop should select issues and write GitHub updates.',
      filePaths: [
        'package.json',
        'apps/runtime/src/server.ts',
        'packages/execution/src/runtime-loop.ts',
        'packages/github/src/issues.ts',
        'packages/ui/src/button.tsx'
      ],
      maxFiles: 3,
      plannerOutput: {
        capabilityTags: ['typescript'],
        objective: 'Implement the runtime loop.',
        relevantSurfaces: ['runtime', 'github-ops'],
        title: 'Build the autonomous runtime loop'
      },
      title: 'Implement runtime loop'
    });

    expect(selectedPaths).toEqual([
      'packages/execution/src/runtime-loop.ts',
      'packages/github/src/issues.ts',
      'apps/runtime/src/server.ts'
    ]);
  });
});
