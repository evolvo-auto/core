import { describe, expect, it, vi } from 'vitest';

import { createRuntimeLoop } from './runtime-loop.js';

describe('createRuntimeLoop', () => {
  it('runs a sync/select/execute cycle and records the selected issue outcome', async () => {
    const runtimeLoop = createRuntimeLoop(
      {
        intervalMs: 1000,
        logging: {
          verbosity: 'quiet'
        }
      },
      {
        executeIssue: vi.fn().mockResolvedValue({
          issueNumber: 901,
          outcome: 'completed'
        }),
        listFailures: vi.fn().mockResolvedValue([
          {
            isSystemic: true,
            issueNumber: 901
          }
        ]),
        listIssues: vi.fn().mockResolvedValue([
          {
            githubIssueNumber: 901,
            kind: 'FEATURE',
            priorityScore: 75,
            riskLevel: 'MEDIUM',
            state: 'TRIAGE',
            title: 'Implement runtime loop'
          }
        ]),
        listMutations: vi.fn().mockResolvedValue([]),
        selectIssue: vi.fn().mockResolvedValue({
          decisionType: 'select-issue',
          expectedLeverageScore: 80,
          nextStep: 'Execute issue 901 next.',
          priorityScore: 80,
          reason: 'Highest value candidate.',
          riskPenaltyScore: 10,
          strategicValueScore: 85,
          targetIssueNumber: 901,
          urgencyScore: 70
        }),
        syncPromptDefinitions: vi.fn().mockResolvedValue([]),
        syncIssues: vi.fn().mockResolvedValue(undefined)
      }
    );

    await runtimeLoop.runOnce();

    expect(runtimeLoop.getStatus()).toEqual(
      expect.objectContaining({
        consecutiveFailures: 0,
        lastDecisionType: 'select-issue',
        lastOutcome: 'completed',
        lastSelectedIssueNumber: 901,
        state: 'idle'
      })
    );
  });

  it('records runtime loop failures and exposes the error state', async () => {
    const runtimeLoop = createRuntimeLoop(
      {
        intervalMs: 1000,
        logging: {
          verbosity: 'quiet'
        }
      },
      {
        listFailures: vi.fn().mockResolvedValue([]),
        listMutations: vi.fn().mockResolvedValue([]),
        syncPromptDefinitions: vi.fn().mockResolvedValue([]),
        syncIssues: vi.fn().mockRejectedValue(new Error('GitHub unavailable'))
      }
    );

    await runtimeLoop.runOnce();

    expect(runtimeLoop.getStatus()).toEqual(
      expect.objectContaining({
        consecutiveFailures: 1,
        lastErrorMessage: 'GitHub unavailable',
        lastOutcome: 'failed',
        state: 'error'
      })
    );
  });

  it('maps selected mutations to their linked executable issues', async () => {
    const executeIssue = vi.fn().mockResolvedValue({
      issueNumber: 902,
      outcome: 'completed'
    });

    const runtimeLoop = createRuntimeLoop(
      {
        intervalMs: 1000,
        logging: {
          verbosity: 'quiet'
        }
      },
      {
        executeIssue,
        listFailures: vi.fn().mockResolvedValue([]),
        listIssues: vi.fn().mockResolvedValue([]),
        listMutations: vi.fn().mockResolvedValue([
          {
            id: 'mutation_902',
            implementationPlan: 'Adjust selector heuristics.',
            linkedIssueNumber: 902,
            priorityScore: 88,
            rationale: 'Repeated failures suggest a heuristic gap.',
            state: 'PROPOSED',
            targetSurface: 'ROUTING',
            title: 'Improve selector routing heuristics'
          }
        ]),
        selectIssue: vi.fn().mockResolvedValue({
          decisionType: 'select-mutation',
          expectedLeverageScore: 90,
          nextStep: 'Execute the linked mutation issue.',
          priorityScore: 91,
          reason: 'This mutation has the highest systemic leverage.',
          riskPenaltyScore: 18,
          strategicValueScore: 92,
          targetMutationId: 'mutation_902',
          urgencyScore: 76
        }),
        syncPromptDefinitions: vi.fn().mockResolvedValue([]),
        syncIssues: vi.fn().mockResolvedValue(undefined)
      }
    );

    await runtimeLoop.runOnce();

    expect(executeIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        issueNumber: 902
      })
    );
  });
});
