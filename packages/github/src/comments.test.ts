import { describe, expect, it, vi } from 'vitest';

import { createIssueComment, listIssueComments } from './comments.js';
import type {
  GitHubContext,
  GitHubIssueComment,
  GitHubIssueCommentListItem,
  GitHubRestClient
} from './types.js';

describe('GitHub comment operations', () => {
  it('lists issue comments with camelCase option mapping', async () => {
    const comments = [{ id: 1 }] as GitHubIssueCommentListItem[];
    const listComments = vi.fn().mockResolvedValue({ data: comments });
    const context: GitHubContext = {
      octokit: {
        rest: {
          issues: {
            listComments
          }
        }
      } as unknown as GitHubRestClient,
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    expect(
      await listIssueComments(
        42,
        {
          direction: 'desc',
          page: 3,
          perPage: 40,
          since: '2026-03-06T00:00:00.000Z',
          sort: 'updated'
        },
        context
      )
    ).toBe(comments);
    expect(listComments).toHaveBeenCalledWith({
      direction: 'desc',
      issue_number: 42,
      owner: 'evolvo-auto',
      page: 3,
      per_page: 40,
      repo: 'core',
      since: '2026-03-06T00:00:00.000Z',
      sort: 'updated'
    });
  });

  it('creates a new issue comment', async () => {
    const comment = { id: 99 } as GitHubIssueComment;
    const createComment = vi.fn().mockResolvedValue({ data: comment });
    const context: GitHubContext = {
      octokit: {
        rest: {
          issues: {
            createComment
          }
        }
      } as unknown as GitHubRestClient,
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    expect(
      await createIssueComment(
        77,
        {
          body: 'Execution summary'
        },
        context
      )
    ).toBe(comment);
    expect(createComment).toHaveBeenCalledWith({
      body: 'Execution summary',
      issue_number: 77,
      owner: 'evolvo-auto',
      repo: 'core'
    });
  });
});
