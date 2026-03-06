import { issuePriorityHeuristics } from '@evolvo/genome/heuristics/issue-priority';
import type {
  FailureCategory,
  MutationState,
  RiskLevel
} from '@evolvo/schemas/shared-enums';

export type PriorityLabel =
  | 'priority:p0'
  | 'priority:p1'
  | 'priority:p2'
  | 'priority:p3';

export type BuildIssuePriorityInput = {
  basePriorityScore?: number;
  category?: FailureCategory;
  isSystemic?: boolean;
  mutationState?: MutationState;
  recurrenceCount?: number;
  riskLevel?: RiskLevel;
};

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function resolveRiskWeight(riskLevel: RiskLevel | undefined): number {
  return issuePriorityHeuristics.riskWeights[riskLevel ?? 'low'];
}

function resolveMutationWeight(mutationState: MutationState | undefined): number {
  if (!mutationState) {
    return 0;
  }

  return issuePriorityHeuristics.mutationStateWeights[mutationState];
}

function resolveCategoryWeight(category: FailureCategory | undefined): number {
  if (!category) {
    return 0;
  }

  return issuePriorityHeuristics.categoryWeights[category];
}

export function buildIssuePriorityScore(input: BuildIssuePriorityInput): number {
  return clampScore(
    (input.basePriorityScore ??
      issuePriorityHeuristics.basePriorityScoreDefault) +
      Math.max(0, (input.recurrenceCount ?? 1) - 1) *
        issuePriorityHeuristics.recurrenceBonusPerRepeat +
      resolveRiskWeight(input.riskLevel) +
      resolveMutationWeight(input.mutationState) +
      resolveCategoryWeight(input.category) +
      (input.isSystemic ? issuePriorityHeuristics.systemicBonus : 0)
  );
}

export function resolvePriorityLabel(priorityScore: number): PriorityLabel {
  if (priorityScore >= 90) {
    return 'priority:p0';
  }

  if (priorityScore >= 70) {
    return 'priority:p1';
  }

  if (priorityScore >= 45) {
    return 'priority:p2';
  }

  return 'priority:p3';
}
