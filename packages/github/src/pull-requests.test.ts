import { describe, expect, it, vi } from 'vitest';

import {
  createPullRequest,
  getPullRequest,
  listPullRequests,
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
