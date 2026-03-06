import { describe, expect, it, vi } from 'vitest';

import {
  createPullRequest,
  getPullRequest,
  listPullRequests,
  syncPullRequestLabelsFromIssue,
  upsertPullRequestFromBranch,
  updatePullRequest
} from './pull-requests.js';
import type {
  GitHubContext,
  GitHubPullRequest,
  GitHubPullRequestListItem,
  GitHubRestClient
} from './types.js';

describe('GitHub pull request operations', () => {
  it('gets and lists pull requests', async () => {
    const pullRequest = { number: 10 } as GitHubPullRequest;
    const pullRequests = [{ number: 10 }] as GitHubPullRequestListItem[];
    const get = vi.fn().mockResolvedValue({ data: pullRequest });
    const list = vi.fn().mockResolvedValue({ data: pullRequests });
    const context: GitHubContext = {
      octokit: {
        rest: {
          pulls: {
            get,
            list
          }
        }
      } as unknown as GitHubRestClient,
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    expect(await getPullRequest(10, context)).toBe(pullRequest);
    expect(
      await listPullRequests(
        {
          base: 'main',
          direction: 'desc',
          head: 'evolvo-auto:feature/P1-001-integrate-github-api-client',
          page: 1,
          perPage: 20,
          sort: 'updated',
          state: 'open'
        },
        context
      )
    ).toBe(pullRequests);
    expect(get).toHaveBeenCalledWith({
      owner: 'evolvo-auto',
      pull_number: 10,
      repo: 'core'
    });
    expect(list).toHaveBeenCalledWith({
      base: 'main',
      direction: 'desc',
      head: 'evolvo-auto:feature/P1-001-integrate-github-api-client',
      owner: 'evolvo-auto',
      page: 1,
      per_page: 20,
      repo: 'core',
      sort: 'updated',
      state: 'open'
    });
  });

  it('creates and updates pull requests', async () => {
    const pullRequest = { number: 11 } as GitHubPullRequest;
    const create = vi.fn().mockResolvedValue({ data: pullRequest });
    const update = vi.fn().mockResolvedValue({ data: pullRequest });
    const context: GitHubContext = {
      octokit: {
        rest: {
          pulls: {
            create,
            update
          }
        }
      } as unknown as GitHubRestClient,
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    expect(
      await createPullRequest(
        {
          base: 'main',
          body: 'Implements GitHub API client foundation.',
          draft: true,
          head: 'feature/P1-001-integrate-github-api-client',
          maintainerCanModify: true,
          title: 'P1-001 Integrate GitHub API client'
        },
        context
      )
    ).toBe(pullRequest);
    expect(
      await updatePullRequest(
        11,
        {
          base: 'main',
          body: 'Ready for review.',
          maintainerCanModify: false,
          state: 'open',
          title: 'P1-001 Integrate GitHub API client'
        },
        context
      )
    ).toBe(pullRequest);
    expect(create).toHaveBeenCalledWith({
      base: 'main',
      body: 'Implements GitHub API client foundation.',
      draft: true,
      head: 'feature/P1-001-integrate-github-api-client',
      maintainer_can_modify: true,
      owner: 'evolvo-auto',
      repo: 'core',
      title: 'P1-001 Integrate GitHub API client'
    });
    expect(update).toHaveBeenCalledWith({
      base: 'main',
      body: 'Ready for review.',
      maintainer_can_modify: false,
      owner: 'evolvo-auto',
      pull_number: 11,
      repo: 'core',
      state: 'open',
      title: 'P1-001 Integrate GitHub API client'
    });
  });
});

describe('upsert pull request from branch', () => {
  it('creates a pull request when no open pull request exists for the branch', async () => {
    const pullRequest = { number: 21 } as GitHubPullRequest;
    const create = vi.fn().mockResolvedValue({ data: pullRequest });
    const list = vi.fn().mockResolvedValue({ data: [] as GitHubPullRequest[] });
    const update = vi.fn();
    const context: GitHubContext = {
      octokit: {
        rest: {
          pulls: {
            create,
            list,
            update
          }
        }
      } as unknown as GitHubRestClient,
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    expect(
      await upsertPullRequestFromBranch(
        {
          base: 'main',
          body: 'Implements issue branch changes.',
          branchName: 'issue/21-improve-routing',
          draft: true,
          maintainerCanModify: true,
          title: 'feat(issue-21): improve routing behavior'
        },
        context
      )
    ).toEqual({
      action: 'created',
      branchName: 'issue/21-improve-routing',
      pullRequest,
      pullRequestNumber: 21
    });
    expect(list).toHaveBeenCalledWith({
      base: 'main',
      direction: 'desc',
      head: 'evolvo-auto:issue/21-improve-routing',
      owner: 'evolvo-auto',
      per_page: 10,
      repo: 'core',
      sort: 'updated',
      state: 'open'
    });
    expect(create).toHaveBeenCalledWith({
      base: 'main',
      body: 'Implements issue branch changes.',
      draft: true,
      head: 'issue/21-improve-routing',
      maintainer_can_modify: true,
      owner: 'evolvo-auto',
      repo: 'core',
      title: 'feat(issue-21): improve routing behavior'
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('updates an existing pull request when one open pull request already matches the branch', async () => {
    const pullRequest = { number: 22 } as GitHubPullRequest;
    const create = vi.fn();
    const list = vi.fn().mockResolvedValue({
      data: [{ number: 22 }] as GitHubPullRequestListItem[]
    });
    const update = vi.fn().mockResolvedValue({ data: pullRequest });
    const context: GitHubContext = {
      octokit: {
        rest: {
          pulls: {
            create,
            list,
            update
          }
        }
      } as unknown as GitHubRestClient,
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    expect(
      await upsertPullRequestFromBranch(
        {
          base: 'main',
          body: 'Includes evaluation summary and final polish.',
          branchName: 'evolvo-auto:issue/22-build-pr-upsert',
          maintainerCanModify: false,
          title: 'fix(issue-22): finalize PR upsert behavior'
        },
        context
      )
    ).toEqual({
      action: 'updated',
      branchName: 'issue/22-build-pr-upsert',
      pullRequest,
      pullRequestNumber: 22
    });
    expect(list).toHaveBeenCalledWith({
      base: 'main',
      direction: 'desc',
      head: 'evolvo-auto:issue/22-build-pr-upsert',
      owner: 'evolvo-auto',
      per_page: 10,
      repo: 'core',
      sort: 'updated',
      state: 'open'
    });
    expect(update).toHaveBeenCalledWith({
      base: 'main',
      body: 'Includes evaluation summary and final polish.',
      maintainer_can_modify: false,
      owner: 'evolvo-auto',
      pull_number: 22,
      repo: 'core',
      state: undefined,
      title: 'fix(issue-22): finalize PR upsert behavior'
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects blank branch names before calling GitHub', async () => {
    const create = vi.fn();
    const list = vi.fn();
    const update = vi.fn();
    const context: GitHubContext = {
      octokit: {
        rest: {
          pulls: {
            create,
            list,
            update
          }
        }
      } as unknown as GitHubRestClient,
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    await expect(
      upsertPullRequestFromBranch(
        {
          base: 'main',
          branchName: '   ',
          title: 'feat(issue-23): invalid branch name test'
        },
        context
      )
    ).rejects.toThrow('Pull request branch name is required.');
    expect(list).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects ambiguous matches when multiple open pull requests share the same branch', async () => {
    const create = vi.fn();
    const list = vi.fn().mockResolvedValue({
      data: [
        { number: 30 },
        { number: 31 }
      ] as unknown as GitHubPullRequestListItem[]
    });
    const update = vi.fn();
    const context: GitHubContext = {
      octokit: {
        rest: {
          pulls: {
            create,
            list,
            update
          }
        }
      } as unknown as GitHubRestClient,
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    await expect(
      upsertPullRequestFromBranch(
        {
          base: 'main',
          branchName: 'issue/30-ambiguous-branch',
          title: 'feat(issue-30): ambiguous branch'
        },
        context
      )
    ).rejects.toThrow(
      'Multiple open pull requests found for branch "evolvo-auto:issue/30-ambiguous-branch": #30, #31'
    );
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
});

describe('sync pull request labels from issue', () => {
  it('mirrors kind/surface/risk labels from issue to pull request and preserves other pull request labels', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        labels: [
          { name: 'kind:feature' },
          { name: 'surface:routing' },
          { name: 'risk:low' },
          { name: 'state:in-progress' }
        ]
      }
    });
    const listLabelsOnIssue = vi.fn().mockResolvedValue({
      data: [
        { name: 'kind:bug' },
        { name: 'surface:runtime' },
        { name: 'risk:high' },
        { name: 'eval:pending' },
        { name: 'promotion:candidate' }
      ]
    });
    const setLabels = vi.fn().mockResolvedValue({
      data: [
        { name: 'eval:pending' },
        { name: 'promotion:candidate' },
        { name: 'kind:feature' },
        { name: 'surface:routing' },
        { name: 'risk:low' }
      ]
    });
    const context: GitHubContext = {
      octokit: {
        rest: {
          issues: {
            get,
            listLabelsOnIssue,
            setLabels
          },
          pulls: {}
        }
      } as unknown as GitHubRestClient,
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    expect(await syncPullRequestLabelsFromIssue(301, 41, {}, context)).toEqual({
      changed: true,
      currentPullRequestLabels: [
        'kind:bug',
        'surface:runtime',
        'risk:high',
        'eval:pending',
        'promotion:candidate'
      ],
      dryRun: false,
      issueNumber: 301,
      mirroredLabelNames: ['kind:feature', 'surface:routing', 'risk:low'],
      nextPullRequestLabels: [
        'eval:pending',
        'promotion:candidate',
        'kind:feature',
        'surface:routing',
        'risk:low'
      ],
      pullRequestNumber: 41
    });
    expect(get).toHaveBeenCalledWith({
      issue_number: 301,
      owner: 'evolvo-auto',
      repo: 'core'
    });
    expect(listLabelsOnIssue).toHaveBeenCalledWith({
      issue_number: 41,
      owner: 'evolvo-auto',
      per_page: 100,
      repo: 'core'
    });
    expect(setLabels).toHaveBeenCalledWith({
      issue_number: 41,
      labels: [
        'eval:pending',
        'promotion:candidate',
        'kind:feature',
        'surface:routing',
        'risk:low'
      ],
      owner: 'evolvo-auto',
      repo: 'core'
    });
  });

  it('supports dry-run mode without writing pull request labels', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        labels: [{ name: 'kind:feature' }]
      }
    });
    const listLabelsOnIssue = vi.fn().mockResolvedValue({
      data: [{ name: 'kind:bug' }, { name: 'eval:pending' }]
    });
    const setLabels = vi.fn();
    const context: GitHubContext = {
      octokit: {
        rest: {
          issues: {
            get,
            listLabelsOnIssue,
            setLabels
          },
          pulls: {}
        }
      } as unknown as GitHubRestClient,
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    const result = await syncPullRequestLabelsFromIssue(
      302,
      42,
      {
        dryRun: true
      },
      context
    );

    expect(result.changed).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(setLabels).not.toHaveBeenCalled();
  });

  it('returns unchanged when pull request already has mirrored labels', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        labels: [{ name: 'kind:feature' }, { name: 'surface:routing' }]
      }
    });
    const listLabelsOnIssue = vi.fn().mockResolvedValue({
      data: [
        { name: 'kind:feature' },
        { name: 'surface:routing' },
        { name: 'eval:passed' }
      ]
    });
    const setLabels = vi.fn();
    const context: GitHubContext = {
      octokit: {
        rest: {
          issues: {
            get,
            listLabelsOnIssue,
            setLabels
          },
          pulls: {}
        }
      } as unknown as GitHubRestClient,
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    const result = await syncPullRequestLabelsFromIssue(303, 43, {}, context);

    expect(result.changed).toBe(false);
    expect(result.nextPullRequestLabels).toEqual([
      'kind:feature',
      'surface:routing',
      'eval:passed'
    ]);
    expect(setLabels).not.toHaveBeenCalled();
  });

  it('supports custom mirror prefixes and rejects empty prefix configurations', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          labels: [{ name: 'source:evolvo' }, { name: 'state:planned' }]
        }
      })
      .mockResolvedValueOnce({
        data: {
          labels: [{ name: 'source:evolvo' }]
        }
      });
    const listLabelsOnIssue = vi
      .fn()
      .mockResolvedValueOnce({
        data: [{ name: 'source:human' }, { name: 'eval:pending' }]
      })
      .mockResolvedValueOnce({
        data: [{ name: 'source:human' }]
      });
    const setLabels = vi.fn().mockResolvedValue({
      data: [{ name: 'eval:pending' }, { name: 'source:evolvo' }]
    });
    const context: GitHubContext = {
      octokit: {
        rest: {
          issues: {
            get,
            listLabelsOnIssue,
            setLabels
          },
          pulls: {}
        }
      } as unknown as GitHubRestClient,
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    const customResult = await syncPullRequestLabelsFromIssue(
      304,
      44,
      {
        mirrorPrefixes: ['source:']
      },
      context
    );

    expect(customResult.changed).toBe(true);
    expect(customResult.mirroredLabelNames).toEqual(['source:evolvo']);
    expect(customResult.nextPullRequestLabels).toEqual([
      'eval:pending',
      'source:evolvo'
    ]);
    expect(setLabels).toHaveBeenCalledWith({
      issue_number: 44,
      labels: ['eval:pending', 'source:evolvo'],
      owner: 'evolvo-auto',
      repo: 'core'
    });

    await expect(
      syncPullRequestLabelsFromIssue(
        305,
        45,
        {
          mirrorPrefixes: ['   ']
        },
        context
      )
    ).rejects.toThrow(
      'At least one pull request label mirror prefix is required.'
    );
  });
});
