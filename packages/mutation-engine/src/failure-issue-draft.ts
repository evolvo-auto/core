import { buildIssuePriorityScore, resolvePriorityLabel } from '@evolvo/scoring/issue-priority';
import type {
  FailureCategory,
  RiskLevel,
  Surface
} from '@evolvo/schemas/shared-enums';
import type { FailureReflection } from '@evolvo/schemas/role-output-schemas';

export type IssueDraft = {
  body: string;
  labels: string[];
  title: string;
};

export type BuildFailureIssueDraftInput = {
  capabilityKey?: string;
  category: FailureCategory;
  reflection: FailureReflection;
  recurrenceCount: number;
  severity: RiskLevel;
  sourceIssueNumber: number;
  surface: Surface;
};

export function buildFailureIssueDraft(
  input: BuildFailureIssueDraftInput
): IssueDraft {
  const priorityLabel = resolvePriorityLabel(
    buildIssuePriorityScore({
      basePriorityScore: 50,
      category: input.category,
      isSystemic: input.reflection.localVsSystemic === 'systemic',
      recurrenceCount: input.recurrenceCount,
      riskLevel: input.severity
    })
  );
  const title = `Failure: issue #${String(input.sourceIssueNumber)} ${input.reflection.symptom}`.slice(
    0,
    120
  );
  const labels = [
    'source:evolvo',
    'kind:failure',
    'state:triage',
    `risk:${input.severity}`,
    `surface:${input.surface}`,
    priorityLabel,
    input.capabilityKey ? `capability:${input.capabilityKey}` : undefined
  ].filter((value): value is string => Boolean(value));
  const body = [
    '## Failed objective',
    '',
    `Source issue: #${String(input.sourceIssueNumber)}`,
    '',
    '## Failure summary',
    '',
    input.reflection.symptom,
    '',
    '## Suspected root causes',
    '',
    ...input.reflection.likelyRootCauses.map(
      (rootCause) => `- ${rootCause.cause} (${String(rootCause.confidence)} confidence)`
    ),
    '',
    '## Local or systemic',
    '',
    input.reflection.localVsSystemic,
    '',
    '## Proposed next actions',
    '',
    ...input.reflection.immediateFollowups.map(
      (followup) => `- ${followup.title}: ${followup.summary}`
    )
  ].join('\n');

  return {
    body,
    labels,
    title
  };
}
