import {
  upsertIssueRecords,
  type UpsertIssueRecordInput
} from '@evolvo/api/issue-record';

import { getGitHubContext } from './auth.js';
import { listRepositoryIssues } from './issues.js';
import type {
  GitHubContext,
  GitHubIssueListItem,
  ListRepositoryIssuesOptions
} from './types.js';

const issueStateLabelMap: Record<string, UpsertIssueRecordInput['state']> = {
  'state:awaiting-eval': 'AWAITING_EVAL',
  'state:awaiting-promotion': 'AWAITING_PROMOTION',
  'state:blocked': 'BLOCKED',
  'state:deferred': 'DEFERRED',
  'state:done': 'DONE',
  'state:in-progress': 'IN_PROGRESS',
  'state:planned': 'PLANNED',
  'state:rejected': 'REJECTED',
  'state:selected': 'SELECTED',
  'state:triage': 'TRIAGE'
};

const issueKindLabelMap: Record<string, UpsertIssueRecordInput['kind']> = {
  'kind:approval-request': 'APPROVAL_REQUEST',
  'kind:benchmark': 'BENCHMARK',
  'kind:bug': 'BUG',
  'kind:challenge': 'CHALLENGE',
  'kind:experiment': 'EXPERIMENT',
  'kind:failure': 'FAILURE',
  'kind:feature': 'FEATURE',
  'kind:idea': 'IDEA',
  'kind:mutation': 'MUTATION',
  'kind:upgrade': 'UPGRADE'
};

const issueSourceLabelMap: Record<string, UpsertIssueRecordInput['source']> = {
  'source:evolvo': 'EVOLVO',
  'source:human': 'HUMAN'
};

const issueRiskLabelMap: Record<string, UpsertIssueRecordInput['riskLevel']> = {
  'risk:high': 'HIGH',
  'risk:low': 'LOW',
  'risk:medium': 'MEDIUM',
  'risk:systemic': 'SYSTEMIC'
};

const issuePriorityScoreLabelMap: Record<string, number> = {
  'priority:p0': 100,
  'priority:p1': 75,
  'priority:p2': 50,
  'priority:p3': 25
};

export type ListAllRepositoryIssuesOptions = Pick<
  ListRepositoryIssuesOptions,
  'direction' | 'perPage' | 'since' | 'sort' | 'state'
>;

export type SyncRepositoryIssuesOptions = ListAllRepositoryIssuesOptions & {
  dryRun?: boolean;
};

export type SyncRepositoryIssuesResult = {
  dryRun: boolean;
  fetchedCount: number;
  ignoredPullRequestCount: number;
  normalizedRecords: UpsertIssueRecordInput[];
  persistedCount: number;
};

function normalizeLabelName(labelName: string): string {
  return labelName.trim().toLowerCase();
}

function pickMappedLabelValue<T>(
  labelNames: string[],
  labelMap: Record<string, T>
): T | undefined {
  for (const labelName of labelNames) {
    if (Object.prototype.hasOwnProperty.call(labelMap, labelName)) {
      return labelMap[labelName];
    }
  }

  return undefined;
}

function extractNormalizedLabelNames(issue: GitHubIssueListItem): string[] {
  const normalizedLabelNames: string[] = [];
  const seenLabels = new Set<string>();

  for (const rawLabel of issue.labels) {
    if (typeof rawLabel === 'string') {
      const normalizedName = normalizeLabelName(rawLabel);

      if (!normalizedName || seenLabels.has(normalizedName)) {
        continue;
      }

      seenLabels.add(normalizedName);
      normalizedLabelNames.push(normalizedName);
      continue;
    }

    const normalizedName = normalizeLabelName(rawLabel.name ?? '');

    if (!normalizedName || seenLabels.has(normalizedName)) {
      continue;
    }

    seenLabels.add(normalizedName);
    normalizedLabelNames.push(normalizedName);
  }

  return normalizedLabelNames;
}

function isPullRequestIssue(issue: GitHubIssueListItem): boolean {
  return issue.pull_request !== undefined;
}

function normalizeIssueTitle(title: string, issueNumber: number): string {
  const normalizedTitle = title.trim();

  if (normalizedTitle.length > 0) {
    return normalizedTitle;
  }

  return `Issue ${issueNumber}`;
}

export function normalizeIssueForCache(
  issue: GitHubIssueListItem
): UpsertIssueRecordInput {
  const normalizedLabelNames = extractNormalizedLabelNames(issue);

  return {
    currentLabels: normalizedLabelNames,
    githubIssueNumber: issue.number,
    kind:
      pickMappedLabelValue(normalizedLabelNames, issueKindLabelMap) ?? 'IDEA',
    priorityScore: pickMappedLabelValue(
      normalizedLabelNames,
      issuePriorityScoreLabelMap
    ),
    riskLevel: pickMappedLabelValue(normalizedLabelNames, issueRiskLabelMap),
    source:
      pickMappedLabelValue(normalizedLabelNames, issueSourceLabelMap) ??
      'HUMAN',
    state:
      pickMappedLabelValue(normalizedLabelNames, issueStateLabelMap) ??
      'TRIAGE',
    title: normalizeIssueTitle(issue.title, issue.number)
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
  const normalizedRecords = issueItems.map((issue) =>
    normalizeIssueForCache(issue)
  );

  if (!options.dryRun && normalizedRecords.length > 0) {
    await upsertIssueRecords({
      records: normalizedRecords
    });
  }

  return {
    dryRun: options.dryRun ?? false,
    fetchedCount: allItems.length,
    ignoredPullRequestCount: allItems.length - issueItems.length,
    normalizedRecords,
    persistedCount: options.dryRun ? 0 : normalizedRecords.length
  };
}
