import { z } from 'zod';

import {
  failureCategories,
  mutationStates,
  riskLevels
} from '@evolvo/schemas/shared-enums';

const nonNegativeIntegerSchema = z.number().int().min(0);
const positiveIntegerSchema = z.number().int().positive();

export const issuePriorityHeuristicConfigSchema = z.object({
  basePriorityScoreDefault: nonNegativeIntegerSchema.max(100),
  categoryWeights: z.record(
    z.enum(failureCategories),
    nonNegativeIntegerSchema.max(100)
  ),
  mutationStateWeights: z.record(
    z.enum(mutationStates),
    nonNegativeIntegerSchema.max(100)
  ),
  recurrenceBonusPerRepeat: nonNegativeIntegerSchema.max(100),
  riskWeights: z.record(z.enum(riskLevels), nonNegativeIntegerSchema.max(100)),
  systemicBonus: nonNegativeIntegerSchema.max(100)
});
export type IssuePriorityHeuristicConfig = z.infer<
  typeof issuePriorityHeuristicConfigSchema
>;

export const failureStrategyHeuristicConfigSchema = z.object({
  directFixMaxRecurrence: positiveIntegerSchema.max(20),
  mutationFirstLowConfidenceThreshold: nonNegativeIntegerSchema.max(100),
  mutationFirstMinRecurrence: positiveIntegerSchema.max(20)
});
export type FailureStrategyHeuristicConfig = z.infer<
  typeof failureStrategyHeuristicConfigSchema
>;

export function parseIssuePriorityHeuristicConfig(
  value: unknown
): IssuePriorityHeuristicConfig {
  return issuePriorityHeuristicConfigSchema.parse(value);
}

export function parseFailureStrategyHeuristicConfig(
  value: unknown
): FailureStrategyHeuristicConfig {
  return failureStrategyHeuristicConfigSchema.parse(value);
}
