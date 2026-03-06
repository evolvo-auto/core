import { describe, expect, it } from 'vitest';

import {
  classifyIssue,
  extractNormalizedIssueLabelNames
} from './issue-classification.js';
import type { GitHubIssueListItem } from './types.js';

describe('issue classification', () => {
  it('normalizes labels and prefers explicit taxonomy labels', () => {
    const issue = {
      labels: [
        { name: ' STATE:PLANNED ' },
        { name: 'kind:feature' },
        { name: 'source:evolvo' },
        { name: 'risk:high' },
        { name: 'priority:p1' },
        { name: 'surface:runtime' },
        { name: 'surface:github-ops' },
        { name: 'surface:runtime' }
      ],
      number: 31,
      title: '  Build cache  '
    } as unknown as GitHubIssueListItem;

    expect(extractNormalizedIssueLabelNames(issue)).toEqual([
      'state:planned',
      'kind:feature',
      'source:evolvo',
      'risk:high',
      'priority:p1',
      'surface:runtime',
      'surface:github-ops'
    ]);

    expect(classifyIssue(issue)).toEqual({
      currentLabels: [
        'state:planned',
        'kind:feature',
        'source:evolvo',
        'risk:high',
        'priority:p1',
        'surface:runtime',
        'surface:github-ops'
      ],
      githubIssueNumber: 31,
      kind: 'FEATURE',
      priorityScore: 75,
      riskLevel: 'HIGH',
      source: 'EVOLVO',
      state: 'PLANNED',
      surfaces: ['RUNTIME', 'GITHUB_OPS'],
      title: 'Build cache'
    });
  });

  it('infers kind, source, and surfaces when taxonomy labels are missing', () => {
    const issue = {
      body: 'Adjust supervisor shadow mode and routing fallback.',
      labels: [],
      number: 77,
      title: 'Mutation: Improve runtime promotion behavior',
      user: {
        type: 'User'
      }
    } as unknown as GitHubIssueListItem;

    expect(classifyIssue(issue)).toEqual({
      currentLabels: [],
      githubIssueNumber: 77,
      kind: 'MUTATION',
      priorityScore: undefined,
      riskLevel: undefined,
      source: 'EVOLVO',
      state: 'TRIAGE',
      surfaces: ['ROUTING', 'RUNTIME', 'SUPERVISOR'],
      title: 'Mutation: Improve runtime promotion behavior'
    });
  });

  it('derives challenge classification from policy labels and uses title fallback', () => {
    const issue = {
      body: 'Need a Next.js dashboard smoke flow for challenge validation.',
      labels: [{ name: 'human-made-challenge' }],
      number: 44,
      title: '   '
    } as unknown as GitHubIssueListItem;

    expect(classifyIssue(issue)).toEqual({
      currentLabels: ['human-made-challenge'],
      githubIssueNumber: 44,
      kind: 'CHALLENGE',
      priorityScore: undefined,
      riskLevel: undefined,
      source: 'HUMAN',
      state: 'TRIAGE',
      surfaces: ['DASHBOARD'],
      title: 'Issue 44'
    });
  });
});
