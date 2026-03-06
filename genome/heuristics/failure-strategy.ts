import {
  parseFailureStrategyHeuristicConfig,
  type FailureStrategyHeuristicConfig
} from '@evolvo/core/heuristic-config';

export const failureStrategyHeuristics: FailureStrategyHeuristicConfig =
  parseFailureStrategyHeuristicConfig({
    directFixMaxRecurrence: 1,
    mutationFirstLowConfidenceThreshold: 45,
    mutationFirstMinRecurrence: 2
  });
