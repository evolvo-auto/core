import { getGitHubContext } from './auth.js';
import { getIssue } from './issues.js';
import type { GitHubContext } from './types.js';

const evaluationLabelNames = [
  'eval:pending',
  'eval:passed',
  'eval:partial',
  'eval:failed',
  'eval:regressed'
] as const;

export type EvaluationLabelName = (typeof evaluationLabelNames)[number];

type IssueLabelLike = { name?: string | null } | string;

function normalizeLabelName(labelName: string): string {
  return labelName.trim().toLowerCase();
}

function extractLabelName(label: IssueLabelLike): string | undefined {
  if (typeof label === 'string') {
    const normalizedLabelName = normalizeLabelName(label);

    return normalizedLabelName.length > 0 ? normalizedLabelName : undefined;
  }

  const normalizedLabelName = normalizeLabelName(label.name ?? '');

  return normalizedLabelName.length > 0 ? normalizedLabelName : undefined;
}

function collectUniqueLabelNames(labels: IssueLabelLike[]): string[] {
  const normalizedLabelNames: string[] = [];
  const seenLabelNames = new Set<string>();

  for (const label of labels) {
    const normalizedLabelName = extractLabelName(label);

    if (!normalizedLabelName || seenLabelNames.has(normalizedLabelName)) {
      continue;
    }

    seenLabelNames.add(normalizedLabelName);
    normalizedLabelNames.push(normalizedLabelName);
  }

  return normalizedLabelNames;
}

function isEvaluationLabelName(
  labelName: string
): labelName is EvaluationLabelName {
  return evaluationLabelNames.includes(labelName as EvaluationLabelName);
}

function buildNextLabelSet(
  currentLabels: string[],
  evaluationLabelName: EvaluationLabelName
): string[] {
  return [
    ...currentLabels.filter((labelName) => !isEvaluationLabelName(labelName)),
    evaluationLabelName
  ];
}

function isSameLabelSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const leftSet = new Set(left);
  const rightSet = new Set(right);

  if (leftSet.size !== rightSet.size) {
    return false;
  }

  for (const labelName of leftSet) {
    if (!rightSet.has(labelName)) {
      return false;
    }
  }

  return true;
}

async function listPullRequestLabelNames(
  pullRequestNumber: number,
  context: GitHubContext
): Promise<string[]> {
  const { data } = await context.octokit.rest.issues.listLabelsOnIssue({
    ...context.repository,
    issue_number: pullRequestNumber,
    per_page: 100
  });

  return collectUniqueLabelNames(data as IssueLabelLike[]);
}

async function replaceIssueLikeLabels(
  issueNumber: number,
  labelNames: string[],
  context: GitHubContext
): Promise<void> {
  await context.octokit.rest.issues.setLabels({
    ...context.repository,
    issue_number: issueNumber,
    labels: labelNames
  });
}

export type SyncEvaluationLabelResult = {
  changed: boolean;
  currentLabels: string[];
  nextLabels: string[];
};

export async function syncIssueEvaluationLabel(
  issueNumber: number,
  evaluationLabelName: EvaluationLabelName,
  context: GitHubContext = getGitHubContext()
): Promise<SyncEvaluationLabelResult> {
  const issue = await getIssue(issueNumber, context);
  const currentLabels = collectUniqueLabelNames(issue.labels as IssueLabelLike[]);
  const nextLabels = buildNextLabelSet(currentLabels, evaluationLabelName);
  const changed = !isSameLabelSet(currentLabels, nextLabels);

  if (changed) {
    await replaceIssueLikeLabels(issueNumber, nextLabels, context);
  }

  return {
    changed,
    currentLabels,
    nextLabels
  };
}

export async function syncPullRequestEvaluationLabel(
  pullRequestNumber: number,
  evaluationLabelName: EvaluationLabelName,
  context: GitHubContext = getGitHubContext()
): Promise<SyncEvaluationLabelResult> {
  const currentLabels = await listPullRequestLabelNames(pullRequestNumber, context);
  const nextLabels = buildNextLabelSet(currentLabels, evaluationLabelName);
  const changed = !isSameLabelSet(currentLabels, nextLabels);

  if (changed) {
    await replaceIssueLikeLabels(pullRequestNumber, nextLabels, context);
  }

  return {
    changed,
    currentLabels,
    nextLabels
  };
}
