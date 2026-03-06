import {
  upsertIssueRecords,
  type UpsertIssueRecordInput
} from '@evolvo/api/issue-record';

import { getGitHubContext } from './auth.js';
import { classifyIssue } from './issue-classification.js';
import { listRepositoryIssues } from './issues.js';
import type {
  GitHubContext,
  GitHubIssueClassification,
  GitHubIssueListItem,
  ListRepositoryIssuesOptions
} from './types.js';

export type ListAllRepositoryIssuesOptions = Pick<
  ListRepositoryIssuesOptions,
  'direction' | 'perPage' | 'since' | 'sort' | 'state'
>;

export type SyncRepositoryIssuesOptions = ListAllRepositoryIssuesOptions & {
  dryRun?: boolean;
};

export type SyncRepositoryIssuesResult = {
  classifiedIssues: GitHubIssueClassification[];
  dryRun: boolean;
  fetchedCount: number;
  ignoredPullRequestCount: number;
  normalizedRecords: UpsertIssueRecordInput[];
  persistedCount: number;
};

function isPullRequestIssue(issue: GitHubIssueListItem): boolean {
  return issue.pull_request !== undefined;
}

export function normalizeIssueForCache(
  issue: GitHubIssueListItem
): UpsertIssueRecordInput {
  const classification = classifyIssue(issue);

  return {
    currentLabels: classification.currentLabels,
    githubIssueNumber: classification.githubIssueNumber,
    kind: classification.kind,
    priorityScore: classification.priorityScore,
    riskLevel: classification.riskLevel,
    source: classification.source,
    state: classification.state,
    title: classification.title
  };
}

export async function listAllRepositoryIssues(
  options: ListAllRepositoryIssuesOptions = {},
  context: GitHubContext = getGitHubContext()
): Promise<GitHubIssueListItem[]> {
  const issues: GitHubIssueListItem[] = [];
  let page = 1;
  const perPage = options.perPage ?? 100;

  while (true) {
    const batch = await listRepositoryIssues(
      {
        direction: options.direction,
        page,
        perPage,
        since: options.since,
        sort: options.sort,
        state: options.state ?? 'open'
      },
      context
    );

    issues.push(...batch);

    if (batch.length < perPage) {
      return issues;
    }

    page += 1;
  }
}

export async function syncRepositoryIssues(
  options: SyncRepositoryIssuesOptions = {},
  context: GitHubContext = getGitHubContext()
): Promise<SyncRepositoryIssuesResult> {
  const allItems = await listAllRepositoryIssues(options, context);
  const issueItems = allItems.filter((item) => !isPullRequestIssue(item));
  const classifiedIssues = issueItems.map((issue) => classifyIssue(issue));
  const normalizedRecords = classifiedIssues.map((classification) => ({
    currentLabels: classification.currentLabels,
    githubIssueNumber: classification.githubIssueNumber,
    kind: classification.kind,
    priorityScore: classification.priorityScore,
    riskLevel: classification.riskLevel,
    source: classification.source,
    state: classification.state,
    title: classification.title
  }));

  if (!options.dryRun && normalizedRecords.length > 0) {
    await upsertIssueRecords({
      records: normalizedRecords
    });
  }

  return {
    classifiedIssues,
    dryRun: options.dryRun ?? false,
    fetchedCount: allItems.length,
    ignoredPullRequestCount: allItems.length - issueItems.length,
    normalizedRecords,
    persistedCount: options.dryRun ? 0 : normalizedRecords.length
  };
}
