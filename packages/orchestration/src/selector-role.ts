import type { CapabilityKey } from '@evolvo/core/model-routing-config';
import {
  selectorDecisionSchema,
  type SelectorDecision
} from '@evolvo/schemas/role-output-schemas';

import {
  invokeRoutedStructuredRole,
  type InvokeRoutedStructuredRole
} from './role-runner.js';

type SelectorCandidateIssue = {
  issueNumber: number;
  kind?: string;
  priorityScore?: number;
  riskLevel?: string;
  state?: string;
  summary?: string;
  title: string;
};

type SelectorCandidateMutation = {
  mutationId: string;
  priorityScore?: number;
  summary?: string;
  targetSurface?: string;
  title: string;
};

type SelectorCandidatePromotion = {
  confidenceScore?: number;
  runtimeVersionId: string;
  summary?: string;
};

export type SelectorRoleInput = {
  attemptId?: string;
  candidateIssues: SelectorCandidateIssue[];
  candidateMutations?: SelectorCandidateMutation[];
  candidatePromotions?: SelectorCandidatePromotion[];
  capability?: CapabilityKey;
  currentFocusIssueNumber?: number;
  strategyNotes?: string[];
};

function buildSelectorSystemPrompt(): string {
  return [
    'You are the selector (governor) role for Evolvo.',
    'Return only valid JSON matching SelectorDecision.',
    'Choose exactly one next action with clear rationale and nextStep.',
    'Scores must be numbers from 0 to 100.'
  ].join('\n');
}

function buildSelectorUserPrompt(input: SelectorRoleInput): string {
  return [
    'Choose the single highest-leverage next action.',
    '',
    'Selection context (JSON):',
    JSON.stringify(
      {
        candidateIssues: input.candidateIssues,
        candidateMutations: input.candidateMutations ?? [],
        candidatePromotions: input.candidatePromotions ?? [],
        currentFocusIssueNumber: input.currentFocusIssueNumber,
        strategyNotes: input.strategyNotes ?? []
      },
      null,
      2
    ),
    '',
    'Hard constraints:',
    '1. If decisionType is issue-based, targetIssueNumber must be set.',
    '2. If decisionType is select-mutation, targetMutationId must be set.',
    '3. If decisionType is promotion-based, targetRuntimeVersionId must be set.',
    '4. Pick only from provided candidates.'
  ].join('\n');
}

function ensureSelectorTarget(
  output: SelectorDecision,
  input: SelectorRoleInput
): void {
  const issueDecisionTypes = new Set([
    'select-issue',
    'defer-issue',
    'reject-issue',
    'select-experiment'
  ]);
  const promotionDecisionTypes = new Set(['promote-runtime', 'reject-promotion']);

  if (issueDecisionTypes.has(output.decisionType)) {
    if (output.targetIssueNumber === undefined) {
      throw new Error(
        `Selector decision "${output.decisionType}" requires targetIssueNumber.`
      );
    }

    const validIssueNumbers = new Set(
      input.candidateIssues.map((candidate) => candidate.issueNumber)
    );

    if (!validIssueNumbers.has(output.targetIssueNumber)) {
      throw new Error(
        `Selector chose issue "${output.targetIssueNumber}" that was not in the candidate issue list.`
      );
    }

    return;
  }

  if (output.decisionType === 'select-mutation') {
    if (!output.targetMutationId) {
      throw new Error('Selector decision "select-mutation" requires targetMutationId.');
    }

    const validMutationIds = new Set(
      (input.candidateMutations ?? []).map((candidate) => candidate.mutationId)
    );

    if (!validMutationIds.has(output.targetMutationId)) {
      throw new Error(
        `Selector chose mutation "${output.targetMutationId}" that was not in the candidate mutation list.`
      );
    }

    return;
  }

  if (promotionDecisionTypes.has(output.decisionType)) {
    if (!output.targetRuntimeVersionId) {
      throw new Error(
        `Selector decision "${output.decisionType}" requires targetRuntimeVersionId.`
      );
    }

    const validRuntimeVersionIds = new Set(
      (input.candidatePromotions ?? []).map(
        (candidate) => candidate.runtimeVersionId
      )
    );

    if (!validRuntimeVersionIds.has(output.targetRuntimeVersionId)) {
      throw new Error(
        `Selector chose runtime version "${output.targetRuntimeVersionId}" that was not in the candidate promotion list.`
      );
    }
  }
}

export async function runSelectorRole(
  input: SelectorRoleInput,
  invokeRole: InvokeRoutedStructuredRole = invokeRoutedStructuredRole
): Promise<SelectorDecision> {
  const result = await invokeRole<SelectorDecision>({
    attemptId: input.attemptId,
    capability: input.capability ?? 'general',
    metadata: {
      candidateIssueCount: input.candidateIssues.length,
      candidateMutationCount: (input.candidateMutations ?? []).length,
      candidatePromotionCount: (input.candidatePromotions ?? []).length,
      roleName: 'selector'
    },
    role: 'governor',
    schema: selectorDecisionSchema,
    systemPrompt: buildSelectorSystemPrompt(),
    taskKind: 'issue-selection',
    userPrompt: buildSelectorUserPrompt(input)
  });

  ensureSelectorTarget(result.output, input);

  return result.output;
}
