import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export type ArtifactType =
  | 'command-log'
  | 'stdout'
  | 'stderr'
  | 'diff-summary'
  | 'evaluation-report'
  | 'failure-reflection'
  | 'promotion-report'
  | 'issue-summary';

export type PersistArtifactInput = {
  artifactType: ArtifactType;
  content: string;
  fileName?: string;
};

export type PersistWorktreeArtifactsInput = {
  artifacts: PersistArtifactInput[];
  artifactsRoot?: string;
  attemptId: string;
  worktreeId: string;
};

export type PersistedArtifact = {
  artifactType: ArtifactType;
  bytes: number;
  fileName: string;
  path: string;
};

export type PersistWorktreeArtifactsResult = {
  artifactsDirectoryPath: string;
  manifestPath: string;
  persistedArtifacts: PersistedArtifact[];
};

const defaultArtifactsDirectoryName = '.artifacts';

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`Artifact persistence ${fieldName} is required.`);
  }

  return normalizedValue;
}

function normalizeArtifacts(artifacts: PersistArtifactInput[]): PersistArtifactInput[] {
  if (artifacts.length === 0) {
    throw new Error('Artifact persistence requires at least one artifact.');
  }

  return artifacts.map((artifact) => ({
    artifactType: artifact.artifactType,
    content: artifact.content,
    fileName: artifact.fileName?.trim()
  }));
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, '-');
}

function resolveArtifactFileName(
  artifact: PersistArtifactInput,
  index: number
): string {
  if (artifact.fileName && artifact.fileName.length > 0) {
    return sanitizeFileName(artifact.fileName);
  }

  return `${String(index + 1).padStart(2, '0')}-${artifact.artifactType}.log`;
}

export async function persistWorktreeArtifacts(
  input: PersistWorktreeArtifactsInput
): Promise<PersistWorktreeArtifactsResult> {
  const artifacts = normalizeArtifacts(input.artifacts);
  const worktreeId = normalizeRequiredText(input.worktreeId, 'worktreeId');
  const attemptId = normalizeRequiredText(input.attemptId, 'attemptId');
  const artifactsRoot = resolve(
    input.artifactsRoot?.trim() || defaultArtifactsDirectoryName
  );
  const artifactsDirectoryPath = resolve(
    artifactsRoot,
    'worktrees',
    worktreeId,
    'attempts',
    attemptId
  );

  await mkdir(artifactsDirectoryPath, {
    recursive: true
  });

  const persistedArtifacts: PersistedArtifact[] = [];

  for (const [index, artifact] of artifacts.entries()) {
    const fileName = resolveArtifactFileName(artifact, index);
    const artifactPath = resolve(artifactsDirectoryPath, fileName);

    await writeFile(artifactPath, artifact.content, {
      encoding: 'utf-8'
    });

    persistedArtifacts.push({
      artifactType: artifact.artifactType,
      bytes: Buffer.byteLength(artifact.content, 'utf-8'),
      fileName,
      path: artifactPath
    });
  }

  const manifestPath = resolve(artifactsDirectoryPath, 'manifest.json');
  const manifest = {
    artifacts: persistedArtifacts.map((artifact) => ({
      artifactType: artifact.artifactType,
      bytes: artifact.bytes,
      fileName: artifact.fileName,
      path: artifact.path
    })),
    attemptId,
    generatedAt: new Date().toISOString(),
    worktreeId
  };

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: 'utf-8'
  });

  return {
    artifactsDirectoryPath,
    manifestPath,
    persistedArtifacts
  };
}
