import { describe, expect, it, vi } from 'vitest';

import { getRepository } from './repository.js';
import type {
  GitHubContext,
  GitHubRepository,
  GitHubRestClient
} from './types.js';

describe('GitHub repository operations', () => {
  it('loads repository details from the configured repository context', async () => {
    const repository = { full_name: 'evolvo-auto/core' } as GitHubRepository;
    const get = vi.fn().mockResolvedValue({
      data: repository
    });
    const context: GitHubContext = {
      octokit: {
        rest: {
          repos: {
            get
          }
        }
      } as unknown as GitHubRestClient,
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    expect(await getRepository(context)).toBe(repository);
    expect(get).toHaveBeenCalledWith({
      owner: 'evolvo-auto',
      repo: 'core'
    });
  });
});
