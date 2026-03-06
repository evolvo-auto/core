import { getGitHubContext } from './auth.js';
import { createIssueComment } from './comments.js';
import type {
  GitHubContext,
  IssueCommentKind,
  StructuredIssueCommentInput,
  WriteStructuredIssueCommentResult
} from './types.js';

const defaultCommentTitleByKind: Record<IssueCommentKind, string> = {
  blocker: 'Execution Blocker',
  defer: 'Issue Deferred',
  'evaluation-result': 'Evaluation Result',
  'mutation-rationale': 'Mutation Rationale',
  progress: 'Execution Progress',
  'promotion-update': 'Promotion Update',
  reject: 'Issue Rejected',
  'work-started': 'Work Started'
};

const defaultStatusByKind: Record<IssueCommentKind, string> = {
  blocker: 'Execution is blocked pending resolution.',
  defer: 'The issue has been deferred for later execution.',
  'evaluation-result': 'Evaluation has completed for the current attempt.',
  'mutation-rationale': 'A mutation proposal has been generated.',
  progress: 'Work is in progress.',
  'promotion-update': 'Promotion status has been updated.',
  reject: 'The issue has been rejected for now.',
  'work-started': 'Work has started on this issue.'
};

const defaultNextStepByKind: Record<IssueCommentKind, string> = {
  blocker: 'Resolve the blocker and resume execution.',
  defer: 'Re-enter planning when priority or context changes.',
  'evaluation-result': 'Apply follow-up actions based on evaluation outcome.',
  'mutation-rationale':
    'Validate the proposal against benchmark and regression checks.',
  progress: 'Continue implementation and report the next milestone.',
  'promotion-update': 'Proceed with the next promotion checkpoint.',
  reject: 'No additional work is planned unless the issue is reopened.',
  'work-started': 'Proceed with implementation and post progress updates.'
};

function normalizeLine(line: string | undefined): string | undefined {
  const normalized = line?.trim();

  if (!normalized) {
    return undefined;
  }

  return normalized;
}

function normalizeBulletItems(items: string[] | undefined): string[] {
  if (!items) {
    return [];
  }

  const normalizedItems: string[] = [];

  for (const item of items) {
    const normalizedItem = normalizeLine(item);

    if (!normalizedItem) {
      continue;
    }

    normalizedItems.push(normalizedItem);
  }

  return normalizedItems;
}

function formatBulletSection(items: string[], fallback: string): string {
  if (items.length === 0) {
    return `- ${fallback}`;
  }

  return items.map((item) => `- ${item}`).join('\n');
}

export function buildStructuredIssueComment(
  input: StructuredIssueCommentInput
): string {
  const title =
    normalizeLine(input.title) ?? defaultCommentTitleByKind[input.commentKind];
  const status =
    normalizeLine(input.status) ?? defaultStatusByKind[input.commentKind];
  const nextStep =
    normalizeLine(input.nextStep) ?? defaultNextStepByKind[input.commentKind];
  const whatChanged = normalizeBulletItems(input.whatChanged);
  const evidence = normalizeBulletItems(input.evidence);

  return [
    `### ${title}`,
    '',
    '**Current status**',
    status,
    '',
    '**What changed**',
    formatBulletSection(whatChanged, 'No material changes to report yet.'),
    '',
    '**Evidence**',
    formatBulletSection(evidence, 'No supporting evidence attached yet.'),
    '',
    '**Next step**',
    nextStep
  ].join('\n');
}

export async function writeStructuredIssueComment(
  issueNumber: number,
  input: StructuredIssueCommentInput,
  context: GitHubContext = getGitHubContext()
): Promise<WriteStructuredIssueCommentResult> {
  const body = buildStructuredIssueComment(input);
  const comment = await createIssueComment(
    issueNumber,
    {
      body
    },
    context
  );

  return {
    body,
    comment,
    commentKind: input.commentKind,
    issueNumber
  };
}
