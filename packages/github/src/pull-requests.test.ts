import { describe, expect, it, vi } from 'vitest';

import {
  createPullRequest,
  getPullRequest,
  listPullRequests,
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
