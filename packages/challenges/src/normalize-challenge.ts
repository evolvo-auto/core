import { createHash } from 'node:crypto';

import type {
  BenchmarkType,
  ChallengeCategory
} from '@evolvo/schemas/shared-enums';

export type NormalizeChallengeInput = {
  body?: string | null;
  labels?: string[];
  source: 'evolvo' | 'human';
  sourceIssueNumber: number;
  title: string;
};

export type NormalizedChallengeDefinition = {
  artifactExpectations: string[];
  benchmarkType: Exclude<BenchmarkType, 'fixed' | 'holdout-pack' | 'regression-pack'>;
  capabilityTags: string[];
  category: ChallengeCategory;
  constraints: string[];
  intent: string;
  scoringNotes: string[];
  source: NormalizeChallengeInput['source'];
  sourceFingerprint: string;
  sourceIssueNumber: number;
  successSignal: string | null;
  title: string;
  validationSteps: string[];
};

type SectionMap = Map<string, string[]>;

const capabilityKeywords = [
  {
    capability: 'nextjs',
    keywords: [' nextjs', ' app router', 'server component', 'react-query']
  },
  {
    capability: 'nestjs',
    keywords: [' nestjs', 'nest ', ' controller', 'provider']
  },
  {
    capability: 'typescript',
    keywords: [' typescript', ' tsconfig', 'typecheck']
  },
  {
    capability: 'ci',
    keywords: [' ci', 'github actions', 'pipeline', 'workflow']
  },
  {
    capability: 'benchmark-design',
    keywords: ['benchmark', 'holdout', 'regression pack']
  },
  {
    capability: 'debugging',
    keywords: ['debug', 'failure', 'regression', 'broken', 'investigate']
  },
  {
    capability: 'repo-generation',
    keywords: ['new repo', 'fresh repo', 'bootstrap', 'scaffold']
  },
  {
    capability: 'prompt-mutation',
    keywords: ['prompt', 'system prompt', 'prompt mutation']
  },
  {
    capability: 'runtime-upgrade',
    keywords: ['runtime upgrade', 'promotion', 'shadow mode', 'upgrade stability']
  }
] as const;

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`Challenge normalization ${fieldName} is required.`);
  }

  return normalizedValue;
}

function normalizeLabelNames(labels: string[] | undefined): string[] {
  if (!labels) {
    return [];
  }

  const normalizedLabels: string[] = [];
  const seenLabels = new Set<string>();

  for (const label of labels) {
    const normalizedLabel = label.trim().toLowerCase();

    if (!normalizedLabel || seenLabels.has(normalizedLabel)) {
      continue;
    }

    seenLabels.add(normalizedLabel);
    normalizedLabels.push(normalizedLabel);
  }

  return normalizedLabels;
}

function parseSections(body: string): SectionMap {
  const sections = new Map<string, string[]>();
  let currentHeading = 'body';

  sections.set(currentHeading, []);

  for (const rawLine of body.split(/\r?\n/)) {
    const headingMatch = rawLine.match(/^#{1,6}\s+(.+?)\s*$/);

    if (headingMatch) {
      currentHeading = headingMatch[1].trim().toLowerCase();
      sections.set(currentHeading, []);
      continue;
    }

    sections.get(currentHeading)?.push(rawLine);
  }

  return sections;
}

function getSectionContent(
  sections: SectionMap,
  sectionNames: string[]
): string {
  for (const sectionName of sectionNames) {
    const lines = sections.get(sectionName);

    if (!lines) {
      continue;
    }

    const content = lines.join('\n').trim();

    if (content) {
      return content;
    }
  }

  return '';
}

function parseListContent(content: string): string[] {
  if (!content.trim()) {
    return [];
  }

  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '').trim())
    .filter((line) => line.length > 0);
}

function findFallbackIntent(body: string): string {
  const firstParagraph = body
    .split(/\n{2,}/)
    .map((section) => section.replace(/^#{1,6}\s+.+$/gm, '').trim())
    .find((section) => section.length > 0);

  return firstParagraph?.replace(/\s+/g, ' ') ?? '';
}

function deriveCapabilityTags(labels: string[], text: string): string[] {
  const capabilityTags: string[] = [];
  const seenTags = new Set<string>();

  for (const label of labels) {
    if (!label.startsWith('capability:')) {
      continue;
    }

    const capabilityTag = label.slice('capability:'.length).trim();

    if (!capabilityTag || seenTags.has(capabilityTag)) {
      continue;
    }

    seenTags.add(capabilityTag);
    capabilityTags.push(capabilityTag);
  }

  const normalizedText = ` ${text.toLowerCase()} `;

  for (const entry of capabilityKeywords) {
    if (seenTags.has(entry.capability)) {
      continue;
    }

    if (entry.keywords.some((keyword) => normalizedText.includes(keyword))) {
      seenTags.add(entry.capability);
      capabilityTags.push(entry.capability);
    }
  }

  return capabilityTags;
}

function deriveCategory(labels: string[], text: string): ChallengeCategory {
  const normalizedText = ` ${text.toLowerCase()} `;

  if (
    labels.includes('capability:repo-generation') ||
    normalizedText.includes(' fresh repo') ||
    normalizedText.includes(' bootstrap')
  ) {
    return 'fresh-repo-generation';
  }

  if (
    labels.includes('capability:ci') ||
    normalizedText.includes(' github actions') ||
    normalizedText.includes(' ci ')
  ) {
    return 'ci-setup';
  }

  if (
    labels.includes('kind:bug') ||
    normalizedText.includes(' bug ') ||
    normalizedText.includes(' fix ')
  ) {
    return 'bug-fixing';
  }

  if (normalizedText.includes(' refactor')) {
    return 'refactor';
  }

  if (
    normalizedText.includes('runtime upgrade') ||
    normalizedText.includes(' upgrade stability')
  ) {
    return 'runtime-upgrade-stability';
  }

  if (normalizedText.includes('prompt mutation') || normalizedText.includes(' prompt ')) {
    return 'prompt-mutation-impact';
  }

  if (
    normalizedText.includes('model routing') ||
    normalizedText.includes(' routing quality')
  ) {
    return 'model-routing-quality';
  }

  if (
    labels.includes('kind:feature') ||
    normalizedText.includes(' implement ') ||
    normalizedText.includes(' feature ') ||
    normalizedText.includes(' improve ')
  ) {
    return 'feature-implementation';
  }

  if (normalizedText.includes(' test ') || normalizedText.includes(' tests ')) {
    return 'test-generation';
  }

  return 'general';
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

export function buildChallengeFingerprint(
  input: Omit<NormalizedChallengeDefinition, 'sourceFingerprint'>
): string {
  const fingerprintable = { ...input };

  delete (fingerprintable as { sourceIssueNumber?: number }).sourceIssueNumber;

  return createHash('sha256')
    .update(stableStringify(fingerprintable))
    .digest('hex');
}

export function normalizeChallenge(
  input: NormalizeChallengeInput
): NormalizedChallengeDefinition {
  const title = normalizeRequiredText(input.title, 'title');
  const body = input.body?.trim() ?? '';
  const sections = parseSections(body);
  const normalizedLabels = normalizeLabelNames(input.labels);
  const intent =
    getSectionContent(sections, ['goal', 'intent', 'objective']).replace(/\s+/g, ' ') ||
    findFallbackIntent(body) ||
    title;
  const constraints = parseListContent(
    getSectionContent(sections, ['constraints', 'constraint'])
  );
  const successSignalContent = getSectionContent(sections, [
    'success signal',
    'success',
    'definition of done'
  ]).replace(/\s+/g, ' ');
  const artifactExpectations = parseListContent(
    getSectionContent(sections, ['artifact expectations', 'artifacts'])
  );
  const validationSteps = parseListContent(
    getSectionContent(sections, ['validation steps', 'validation', 'checks', 'test plan'])
  );
  const scoringNotes = parseListContent(
    getSectionContent(sections, ['scoring notes', 'scoring', 'rubric'])
  );
  const capabilityTags = deriveCapabilityTags(
    normalizedLabels,
    `${title}\n${body}`
  );
  const category = deriveCategory(normalizedLabels, `${title}\n${body}`);
  const benchmarkType =
    input.source === 'human' ? 'human-challenge' : 'evolvo-challenge';
  const normalized = {
    artifactExpectations,
    benchmarkType,
    capabilityTags,
    category,
    constraints,
    intent,
    scoringNotes,
    source: input.source,
    sourceIssueNumber: input.sourceIssueNumber,
    successSignal: successSignalContent || null,
    title,
    validationSteps
  } satisfies Omit<NormalizedChallengeDefinition, 'sourceFingerprint'>;

  return {
    ...normalized,
    sourceFingerprint: buildChallengeFingerprint(normalized)
  };
}
