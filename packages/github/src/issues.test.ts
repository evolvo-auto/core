import { describe, expect, it, vi } from 'vitest';

import {
  addIssueLabels,
  createRepositoryIssue,
  getIssue,
  listRepositoryIssues,
  removeIssueLabel,
  replaceIssueLabels
} from './issues.js';
import type {
  GitHubContext,
  GitHubIssue,
  GitHubIssueLabelMutationResult,
  GitHubIssueListItem,
  GitHubRestClient
} from './types.js';

describe('GitHub issue operations', () => {
  it('creates a repository issue with labels', async () => {
    const issue = { number: 33 } as GitHubIssue;
    const create = vi.fn().mockResolvedValue({ data: issue });
    const context: GitHubContext = {
      octokit: {
        rest: {
          issues: {
            create
          }
        }
      } as unknown as GitHubRestClient,
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    expect(
      await createRepositoryIssue(
        {
          body: 'Follow-up from issue #14',
          labels: ['source:evolvo', 'kind:failure'],
          title: 'Failure: repeated schema validation'
        },
        context
      )
    ).toBe(issue);
    expect(create).toHaveBeenCalledWith({
      body: 'Follow-up from issue #14',
      labels: ['source:evolvo', 'kind:failure'],
      owner: 'evolvo-auto',
      repo: 'core',
      title: 'Failure: repeated schema validation'
    });
  });

  it('gets a single issue by number', async () => {
    const issue = { number: 42 } as GitHubIssue;
    const get = vi.fn().mockResolvedValue({ data: issue });
    const context: GitHubContext = {
      octokit: {
        rest: {
          issues: {
            get
          }
        }
      } as unknown as GitHubRestClient,
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    expect(await getIssue(42, context)).toBe(issue);
    expect(get).toHaveBeenCalledWith({
      issue_number: 42,
      owner: 'evolvo-auto',
      repo: 'core'
    });
  });

  it('lists repository issues with camelCase option mapping', async () => {
    const issues = [{ number: 7 }] as GitHubIssueListItem[];
    const listForRepo = vi.fn().mockResolvedValue({ data: issues });
    const context: GitHubContext = {
      octokit: {
        rest: {
          issues: {
            listForRepo
          }
        }
      } as unknown as GitHubRestClient,
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    expect(
      await listRepositoryIssues(
        {
          direction: 'desc',
          labels: ['kind:feature', 'state:triage'],
          page: 2,
          perPage: 25,
          since: '2026-03-06T00:00:00.000Z',
          sort: 'updated',
          state: 'open'
        },
        context
      )
    ).toBe(issues);
    expect(listForRepo).toHaveBeenCalledWith({
      direction: 'desc',
      labels: 'kind:feature,state:triage',
      owner: 'evolvo-auto',
      page: 2,
      per_page: 25,
      repo: 'core',
      since: '2026-03-06T00:00:00.000Z',
      sort: 'updated',
      state: 'open'
    });
  });

  it('adds and replaces issue labels through the issues API', async () => {
    const labels = [
      { name: 'state:planned' }
    ] as GitHubIssueLabelMutationResult;
    const addLabels = vi.fn().mockResolvedValue({ data: labels });
    const setLabels = vi.fn().mockResolvedValue({ data: labels });
    const context: GitHubContext = {
      octokit: {
        rest: {
          issues: {
            addLabels,
            setLabels
          }
        }
      } as unknown as GitHubRestClient,
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    expect(await addIssueLabels(17, ['state:planned'], context)).toBe(labels);
    expect(await replaceIssueLabels(17, ['state:done'], context)).toBe(labels);
    expect(addLabels).toHaveBeenCalledWith({
      issue_number: 17,
      labels: ['state:planned'],
      owner: 'evolvo-auto',
      repo: 'core'
    });
    expect(setLabels).toHaveBeenCalledWith({
      issue_number: 17,
      labels: ['state:done'],
      owner: 'evolvo-auto',
      repo: 'core'
    });
  });

  it('removes a single issue label by name', async () => {
    const removeLabel = vi.fn().mockResolvedValue({});
    const context: GitHubContext = {
      octokit: {
        rest: {
          issues: {
            removeLabel
          }
        }
      } as unknown as GitHubRestClient,
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    await removeIssueLabel(19, 'state:triage', context);

    expect(removeLabel).toHaveBeenCalledWith({
      issue_number: 19,
      name: 'state:triage',
      owner: 'evolvo-auto',
      repo: 'core'
    });
  });
});
