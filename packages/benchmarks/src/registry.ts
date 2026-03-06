import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

import {
  listBenchmarkDefinitions,
  upsertBenchmarkDefinition,
  type ListBenchmarkDefinitionsOptions,
  type UpsertBenchmarkDefinitionInput
} from '@evolvo/api/benchmark-definition';
import type { BenchmarkDefinition, Prisma } from '@evolvo/api/generated/prisma/client';
import type { NormalizedChallengeDefinition } from '@evolvo/challenges/normalize-challenge';

export type FixedBenchmarkConfigEntry = {
  benchmarkKey: string;
  benchmarkType: 'fixed' | 'holdout-pack' | 'regression-pack';
  capabilityTags?: string[];
  definition: {
    artifactExpectations?: string[];
    intent: string;
    scoringNotes?: string[];
    validationSteps?: string[];
  };
  familyKey?: string;
  isHoldout?: boolean;
  isRegressionPack?: boolean;
  scoringConfig?: Record<string, unknown>;
  title: string;
};

export type FixedBenchmarkRegistryConfig = {
  benchmarks: FixedBenchmarkConfigEntry[];
};

export type SyncFixedBenchmarkRegistryOptions = {
  configPath?: string;
  readConfig?: (path: string) => Promise<string>;
  upsertDefinition?: typeof upsertBenchmarkDefinition;
};

export type SelectBenchmarkDefinitionsInput = {
  benchmarkDefinitions: BenchmarkDefinition[];
  capabilityTags: string[];
  issueNumber: number;
};

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`Benchmark registry ${fieldName} is required.`);
  }

  return normalizedValue;
}

function normalizeOptionalText(
  value: string | null | undefined
): string | null | undefined {
  if (value === null || value === undefined) {
    return value;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue;
}

function normalizeCapabilityTags(capabilityTags: string[] | undefined): string[] {
  if (!capabilityTags) {
    return [];
  }

  const normalizedTags: string[] = [];
  const seenTags = new Set<string>();

  for (const capabilityTag of capabilityTags) {
    const normalizedTag = normalizeOptionalText(capabilityTag)?.toLowerCase();

    if (!normalizedTag || seenTags.has(normalizedTag)) {
      continue;
    }

    seenTags.add(normalizedTag);
    normalizedTags.push(normalizedTag);
  }

  return normalizedTags;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
    left.localeCompare(right)
  );

  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
    .join(',')}}`;
}

function buildFingerprint(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function toPrismaBenchmarkType(
  benchmarkType: FixedBenchmarkConfigEntry['benchmarkType'] | NormalizedChallengeDefinition['benchmarkType']
): 'EVOLVO_CHALLENGE' | 'FIXED' | 'HOLDOUT_PACK' | 'HUMAN_CHALLENGE' | 'REGRESSION_PACK' {
  switch (benchmarkType) {
    case 'evolvo-challenge':
      return 'EVOLVO_CHALLENGE';
    case 'human-challenge':
      return 'HUMAN_CHALLENGE';
    case 'holdout-pack':
      return 'HOLDOUT_PACK';
    case 'regression-pack':
      return 'REGRESSION_PACK';
    case 'fixed':
    default:
      return 'FIXED';
  }
}

async function defaultReadConfig(path: string): Promise<string> {
  return readFile(path, 'utf-8');
}

export function getDefaultBenchmarkRegistryConfigPath(): string {
  return resolve(process.cwd(), 'genome/benchmark-config/registry.json');
}

export async function loadFixedBenchmarkRegistryConfig(
  options: Pick<SyncFixedBenchmarkRegistryOptions, 'configPath' | 'readConfig'> = {}
): Promise<FixedBenchmarkRegistryConfig> {
  const configPath = options.configPath ?? getDefaultBenchmarkRegistryConfigPath();
  const readConfig = options.readConfig ?? defaultReadConfig;
  const parsed = JSON.parse(await readConfig(configPath)) as FixedBenchmarkRegistryConfig;

  if (!Array.isArray(parsed.benchmarks)) {
    throw new Error('Benchmark registry config must include a benchmarks array.');
  }

  return {
    benchmarks: parsed.benchmarks.map((entry) => ({
      benchmarkKey: normalizeRequiredText(entry.benchmarkKey, 'benchmarkKey'),
      benchmarkType: entry.benchmarkType,
      capabilityTags: normalizeCapabilityTags(entry.capabilityTags),
      definition: {
        artifactExpectations: entry.definition.artifactExpectations ?? [],
        intent: normalizeRequiredText(entry.definition.intent, 'definition.intent'),
        scoringNotes: entry.definition.scoringNotes ?? [],
        validationSteps: entry.definition.validationSteps ?? []
      },
      familyKey: normalizeOptionalText(entry.familyKey) ?? undefined,
      isHoldout: entry.isHoldout ?? entry.benchmarkType === 'holdout-pack',
      isRegressionPack:
        entry.isRegressionPack ?? entry.benchmarkType === 'regression-pack',
      scoringConfig: entry.scoringConfig ?? {},
      title: normalizeRequiredText(entry.title, 'title')
    }))
  };
}

export function buildChallengeBenchmarkDefinitionInput(
  challenge: NormalizedChallengeDefinition,
  challengeId?: string | null
): UpsertBenchmarkDefinitionInput {
  return {
    benchmarkKey: `challenge-issue-${String(challenge.sourceIssueNumber)}`,
    benchmarkType: toPrismaBenchmarkType(challenge.benchmarkType),
    capabilityTags: challenge.capabilityTags,
    challengeId: challengeId ?? null,
    definitionJson: {
      artifactExpectations: challenge.artifactExpectations,
      constraints: challenge.constraints,
      intent: challenge.intent,
      successSignal: challenge.successSignal,
      validationSteps: challenge.validationSteps
    },
    familyKey:
      challenge.benchmarkType === 'human-challenge'
        ? 'human-challenges'
        : 'evolvo-challenges',
    scoringConfigJson: {
      category: challenge.category,
      scoringNotes: challenge.scoringNotes
    },
    sourceFingerprint: challenge.sourceFingerprint,
    sourceIssueNumber: challenge.sourceIssueNumber,
    title: challenge.title
  };
}

export async function syncFixedBenchmarkRegistry(
  options: SyncFixedBenchmarkRegistryOptions = {}
): Promise<BenchmarkDefinition[]> {
  const config = await loadFixedBenchmarkRegistryConfig(options);
  const upsertDefinition = options.upsertDefinition ?? upsertBenchmarkDefinition;
  const results: BenchmarkDefinition[] = [];

  for (const entry of config.benchmarks) {
    results.push(
      await upsertDefinition({
        benchmarkKey: entry.benchmarkKey,
        benchmarkType: toPrismaBenchmarkType(entry.benchmarkType),
        capabilityTags: entry.capabilityTags,
        definitionJson: entry.definition,
        familyKey: entry.familyKey,
        isHoldout: entry.isHoldout,
        isRegressionPack: entry.isRegressionPack,
        scoringConfigJson: (entry.scoringConfig ?? {}) as Prisma.InputJsonValue,
        sourceFingerprint: buildFingerprint(entry),
        title: entry.title
      })
    );
  }

  return results;
}

function intersects(left: string[], right: string[]): boolean {
  if (left.length === 0 || right.length === 0) {
    return false;
  }

  const rightSet = new Set(right);

  return left.some((entry) => rightSet.has(entry));
}

export function selectBenchmarkDefinitionsForAttempt(
  input: SelectBenchmarkDefinitionsInput
): BenchmarkDefinition[] {
  const normalizedCapabilityTags = normalizeCapabilityTags(input.capabilityTags);

  return input.benchmarkDefinitions.filter((definition) => {
    if (!definition.isActive) {
      return false;
    }

    if (
      definition.benchmarkType === 'HUMAN_CHALLENGE' ||
      definition.benchmarkType === 'EVOLVO_CHALLENGE'
    ) {
      return definition.sourceIssueNumber === input.issueNumber;
    }

    if (definition.benchmarkType === 'FIXED') {
      return true;
    }

    return (
      definition.capabilityTags.length === 0 ||
      intersects(definition.capabilityTags, normalizedCapabilityTags)
    );
  });
}

export async function listActiveBenchmarkRegistry(
  options: Omit<ListBenchmarkDefinitionsOptions, 'isActive'> = {}
): Promise<BenchmarkDefinition[]> {
  return listBenchmarkDefinitions({
    ...options,
    isActive: true
  });
}
