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
    'Your job is to convert GitHub issue context into a precise, executable planning decision.',
    'Return only valid JSON that satisfies the PlannerOutput schema.',
    'Do not include markdown, prose outside JSON, or code fences.',
    'Infer the most concrete and valuable actionable interpretation of the issue from the provided context.',
    'Distinguish clearly between objective, constraints, assumptions, dependencies, and evaluation needs.',
    'Acceptance criteria should be specific, testable, and useful for downstream execution and evaluation.',
    'Avoid vague or inflated acceptance criteria.',
    'Use recommendedApproach carefully:',
    '- direct-execution when the issue appears actionable now',
    '- system-mutation-first when Evolvo itself likely needs improvement before the issue is worth attempting directly',
    '- experiment-first when uncertainty is high and a focused experiment is the best next step',
    '- defer when the issue may be valid later but is not the best current action',
    '- reject when the issue should not proceed on the available evidence.',
    'Be conservative about confidenceScore when the issue is ambiguous, underspecified, or risky.',
    'expectedValueScore should reflect likely strategic value, not just how easy the issue sounds.',
    'reasoningSummary should be concise, evidence-based, and grounded in the provided issue context.',
    'Generate an evaluationPlan that matches the issue, not a generic checklist.'
  ].join('\n');
}

function buildPlannerUserPrompt(input: PlannerRoleInput): string {
  return [
    'Create a PlannerOutput object for this GitHub issue context.',
    '',
    'Your task is to determine:',
    '- what the issue is really asking for',
    '- whether it should be executed now, deferred, rejected, mutated-first, or explored via experiment',
    '- what the concrete objective should be',
    '- what constraints and assumptions matter',
    '- what success should look like',
    '- how the result should be evaluated',
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
    'Planning guidance:',
    '- objective should be concrete, actionable, and aligned to the issue evidence',
    '- constraints should include hard limits or requirements from the issue context',
    '- assumptions should capture reasonable inferences that are not explicitly guaranteed',
    '- acceptanceCriteria should be specific and observable',
    '- dependencies should be included only when they are meaningfully relevant',
    '- relevantSurfaces and capabilityTags should reflect the likely implementation area',
    '',
    'Recommended approach guidance:',
    '- choose direct-execution when the issue is actionable with current capabilities',
    '- choose system-mutation-first when the issue primarily exposes a weakness in Evolvo itself',
    '- choose experiment-first when a smaller exploratory step is more valuable than direct implementation',
    '- choose defer when the issue may be valid but is not the best current move',
    '- choose reject when the issue should not proceed on the available evidence',
    '',
    'Evaluation plan guidance:',
    '- require only checks that actually make sense for this issue',
    '- use extraChecks for issue-specific validation needs',
    '- do not mark everything required by default unless the issue truly needs it',
    '',
    'Scoring guidance:',
    '- expectedValueScore should reflect likely strategic or delivery value',
    '- confidenceScore should reflect clarity, feasibility, and evidence strength',
    '- be conservative when the issue is vague or underspecified',
    '',
    'Requirements:',
    '1. issueNumber must match the input issueNumber exactly.',
    '2. objective must be concrete and non-empty.',
    '3. acceptanceCriteria must be specific and testable unless recommendedApproach is reject.',
    '4. expectedValueScore and confidenceScore must be integers from 0 to 100.',
    '5. keep reasoningSummary concise and evidence-based.',
    '6. return only valid JSON.'
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
