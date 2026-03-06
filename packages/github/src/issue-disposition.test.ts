import { afterEach, describe, expect, it, vi } from 'vitest';

import { recordGitHubAuditEvent } from './audit-events.js';
import {
  buildStructuredIssueComment,
  writeStructuredIssueComment
} from './issue-comment-writer.js';
import { deferIssue, rejectIssue } from './issue-disposition.js';
import { transitionIssueState } from './issue-state.js';
import type {
  GitHubContext,
  GitHubIssueComment,
  TransitionIssueStateResult
} from './types.js';

vi.mock('./issue-comment-writer.js', () => ({
  buildStructuredIssueComment: vi.fn(),
  writeStructuredIssueComment: vi.fn()
}));

vi.mock('./issue-state.js', () => ({
  transitionIssueState: vi.fn()
}));

vi.mock('./audit-events.js', () => ({
  recordGitHubAuditEvent: vi.fn()
}));

const mockedRecordGitHubAuditEvent = vi.mocked(recordGitHubAuditEvent);
const mockedBuildStructuredIssueComment = vi.mocked(
  buildStructuredIssueComment
);
const mockedTransitionIssueState = vi.mocked(transitionIssueState);
const mockedWriteStructuredIssueComment = vi.mocked(
  writeStructuredIssueComment
);

describe('issue rejection/defer flow helpers', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('defers an issue by transitioning state and posting a structured defer comment', async () => {
    const transitionResult = {
      changed: true,
      currentLabels: ['state:planned'],
      currentState: 'PLANNED',
      currentStateLabels: ['state:planned'],
      dryRun: false,
      issueNumber: 91,
      nextLabels: ['state:deferred'],
      nextState: 'DEFERRED',
      nextStateLabel: 'state:deferred'
    } as TransitionIssueStateResult;
    const comment = { id: 901 } as GitHubIssueComment;
    const context = { marker: 'custom-context' } as unknown as GitHubContext;
    mockedTransitionIssueState.mockResolvedValue(transitionResult);
    mockedWriteStructuredIssueComment.mockResolvedValue({
      body: 'defer comment body',
      comment,
      commentKind: 'defer',
      issueNumber: 91
    });

    expect(
      await deferIssue(
        91,
        {
          evidence: ['Issue was reviewed against higher-priority work.'],
          nextStep: 'Revisit during the next prioritization window.',
          status: 'Lower strategic value than currently selected work.',
          whatChanged: ['Work has been intentionally deferred.']
        },
        {},
        context
      )
    ).toEqual({
      action: 'defer',
      comment,
      commentBody: 'defer comment body',
      commentPosted: true,
      issueNumber: 91,
      stateTransition: transitionResult,
      targetState: 'DEFERRED'
    });
    expect(mockedTransitionIssueState).toHaveBeenCalledWith(
      91,
      'DEFERRED',
      {},
      context
    );
    expect(mockedWriteStructuredIssueComment).toHaveBeenCalledWith(
      91,
      {
        commentKind: 'defer',
        evidence: ['Issue was reviewed against higher-priority work.'],
        nextStep: 'Revisit during the next prioritization window.',
        status: 'Lower strategic value than currently selected work.',
        title: undefined,
        whatChanged: ['Work has been intentionally deferred.']
      },
      context
    );
    expect(mockedRecordGitHubAuditEvent).toHaveBeenCalledWith(
      {
        action: 'issue.defer',
        issueNumber: 91,
        metadata: {
          commentId: 901,
          stateChanged: true,
          targetState: 'DEFERRED'
        }
      },
      context
    );
  });

  it('rejects an issue by transitioning state and posting a structured reject comment', async () => {
    const transitionResult = {
      changed: true,
      currentLabels: ['state:triage'],
      currentState: 'TRIAGE',
      currentStateLabels: ['state:triage'],
      dryRun: false,
      issueNumber: 92,
      nextLabels: ['state:rejected'],
      nextState: 'REJECTED',
      nextStateLabel: 'state:rejected'
    } as TransitionIssueStateResult;
    const comment = { id: 902 } as GitHubIssueComment;
    const context = { marker: 'custom-context' } as unknown as GitHubContext;
    mockedTransitionIssueState.mockResolvedValue(transitionResult);
    mockedWriteStructuredIssueComment.mockResolvedValue({
      body: 'reject comment body',
      comment,
      commentKind: 'reject',
      issueNumber: 92
    });

    expect(
      await rejectIssue(
        92,
        {
          status: 'Superseded by a broader systemic issue.'
        },
        {
          expectedCurrentState: 'TRIAGE'
        },
        context
      )
    ).toEqual({
      action: 'reject',
      comment,
      commentBody: 'reject comment body',
      commentPosted: true,
      issueNumber: 92,
      stateTransition: transitionResult,
      targetState: 'REJECTED'
    });
    expect(mockedTransitionIssueState).toHaveBeenCalledWith(
      92,
      'REJECTED',
      {
        expectedCurrentState: 'TRIAGE'
      },
      context
    );
    expect(mockedWriteStructuredIssueComment).toHaveBeenCalledWith(
      92,
      {
        commentKind: 'reject',
        evidence: undefined,
        nextStep: undefined,
        status: 'Superseded by a broader systemic issue.',
        title: undefined,
        whatChanged: undefined
      },
      context
    );
    expect(mockedRecordGitHubAuditEvent).toHaveBeenCalledWith(
      {
        action: 'issue.reject',
        issueNumber: 92,
        metadata: {
          commentId: 902,
          stateChanged: true,
          targetState: 'REJECTED'
        }
      },
      context
    );
  });

  it('supports dry-run reject/defer flow without posting a comment', async () => {
    const transitionResult = {
      changed: true,
      currentLabels: ['state:planned'],
      currentState: 'PLANNED',
      currentStateLabels: ['state:planned'],
      dryRun: true,
      issueNumber: 93,
      nextLabels: ['state:deferred'],
      nextState: 'DEFERRED',
      nextStateLabel: 'state:deferred'
    } as TransitionIssueStateResult;
    const context = { marker: 'custom-context' } as unknown as GitHubContext;
    mockedTransitionIssueState.mockResolvedValue(transitionResult);
    mockedBuildStructuredIssueComment.mockReturnValue('preview comment body');

    expect(
      await deferIssue(
        93,
        {
          status: 'Deferred after risk and priority review.'
        },
        {
          dryRun: true
        },
        context
      )
    ).toEqual({
      action: 'defer',
      commentBody: 'preview comment body',
      commentPosted: false,
      issueNumber: 93,
      stateTransition: transitionResult,
      targetState: 'DEFERRED'
    });
    expect(mockedBuildStructuredIssueComment).toHaveBeenCalledWith({
      commentKind: 'defer',
      evidence: undefined,
      nextStep: undefined,
      status: 'Deferred after risk and priority review.',
      title: undefined,
      whatChanged: undefined
    });
    expect(mockedWriteStructuredIssueComment).not.toHaveBeenCalled();
    expect(mockedRecordGitHubAuditEvent).not.toHaveBeenCalled();
  });

  it('requires a non-empty status explanation for defer/reject flows', async () => {
    const context = { marker: 'custom-context' } as unknown as GitHubContext;

    await expect(
      rejectIssue(
        94,
        {
          status: '   '
        },
        {},
        context
      )
    ).rejects.toThrow('Issue disposition status is required.');

    expect(mockedTransitionIssueState).not.toHaveBeenCalled();
    expect(mockedBuildStructuredIssueComment).not.toHaveBeenCalled();
    expect(mockedWriteStructuredIssueComment).not.toHaveBeenCalled();
    expect(mockedRecordGitHubAuditEvent).not.toHaveBeenCalled();
  });
});
