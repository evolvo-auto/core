import { describe, expect, it, vi } from 'vitest';

import { createIssueComment } from './comments.js';
import {
  buildStructuredIssueComment,
  writeStructuredIssueComment
} from './issue-comment-writer.js';
import type { GitHubContext, GitHubIssueComment } from './types.js';

vi.mock('./comments.js', () => ({
  createIssueComment: vi.fn()
}));

const mockedCreateIssueComment = vi.mocked(createIssueComment);

describe('issue comment writer', () => {
  it('builds a structured comment with normalized user-provided content', () => {
    expect(
      buildStructuredIssueComment({
        commentKind: 'progress',
        evidence: ['  CI green on main branch  ', '   '],
        nextStep: '  Open PR for review  ',
        status: '  Main implementation pass is complete.  ',
        title: '  Progress Checkpoint  ',
        whatChanged: [
          ' Added API integration ',
          '',
          ' Expanded test coverage  '
        ]
      })
    ).toBe(`### Progress Checkpoint

**Current status**
Main implementation pass is complete.

**What changed**
- Added API integration
- Expanded test coverage

**Evidence**
- CI green on main branch

**Next step**
Open PR for review`);
  });

  it('uses defaults and fallback bullets when optional fields are omitted', () => {
    expect(
      buildStructuredIssueComment({
        commentKind: 'blocker',
        evidence: ['   '],
        nextStep: '   ',
        status: '',
        title: ' ',
        whatChanged: []
      })
    ).toBe(`### Execution Blocker

**Current status**
Execution is blocked pending resolution.

**What changed**
- No material changes to report yet.

**Evidence**
- No supporting evidence attached yet.

**Next step**
Resolve the blocker and resume execution.`);
  });

  it('writes the rendered comment to the issue and returns metadata', async () => {
    const comment = {
      body: 'posted',
      id: 501
    } as GitHubIssueComment;
    const context = { marker: 'custom-context' } as unknown as GitHubContext;
    mockedCreateIssueComment.mockResolvedValue(comment);

    const result = await writeStructuredIssueComment(
      88,
      {
        commentKind: 'work-started',
        evidence: ['Task selected and scoped.'],
        whatChanged: ['Created implementation branch.']
      },
      context
    );

    expect(mockedCreateIssueComment).toHaveBeenCalledWith(
      88,
      {
        body: `### Work Started

**Current status**
Work has started on this issue.

**What changed**
- Created implementation branch.

**Evidence**
- Task selected and scoped.

**Next step**
Proceed with implementation and post progress updates.`
      },
      context
    );
    expect(result).toEqual({
      body: `### Work Started

**Current status**
Work has started on this issue.

**What changed**
- Created implementation branch.

**Evidence**
- Task selected and scoped.

**Next step**
Proceed with implementation and post progress updates.`,
      comment,
      commentKind: 'work-started',
      issueNumber: 88
    });
  });
});
