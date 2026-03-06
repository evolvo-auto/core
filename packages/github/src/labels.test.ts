import { describe, expect, it, vi } from 'vitest';

import { canonicalGitHubLabels } from './label-taxonomy.js';
import {
  createRepositoryLabel,
  listAllRepositoryLabels,
  listRepositoryLabels,
  syncRepositoryLabels,
  updateRepositoryLabel
} from './labels.js';
import type { GitHubContext, GitHubLabel, GitHubRestClient } from './types.js';

describe('GitHub label operations', () => {
  it('lists repository labels with page option mapping', async () => {
    const labels = [{ name: 'state:triage' }] as GitHubLabel[];
    const listLabelsForRepo = vi.fn().mockResolvedValue({ data: labels });
    const context: GitHubContext = {
      octokit: {
        rest: {
          issues: {
            listLabelsForRepo
          }
        }
      } as unknown as GitHubRestClient,
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    expect(await listRepositoryLabels({ page: 2, perPage: 50 }, context)).toBe(
      labels
    );
    expect(listLabelsForRepo).toHaveBeenCalledWith({
      owner: 'evolvo-auto',
      page: 2,
      per_page: 50,
      repo: 'core'
    });
  });

  it('lists all repository labels across pages', async () => {
    const listLabelsForRepo = vi
      .fn()
      .mockResolvedValueOnce({
        data: Array.from({ length: 100 }, (_, index) => ({
          name: `label-${String(index + 1)}`
        }))
      })
      .mockResolvedValueOnce({
        data: [{ name: 'label-101' }]
      });
    const context: GitHubContext = {
      octokit: {
        rest: {
          issues: {
            listLabelsForRepo
          }
        }
      } as unknown as GitHubRestClient,
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    const labels = await listAllRepositoryLabels(context);

    expect(labels).toHaveLength(101);
    expect(listLabelsForRepo).toHaveBeenNthCalledWith(1, {
      owner: 'evolvo-auto',
      page: 1,
      per_page: 100,
      repo: 'core'
    });
    expect(listLabelsForRepo).toHaveBeenNthCalledWith(2, {
      owner: 'evolvo-auto',
      page: 2,
      per_page: 100,
      repo: 'core'
    });
  });

  it('creates and updates repository labels', async () => {
    const label = { name: 'state:planned' } as GitHubLabel;
    const createLabel = vi.fn().mockResolvedValue({ data: label });
    const updateLabel = vi.fn().mockResolvedValue({ data: label });
    const context: GitHubContext = {
      octokit: {
        rest: {
          issues: {
            createLabel,
            updateLabel
          }
        }
      } as unknown as GitHubRestClient,
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    expect(
      await createRepositoryLabel(
        {
          color: '0f172a',
          description: 'Issue is planned for work',
          name: 'state:planned'
        },
        context
      )
    ).toBe(label);
    expect(
      await updateRepositoryLabel(
        'state:planned',
        {
          color: '111827',
          description: 'Issue is actively planned',
          newName: 'state:selected'
        },
        context
      )
    ).toBe(label);
    expect(createLabel).toHaveBeenCalledWith({
      color: '0f172a',
      description: 'Issue is planned for work',
      name: 'state:planned',
      owner: 'evolvo-auto',
      repo: 'core'
    });
    expect(updateLabel).toHaveBeenCalledWith({
      color: '111827',
      description: 'Issue is actively planned',
      name: 'state:planned',
      new_name: 'state:selected',
      owner: 'evolvo-auto',
      repo: 'core'
    });
  });

  it('plans and applies repository label sync without deleting extra labels', async () => {
    const existingLabel = {
      color: canonicalGitHubLabels[0].color,
      description: 'Old description',
      name: canonicalGitHubLabels[0].name
    } as GitHubLabel;
    const extraLabel = {
      color: 'ffffff',
      description: 'Default GitHub label',
      name: 'bug'
    } as GitHubLabel;
    const listLabelsForRepo = vi.fn().mockResolvedValue({
      data: [existingLabel, extraLabel]
    });
    const createLabel = vi.fn().mockResolvedValue({ data: {} });
    const updateLabel = vi.fn().mockResolvedValue({ data: {} });
    const context: GitHubContext = {
      octokit: {
        rest: {
          issues: {
            createLabel,
            listLabelsForRepo,
            updateLabel
          }
        }
      } as unknown as GitHubRestClient,
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    const planned = await syncRepositoryLabels(
      {
        definitions: canonicalGitHubLabels.slice(0, 2),
        dryRun: true
      },
      context
    );

    expect(planned.created).toMatchObject([
      {
        action: 'create',
        name: canonicalGitHubLabels[1].name
      }
    ]);
    expect(planned.updated).toMatchObject([
      {
        action: 'update',
        currentDescription: 'Old description',
        name: canonicalGitHubLabels[0].name
      }
    ]);
    expect(planned.extraLabels).toEqual([
      {
        color: 'ffffff',
        description: 'Default GitHub label',
        name: 'bug'
      }
    ]);
    expect(createLabel).not.toHaveBeenCalled();
    expect(updateLabel).not.toHaveBeenCalled();

    const applied = await syncRepositoryLabels(
      {
        definitions: canonicalGitHubLabels.slice(0, 2)
      },
      context
    );

    expect(applied.dryRun).toBe(false);
    expect(createLabel).toHaveBeenCalledWith({
      color: canonicalGitHubLabels[1].color,
      description: canonicalGitHubLabels[1].description,
      name: canonicalGitHubLabels[1].name,
      owner: 'evolvo-auto',
      repo: 'core'
    });
    expect(updateLabel).toHaveBeenCalledWith({
      color: canonicalGitHubLabels[0].color,
      description: canonicalGitHubLabels[0].description,
      name: canonicalGitHubLabels[0].name,
      new_name: undefined,
      owner: 'evolvo-auto',
      repo: 'core'
    });
  });
});
