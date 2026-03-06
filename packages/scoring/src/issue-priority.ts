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
  switch (riskLevel) {
    case 'systemic':
      return 24;
    case 'high':
      return 16;
    case 'medium':
      return 8;
    case 'low':
    default:
      return 0;
  }
}

function resolveMutationWeight(mutationState: MutationState | undefined): number {
  switch (mutationState) {
    case 'validated':
      return 18;
    case 'selected':
    case 'in-progress':
      return 12;
    case 'proposed':
      return 6;
    default:
      return 0;
  }
}

function resolveCategoryWeight(category: FailureCategory | undefined): number {
  switch (category) {
    case 'model-quality-issue':
    case 'dependency-configuration-issue':
      return 12;
    case 'smoke-e2e-failure':
    case 'runtime-failure':
      return 8;
    case 'requirement-misunderstanding':
      return 4;
    default:
      return 0;
  }
}

export function buildIssuePriorityScore(input: BuildIssuePriorityInput): number {
  return clampScore(
    (input.basePriorityScore ?? 40) +
      Math.max(0, (input.recurrenceCount ?? 1) - 1) * 12 +
      resolveRiskWeight(input.riskLevel) +
      resolveMutationWeight(input.mutationState) +
      resolveCategoryWeight(input.category) +
      (input.isSystemic ? 15 : 0)
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
