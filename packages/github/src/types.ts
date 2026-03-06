import type { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods';
import type { Octokit } from 'octokit';

type CreateLabelParameters =
  RestEndpointMethodTypes['issues']['createLabel']['parameters'];
type CreatePullRequestParameters =
  RestEndpointMethodTypes['pulls']['create']['parameters'];
type ListCommentsParameters =
  RestEndpointMethodTypes['issues']['listComments']['parameters'];
type ListIssuesParameters =
  RestEndpointMethodTypes['issues']['listForRepo']['parameters'];
type ListLabelsParameters =
  RestEndpointMethodTypes['issues']['listLabelsForRepo']['parameters'];
type ListPullRequestsParameters =
  RestEndpointMethodTypes['pulls']['list']['parameters'];
type UpdateLabelParameters =
  RestEndpointMethodTypes['issues']['updateLabel']['parameters'];
type UpdatePullRequestParameters =
  RestEndpointMethodTypes['pulls']['update']['parameters'];

export type GitHubRestClient = Octokit;

export type GitHubRepositoryRef = {
  owner: string;
  repo: string;
};

export type GitHubContext = {
  octokit: GitHubRestClient;
  repository: GitHubRepositoryRef;
};

export type GitHubRepository =
  RestEndpointMethodTypes['repos']['get']['response']['data'];
export type GitHubIssue =
  RestEndpointMethodTypes['issues']['get']['response']['data'];
export type GitHubIssueComment =
  RestEndpointMethodTypes['issues']['createComment']['response']['data'];
export type GitHubIssueCommentListItem =
  RestEndpointMethodTypes['issues']['listComments']['response']['data'][number];
export type GitHubIssueLabelMutationResult =
  RestEndpointMethodTypes['issues']['setLabels']['response']['data'];
export type GitHubIssueListItem =
  RestEndpointMethodTypes['issues']['listForRepo']['response']['data'][number];
export type GitHubLabel =
  RestEndpointMethodTypes['issues']['createLabel']['response']['data'];
export type GitHubPullRequest =
  RestEndpointMethodTypes['pulls']['get']['response']['data'];
export type GitHubPullRequestListItem =
  RestEndpointMethodTypes['pulls']['list']['response']['data'][number];

export type ListRepositoryCommentsOptions = {
  direction?: ListCommentsParameters['direction'];
  page?: ListCommentsParameters['page'];
  perPage?: ListCommentsParameters['per_page'];
  since?: ListCommentsParameters['since'];
  sort?: ListCommentsParameters['sort'];
};

export type ListRepositoryIssuesOptions = {
  direction?: ListIssuesParameters['direction'];
  labels?: string[];
  page?: ListIssuesParameters['page'];
  perPage?: ListIssuesParameters['per_page'];
  since?: ListIssuesParameters['since'];
  sort?: ListIssuesParameters['sort'];
  state?: ListIssuesParameters['state'];
};

export type ListRepositoryLabelsOptions = {
  page?: ListLabelsParameters['page'];
  perPage?: ListLabelsParameters['per_page'];
};

export type ListRepositoryPullRequestsOptions = {
  base?: ListPullRequestsParameters['base'];
  direction?: ListPullRequestsParameters['direction'];
  head?: ListPullRequestsParameters['head'];
  page?: ListPullRequestsParameters['page'];
  perPage?: ListPullRequestsParameters['per_page'];
  sort?: ListPullRequestsParameters['sort'];
  state?: ListPullRequestsParameters['state'];
};

export type CreateRepositoryLabelInput = {
  color: CreateLabelParameters['color'];
  description?: CreateLabelParameters['description'];
  name: CreateLabelParameters['name'];
};

export type UpdateRepositoryLabelInput = {
  color?: UpdateLabelParameters['color'];
  description?: UpdateLabelParameters['description'];
  newName?: UpdateLabelParameters['new_name'];
};

export type CreateIssueCommentInput = {
  body: RestEndpointMethodTypes['issues']['createComment']['parameters']['body'];
};

export type CreatePullRequestInput = {
  base: CreatePullRequestParameters['base'];
  body?: CreatePullRequestParameters['body'];
  draft?: CreatePullRequestParameters['draft'];
  head: CreatePullRequestParameters['head'];
  maintainerCanModify?: CreatePullRequestParameters['maintainer_can_modify'];
  title: CreatePullRequestParameters['title'];
};

export type UpdatePullRequestInput = {
  base?: UpdatePullRequestParameters['base'];
  body?: UpdatePullRequestParameters['body'];
  maintainerCanModify?: UpdatePullRequestParameters['maintainer_can_modify'];
  state?: UpdatePullRequestParameters['state'];
  title?: UpdatePullRequestParameters['title'];
};
