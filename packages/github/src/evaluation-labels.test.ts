import { describe, expect, it, vi } from 'vitest';

import {
  syncIssueEvaluationLabel,
  syncPullRequestEvaluationLabel
} from './evaluation-labels.js';
import type { GitHubContext } from './types.js';

describe('evaluation label sync', () => {
  it('replaces existing issue evaluation labels and preserves non-evaluation labels', async () => {
    const setLabels = vi.fn().mockResolvedValue(undefined);
    const context = {
      octokit: {
        rest: {
          issues: {
            get: vi.fn().mockResolvedValue({
              data: {
                labels: ['kind:feature', 'eval:pending', { name: 'state:triage' }]
              }
            }),
            setLabels
          }
        }
      },
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    } as unknown as GitHubContext;

    const result = await syncIssueEvaluationLabel(101, 'eval:passed', context);

    expect(result).toEqual({
      changed: true,
      currentLabels: ['kind:feature', 'eval:pending', 'state:triage'],
      nextLabels: ['kind:feature', 'state:triage', 'eval:passed']
    });
    expect(setLabels).toHaveBeenCalledWith({
      issue_number: 101,
      labels: ['kind:feature', 'state:triage', 'eval:passed'],
      owner: 'evolvo-auto',
      repo: 'core'
    });
  });

  it('does not rewrite issue labels when the requested evaluation label is already present', async () => {
    const setLabels = vi.fn().mockResolvedValue(undefined);
    const context = {
      octokit: {
        rest: {
          issues: {
            get: vi.fn().mockResolvedValue({
              data: {
                labels: ['kind:bug', 'eval:failed']
              }
            }),
            setLabels
          }
        }
      },
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    } as unknown as GitHubContext;

    await expect(
      syncIssueEvaluationLabel(102, 'eval:failed', context)
    ).resolves.toEqual({
      changed: false,
      currentLabels: ['kind:bug', 'eval:failed'],
      nextLabels: ['kind:bug', 'eval:failed']
    });

    expect(setLabels).not.toHaveBeenCalled();
  });

  it('replaces pull request evaluation labels using the issue labels endpoint', async () => {
    const listLabelsOnIssue = vi.fn().mockResolvedValue({
      data: [{ name: 'source:human' }, { name: 'eval:partial' }]
    });
    const setLabels = vi.fn().mockResolvedValue(undefined);
    const context = {
      octokit: {
        rest: {
          issues: {
            listLabelsOnIssue,
            setLabels
          }
        }
      },
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    } as unknown as GitHubContext;

    const result = await syncPullRequestEvaluationLabel(
      55,
      'eval:regressed',
      context
    );

    expect(result).toEqual({
      changed: true,
      currentLabels: ['source:human', 'eval:partial'],
      nextLabels: ['source:human', 'eval:regressed']
    });
    expect(listLabelsOnIssue).toHaveBeenCalledWith({
      issue_number: 55,
      owner: 'evolvo-auto',
      per_page: 100,
      repo: 'core'
    });
    expect(setLabels).toHaveBeenCalledWith({
      issue_number: 55,
      labels: ['source:human', 'eval:regressed'],
      owner: 'evolvo-auto',
      repo: 'core'
    });
  });
});
