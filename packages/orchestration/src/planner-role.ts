import type { CapabilityKey } from '@evolvo/core/model-routing-config';
import {
  plannerOutputSchema,
  type PlannerOutput
} from '@evolvo/schemas/role-output-schemas';

import {
  invokeRoutedStructuredRole,
  type InvokeRoutedStructuredRole
} from './role-runner.js';

export type PlannerRoleInput = {
  acceptanceCriteriaHints?: string[];
  assumptions?: string[];
  attemptId?: string;
  body?: string;
  capability?: CapabilityKey;
  capabilityTagsHints?: string[];
  constraints?: string[];
  dependencies?: number[];
  issueNumber: number;
  kindHint?: PlannerOutput['kind'];
  labels?: string[];
  relevantSurfacesHints?: PlannerOutput['relevantSurfaces'];
  title: string;
};

function buildPlannerSystemPrompt(): string {
  return [
    'You are the planner role for Evolvo.',
    'Return only valid JSON that satisfies the PlannerOutput schema.',
    'Do not include markdown, prose outside JSON, or code fences.',
    'Generate concrete acceptance criteria and an actionable evaluation plan.',
    'If the issue should not proceed, use recommendedApproach="reject".'
  ].join('\n');
}

function buildPlannerUserPrompt(input: PlannerRoleInput): string {
  return [
    'Create a PlannerOutput object for this GitHub issue context.',
    '',
    'Issue context (JSON):',
    JSON.stringify(
      {
        acceptanceCriteriaHints: input.acceptanceCriteriaHints ?? [],
        assumptions: input.assumptions ?? [],
        body: input.body ?? '',
        capabilityTagsHints: input.capabilityTagsHints ?? [],
        constraints: input.constraints ?? [],
        dependencies: input.dependencies ?? [],
        issueNumber: input.issueNumber,
        kindHint: input.kindHint,
        labels: input.labels ?? [],
        relevantSurfacesHints: input.relevantSurfacesHints ?? [],
        title: input.title
      },
      null,
      2
    ),
    '',
    'Requirements:',
    '1. issueNumber must match the input issueNumber exactly.',
    '2. objective must be concrete and non-empty.',
    '3. acceptanceCriteria must be specific and testable unless the approach is reject.',
    '4. expectedValueScore and confidenceScore must be integers from 0 to 100.',
    '5. keep reasoningSummary concise and evidence-based.'
  ].join('\n');
}

export async function runPlannerRole(
  input: PlannerRoleInput,
  invokeRole: InvokeRoutedStructuredRole = invokeRoutedStructuredRole
): Promise<PlannerOutput> {
  const result = await invokeRole<PlannerOutput>({
    attemptId: input.attemptId,
    capability: input.capability ?? 'general',
    metadata: {
      inputIssueNumber: input.issueNumber,
      inputLabels: input.labels ?? [],
      roleName: 'planner'
    },
    role: 'planner',
    schema: plannerOutputSchema,
    systemPrompt: buildPlannerSystemPrompt(),
    taskKind: 'issue-planning',
    userPrompt: buildPlannerUserPrompt(input)
  });

  if (result.output.issueNumber !== input.issueNumber) {
    throw new Error(
      `Planner output issueNumber "${result.output.issueNumber}" did not match input issueNumber "${input.issueNumber}".`
    );
  }

  return result.output;
}
