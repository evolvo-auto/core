import { getGitHubContext } from './auth.js';
import type {
  CreatePullRequestInput,
  GitHubContext,
  GitHubPullRequest,
  GitHubPullRequestListItem,
  ListRepositoryPullRequestsOptions,
  UpdatePullRequestInput
} from './types.js';

export async function getPullRequest(
  pullRequestNumber: number,
  context: GitHubContext = getGitHubContext()
): Promise<GitHubPullRequest> {
  const { data } = await context.octokit.rest.pulls.get({
    ...context.repository,
    pull_number: pullRequestNumber
  });

  return data;
}

export async function listPullRequests(
  options: ListRepositoryPullRequestsOptions = {},
  context: GitHubContext = getGitHubContext()
): Promise<GitHubPullRequestListItem[]> {
  const { perPage, ...rest } = options;
  const { data } = await context.octokit.rest.pulls.list({
    ...context.repository,
    ...rest,
    per_page: perPage
  });

  return data;
}

export async function createPullRequest(
  input: CreatePullRequestInput,
  context: GitHubContext = getGitHubContext()
): Promise<GitHubPullRequest> {
  const { data } = await context.octokit.rest.pulls.create({
    ...context.repository,
    base: input.base,
    body: input.body,
    draft: input.draft,
    head: input.head,
    maintainer_can_modify: input.maintainerCanModify,
    title: input.title
  });

  return data;
}

export async function updatePullRequest(
  pullRequestNumber: number,
  input: UpdatePullRequestInput,
  context: GitHubContext = getGitHubContext()
): Promise<GitHubPullRequest> {
  const { data } = await context.octokit.rest.pulls.update({
    ...context.repository,
    base: input.base,
    body: input.body,
    maintainer_can_modify: input.maintainerCanModify,
    pull_number: pullRequestNumber,
    state: input.state,
    title: input.title
  });

  return data;
}
