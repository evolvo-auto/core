import { describe, expect, it } from 'vitest';

import {
  buildIssuePriorityScore,
  resolvePriorityLabel
} from './issue-priority.js';

describe('issue priority scoring', () => {
  it('boosts repeated systemic failures into the highest priority tier', () => {
    const priorityScore = buildIssuePriorityScore({
      basePriorityScore: 50,
      category: 'model-quality-issue',
      isSystemic: true,
      recurrenceCount: 4,
      riskLevel: 'systemic'
    });

    expect(priorityScore).toBe(100);
    expect(resolvePriorityLabel(priorityScore)).toBe('priority:p0');
  });

  it('keeps isolated low-risk issues in lower tiers', () => {
    const priorityScore = buildIssuePriorityScore({
      basePriorityScore: 35,
      category: 'planning-failure',
      recurrenceCount: 1,
      riskLevel: 'low'
    });

    expect(priorityScore).toBe(35);
    expect(resolvePriorityLabel(priorityScore)).toBe('priority:p3');
  });
});
