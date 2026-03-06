import { getGitHubContext } from './auth.js';
import type { GitHubContext, GitHubRepository } from './types.js';

export async function getRepository(
  context: GitHubContext = getGitHubContext()
): Promise<GitHubRepository> {
  const { data } = await context.octokit.rest.repos.get(context.repository);

  return data;
}
