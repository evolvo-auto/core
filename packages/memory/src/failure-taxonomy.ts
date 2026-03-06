import type { CriticOutput } from '@evolvo/schemas/role-output-schemas';
import type {
  FailureCategory,
  FailurePhase
} from '@evolvo/schemas/shared-enums';

export type FailureTaxonomyInput = {
  criticOutput?: Pick<
    CriticOutput,
    'completionAssessment' | 'isSystemic' | 'notes' | 'recommendedNextAction'
  >;
  observedFailures?: string[];
};

export type FailureTaxonomyResult = {
  category: FailureCategory;
  phase: FailurePhase;
  signals: string[];
};

const dependencyIssueKeywords = [
  'module not found',
  'cannot resolve',
  'package.json',
  'lockfile',
  'tsconfig',
  'eslint config',
  'postcss',
  'tailwind',
  'missing script',
  'workspace'
] as const;
const environmentIssueKeywords = [
  'env',
  'environment',
  'database_url',
  'connection refused',
  'docker',
  'port ',
  'permission denied',
  'timed out'
] as const;
const evaluatorMismatchKeywords = [
  'acceptance criteria',
  'expected',
  'evaluator mismatch',
  'should have'
] as const;
const modelQualityKeywords = [
  'schema validation failed',
  'structured output',
  'invalid input',
  'responses api',
  'model invocation',
  'temperature is not supported',
  'unsupported parameter'
] as const;

function normalizeTextValues(values: string[]): string[] {
  return values
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function includesAnyKeyword(text: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function buildEvidenceText(input: FailureTaxonomyInput): string {
  return normalizeTextValues([
    ...(input.observedFailures ?? []),
    ...(input.criticOutput?.notes ?? [])
  ])
    .join('\n')
    .toLowerCase();
}

function detectPhase(input: FailureTaxonomyInput, evidenceText: string): FailurePhase {
  if (
    evidenceText.includes('requirement') ||
    evidenceText.includes('misunderstood') ||
    input.criticOutput?.recommendedNextAction === 'defer'
  ) {
    return 'planning';
  }

  if (
    includesAnyKeyword(evidenceText, environmentIssueKeywords) ||
    evidenceText.includes('install')
  ) {
    return 'environment';
  }

  if (includesAnyKeyword(evidenceText, modelQualityKeywords)) {
    return 'runtime';
  }

  if (
    evidenceText.includes('promotion') ||
    evidenceText.includes('shadow mode') ||
    evidenceText.includes('runtime candidate')
  ) {
    return 'promotion';
  }

  if (input.observedFailures && input.observedFailures.length > 0) {
    return 'evaluation';
  }

  return 'implementation';
}

function detectCategory(
  input: FailureTaxonomyInput,
  evidenceText: string,
  phase: FailurePhase
): FailureCategory {
  if (
    evidenceText.includes('requirement') ||
    evidenceText.includes('misunderstood')
  ) {
    return 'requirement-misunderstanding';
  }

  if (phase === 'planning') {
    return 'planning-failure';
  }

  if (includesAnyKeyword(evidenceText, modelQualityKeywords)) {
    return 'model-quality-issue';
  }

  if (evidenceText.includes('benchmark')) {
    return 'benchmark-integrity-issue';
  }

  if (evidenceText.includes('mutation') && evidenceText.includes('regress')) {
    return 'mutation-regression';
  }

  if (evidenceText.includes('smoke') || evidenceText.includes('playwright')) {
    return 'smoke-e2e-failure';
  }

  if (includesAnyKeyword(evidenceText, evaluatorMismatchKeywords)) {
    return 'evaluator-mismatch';
  }

  if (phase === 'environment') {
    if (includesAnyKeyword(evidenceText, dependencyIssueKeywords)) {
      return 'dependency-configuration-issue';
    }

    return 'environment-setup-failure';
  }

  if (
    phase === 'evaluation' &&
    includesAnyKeyword(evidenceText, dependencyIssueKeywords)
  ) {
    return 'dependency-configuration-issue';
  }

  if (phase === 'runtime') {
    return 'runtime-failure';
  }

  if (
    input.criticOutput?.completionAssessment === 'failed' ||
    input.criticOutput?.recommendedNextAction === 'patch-directly'
  ) {
    return 'code-generation-defect';
  }

  return 'runtime-failure';
}

export function classifyFailureTaxonomy(
  input: FailureTaxonomyInput
): FailureTaxonomyResult {
  const evidenceText = buildEvidenceText(input);
  const phase = detectPhase(input, evidenceText);
  const category = detectCategory(input, evidenceText, phase);
  const signals = normalizeTextValues([
    phase,
    category,
    ...(input.observedFailures ?? []).slice(0, 3),
    ...(input.criticOutput?.notes ?? []).slice(0, 2)
  ]);

  return {
    category,
    phase,
    signals
  };
}

export function toPrismaFailureCategory(category: FailureCategory): string {
  return category.toUpperCase().replace(/-/g, '_');
}

export function toPrismaFailurePhase(phase: FailurePhase): string {
  return phase.toUpperCase();
}
