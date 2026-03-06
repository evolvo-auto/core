import {
  parseIssuePriorityHeuristicConfig,
  type IssuePriorityHeuristicConfig
} from '@evolvo/core/heuristic-config';

export const issuePriorityHeuristics: IssuePriorityHeuristicConfig =
  parseIssuePriorityHeuristicConfig({
    basePriorityScoreDefault: 40,
    categoryWeights: {
      'benchmark-integrity-issue': 0,
      'code-generation-defect': 0,
      'dependency-configuration-issue': 12,
      'environment-setup-failure': 0,
      'evaluator-mismatch': 0,
      'model-quality-issue': 12,
      'mutation-regression': 0,
      'planning-failure': 0,
      'requirement-misunderstanding': 4,
      'runtime-failure': 8,
      'smoke-e2e-failure': 8
    },
    mutationStateWeights: {
      adopted: 0,
      'in-progress': 12,
      proposed: 6,
      rejected: 0,
      reverted: 0,
      selected: 12,
      validated: 18
    },
    recurrenceBonusPerRepeat: 12,
    riskWeights: {
      high: 16,
      low: 0,
      medium: 8,
      systemic: 24
    },
    systemicBonus: 15
  });
