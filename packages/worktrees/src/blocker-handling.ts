import { updateAttemptRecord } from '@evolvo/api/attempt-record';
import {
  getWorktreeRecordById,
  updateWorktreeRecord
} from '@evolvo/api/worktree-record';
import { transitionIssueState } from '@evolvo/github/issue-state';
import { writeStructuredIssueComment } from '@evolvo/github/issue-comment-writer';

export type WorktreeFailurePhase =
  | 'reservation'
  | 'creation'
  | 'hydration'
  | 'execution'
  | 'evaluation'
  | 'cleanup';

export type HandleWorktreeBlockerInput = {
  attemptId?: string;
  error: unknown;
  evidence?: string[];
  issueNumber?: number;
  nextStep?: string;
  phase: WorktreeFailurePhase;
  worktreeId: string;
};

export type HandleWorktreeBlockerResult = {
  commentBody: string;
  issueNumber: number;
  message: string;
  stateChanged: boolean;
  worktree: Awaited<ReturnType<typeof updateWorktreeRecord>>;
};

export type HandleWorktreeBlockerDependencies = {
  getRecordById?: typeof getWorktreeRecordById;
  transitionIssue?: typeof transitionIssueState;
  updateAttempt?: typeof updateAttemptRecord;
  updateWorktree?: typeof updateWorktreeRecord;
  writeComment?: typeof writeStructuredIssueComment;
};

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`Worktree blocker ${fieldName} is required.`);
  }

  return normalizedValue;
}

function normalizeIssueNumber(issueNumber: number): number {
  if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
    throw new Error('Worktree blocker issueNumber must be a positive integer.');
  }

  return issueNumber;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.trim() || 'Unknown worktree setup failure.';
  }

  return String(error || 'Unknown worktree setup failure.');
}

function formatPhase(phase: WorktreeFailurePhase): string {
  return phase[0].toUpperCase() + phase.slice(1);
}

export async function handleWorktreeBlocker(
  input: HandleWorktreeBlockerInput,
  dependencies: HandleWorktreeBlockerDependencies = {}
): Promise<HandleWorktreeBlockerResult> {
  const getRecordById = dependencies.getRecordById ?? getWorktreeRecordById;
  const updateWorktree = dependencies.updateWorktree ?? updateWorktreeRecord;
  const transitionIssue = dependencies.transitionIssue ?? transitionIssueState;
  const writeComment = dependencies.writeComment ?? writeStructuredIssueComment;
  const updateAttempt = dependencies.updateAttempt ?? updateAttemptRecord;
  const worktreeId = normalizeRequiredText(input.worktreeId, 'worktreeId');
  const record = await getRecordById(worktreeId);

  if (!record) {
    throw new Error(`Worktree "${worktreeId}" was not found.`);
  }

  const issueNumber = normalizeIssueNumber(input.issueNumber ?? record.issueNumber);
  const message = toErrorMessage(input.error);
  const phase = formatPhase(input.phase);
  const worktree = await updateWorktree({
    id: record.id,
    status: 'FAILED'
  });

  if (input.attemptId?.trim()) {
    await updateAttempt({
      endedAt: new Date(),
      id: input.attemptId.trim(),
      outcome: 'BLOCKED',
      summary: `${phase} blocked worktree execution: ${message}`
    }).catch(() => {
      // Attempt updates are best effort because some setup failures occur before attempt creation.
    });
  }

  const commentResult = await writeComment(issueNumber, {
    commentKind: 'blocker',
    evidence: [
      `Worktree: ${record.id}`,
      `Phase: ${input.phase}`,
      `Error: ${message}`,
      ...(input.evidence ?? [])
    ],
    nextStep:
      input.nextStep ??
      'Resolve the setup blocker, then rerun worktree creation/hydration.',
    status: `${phase} failed while preparing worktree \`${record.branchName}\`.`,
    title: `${phase} blocker in worktree setup`,
    whatChanged: [
      `Worktree status was updated to \`FAILED\` for \`${record.id}\`.`,
      'Issue has been moved to `state:blocked`.'
    ]
  });
  const transitionResult = await transitionIssue(issueNumber, 'BLOCKED', {
    dryRun: false
  });

  return {
    commentBody: commentResult.body,
    issueNumber,
    message,
    stateChanged: transitionResult.changed,
    worktree
  };
}
