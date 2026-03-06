import { normalizeChallenge } from './normalize-challenge.js';

export type BuildGeneratedChallengeIssueDraftInput = {
  capabilityKey: string;
  evidence: string[];
  recurrenceCount: number;
  recurrenceGroup: string;
  sourceIssueNumber: number;
  weaknessSummary: string;
};

export type GeneratedChallengeIssueDraft = {
  dedupeFingerprint: string;
  issue: {
    body: string;
    labels: string[];
    title: string;
  };
};

const supportedCapabilityLabels = new Set([
  'nextjs',
  'nestjs',
  'typescript',
  'ci',
  'debugging',
  'repo-generation',
  'model-routing'
]);

function humanizeCapability(capabilityKey: string): string {
  return capabilityKey
    .split(/[-\s]+/)
    .filter((segment) => segment.length > 0)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(' ');
}

export function buildGeneratedChallengeIssueDraft(
  input: BuildGeneratedChallengeIssueDraftInput
): GeneratedChallengeIssueDraft {
  const title = `Challenge: Stress ${humanizeCapability(input.capabilityKey)} resilience for ${input.recurrenceGroup}`;
  const capabilityLabel = supportedCapabilityLabels.has(input.capabilityKey)
    ? [`capability:${input.capabilityKey}`]
    : [];
  const body = [
    '## Goal',
    '',
    input.weaknessSummary,
    '',
    '## Constraints',
    '',
    '- Preserve existing benchmark comparability where possible',
    '- Prefer minimal surface-area fixes that address the recurring weakness',
    '',
    '## Success signal',
    '',
    `The runtime can resolve issue #${String(input.sourceIssueNumber)}-style failures without reproducing recurrence group \`${input.recurrenceGroup}\`.`,
    '',
    '## Validation steps',
    '',
    '- Replay the originating issue or an equivalent regression case',
    '- Run the relevant regression pack and at least one holdout check',
    '- Confirm failure recurrence drops after the change',
    '',
    '## Scoring notes',
    '',
    `- Reward reductions in recurrence count beyond ${String(input.recurrenceCount)}`,
    '- Penalize regressions on unrelated benchmark families',
    '',
    '## Evidence',
    '',
    ...input.evidence.map((entry) => `- ${entry}`)
  ].join('\n');
  const labels = [
    'source:evolvo',
    'kind:challenge',
    'evolvo-made-challenge',
    'state:triage',
    'surface:benchmarks',
    ...capabilityLabel
  ];
  const dedupeFingerprint = normalizeChallenge({
    body,
    labels,
    source: 'evolvo',
    sourceIssueNumber: input.sourceIssueNumber,
    title
  }).sourceFingerprint;

  return {
    dedupeFingerprint,
    issue: {
      body,
      labels,
      title
    }
  };
}
