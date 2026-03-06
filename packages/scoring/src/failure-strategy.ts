import { failureStrategyHeuristics } from '@evolvo/genome/heuristics/failure-strategy';

export type FailureHandlingStrategy =
  | 'defer'
  | 'direct-fix'
  | 'failure-followup'
  | 'mutation-first'
  | 'stop';

export type DecideFailureHandlingStrategyInput = {
  capabilityConfidenceScore?: number;
  directFixRecommended: boolean;
  isSystemic: boolean;
  mutationRecommended: boolean;
  recommendedNextAction:
    | 'defer'
    | 'open-failure'
    | 'open-mutation'
    | 'patch-directly'
    | 'retry'
    | 'stop';
  recurrenceCount: number;
};

export function decideFailureHandlingStrategy(
  input: DecideFailureHandlingStrategyInput
): FailureHandlingStrategy {
  if (input.recommendedNextAction === 'defer') {
    return 'defer';
  }

  if (
    input.mutationRecommended &&
    (input.isSystemic ||
      input.recurrenceCount >=
        failureStrategyHeuristics.mutationFirstMinRecurrence ||
      (input.capabilityConfidenceScore ?? 100) <
        failureStrategyHeuristics.mutationFirstLowConfidenceThreshold)
  ) {
    return 'mutation-first';
  }

  if (
    input.directFixRecommended &&
    input.recurrenceCount <=
      failureStrategyHeuristics.directFixMaxRecurrence &&
    !input.isSystemic
  ) {
    return 'direct-fix';
  }

  if (input.recommendedNextAction === 'stop') {
    return 'stop';
  }

  return 'failure-followup';
}
