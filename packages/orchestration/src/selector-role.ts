import type { CapabilityKey } from '@evolvo/core/model-routing-config';
import {
  selectorPrompt,
  type SelectorPromptInput
} from '@evolvo/genome/prompts/selector';
import {
  selectorDecisionSchema,
  type SelectorDecision
} from '@evolvo/schemas/role-output-schemas';

import {
  invokeRoutedStructuredRole,
  type InvokeRoutedStructuredRole
} from './role-runner.js';

export type SelectorRoleInput = SelectorPromptInput & {
  attemptId?: string;
  capability?: CapabilityKey;
};

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
    systemPrompt: selectorPrompt.buildSystemPrompt(),
    taskKind: 'issue-selection',
    userPrompt: selectorPrompt.buildUserPrompt(input)
  });

  ensureSelectorTarget(result.output, input);

  return result.output;
}
