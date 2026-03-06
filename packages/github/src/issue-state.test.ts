import { afterEach, describe, expect, it, vi } from 'vitest';

import { recordGitHubAuditEvent } from './audit-events.js';
import {
  buildIssueStateTransitionLabels,
  extractIssueStateLabelNames,
  getIssueStateLabelName,
  transitionIssueState,
  transitionIssueToState
} from './issue-state.js';
import type {
  GitHubContext,
  GitHubIssue,
  GitHubIssueLabelMutationResult,
  GitHubRestClient
} from './types.js';

vi.mock('./audit-events.js', () => ({
  recordGitHubAuditEvent: vi.fn()
}));

const mockedRecordGitHubAuditEvent = vi.mocked(recordGitHubAuditEvent);

describe('issue state helpers', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('maps workflow states to canonical state labels', () => {
    expect(getIssueStateLabelName('TRIAGE')).toBe('state:triage');
    expect(getIssueStateLabelName('IN_PROGRESS')).toBe('state:in-progress');
    expect(getIssueStateLabelName('DONE')).toBe('state:done');
  });

  it('extracts and deduplicates state labels', () => {
    expect(
      extractIssueStateLabelNames([
        { name: 'state:planned' },
        { name: 'state:planned' },
        { name: 'kind:feature' },
        'state:blocked',
        'state:blocked'
      ])
    ).toEqual(['state:planned', 'state:blocked']);
  });

  it('builds transition labels by preserving non-state labels', () => {
    expect(
      buildIssueStateTransitionLabels(
        [
          { name: 'kind:feature' },
          { name: 'state:planned' },
          { name: 'risk:low' },
          { name: 'state:blocked' }
        ],
        'SELECTED'
      )
    ).toEqual(['kind:feature', 'risk:low', 'state:selected']);
  });

  it('transitions issue labels via setLabels when a change is needed', async () => {
    const issue = {
      labels: [{ name: 'kind:feature' }, { name: 'state:planned' }],
      number: 42
    } as unknown as GitHubIssue;
    const get = vi.fn().mockResolvedValue({ data: issue });
    const setLabels = vi
      .fn()
      .mockResolvedValue({ data: [] as GitHubIssueLabelMutationResult });
    const context: GitHubContext = {
      octokit: {
        rest: {
          issues: {
            get,
            setLabels
          }
        }
      } as unknown as GitHubRestClient,
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    const result = await transitionIssueState(42, 'IN_PROGRESS', {}, context);

    expect(result.changed).toBe(true);
    expect(result.currentState).toBe('PLANNED');
    expect(result.currentStateLabels).toEqual(['state:planned']);
    expect(result.nextState).toBe('IN_PROGRESS');
    expect(result.nextStateLabel).toBe('state:in-progress');
    expect(result.nextLabels).toEqual(['kind:feature', 'state:in-progress']);
    expect(setLabels).toHaveBeenCalledWith({
      issue_number: 42,
      labels: ['kind:feature', 'state:in-progress'],
      owner: 'evolvo-auto',
      repo: 'core'
    });
    expect(mockedRecordGitHubAuditEvent).toHaveBeenCalledWith(
      {
        action: 'issue-state.transitioned',
        issueNumber: 42,
        metadata: {
          currentState: 'PLANNED',
          currentStateLabels: ['state:planned'],
          nextLabels: ['kind:feature', 'state:in-progress'],
          nextState: 'IN_PROGRESS',
          nextStateLabel: 'state:in-progress'
        }
      },
      context
    );
  });

  it('returns unchanged when issue is already in target state', async () => {
    const issue = {
      labels: [{ name: 'kind:feature' }, { name: 'state:planned' }],
      number: 43
    } as unknown as GitHubIssue;
    const get = vi.fn().mockResolvedValue({ data: issue });
    const setLabels = vi.fn();
    const context: GitHubContext = {
      octokit: {
        rest: {
          issues: {
            get,
            setLabels
          }
        }
      } as unknown as GitHubRestClient,
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    const result = await transitionIssueState(43, 'PLANNED', {}, context);

    expect(result.changed).toBe(false);
    expect(result.nextLabels).toEqual(['kind:feature', 'state:planned']);
    expect(setLabels).not.toHaveBeenCalled();
    expect(mockedRecordGitHubAuditEvent).not.toHaveBeenCalled();
  });

  it('supports dry-run transitions without writing labels', async () => {
    const issue = {
      labels: [{ name: 'kind:feature' }, { name: 'state:planned' }],
      number: 44
    } as unknown as GitHubIssue;
    const get = vi.fn().mockResolvedValue({ data: issue });
    const setLabels = vi.fn();
    const context: GitHubContext = {
      octokit: {
        rest: {
          issues: {
            get,
            setLabels
          }
        }
      } as unknown as GitHubRestClient,
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    const result = await transitionIssueState(
      44,
      'IN_PROGRESS',
      {
        dryRun: true
      },
      context
    );

    expect(result.changed).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(setLabels).not.toHaveBeenCalled();
    expect(mockedRecordGitHubAuditEvent).not.toHaveBeenCalled();
  });

  it('blocks transitions when expected current state does not match', async () => {
    const issue = {
      labels: [{ name: 'kind:feature' }, { name: 'state:planned' }],
      number: 45
    } as unknown as GitHubIssue;
    const get = vi.fn().mockResolvedValue({ data: issue });
    const setLabels = vi.fn();
    const context: GitHubContext = {
      octokit: {
        rest: {
          issues: {
            get,
            setLabels
          }
        }
      } as unknown as GitHubRestClient,
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    await expect(
      transitionIssueState(
        45,
        'DONE',
        {
          expectedCurrentState: 'SELECTED'
        },
        context
      )
    ).rejects.toThrow(
      'Refusing state transition for issue #45: expected current state SELECTED, received PLANNED'
    );
    expect(setLabels).not.toHaveBeenCalled();
    expect(mockedRecordGitHubAuditEvent).not.toHaveBeenCalled();
  });

  it('supports transitioning an issue object directly', async () => {
    const issue = {
      labels: [{ name: 'state:planned' }],
      number: 46
    } as unknown as GitHubIssue;
    const get = vi.fn().mockResolvedValue({ data: issue });
    const setLabels = vi.fn().mockResolvedValue({
      data: [] as GitHubIssueLabelMutationResult
    });
    const context: GitHubContext = {
      octokit: {
        rest: {
          issues: {
            get,
            setLabels
          }
        }
      } as unknown as GitHubRestClient,
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    const result = await transitionIssueToState(issue, 'DONE', {}, context);

    expect(result.issueNumber).toBe(46);
    expect(result.nextState).toBe('DONE');
    expect(setLabels).toHaveBeenCalledTimes(1);
    expect(mockedRecordGitHubAuditEvent).toHaveBeenCalledTimes(1);
  });
});
