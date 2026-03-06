import { getGitHubContext } from './auth.js';
import type {
  CreateRepositoryIssueInput,
  GitHubContext,
  GitHubIssue,
  GitHubIssueLabelMutationResult,
  GitHubIssueListItem,
  ListRepositoryIssuesOptions
} from './types.js';

export async function createRepositoryIssue(
  input: CreateRepositoryIssueInput,
  context: GitHubContext = getGitHubContext()
): Promise<GitHubIssue> {
  const { data } = await context.octokit.rest.issues.create({
    ...context.repository,
    body: input.body,
    labels: input.labels,
    title: input.title
  });

  return data;
}

export async function getIssue(
  issueNumber: number,
  context: GitHubContext = getGitHubContext()
): Promise<GitHubIssue> {
  const { data } = await context.octokit.rest.issues.get({
    ...context.repository,
    issue_number: issueNumber
  });

  return data;
}

export async function listRepositoryIssues(
  options: ListRepositoryIssuesOptions = {},
  context: GitHubContext = getGitHubContext()
): Promise<GitHubIssueListItem[]> {
  const { labels, perPage, ...rest } = options;
  const { data } = await context.octokit.rest.issues.listForRepo({
    ...context.repository,
    ...rest,
    labels: labels?.join(','),
    per_page: perPage
  });

  return data;
}

export async function addIssueLabels(
  issueNumber: number,
  labelNames: string[],
  context: GitHubContext = getGitHubContext()
): Promise<GitHubIssueLabelMutationResult> {
  const { data } = await context.octokit.rest.issues.addLabels({
    ...context.repository,
    issue_number: issueNumber,
    labels: labelNames
  });

  return data;
}

export async function replaceIssueLabels(
  issueNumber: number,
  labelNames: string[],
  context: GitHubContext = getGitHubContext()
): Promise<GitHubIssueLabelMutationResult> {
  const { data } = await context.octokit.rest.issues.setLabels({
    ...context.repository,
    issue_number: issueNumber,
    labels: labelNames
  });

  return data;
}

export async function removeIssueLabel(
  issueNumber: number,
  labelName: string,
  context: GitHubContext = getGitHubContext()
): Promise<void> {
  await context.octokit.rest.issues.removeLabel({
    ...context.repository,
    issue_number: issueNumber,
    name: labelName
  });
}
