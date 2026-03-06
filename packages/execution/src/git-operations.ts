import { executeWorktreeCommand } from '@evolvo/worktrees/execution-engine';

export type CommitWorktreeChangesInput = {
  commitMessage: string;
  journalPath: string;
  worktreeId: string;
  worktreePath: string;
};

export type PushWorktreeBranchInput = {
  branchName: string;
  journalPath: string;
  remoteName?: string;
  worktreeId: string;
  worktreePath: string;
};

export type CommitAndPushWorktreeInput = CommitWorktreeChangesInput &
  PushWorktreeBranchInput;

export type CommitAndPushWorktreeResult = {
  branchName: string;
  commitMessage: string;
  remoteName: string;
};

export type GitOperationsDependencies = {
  executeCommand?: typeof executeWorktreeCommand;
};

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`Git operations ${fieldName} is required.`);
  }

  return normalizedValue;
}

export function buildIssueCommitMessage(
  issueKind: string,
  issueNumber: number,
  title: string
): string {
  const normalizedTitle = normalizeRequiredText(title, 'title');
  const normalizedIssueKind = issueKind.trim().toLowerCase();
  const prefix =
    normalizedIssueKind === 'bug' || normalizedIssueKind === 'failure'
      ? 'fix'
      : normalizedIssueKind === 'feature' ||
          normalizedIssueKind === 'challenge' ||
          normalizedIssueKind === 'idea' ||
          normalizedIssueKind === 'experiment'
        ? 'feat'
        : 'chore';

  return `${prefix}(issue-${String(issueNumber)}): ${normalizedTitle}`;
}

export async function commitWorktreeChanges(
  input: CommitWorktreeChangesInput,
  dependencies: GitOperationsDependencies = {}
): Promise<void> {
  const executeCommand =
    dependencies.executeCommand ?? executeWorktreeCommand;

  await executeCommand({
    args: ['add', '-A'],
    command: 'git',
    cwd: input.worktreePath,
    journalPath: input.journalPath,
    throwOnNonZeroExit: true,
    worktreeId: input.worktreeId
  });
  await executeCommand({
    args: ['commit', '-m', normalizeRequiredText(input.commitMessage, 'commitMessage')],
    command: 'git',
    cwd: input.worktreePath,
    journalPath: input.journalPath,
    throwOnNonZeroExit: true,
    worktreeId: input.worktreeId
  });
}

export async function pushWorktreeBranch(
  input: PushWorktreeBranchInput,
  dependencies: GitOperationsDependencies = {}
): Promise<void> {
  const executeCommand =
    dependencies.executeCommand ?? executeWorktreeCommand;
  const remoteName = input.remoteName?.trim() || 'origin';

  await executeCommand({
    args: ['push', '-u', remoteName, normalizeRequiredText(input.branchName, 'branchName')],
    command: 'git',
    cwd: input.worktreePath,
    journalPath: input.journalPath,
    throwOnNonZeroExit: true,
    worktreeId: input.worktreeId
  });
}

export async function commitAndPushWorktree(
  input: CommitAndPushWorktreeInput,
  dependencies: GitOperationsDependencies = {}
): Promise<CommitAndPushWorktreeResult> {
  const remoteName = input.remoteName?.trim() || 'origin';

  await commitWorktreeChanges(input, dependencies);
  await pushWorktreeBranch(
    {
      branchName: input.branchName,
      journalPath: input.journalPath,
      remoteName,
      worktreeId: input.worktreeId,
      worktreePath: input.worktreePath
    },
    dependencies
  );

  return {
    branchName: input.branchName,
    commitMessage: input.commitMessage,
    remoteName
  };
}
