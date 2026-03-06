import { describe, expect, it, vi } from 'vitest';

import {
  createRepositoryLabel,
  listRepositoryLabels,
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
});
