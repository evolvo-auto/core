import { getGitHubContext } from './auth.js';
import { getIssue } from './issues.js';
import type {
  CreatePullRequestInput,
  GitHubContext,
  GitHubPullRequest,
  GitHubPullRequestListItem,
  ListRepositoryPullRequestsOptions,
  SyncPullRequestLabelsOptions,
  SyncPullRequestLabelsResult,
  UpsertPullRequestFromBranchInput,
  UpsertPullRequestFromBranchResult,
  UpdatePullRequestInput
} from './types.js';

type NormalizedPullRequestBranchReference = {
  branchName: string;
  createHead: string;
  listHead: string;
};

type IssueLabelLike = { name?: string | null } | string;

const defaultPullRequestLabelMirrorPrefixes = ['kind:', 'surface:', 'risk:'];

function normalizeLabelName(name: string): string {
  return name.trim().toLowerCase();
}

function extractLabelName(label: IssueLabelLike): string | undefined {
  if (typeof label === 'string') {
    const normalizedLabel = normalizeLabelName(label);

    return normalizedLabel.length > 0 ? normalizedLabel : undefined;
  }

  const normalizedLabel = normalizeLabelName(label.name ?? '');

  return normalizedLabel.length > 0 ? normalizedLabel : undefined;
}

function collectUniqueLabelNames(labels: IssueLabelLike[]): string[] {
  const uniqueLabels: string[] = [];
  const seenLabels = new Set<string>();

  for (const label of labels) {
    const labelName = extractLabelName(label);

    if (!labelName || seenLabels.has(labelName)) {
      continue;
    }

    seenLabels.add(labelName);
    uniqueLabels.push(labelName);
  }

  return uniqueLabels;
}

function normalizeMirrorPrefixes(prefixes: string[] | undefined): string[] {
  const sourcePrefixes = prefixes ?? defaultPullRequestLabelMirrorPrefixes;
  const normalizedPrefixes: string[] = [];
  const seenPrefixes = new Set<string>();

  for (const prefix of sourcePrefixes) {
    const normalizedPrefix = normalizeLabelName(prefix);

    if (!normalizedPrefix || seenPrefixes.has(normalizedPrefix)) {
      continue;
    }

    seenPrefixes.add(normalizedPrefix);
    normalizedPrefixes.push(normalizedPrefix);
  }

  if (normalizedPrefixes.length === 0) {
    throw new Error(
      'At least one pull request label mirror prefix is required.'
    );
  }

  return normalizedPrefixes;
}

function hasMirroredPrefix(labelName: string, prefixes: string[]): boolean {
  for (const prefix of prefixes) {
    if (labelName.startsWith(prefix)) {
      return true;
    }
  }

  return false;
}

function isSameLabelSet(
  currentLabels: string[],
  nextLabels: string[]
): boolean {
  if (currentLabels.length !== nextLabels.length) {
    return false;
  }

  const currentSet = new Set(currentLabels);
  const nextSet = new Set(nextLabels);

  if (currentSet.size !== nextSet.size) {
    return false;
  }

  for (const label of currentSet) {
    if (!nextSet.has(label)) {
      return false;
    }
  }

  return true;
}

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

async function replacePullRequestLabels(
  pullRequestNumber: number,
  labelNames: string[],
  context: GitHubContext
): Promise<void> {
  await context.octokit.rest.issues.setLabels({
    ...context.repository,
    issue_number: pullRequestNumber,
    labels: labelNames
  });
}

export async function syncPullRequestLabelsFromIssue(
  issueNumber: number,
  pullRequestNumber: number,
  options: SyncPullRequestLabelsOptions = {},
  context: GitHubContext = getGitHubContext()
): Promise<SyncPullRequestLabelsResult> {
  const mirrorPrefixes = normalizeMirrorPrefixes(options.mirrorPrefixes);
  const issue = await getIssue(issueNumber, context);
  const issueLabelNames = collectUniqueLabelNames(
    issue.labels as IssueLabelLike[]
  );
  const currentPullRequestLabels = await listPullRequestLabelNames(
    pullRequestNumber,
    context
  );
  const mirroredLabelNames = issueLabelNames.filter((labelName) =>
    hasMirroredPrefix(labelName, mirrorPrefixes)
  );
  const computedNextPullRequestLabels = collectUniqueLabelNames([
    ...currentPullRequestLabels.filter(
      (labelName) => !hasMirroredPrefix(labelName, mirrorPrefixes)
    ),
    ...mirroredLabelNames
  ]);
  const changed = !isSameLabelSet(
    currentPullRequestLabels,
    computedNextPullRequestLabels
  );
  const nextPullRequestLabels = changed
    ? computedNextPullRequestLabels
    : currentPullRequestLabels;
  const dryRun = options.dryRun ?? false;

  if (!dryRun && changed) {
    await replacePullRequestLabels(
      pullRequestNumber,
      nextPullRequestLabels,
      context
    );
  }

  return {
    changed,
    currentPullRequestLabels,
    dryRun,
    issueNumber,
    mirroredLabelNames,
    nextPullRequestLabels,
    pullRequestNumber
  };
}
