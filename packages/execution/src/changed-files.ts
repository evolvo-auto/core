import { executeWorktreeCommand } from '@evolvo/worktrees/execution-engine';

export type DetectChangedFilesInput = {
  intendedFiles: string[];
  journalPath: string;
  worktreeId: string;
  worktreePath: string;
};

export type DetectChangedFilesResult = {
  actualChangedFiles: string[];
  diffSummary: string;
  hasChanges: boolean;
  intendedOnlyFiles: string[];
  unexpectedChangedFiles: string[];
};

export type DetectChangedFilesDependencies = {
  executeCommand?: typeof executeWorktreeCommand;
};

function normalizeFilePath(filePath: string): string {
  return filePath.trim();
}

function parseChangedFilePaths(stdout: string): string[] {
  const changedFilePaths: string[] = [];
  const seenFilePaths = new Set<string>();

  for (const line of stdout.split('\n')) {
    const normalizedFilePath = normalizeFilePath(line);

    if (!normalizedFilePath || seenFilePaths.has(normalizedFilePath)) {
      continue;
    }

    seenFilePaths.add(normalizedFilePath);
    changedFilePaths.push(normalizedFilePath);
  }

  return changedFilePaths;
}

function buildSetDifference(left: string[], right: string[]): string[] {
  const rightSet = new Set(right);

  return left.filter((value) => !rightSet.has(value));
}

export async function detectChangedFiles(
  input: DetectChangedFilesInput,
  dependencies: DetectChangedFilesDependencies = {}
): Promise<DetectChangedFilesResult> {
  const executeCommand = dependencies.executeCommand ?? executeWorktreeCommand;
  const changedFilesResult = await executeCommand({
    args: ['diff', '--name-only', '--relative=.', 'HEAD'],
    classification: 'inspect',
    command: 'git',
    cwd: input.worktreePath,
    journalPath: input.journalPath,
    throwOnNonZeroExit: false,
    worktreeId: input.worktreeId
  });
  const diffSummaryResult = await executeCommand({
    args: ['diff', '--stat', '--relative=.', 'HEAD'],
    classification: 'inspect',
    command: 'git',
    cwd: input.worktreePath,
    journalPath: input.journalPath,
    throwOnNonZeroExit: false,
    worktreeId: input.worktreeId
  });
  const actualChangedFiles = parseChangedFilePaths(changedFilesResult.result.stdout);
  const intendedFiles = input.intendedFiles
    .map((filePath) => normalizeFilePath(filePath))
    .filter((filePath) => filePath.length > 0);

  return {
    actualChangedFiles,
    diffSummary: diffSummaryResult.result.stdout.trim(),
    hasChanges: actualChangedFiles.length > 0,
    intendedOnlyFiles: buildSetDifference(intendedFiles, actualChangedFiles),
    unexpectedChangedFiles: buildSetDifference(actualChangedFiles, intendedFiles)
  };
}
