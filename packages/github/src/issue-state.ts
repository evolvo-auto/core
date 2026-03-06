import { getGitHubContext } from './auth.js';
import { getIssue, replaceIssueLabels } from './issues.js';
import type {
  GitHubContext,
  GitHubIssue,
  GitHubIssueWorkflowState,
  GitHubLabel,
  IssueStateLabelName,
  TransitionIssueStateOptions,
  TransitionIssueStateResult
} from './types.js';

type IssueLabelLike = string | Pick<GitHubLabel, 'name'>;

const issueStateLabelByWorkflowState: Record<
  GitHubIssueWorkflowState,
  IssueStateLabelName
> = {
  AWAITING_EVAL: 'state:awaiting-eval',
  AWAITING_PROMOTION: 'state:awaiting-promotion',
  BLOCKED: 'state:blocked',
  DEFERRED: 'state:deferred',
  DONE: 'state:done',
  IN_PROGRESS: 'state:in-progress',
  PLANNED: 'state:planned',
  REJECTED: 'state:rejected',
  SELECTED: 'state:selected',
  TRIAGE: 'state:triage'
};

const issueWorkflowStateByLabel: Record<
  IssueStateLabelName,
  GitHubIssueWorkflowState
> = {
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

const issueStateLabelNameSet = new Set<IssueStateLabelName>(
  Object.values(issueStateLabelByWorkflowState)
);

type NormalizedIssueLabel = {
  normalized: string;
  original: string;
};

function normalizeIssueLabelName(labelName: string): string {
  return labelName.trim().toLowerCase();
}

function extractIssueLabelName(label: IssueLabelLike): string | undefined {
  if (typeof label === 'string') {
    const normalized = label.trim();

    return normalized.length > 0 ? normalized : undefined;
  }

  const normalized = label.name?.trim() ?? '';

  return normalized.length > 0 ? normalized : undefined;
}

function collectUniqueIssueLabels(
  labels: IssueLabelLike[]
): NormalizedIssueLabel[] {
  const uniqueLabels: NormalizedIssueLabel[] = [];
  const seenLabels = new Set<string>();

  for (const label of labels) {
    const extractedName = extractIssueLabelName(label);

    if (!extractedName) {
      continue;
    }

    const normalizedName = normalizeIssueLabelName(extractedName);

    if (!normalizedName || seenLabels.has(normalizedName)) {
      continue;
    }

    seenLabels.add(normalizedName);
    uniqueLabels.push({
      normalized: normalizedName,
      original: extractedName
    });
  }

  return uniqueLabels;
}

function extractIssueStateLabelNamesFromNormalizedLabels(
  labels: NormalizedIssueLabel[]
): IssueStateLabelName[] {
  return labels
    .map((label) => label.normalized)
    .filter((label): label is IssueStateLabelName =>
      issueStateLabelNameSet.has(label as IssueStateLabelName)
    );
}

function resolveSingleCurrentState(
  currentStateLabels: IssueStateLabelName[]
): GitHubIssueWorkflowState | undefined {
  if (currentStateLabels.length !== 1) {
    return undefined;
  }

  return issueWorkflowStateByLabel[currentStateLabels[0]];
}

function isSameLabelSet(
  currentLabels: string[],
  nextLabels: string[]
): boolean {
  if (currentLabels.length !== nextLabels.length) {
    return false;
  }

  const currentSet = new Set(currentLabels.map((label) => label.toLowerCase()));
  const nextSet = new Set(nextLabels.map((label) => label.toLowerCase()));

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

export function getIssueStateLabelName(
  state: GitHubIssueWorkflowState
): IssueStateLabelName {
  return issueStateLabelByWorkflowState[state];
}

export function extractIssueStateLabelNames(
  labels: IssueLabelLike[]
): IssueStateLabelName[] {
  return extractIssueStateLabelNamesFromNormalizedLabels(
    collectUniqueIssueLabels(labels)
  );
}

export function buildIssueStateTransitionLabels(
  labels: IssueLabelLike[],
  targetState: GitHubIssueWorkflowState
): string[] {
  const targetStateLabel = getIssueStateLabelName(targetState);

  return [
    ...collectUniqueIssueLabels(labels)
      .filter(
        (label) =>
          !issueStateLabelNameSet.has(label.normalized as IssueStateLabelName)
      )
      .map((label) => label.original),
    targetStateLabel
  ];
}

export async function transitionIssueState(
  issueNumber: number,
  targetState: GitHubIssueWorkflowState,
  options: TransitionIssueStateOptions = {},
  context: GitHubContext = getGitHubContext()
): Promise<TransitionIssueStateResult> {
  const issue = await getIssue(issueNumber, context);
  const issueLabels = issue.labels as IssueLabelLike[];
  const currentLabelNames = collectUniqueIssueLabels(issueLabels).map(
    (label) => label.original
  );
  const currentStateLabels = extractIssueStateLabelNames(issueLabels);
  const currentState = resolveSingleCurrentState(currentStateLabels);
  const nextStateLabel = getIssueStateLabelName(targetState);

  if (
    options.expectedCurrentState &&
    currentState !== options.expectedCurrentState
  ) {
    throw new Error(
      `Refusing state transition for issue #${issueNumber}: expected current state ${options.expectedCurrentState}, received ${currentState ?? 'UNRESOLVED'}`
    );
  }

  const nextLabels = buildIssueStateTransitionLabels(issueLabels, targetState);
  const nextStateLabels = extractIssueStateLabelNames(nextLabels);
  const changed =
    !isSameLabelSet(currentLabelNames, nextLabels) ||
    currentStateLabels.length !== 1 ||
    currentStateLabels[0] !== nextStateLabel ||
    nextStateLabels.length !== 1 ||
    nextStateLabels[0] !== nextStateLabel;

  if (!options.dryRun && changed) {
    await replaceIssueLabels(issueNumber, nextLabels, context);
  }

  return {
    changed,
    currentLabels: currentLabelNames,
    currentState,
    currentStateLabels,
    dryRun: options.dryRun ?? false,
    issueNumber,
    nextLabels,
    nextState: targetState,
    nextStateLabel
  };
}

export async function transitionIssueToState(
  issue: GitHubIssue,
  targetState: GitHubIssueWorkflowState,
  options: Omit<TransitionIssueStateOptions, 'expectedCurrentState'> = {},
  context: GitHubContext = getGitHubContext()
): Promise<TransitionIssueStateResult> {
  return transitionIssueState(issue.number, targetState, options, context);
}
