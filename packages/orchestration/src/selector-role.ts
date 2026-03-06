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
    'Your job is to choose the single most valuable next action for the system.',
    'Return only valid JSON matching SelectorDecision.',
    'You must choose exactly one action from the provided candidates.',
    'Think like a disciplined technical lead balancing forward progress, systemic improvement, risk, and focus.',
    'Prefer actions with high leverage: unblock important work, reduce repeated failures, improve broad capability, or safely adopt validated improvements.',
    'Do not chase novelty, admin churn, or low-value meta-work.',
    'Respect momentum: if there is a current focus issue, do not switch away without a clear reason.',
    'Select a mutation only when the expected systemic value is stronger than continuing normal issue execution.',
    'Select a promotion only when the candidate appears sufficiently validated and promoting now is more valuable than waiting for more evidence.',
    'Reject or defer work only when there is a clear strategic reason.',
    'Base your choice on the provided candidate data and strategy notes only; do not invent unseen evidence.',
    'Scores must be integers from 0 to 100.',
    'Your reason and nextStep should be concrete and operational, not vague.'
  ].join('\n');
}

function buildSelectorUserPrompt(input: SelectorRoleInput): string {
  return [
    'Choose the single highest-value next action.',
    '',
    'Your decision should balance:',
    '- strategic value',
    '- expected leverage',
    '- forward progress',
    '- recurrence reduction',
    '- risk',
    '- focus stability',
    '- readiness of promotions or mutations',
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
    'Decision guidance:',
    '- Prefer continuing the current focus issue when it still appears valuable and not clearly blocked.',
    '- Prefer a mutation when it has meaningful systemic leverage and is more valuable than normal issue execution.',
    '- Prefer a promotion when a runtime candidate appears sufficiently validated and promotion has immediate value.',
    '- Prefer issue execution when it creates clear progress and there is no stronger systemic opportunity.',
    '- Avoid low-value context switching.',
    '- Avoid deferring or rejecting issues unless there is a strong strategic reason.',
    '',
    'Scoring guidance:',
    '- priorityScore: overall urgency and value of doing this next.',
    '- urgencyScore: how time-sensitive or blocking this action is.',
    '- strategicValueScore: how much this action improves Evolvo’s long-term direction.',
    '- expectedLeverageScore: how broadly useful this action is likely to be.',
    '- riskPenaltyScore: how much uncertainty, instability, or downside should count against it.',
    '',
    'Hard constraints:',
    '1. If decisionType is issue-based, targetIssueNumber must be set.',
    '2. If decisionType is select-mutation, targetMutationId must be set.',
    '3. If decisionType is promotion-based, targetRuntimeVersionId must be set.',
    '4. Pick only from provided candidates.',
    '5. Return only valid JSON.'
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
