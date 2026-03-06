import { recordGitHubAuditEvent } from './audit-events.js';
import { getGitHubContext } from './auth.js';
import {
  buildStructuredIssueComment,
  writeStructuredIssueComment
} from './issue-comment-writer.js';
import { transitionIssueState } from './issue-state.js';
import type {
  GitHubContext,
  GitHubIssueWorkflowState,
  IssueDispositionAction,
  IssueDispositionInput,
  IssueDispositionOptions,
  IssueDispositionResult,
  StructuredIssueCommentInput
} from './types.js';

const targetStateByDispositionAction: Record<
  IssueDispositionAction,
  GitHubIssueWorkflowState
> = {
  defer: 'DEFERRED',
  reject: 'REJECTED'
};

function normalizeDispositionStatus(status: string): string {
  const normalizedStatus = status.trim();

  if (!normalizedStatus) {
    throw new Error('Issue disposition status is required.');
  }

  return normalizedStatus;
}

function buildDispositionCommentInput(
  action: IssueDispositionAction,
  input: IssueDispositionInput
): StructuredIssueCommentInput {
  return {
    commentKind: action,
    evidence: input.evidence,
    nextStep: input.nextStep,
    status: normalizeDispositionStatus(input.status),
    title: input.title,
    whatChanged: input.whatChanged
  };
}

async function performIssueDisposition(
  action: IssueDispositionAction,
  issueNumber: number,
  input: IssueDispositionInput,
  options: IssueDispositionOptions = {},
  context: GitHubContext = getGitHubContext()
): Promise<IssueDispositionResult> {
  const targetState = targetStateByDispositionAction[action];
  const commentInput = buildDispositionCommentInput(action, input);
  const stateTransition = await transitionIssueState(
    issueNumber,
    targetState,
    options,
    context
  );

  if (options.dryRun) {
    return {
      action,
      commentBody: buildStructuredIssueComment(commentInput),
      commentPosted: false,
      issueNumber,
      stateTransition,
      targetState
    };
  }

  const commentResult = await writeStructuredIssueComment(
    issueNumber,
    commentInput,
    context
  );
  await recordGitHubAuditEvent(
    {
      action: action === 'defer' ? 'issue.defer' : 'issue.reject',
      issueNumber,
      metadata: {
        commentId: commentResult.comment.id,
        stateChanged: stateTransition.changed,
        targetState
      }
    },
    context
  );

  return {
    action,
    comment: commentResult.comment,
    commentBody: commentResult.body,
    commentPosted: true,
    issueNumber,
    stateTransition,
    targetState
  };
}

export async function deferIssue(
  issueNumber: number,
  input: IssueDispositionInput,
  options: IssueDispositionOptions = {},
  context: GitHubContext = getGitHubContext()
): Promise<IssueDispositionResult> {
  return performIssueDisposition('defer', issueNumber, input, options, context);
}

export async function rejectIssue(
  issueNumber: number,
  input: IssueDispositionInput,
  options: IssueDispositionOptions = {},
  context: GitHubContext = getGitHubContext()
): Promise<IssueDispositionResult> {
  return performIssueDisposition(
    'reject',
    issueNumber,
    input,
    options,
    context
  );
}
