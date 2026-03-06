import { describe, expect, it, vi } from 'vitest';

import type {
  EvaluatorOutput,
  PlannerOutput
} from '@evolvo/schemas/role-output-schemas';

import { executeIssueAttempt } from './issue-executor.js';

const plannerOutput: PlannerOutput = {
  acceptanceCriteria: ['Runtime loop can complete one issue automatically.'],
  assumptions: [],
  capabilityTags: ['typescript'],
  confidenceScore: 80,
  constraints: [],
  dependencies: [],
  evaluationPlan: {
    extraChecks: [],
    requireBuild: true,
    requireInstall: true,
    requireLint: true,
    requireRun: true,
    requireSmoke: true,
    requireTests: true,
    requireTypecheck: true
  },
  expectedValueScore: 90,
  issueNumber: 801,
  kind: 'feature',
  objective: 'Implement the autonomous runtime loop.',
  reasoningSummary: 'This unlocks end-to-end issue execution.',
  recommendedApproach: 'direct-execution',
  relevantSurfaces: ['runtime'],
  riskLevel: 'medium',
  title: 'Implement runtime loop'
};

describe('executeIssueAttempt', () => {
  it('rejects issues when the planner recommends rejection', async () => {
    const reject = vi.fn().mockResolvedValue({
      stateTransition: {
        nextLabels: ['state:rejected'],
        nextState: 'REJECTED'
      }
    });

    const result = await executeIssueAttempt(
      {
        issueNumber: 801
      },
      {
        getGitHubIssue: vi.fn().mockResolvedValue({
          body: 'Please reject this.',
          labels: ['kind:feature', 'source:human', 'state:triage'],
          number: 801,
          title: 'Reject me'
        }),
        planner: vi.fn().mockResolvedValue({
          ...plannerOutput,
          reasoningSummary: 'The requested work should not proceed.',
          recommendedApproach: 'reject'
        } satisfies PlannerOutput),
        reject,
        updateIssue: vi.fn().mockResolvedValue(undefined)
      }
    );

    expect(result).toEqual({
      issueNumber: 801,
      outcome: 'rejected'
    });
    expect(reject).toHaveBeenCalledWith(801, {
      status: 'The requested work should not proceed.',
      whatChanged: ['Planner determined the issue should not proceed.']
    });
  });

  it('completes a successful builder/evaluator cycle and opens a pull request', async () => {
    const evaluationOutput: EvaluatorOutput = {
      checks: {
        build: 'passed',
        install: 'passed',
        lint: 'passed',
        run: 'passed',
        smoke: 'passed',
        tests: 'passed',
        typecheck: 'passed'
      },
      extraChecks: [],
      issueNumber: 801,
      outcome: 'success',
      regressionRisk: 'low',
      shouldMergeIfPRExists: false,
      shouldOpenPR: true,
      summary: 'All evaluation checks passed.'
    };
    const builderResult = {
      builderOutput: {
        believesReadyForEvaluation: true,
        commandsSuggested: [],
        filesActuallyChanged: ['packages/execution/src/runtime-loop.ts'],
        filesIntendedToChange: ['packages/execution/src/runtime-loop.ts'],
        implementationNotes: ['Added the loop worker wiring.'],
        issueNumber: 801,
        possibleKnownRisks: [],
        summary: 'Implemented the runtime loop.'
      },
      diffSummary: '1 file changed',
      intendedOnlyFiles: [],
      patchPath: '/repo/worktree/.evolvo/builder.patch',
      unexpectedChangedFiles: []
    };

    const result = await executeIssueAttempt(
      {
        gitRemote: 'origin',
        issueNumber: 801,
        maxRepairAttempts: 0
      },
      {
        builder: vi.fn().mockResolvedValue(builderResult),
        cleanup: vi.fn().mockResolvedValue(undefined),
        createReserved: vi.fn().mockResolvedValue(undefined),
        evaluationRunner: vi.fn().mockResolvedValue({
          checkResults: [],
          evaluatorOutput: evaluationOutput,
          observedFailures: []
        }),
        findActiveWorktree: vi.fn().mockResolvedValue(null),
        getGitHubIssue: vi.fn().mockResolvedValue({
          body: 'Please implement the runtime loop.',
          labels: ['kind:feature', 'source:human', 'state:triage'],
          number: 801,
          title: 'Implement runtime loop'
        }),
        hydrate: vi.fn().mockResolvedValue({
          attemptId: 'att_801',
          attemptJournalPath: '/repo/worktree/.evolvo/attempt-journal.json',
          environmentFingerprintPath: '/repo/worktree/.evolvo/environment-fingerprint.json',
          installPerformed: true,
          worktree: {
            id: 'wt_801'
          }
        }),
        persistArtifacts: vi.fn().mockResolvedValue({
          manifestPath: '/repo/.artifacts/worktrees/wt_801/attempts/att_801/manifest.json'
        }),
        planner: vi.fn().mockResolvedValue(plannerOutput),
        pushAndCommit: vi.fn().mockResolvedValue({
          branchName: 'issue/801-runtime-loop',
          commitMessage: 'feat(issue-801): Implement runtime loop',
          remoteName: 'origin'
        }),
        reserve: vi.fn().mockResolvedValue({
          branchName: 'issue/801-runtime-loop',
          filesystemPath: '/repo/worktree',
          worktree: {
            id: 'wt_801'
          }
        }),
        syncIssueEvalLabel: vi.fn().mockResolvedValue(undefined),
        syncPullRequestEvalLabel: vi.fn().mockResolvedValue(undefined),
        syncPullRequestLabels: vi.fn().mockResolvedValue(undefined),
        transitionState: vi.fn().mockResolvedValue({
          nextLabels: ['state:done'],
          nextState: 'DONE'
        }),
        updateAttempt: vi.fn().mockResolvedValue(undefined),
        updateIssue: vi.fn().mockResolvedValue(undefined),
        updateWorktree: vi.fn().mockResolvedValue(undefined),
        upsertPullRequest: vi.fn().mockResolvedValue({
          action: 'created',
          branchName: 'issue/801-runtime-loop',
          pullRequest: {
            number: 44
          },
          pullRequestNumber: 44
        }),
        writeComment: vi.fn().mockResolvedValue(undefined)
      }
    );

    expect(result).toEqual({
      artifactManifestPath:
        '/repo/.artifacts/worktrees/wt_801/attempts/att_801/manifest.json',
      attemptId: 'att_801',
      issueNumber: 801,
      outcome: 'completed',
      pullRequestNumber: 44,
      worktreeId: 'wt_801'
    });
  });
});
