import { describe, expect, it } from 'vitest';

import {
  canonicalGitHubLabels,
  getCanonicalGitHubLabel,
  humanPolicyLabels
} from './label-taxonomy.js';

describe('canonical GitHub label taxonomy', () => {
  it('contains the full initial taxonomy with unique label names', () => {
    const names = canonicalGitHubLabels.map((label) => label.name);

    expect(canonicalGitHubLabels).toHaveLength(59);
    expect(new Set(names).size).toBe(names.length);
    expect(names.every((name) => name === name.toLowerCase())).toBe(true);
  });

  it('preserves the exact human policy labels required by the system contract', () => {
    expect(humanPolicyLabels.map((label) => label.name)).toEqual([
      'human-made-challenge',
      'evolvo-made-challenge',
      'human-approval-needed'
    ]);
  });

  it('can look up canonical labels by name', () => {
    expect(getCanonicalGitHubLabel('state:triage')).toMatchObject({
      color: 'fbca04',
      description: 'Awaiting classification and routing.',
      group: 'state',
      name: 'state:triage'
    });
    expect(getCanonicalGitHubLabel('does-not-exist')).toBeUndefined();
  });
});
