import { getGitHubContext } from './auth.js';
import type {
  CreatePullRequestInput,
  GitHubContext,
  GitHubPullRequest,
  GitHubPullRequestListItem,
  ListRepositoryPullRequestsOptions,
  UpsertPullRequestFromBranchInput,
  UpsertPullRequestFromBranchResult,
  UpdatePullRequestInput
} from './types.js';

type NormalizedPullRequestBranchReference = {
  branchName: string;
  createHead: string;
  listHead: string;
};

function normalizePullRequestBranchReference(
  branchReference: string,
  owner: string
): NormalizedPullRequestBranchReference {
  const normalizedBranchReference = branchReference.trim();

  if (!normalizedBranchReference) {
    throw new Error('Pull request branch name is required.');
  }

  const separatorIndex = normalizedBranchReference.indexOf(':');

  if (separatorIndex === -1) {
    return {
      branchName: normalizedBranchReference,
      createHead: normalizedBranchReference,
      listHead: `${owner}:${normalizedBranchReference}`
    };
  }

  const branchOwner = normalizedBranchReference.slice(0, separatorIndex).trim();
  const branchName = normalizedBranchReference.slice(separatorIndex + 1).trim();

  if (!branchOwner || !branchName) {
    throw new Error(
      `Invalid pull request branch reference "${branchReference}". Expected "branch" or "owner:branch".`
    );
  }

  const qualifiedHead = `${branchOwner}:${branchName}`;

  return {
    branchName,
    createHead: qualifiedHead,
    listHead: qualifiedHead
  };
}

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

export async function upsertPullRequestFromBranch(
  input: UpsertPullRequestFromBranchInput,
  context: GitHubContext = getGitHubContext()
): Promise<UpsertPullRequestFromBranchResult> {
  const normalizedBranchReference = normalizePullRequestBranchReference(
    input.branchName,
    context.repository.owner
  );
  const existingPullRequests = await listPullRequests(
    {
      base: input.base,
      direction: 'desc',
      head: normalizedBranchReference.listHead,
      perPage: 10,
      sort: 'updated',
      state: 'open'
    },
    context
  );

  if (existingPullRequests.length > 1) {
    const matchingPullRequestNumbers = existingPullRequests
      .map((pullRequest) => `#${pullRequest.number}`)
      .join(', ');

    throw new Error(
      `Multiple open pull requests found for branch "${normalizedBranchReference.listHead}": ${matchingPullRequestNumbers}`
    );
  }

  if (existingPullRequests.length === 1) {
    const pullRequest = await updatePullRequest(
      existingPullRequests[0].number,
      {
        base: input.base,
        body: input.body,
        maintainerCanModify: input.maintainerCanModify,
        title: input.title
      },
      context
    );

    return {
      action: 'updated',
      branchName: normalizedBranchReference.branchName,
      pullRequest,
      pullRequestNumber: pullRequest.number
    };
  }

  const pullRequest = await createPullRequest(
    {
      base: input.base,
      body: input.body,
      draft: input.draft,
      head: normalizedBranchReference.createHead,
      maintainerCanModify: input.maintainerCanModify,
      title: input.title
    },
    context
  );

  return {
    action: 'created',
    branchName: normalizedBranchReference.branchName,
    pullRequest,
    pullRequestNumber: pullRequest.number
  };
}
