import { describe, expect, it } from 'vitest';

import { failureStrategyHeuristics } from './heuristics/failure-strategy.ts';
import { issuePriorityHeuristics } from './heuristics/issue-priority.ts';
import { builderPrompt } from './prompts/builder.ts';
import { criticPrompt } from './prompts/critic.ts';
import { evaluatorInterpreterPrompt } from './prompts/evaluator-interpreter.ts';
import { mutatorPrompt } from './prompts/mutator.ts';
import { narratorPrompt } from './prompts/narrator.ts';
import { plannerPrompt } from './prompts/planner.ts';
import { selectorPrompt } from './prompts/selector.ts';

describe('genome configuration', () => {
  it('keeps unique prompt keys and versions for the active prompt set', () => {
    const definitions = [
      builderPrompt,
      criticPrompt,
      evaluatorInterpreterPrompt,
      mutatorPrompt,
      narratorPrompt,
      plannerPrompt,
      selectorPrompt
    ];

    expect(
      new Set(
        definitions.map(
          (definition) => `${definition.promptKey}@${String(definition.version)}`
        )
      ).size
    ).toBe(definitions.length);
  });

  it('exposes issue priority and failure strategy heuristics from genome', () => {
    expect(issuePriorityHeuristics.basePriorityScoreDefault).toBe(40);
    expect(issuePriorityHeuristics.systemicBonus).toBe(15);
    expect(failureStrategyHeuristics.mutationFirstMinRecurrence).toBe(2);
    expect(failureStrategyHeuristics.directFixMaxRecurrence).toBe(1);
  });
});
