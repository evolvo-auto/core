import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export type ApplyPromptLineageInput = {
  changedFiles: string[];
  lineageReason: string;
  mutationProposalId: string;
  worktreePath: string;
};

export type ApplyPromptLineageDependencies = {
  read?: typeof readFile;
  write?: typeof writeFile;
};

function escapeStringLiteral(value: string): string {
  return JSON.stringify(value);
}

function replaceOrInsertField(
  content: string,
  fieldName: string,
  nextValueSource: string
): string {
  const fieldPattern = new RegExp(`${fieldName}:\\s*[^,\\n]+`, 'm');

  if (fieldPattern.test(content)) {
    return content.replace(fieldPattern, `${fieldName}: ${nextValueSource}`);
  }

  return content.replace(
    /title:\s*[^,\n]+,/m,
    `${fieldName}: ${nextValueSource},\n  $&`
  );
}

function applyLineageToContent(
  content: string,
  mutationProposalId: string,
  lineageReason: string
): string {
  const versionMatch = content.match(/version:\s*(\d+)/);

  if (!versionMatch) {
    throw new Error('Prompt file did not contain a version field.');
  }

  const currentVersion = Number(versionMatch[1]);
  let updatedContent = content.replace(
    /version:\s*\d+/,
    `version: ${String(currentVersion + 1)}`
  );

  updatedContent = replaceOrInsertField(
    updatedContent,
    'sourceMutationId',
    escapeStringLiteral(mutationProposalId)
  );
  updatedContent = replaceOrInsertField(
    updatedContent,
    'lineageParentVersion',
    String(currentVersion)
  );
  updatedContent = replaceOrInsertField(
    updatedContent,
    'lineageReason',
    escapeStringLiteral(lineageReason)
  );

  return updatedContent;
}

export async function applyPromptLineage(
  input: ApplyPromptLineageInput,
  dependencies: ApplyPromptLineageDependencies = {}
): Promise<string[]> {
  const read = dependencies.read ?? readFile;
  const write = dependencies.write ?? writeFile;
  const promptFiles = input.changedFiles.filter(
    (filePath) =>
      filePath.startsWith('genome/prompts/') &&
      filePath.endsWith('.ts') &&
      !filePath.endsWith('prompt-definition.ts')
  );

  for (const filePath of promptFiles) {
    const absolutePath = resolve(input.worktreePath, filePath);
    const currentContent = await read(absolutePath, 'utf-8');

    await write(
      absolutePath,
      applyLineageToContent(
        currentContent,
        input.mutationProposalId,
        input.lineageReason
      ),
      'utf-8'
    );
  }

  return promptFiles;
}
