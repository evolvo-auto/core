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
        issueNumber: 801,
        logging: {
          verbosity: 'quiet'
        }
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
        runBenchmarks: vi.fn().mockResolvedValue({
          averageScore: null,
          benchmarkRuns: [],
          selectedBenchmarkKeys: []
        }),
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
        logging: {
          verbosity: 'quiet'
        },
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
        evaluateMutationSummary: vi.fn().mockResolvedValue({
          adoptionDecision: 'adopt',
          benchmarkDelta: {
            averageBaselineScore: 70,
            averageCurrentScore: 84,
            averageScoreDelta: 14,
            benchmarkComparisons: [],
            benchmarkEvidenceSatisfied: true,
            currentRegressionCount: 0,
            executedBenchmarkKeys: ['routing-pack'],
            maxAllowedRegressionCount: 0,
            minimumPassRateDelta: 5,
            missingRequiredBenchmarkKeys: [],
            requiredBenchmarkKeys: ['routing-pack'],
            routingEvidenceRequired: true
          },
          notes: []
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
        runBenchmarks: vi.fn().mockResolvedValue({
          averageScore: 88,
          benchmarkRuns: [],
          selectedBenchmarkKeys: ['core-runtime-smoke']
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

  it('posts milestone progress comments when verbose logging is enabled', async () => {
    const writeComment = vi.fn().mockResolvedValue(undefined);

    await executeIssueAttempt(
      {
        issueNumber: 801,
        logging: {
          verbosity: 'verbose'
        },
        maxRepairAttempts: 0
      },
      {
        builder: vi.fn().mockResolvedValue({
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
        }),
        cleanup: vi.fn().mockResolvedValue(undefined),
        createReserved: vi.fn().mockResolvedValue(undefined),
        evaluationRunner: vi.fn().mockResolvedValue({
          checkResults: [],
          evaluatorOutput: {
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
          },
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
          environmentFingerprintPath:
            '/repo/worktree/.evolvo/environment-fingerprint.json',
          installPerformed: true,
          worktree: {
            id: 'wt_801'
          }
        }),
        persistArtifacts: vi.fn().mockResolvedValue({
          manifestPath:
            '/repo/.artifacts/worktrees/wt_801/attempts/att_801/manifest.json'
        }),
        planner: vi.fn().mockResolvedValue(plannerOutput),
        pushAndCommit: vi.fn().mockResolvedValue({
          branchName: 'issue/801-runtime-loop',
          commitMessage: 'feat(issue-801): Implement runtime loop',
          remoteName: 'origin'
        }),
        runBenchmarks: vi.fn().mockResolvedValue({
          averageScore: 88,
          benchmarkRuns: [],
          selectedBenchmarkKeys: ['core-runtime-smoke']
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
        writeComment
      }
    );

    expect(writeComment).toHaveBeenCalledWith(
      801,
      expect.objectContaining({
        commentKind: 'progress',
        title: 'Execution Environment Ready'
      })
    );
    expect(writeComment).toHaveBeenCalledWith(
      801,
      expect.objectContaining({
        commentKind: 'progress',
        title: 'Builder Attempt 1 Completed'
      })
    );
  });

  it('records failure follow-up data and defers when mutation-first strategy wins', async () => {
    const result = await executeIssueAttempt(
      {
        issueNumber: 801,
        logging: {
          verbosity: 'quiet'
        },
        maxRepairAttempts: 1
      },
      {
        builder: vi.fn().mockResolvedValue({
          builderOutput: {
            believesReadyForEvaluation: true,
            commandsSuggested: [],
            filesActuallyChanged: ['packages/execution/src/runtime-loop.ts'],
            filesIntendedToChange: ['packages/execution/src/runtime-loop.ts'],
            implementationNotes: ['Added loop wiring.'],
            issueNumber: 801,
            possibleKnownRisks: [],
            summary: 'Implemented the runtime loop.'
          },
          diffSummary: '1 file changed',
          intendedOnlyFiles: [],
          patchPath: '/repo/worktree/.evolvo/builder.patch',
          unexpectedChangedFiles: []
        }),
        cleanup: vi.fn().mockResolvedValue(undefined),
        createReserved: vi.fn().mockResolvedValue(undefined),
        critic: vi.fn().mockResolvedValue({
          completionAssessment: 'failed',
          directFixRecommended: false,
          isSystemic: true,
          issueNumber: 801,
          likelyRootCauses: [
            {
              cause: 'The repair loop is under-specified.',
              confidence: 86
            }
          ],
          mutationRecommended: true,
          notes: ['Repeated across several issues.'],
          outcome: 'failure',
          primarySymptoms: ['Schema validation failed'],
          recommendedNextAction: 'open-mutation'
        }),
        evaluationRunner: vi.fn().mockResolvedValue({
          checkResults: [],
          evaluatorOutput: {
            checks: {
              build: 'failed',
              install: 'passed',
              lint: 'passed',
              run: 'skipped',
              smoke: 'skipped',
              tests: 'failed',
              typecheck: 'passed'
            },
            extraChecks: [],
            issueNumber: 801,
            outcome: 'failure',
            regressionRisk: 'medium',
            shouldMergeIfPRExists: false,
            shouldOpenPR: false,
            summary: 'Tests failed.'
          },
          observedFailures: ['Schema validation failed']
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
        processFailureMemory: vi.fn().mockResolvedValue({
          capabilitySnapshot: {
            attempts: 3,
            capabilityKey: 'typescript',
            confidenceScore: 38,
            failures: 2,
            lastIssueNumber: 801,
            recurringFailureModes: ['model-quality/runtime/openai'],
            successes: 1
          },
          createdFailureIssueNumber: 91,
          createdMutationIssueNumber: 92,
          failureRecordId: 'failure_801',
          followupErrors: [],
          mutationProposalId: 'mutation_801',
          recurrenceCount: 3,
          recurrenceGroup: 'model-quality/runtime/openai',
          reflection: {
            attemptId: 'att_801',
            immediateFollowups: [],
            issueNumber: 801,
            localVsSystemic: 'systemic',
            likelyRootCauses: [
              {
                cause: 'The repair loop is under-specified.',
                confidence: 86
              }
            ],
            phase: 'runtime',
            recurrenceHints: [],
            shouldCreateFailureIssue: true,
            shouldCreateMutationIssue: true,
            symptom: 'Schema validation failed'
          },
          strategy: 'mutation-first'
        }),
        runBenchmarks: vi.fn().mockResolvedValue({
          averageScore: 41,
          benchmarkRuns: [],
          selectedBenchmarkKeys: ['core-runtime-smoke', 'typescript-regression-pack']
        }),
        reserve: vi.fn().mockResolvedValue({
          branchName: 'issue/801-runtime-loop',
          filesystemPath: '/repo/worktree',
          worktree: {
            id: 'wt_801'
          }
        }),
        syncIssueEvalLabel: vi.fn().mockResolvedValue(undefined),
        transitionState: vi.fn().mockResolvedValue({
          nextLabels: ['state:deferred'],
          nextState: 'DEFERRED'
        }),
        updateAttempt: vi.fn().mockResolvedValue(undefined),
        updateIssue: vi.fn().mockResolvedValue(undefined),
        updateWorktree: vi.fn().mockResolvedValue(undefined),
        writeComment: vi.fn().mockResolvedValue(undefined)
      }
    );

    expect(result).toEqual({
      artifactManifestPath:
        '/repo/.artifacts/worktrees/wt_801/attempts/att_801/manifest.json',
      attemptId: 'att_801',
      issueNumber: 801,
      outcome: 'deferred',
      worktreeId: 'wt_801'
    });
  });

  it('records mutation adoption evidence and includes mutation evaluation in the pull request body', async () => {
    const createMutationEvaluationOutcome = vi.fn().mockResolvedValue({
      id: 'mutation_outcome_1'
    });
    const updateMutation = vi.fn().mockResolvedValue({
      id: 'mutation_801',
      state: 'ADOPTED'
    });
    const upsertPullRequest = vi.fn().mockResolvedValue({
      action: 'created',
      branchName: 'issue/801-runtime-loop',
      pullRequest: {
        number: 44
      },
      pullRequestNumber: 44
    });
    const runBenchmarks = vi.fn().mockResolvedValue({
      averageScore: 86,
      benchmarkRuns: [
        {
          attemptId: 'att_801',
          benchmarkKey: 'routing-pack',
          outcome: 'PASSED',
          regressionCount: 0,
          score: 84
        }
      ],
      selectedBenchmarkKeys: ['routing-pack']
    });

    await executeIssueAttempt(
      {
        issueNumber: 801,
        logging: {
          verbosity: 'quiet'
        },
        maxRepairAttempts: 0
      },
      {
        builder: vi.fn().mockResolvedValue({
          builderOutput: {
            believesReadyForEvaluation: true,
            commandsSuggested: [],
            filesActuallyChanged: ['genome/routing/model-routing.ts'],
            filesIntendedToChange: ['genome/routing/model-routing.ts'],
            implementationNotes: ['Adjusted routing defaults.'],
            issueNumber: 801,
            possibleKnownRisks: [],
            summary: 'Updated routing defaults.'
          },
          diffSummary: '1 file changed',
          intendedOnlyFiles: [],
          patchPath: '/repo/worktree/.evolvo/builder.patch',
          unexpectedChangedFiles: []
        }),
        buildMutationRoutingChangeEvidence: vi
          .fn()
          .mockResolvedValue('## Routing Change Evidence\n\nRouting diff verified.'),
        cleanup: vi.fn().mockResolvedValue(undefined),
        createMutationEvaluationOutcome,
        createReserved: vi.fn().mockResolvedValue(undefined),
        evaluationRunner: vi.fn().mockResolvedValue({
          checkResults: [],
          evaluatorOutput: {
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
          },
          observedFailures: []
        }),
        findActiveWorktree: vi.fn().mockResolvedValue(null),
        getGitHubIssue: vi.fn().mockResolvedValue({
          body: 'Validate a routing mutation.',
          labels: ['kind:mutation', 'source:evolvo', 'state:triage', 'surface:routing'],
          number: 801,
          title: 'Mutation: improve routing'
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
        listMutations: vi.fn().mockResolvedValue([
          {
            id: 'mutation_801',
            linkedIssueNumber: 801,
            rationale: 'Switch routing to a stronger model for routing-sensitive work.',
            state: 'PROPOSED',
            targetSurface: 'ROUTING',
            title: 'Improve routing',
            validationPlan: {
              benchmarkIds: ['routing-pack'],
              maxAllowedRegressionCount: 0,
              minimumPassRateDelta: 5,
              replayIssueNumbers: [],
              requireShadowMode: false
            }
          }
        ]),
        persistArtifacts: vi.fn().mockResolvedValue({
          manifestPath: '/repo/.artifacts/worktrees/wt_801/attempts/att_801/manifest.json'
        }),
        planner: vi.fn().mockResolvedValue({
          ...plannerOutput,
          kind: 'mutation',
          relevantSurfaces: ['routing']
        }),
        pushAndCommit: vi.fn().mockResolvedValue({
          branchName: 'issue/801-runtime-loop',
          commitMessage: 'feat(mutation-801): Improve routing',
          remoteName: 'origin'
        }),
        reserve: vi.fn().mockResolvedValue({
          branchName: 'issue/801-runtime-loop',
          filesystemPath: '/repo/worktree',
          worktree: {
            id: 'wt_801'
          }
        }),
        evaluateMutationSummary: vi.fn().mockResolvedValue({
          adoptionDecision: 'adopt',
          benchmarkDelta: {
            averageBaselineScore: 80,
            averageCurrentScore: 84,
            averageScoreDelta: 4,
            benchmarkComparisons: [
              {
                baselineScore: 80,
                benchmarkKey: 'routing-pack',
                currentScore: 84,
                delta: 4,
                outcome: 'PASSED'
              }
            ],
            benchmarkEvidenceSatisfied: true,
            currentRegressionCount: 0,
            executedBenchmarkKeys: ['routing-pack'],
            maxAllowedRegressionCount: 0,
            minimumPassRateDelta: 4,
            missingRequiredBenchmarkKeys: [],
            requiredBenchmarkKeys: ['routing-pack'],
            routingEvidenceRequired: true
          },
          notes: [
            'Required routing benchmark passed with no regressions and improved score.'
          ]
        }),
        runBenchmarks,
        syncIssueEvalLabel: vi.fn().mockResolvedValue(undefined),
        syncPullRequestEvalLabel: vi.fn().mockResolvedValue(undefined),
        syncPullRequestLabels: vi.fn().mockResolvedValue(undefined),
        transitionState: vi.fn().mockResolvedValue({
          nextLabels: ['state:done'],
          nextState: 'DONE'
        }),
        updateAttempt: vi.fn().mockResolvedValue(undefined),
        updateIssue: vi.fn().mockResolvedValue(undefined),
        updateMutation,
        updateWorktree: vi.fn().mockResolvedValue(undefined),
        upsertPullRequest,
        writeComment: vi.fn().mockResolvedValue(undefined)
      }
    );

    expect(runBenchmarks).toHaveBeenCalledWith(
      expect.objectContaining({
        requiredBenchmarkKeys: ['routing-pack']
      })
    );
    expect(upsertPullRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('## Mutation Evaluation')
      })
    );
    expect(createMutationEvaluationOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        mutationProposalId: 'mutation_801',
        outcome: 'ADOPTED'
      })
    );
    expect(updateMutation).toHaveBeenCalledWith({
      id: 'mutation_801',
      state: 'ADOPTED'
    });
  });
});
