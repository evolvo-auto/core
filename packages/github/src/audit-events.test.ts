import { describe, expect, it, vi } from 'vitest';

import { createGitHubAuditEvent } from '@evolvo/api/github-audit-event';

import { recordGitHubAuditEvent } from './audit-events.js';
import type { GitHubContext } from './types.js';

vi.mock('@evolvo/api/github-audit-event', () => ({
  createGitHubAuditEvent: vi.fn()
}));

const mockedCreateGitHubAuditEvent = vi.mocked(createGitHubAuditEvent);

describe('GitHub audit event persistence', () => {
  it('persists an audit event with repository context mapping', async () => {
    const context: GitHubContext = {
      octokit: {} as GitHubContext['octokit'],
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    mockedCreateGitHubAuditEvent.mockResolvedValue({
      action: 'issue-comment.created',
      createdAt: new Date('2026-03-06T12:00:00.000Z'),
      id: 'evt_1',
      issueNumber: 44,
      metadataJson: {
        commentKind: 'progress'
      },
      pullRequestNumber: null,
      repositoryName: 'core',
      repositoryOwner: 'evolvo-auto'
    });

    expect(
      await recordGitHubAuditEvent(
        {
          action: 'issue-comment.created',
          issueNumber: 44,
          metadata: {
            commentKind: 'progress'
          }
        },
        context
      )
    ).toEqual({
      action: 'issue-comment.created',
      issueNumber: 44,
      persisted: true,
      pullRequestNumber: undefined
    });

    expect(mockedCreateGitHubAuditEvent).toHaveBeenCalledWith({
      action: 'issue-comment.created',
      issueNumber: 44,
      metadataJson: {
        commentKind: 'progress'
      },
      pullRequestNumber: undefined,
      repositoryName: 'core',
      repositoryOwner: 'evolvo-auto'
    });
  });

  it('returns a non-throwing persistence result when DAL write fails', async () => {
    const context: GitHubContext = {
      octokit: {} as GitHubContext['octokit'],
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    mockedCreateGitHubAuditEvent.mockRejectedValue(
      new Error('database unavailable')
    );

    expect(
      await recordGitHubAuditEvent(
        {
          action: 'pull-request.updated',
          pullRequestNumber: 22
        },
        context
      )
    ).toEqual({
      action: 'pull-request.updated',
      errorMessage: 'database unavailable',
      issueNumber: undefined,
      persisted: false,
      pullRequestNumber: 22
    });
  });
});
