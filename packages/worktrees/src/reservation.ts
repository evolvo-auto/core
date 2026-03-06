import { resolve } from 'node:path';

import {
  reserveWorktreeRecord,
  type ReserveWorktreeRecordInput
} from '@evolvo/api/worktree-record';

import { makeIssueBranchName } from './branch-name.js';

const defaultBaseRef = 'main';
const defaultWorktreesFolderName = '.worktrees';

export type ReserveWorktreeInput = {
  baseRef?: string;
  branchName?: string;
  filesystemPath?: string;
  issueNumber: number;
  issueTitle: string;
  worktreesRoot?: string;
};

export type ReserveWorktreeResult = {
  branchName: string;
  filesystemPath: string;
  worktree: Awaited<ReturnType<typeof reserveWorktreeRecord>>;
};

export type ReserveWorktreeDependencies = {
  reserveRecord?: (
    input: ReserveWorktreeRecordInput
  ) => Promise<Awaited<ReturnType<typeof reserveWorktreeRecord>>>;
};

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`Worktree reservation ${fieldName} is required.`);
  }

  return normalizedValue;
}

function buildFilesystemPath(input: ReserveWorktreeInput, branchName: string): string {
  if (input.filesystemPath !== undefined) {
    return normalizeRequiredText(input.filesystemPath, 'filesystemPath');
  }

  const worktreesRoot = input.worktreesRoot
    ? normalizeRequiredText(input.worktreesRoot, 'worktreesRoot')
    : resolve(process.cwd(), defaultWorktreesFolderName);

  return resolve(worktreesRoot, branchName);
}

export async function reserveWorktree(
  input: ReserveWorktreeInput,
  dependencies: ReserveWorktreeDependencies = {}
): Promise<ReserveWorktreeResult> {
  const reserveRecord = dependencies.reserveRecord ?? reserveWorktreeRecord;
  const baseRef = normalizeRequiredText(input.baseRef ?? defaultBaseRef, 'baseRef');
  const branchName =
    input.branchName?.trim() ||
    makeIssueBranchName(input.issueNumber, input.issueTitle);
  const filesystemPath = buildFilesystemPath(input, branchName);

  const worktree = await reserveRecord({
    baseRef,
    branchName,
    filesystemPath,
    issueNumber: input.issueNumber
  });

  return {
    branchName,
    filesystemPath,
    worktree
  };
}
