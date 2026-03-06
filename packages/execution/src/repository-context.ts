import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { PlannerOutput } from '@evolvo/schemas/role-output-schemas';

export type RepositoryContextFile = {
  content: string;
  path: string;
};

export type BuildRepositoryContextInput = {
  body?: string;
  filePaths: string[];
  maxCharactersPerFile?: number;
  maxFiles?: number;
  plannerOutput: Pick<
    PlannerOutput,
    'capabilityTags' | 'objective' | 'relevantSurfaces' | 'title'
  >;
  title: string;
  worktreePath: string;
};

function normalizeFilePath(filePath: string): string {
  return filePath.trim();
}

function tokenize(text: string): string[] {
  const matches = text.toLowerCase().match(/[a-z0-9][a-z0-9-]+/g);

  if (!matches) {
    return [];
  }

  const tokens = matches.filter((token) => token.length >= 3);

  return Array.from(new Set(tokens));
}

function buildKeywordSet(
  input: Pick<BuildRepositoryContextInput, 'body' | 'plannerOutput' | 'title'>
): Set<string> {
  return new Set(
    tokenize(
      [
        input.body ?? '',
        input.plannerOutput.objective,
        input.plannerOutput.title,
        input.title,
        input.plannerOutput.capabilityTags.join(' '),
        input.plannerOutput.relevantSurfaces.join(' ')
      ].join(' ')
    )
  );
}

function scoreFilePath(filePath: string, keywords: Set<string>): number {
  const normalizedFilePath = filePath.toLowerCase();
  let score = 0;

  for (const keyword of keywords) {
    if (normalizedFilePath.includes(keyword)) {
      score += 5;
    }
  }

  if (normalizedFilePath === 'package.json') {
    score += 6;
  }

  if (
    normalizedFilePath === 'turbo.json' ||
    normalizedFilePath === 'pnpm-workspace.yaml' ||
    normalizedFilePath === 'tsconfig.base.json'
  ) {
    score += 5;
  }

  if (normalizedFilePath.startsWith('apps/')) {
    score += 2;
  }

  if (normalizedFilePath.startsWith('packages/')) {
    score += 3;
  }

  return score;
}

export function selectRepositoryContextPaths(
  input: Pick<
    BuildRepositoryContextInput,
    'body' | 'filePaths' | 'maxFiles' | 'plannerOutput' | 'title'
  >
): string[] {
  const keywords = buildKeywordSet(input);
  const maxFiles = Math.max(1, Math.floor(input.maxFiles ?? 14));

  return input.filePaths
    .map((filePath) => ({
      filePath,
      score: scoreFilePath(filePath, keywords)
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.filePath.localeCompare(right.filePath);
    })
    .slice(0, maxFiles)
    .map((entry) => entry.filePath);
}

export async function buildRepositoryContext(
  input: BuildRepositoryContextInput
): Promise<RepositoryContextFile[]> {
  const contextPaths = selectRepositoryContextPaths(input);
  const maxCharactersPerFile = Math.max(
    500,
    Math.floor(input.maxCharactersPerFile ?? 8000)
  );
  const repositoryContextFiles: RepositoryContextFile[] = [];

  for (const contextPath of contextPaths) {
    const normalizedPath = normalizeFilePath(contextPath);
    const absolutePath = resolve(input.worktreePath, normalizedPath);
    const fileContent = await readFile(absolutePath, 'utf-8').catch(() => undefined);

    if (fileContent === undefined) {
      continue;
    }

    repositoryContextFiles.push({
      content:
        fileContent.length > maxCharactersPerFile
          ? `${fileContent.slice(0, maxCharactersPerFile)}\n/* [truncated for builder context] */\n`
          : fileContent,
      path: normalizedPath
    });
  }

  return repositoryContextFiles;
}
