import { createGitHubAuditEvent } from '@evolvo/api/github-audit-event';

import { getGitHubContext } from './auth.js';
import type {
  GitHubContext,
  RecordGitHubAuditEventInput,
  RecordGitHubAuditEventResult
} from './types.js';

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export async function recordGitHubAuditEvent(
  input: RecordGitHubAuditEventInput,
  context: GitHubContext = getGitHubContext()
): Promise<RecordGitHubAuditEventResult> {
  try {
    await createGitHubAuditEvent({
      action: input.action,
      issueNumber: input.issueNumber,
      metadataJson: input.metadata,
      pullRequestNumber: input.pullRequestNumber,
      repositoryName: context.repository.repo,
      repositoryOwner: context.repository.owner
    });

    return {
      action: input.action,
      issueNumber: input.issueNumber,
      persisted: true,
      pullRequestNumber: input.pullRequestNumber
    };
  } catch (error) {
    return {
      action: input.action,
      errorMessage: toErrorMessage(error),
      issueNumber: input.issueNumber,
      persisted: false,
      pullRequestNumber: input.pullRequestNumber
    };
  }
}
