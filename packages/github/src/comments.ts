import { getGitHubContext } from './auth.js';
import type {
  CreateIssueCommentInput,
  GitHubContext,
  GitHubIssueComment,
  GitHubIssueCommentListItem,
  ListRepositoryCommentsOptions
} from './types.js';

export async function listIssueComments(
  issueNumber: number,
  options: ListRepositoryCommentsOptions = {},
  context: GitHubContext = getGitHubContext()
): Promise<GitHubIssueCommentListItem[]> {
  const { perPage, ...rest } = options;
  const { data } = await context.octokit.rest.issues.listComments({
    ...context.repository,
    ...rest,
    issue_number: issueNumber,
    per_page: perPage
  });

  return data;
}

export async function createIssueComment(
  issueNumber: number,
  input: CreateIssueCommentInput,
  context: GitHubContext = getGitHubContext()
): Promise<GitHubIssueComment> {
  const { data } = await context.octokit.rest.issues.createComment({
    ...context.repository,
    ...input,
    issue_number: issueNumber
  });

  return data;
}
