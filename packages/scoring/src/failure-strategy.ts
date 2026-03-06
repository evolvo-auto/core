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
      input.recurrenceCount >= 2 ||
      (input.capabilityConfidenceScore ?? 100) < 45)
  ) {
    return 'mutation-first';
  }

  if (
    input.directFixRecommended &&
    input.recurrenceCount < 2 &&
    !input.isSystemic
  ) {
    return 'direct-fix';
  }

  if (input.recommendedNextAction === 'stop') {
    return 'stop';
  }

  return 'failure-followup';
}
