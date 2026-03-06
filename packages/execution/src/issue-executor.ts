import { updateAttemptRecord } from '@evolvo/api/attempt-record';
import { updateIssueRecord } from '@evolvo/api/issue-record';
import { runBenchmarkSuite, type RunBenchmarkSuiteResult } from '@evolvo/benchmarks/runner';
import {
  findActiveWorktreeForIssue,
  updateWorktreeRecord
} from '@evolvo/api/worktree-record';
import { runEvaluation, type RunEvaluationResult } from '@evolvo/evaluation/evaluator-runner';
import type { SmokeContract } from '@evolvo/evaluation/smoke-contract';
import { syncIssueEvaluationLabel, syncPullRequestEvaluationLabel } from '@evolvo/github/evaluation-labels';
import { classifyIssue } from '@evolvo/github/issue-classification';
import { writeStructuredIssueComment } from '@evolvo/github/issue-comment-writer';
import { transitionIssueState } from '@evolvo/github/issue-state';
import { deferIssue, rejectIssue } from '@evolvo/github/issue-disposition';
import { upsertPullRequestFromBranch, syncPullRequestLabelsFromIssue } from '@evolvo/github/pull-requests';
import { getIssue } from '@evolvo/github/issues';
import type {
  StructuredIssueCommentInput,
  TransitionIssueStateResult
} from '@evolvo/github/types';
import {
  createLogger,
  type StructuredLogger
} from '@evolvo/observability/logger';
import { runCriticRole } from '@evolvo/orchestration/critic-role';
import { runPlannerRole } from '@evolvo/orchestration/planner-role';
import type {
  CriticOutput,
  FailureReflection,
  PlannerOutput
} from '@evolvo/schemas/role-output-schemas';
import {
  cleanupWorktree
} from '@evolvo/worktrees/cleanup';
import {
  createReservedWorktree
} from '@evolvo/worktrees/creation';
import {
  handleWorktreeBlocker
} from '@evolvo/worktrees/blocker-handling';
import {
  hydrateWorktree
} from '@evolvo/worktrees/hydration';
import {
  persistWorktreeArtifacts
} from '@evolvo/worktrees/artifact-persistence';
import {
  reserveWorktree
} from '@evolvo/worktrees/reservation';

import { runBuilderOrchestration, type RunBuilderOrchestrationResult } from './builder-orchestration.js';
import {
  resolveExecutionLoggingConfig,
  shouldIncludeVerboseTerminalData,
  shouldPostIssueProgressComments,
  type ExecutionLoggingConfig,
  toTerminalLogLevel
} from './logging-policy.js';
import {
  processFailureFollowup
} from './failure-followup.js';
import {
  buildIssueCommitMessage,
  commitAndPushWorktree
} from './git-operations.js';

type IssueWorkflowState =
  | 'BLOCKED'
  | 'DEFERRED'
  | 'DONE'
  | 'IN_PROGRESS'
  | 'REJECTED'
  | 'SELECTED'
  | 'TRIAGE';

type AttemptOutcome = 'BLOCKED' | 'FAILURE' | 'INCONCLUSIVE' | 'PARTIAL' | 'SUCCESS';
type EvaluationStatus = 'FAILED' | 'PARTIAL' | 'PASSED' | 'PENDING' | 'REGRESSED';

export type ExecuteIssueAttemptInput = {
  baseRef?: string;
  gitRemote?: string;
  issueNumber: number;
  logging?: Partial<ExecutionLoggingConfig>;
  maxRepairAttempts?: number;
  smokeContract?: SmokeContract;
  worktreesRoot?: string;
};

export type ExecuteIssueAttemptResult = {
  artifactManifestPath?: string;
  attemptId?: string;
  issueNumber: number;
  outcome: 'completed' | 'deferred' | 'failed' | 'rejected' | 'skipped';
  pullRequestNumber?: number;
  worktreeId?: string;
};

export type ExecuteIssueAttemptDependencies = {
  cleanup?: typeof cleanupWorktree;
  createReserved?: typeof createReservedWorktree;
  findActiveWorktree?: typeof findActiveWorktreeForIssue;
  getGitHubIssue?: typeof getIssue;
  handleBlocker?: typeof handleWorktreeBlocker;
  hydrate?: typeof hydrateWorktree;
  planner?: typeof runPlannerRole;
  builder?: typeof runBuilderOrchestration;
  evaluationRunner?: typeof runEvaluation;
  runBenchmarks?: typeof runBenchmarkSuite;
  critic?: typeof runCriticRole;
  reserve?: typeof reserveWorktree;
  persistArtifacts?: typeof persistWorktreeArtifacts;
  processFailureMemory?: typeof processFailureFollowup;
  pushAndCommit?: typeof commitAndPushWorktree;
  reject?: typeof rejectIssue;
  defer?: typeof deferIssue;
  transitionState?: typeof transitionIssueState;
  syncIssueEvalLabel?: typeof syncIssueEvaluationLabel;
  syncPullRequestEvalLabel?: typeof syncPullRequestEvaluationLabel;
  syncPullRequestLabels?: typeof syncPullRequestLabelsFromIssue;
  upsertPullRequest?: typeof upsertPullRequestFromBranch;
  updateAttempt?: typeof updateAttemptRecord;
  updateIssue?: typeof updateIssueRecord;
  updateWorktree?: typeof updateWorktreeRecord;
  writeComment?: typeof writeStructuredIssueComment;
};

function resolveCapability(
  labels: string[],
  plannerOutput: PlannerOutput
): 'debugging' | 'general' | 'nestjs' | 'nextjs' | 'typescript' {
  const normalizedLabels = labels.map((label) => label.toLowerCase());
  const normalizedCapabilityTags = plannerOutput.capabilityTags.map((tag) =>
    tag.toLowerCase()
  );

  if (
    normalizedLabels.includes('capability:nextjs') ||
    normalizedCapabilityTags.includes('nextjs')
  ) {
    return 'nextjs';
  }

  if (
    normalizedLabels.includes('capability:nestjs') ||
    normalizedCapabilityTags.includes('nestjs')
  ) {
    return 'nestjs';
  }

  if (
    normalizedLabels.includes('capability:typescript') ||
    normalizedCapabilityTags.includes('typescript')
  ) {
    return 'typescript';
  }

  return 'general';
}

function resolveSmokeContract(
  smokeContract: SmokeContract | undefined,
  env: NodeJS.ProcessEnv
): SmokeContract {
  const port = env.DASHBOARD_PORT?.trim() || '3000';
  const defaultSmokeContract: SmokeContract = {
    baseUrl: `http://127.0.0.1:${port}`,
    startupCommand: {
      args: [
        '--filter',
        '@evolvo/dashboard',
        'start',
        '--',
        '--hostname',
        '127.0.0.1',
        '--port',
        port
      ],
      command: 'pnpm',
      startupTimeoutMs: 30_000
    }
  };

  if (!smokeContract) {
    return defaultSmokeContract;
  }

  return {
    ...defaultSmokeContract,
    ...smokeContract,
    startupCommand: smokeContract.startupCommand
      ? {
          ...defaultSmokeContract.startupCommand,
          ...smokeContract.startupCommand
        }
      : defaultSmokeContract.startupCommand
  };
}

function mapEvaluatorOutputToAttemptOutcome(
  evaluationResult: RunEvaluationResult
): AttemptOutcome {
  switch (evaluationResult.evaluatorOutput.outcome) {
    case 'success':
      return 'SUCCESS';
    case 'partial':
      return 'PARTIAL';
    case 'blocked':
      return 'BLOCKED';
    case 'inconclusive':
      return 'INCONCLUSIVE';
    case 'failure':
    default:
      return 'FAILURE';
  }
}

function mapEvaluatorOutputToEvaluationStatus(
  evaluationResult: RunEvaluationResult
): EvaluationStatus {
  if (evaluationResult.evaluatorOutput.regressionRisk === 'high') {
    return 'REGRESSED';
  }

  switch (evaluationResult.evaluatorOutput.outcome) {
    case 'success':
      return 'PASSED';
    case 'partial':
      return 'PARTIAL';
    case 'failure':
    case 'blocked':
    case 'inconclusive':
    default:
      return 'FAILED';
  }
}

function mapEvaluationStatusToLabel(
  evaluationStatus: EvaluationStatus
): 'eval:failed' | 'eval:partial' | 'eval:passed' | 'eval:regressed' {
  if (evaluationStatus === 'REGRESSED') {
    return 'eval:regressed';
  }

  if (evaluationStatus === 'PASSED') {
    return 'eval:passed';
  }

  if (evaluationStatus === 'PARTIAL') {
    return 'eval:partial';
  }

  return 'eval:failed';
}

function buildPullRequestBody(
  issueNumber: number,
  plannerOutput: PlannerOutput,
  builderResult: RunBuilderOrchestrationResult,
  evaluationResult: RunEvaluationResult
): string {
  return [
    `## Summary`,
    '',
    builderResult.builderOutput.summary,
    '',
    `## Planner objective`,
    '',
    plannerOutput.objective,
    '',
    `## Evaluation`,
    '',
    `- Outcome: ${evaluationResult.evaluatorOutput.outcome}`,
    `- Summary: ${evaluationResult.evaluatorOutput.summary}`,
    `- Checks: ${evaluationResult.checkResults
      .map((checkResult) => `${checkResult.name}=${checkResult.result}`)
      .join(', ')}`,
    '',
    `Closes #${String(issueNumber)}`
  ].join('\n');
}

function buildArtifactSet(input: {
  builderResult?: RunBuilderOrchestrationResult;
  criticResult?: CriticOutput;
  evaluationResult?: RunEvaluationResult;
  failureReflection?: FailureReflection;
  summary: string;
}) {
  const artifacts: Array<{
    artifactType: 'diff-summary' | 'evaluation-report' | 'failure-reflection' | 'issue-summary';
    content: string;
    fileName?: string;
  }> = [
    {
      artifactType: 'issue-summary',
      content: input.summary,
      fileName: 'issue-summary.md'
    }
  ];

  if (input.builderResult) {
    artifacts.push({
      artifactType: 'diff-summary',
      content: input.builderResult.diffSummary || '[no diff summary available]',
      fileName: 'diff-summary.txt'
    });
  }

  if (input.evaluationResult) {
    artifacts.push({
      artifactType: 'evaluation-report',
      content: `${JSON.stringify(input.evaluationResult, null, 2)}\n`,
      fileName: 'evaluation-report.json'
    });
  }

  if (input.failureReflection || input.criticResult) {
    artifacts.push({
      artifactType: 'failure-reflection',
      content: `${JSON.stringify(input.failureReflection ?? input.criticResult, null, 2)}\n`,
      fileName: 'failure-reflection.json'
    });
  }

  return artifacts;
}

async function syncLocalIssueState(
  issueNumber: number,
  transitionResult: TransitionIssueStateResult,
  updateIssue: typeof updateIssueRecord,
  logger: StructuredLogger
): Promise<void> {
  await updateIssue({
    currentLabels: transitionResult.nextLabels,
    githubIssueNumber: issueNumber,
    lastSyncedAt: new Date(),
    state: transitionResult.nextState
  }).catch((error) => {
    logger.debug({
      correlationIds: {
        issueNumber
      },
      error,
      eventName: 'issue-state.local-sync.skipped',
      message: 'Issue state transition completed on GitHub but local cache sync failed.'
    });
  });
}

function summarizeCheckResults(evaluationResult: RunEvaluationResult): string {
  return evaluationResult.checkResults
    .map((checkResult) => `${checkResult.name}=${checkResult.result}`)
    .join(', ');
}

async function writeVerboseProgressComment(
  issueNumber: number,
  input: Omit<StructuredIssueCommentInput, 'commentKind'>,
  options: {
    logger: StructuredLogger;
    logging: ExecutionLoggingConfig;
    writeComment: typeof writeStructuredIssueComment;
  }
): Promise<void> {
  if (!shouldPostIssueProgressComments(options.logging.verbosity)) {
    return;
  }

  try {
    await options.writeComment(issueNumber, {
      ...input,
      commentKind: 'progress'
    });
  } catch (error) {
    options.logger.warn({
      correlationIds: {
        issueNumber
      },
      error,
      eventName: 'issue-progress-comment.skipped',
      message:
        'A verbose progress comment could not be posted, so execution continued without it.'
    });
  }
}

function buildFailureState(
  criticResult: CriticOutput | undefined,
  strategy:
    | 'defer'
    | 'direct-fix'
    | 'failure-followup'
    | 'mutation-first'
    | 'stop'
): IssueWorkflowState {
  if (!criticResult) {
    return 'BLOCKED';
  }

  if (
    criticResult.recommendedNextAction === 'defer' ||
    strategy === 'defer' ||
    strategy === 'mutation-first'
  ) {
    return 'DEFERRED';
  }

  if (criticResult.recommendedNextAction === 'stop') {
    return 'BLOCKED';
  }

  return 'BLOCKED';
}

export async function executeIssueAttempt(
  input: ExecuteIssueAttemptInput,
  dependencies: ExecuteIssueAttemptDependencies = {}
): Promise<ExecuteIssueAttemptResult> {
  const logging = resolveExecutionLoggingConfig(input.logging);
  const includeVerboseData = shouldIncludeVerboseTerminalData(
    logging.verbosity
  );
  const logger = createLogger({
    correlationIds: {
      issueNumber: input.issueNumber
    },
    minLevel: toTerminalLogLevel(logging.verbosity),
    source: 'execution/issue-executor'
  });
  const cleanup = dependencies.cleanup ?? cleanupWorktree;
  const createReserved = dependencies.createReserved ?? createReservedWorktree;
  const findActiveWorktree = dependencies.findActiveWorktree ?? findActiveWorktreeForIssue;
  const getGitHubIssue = dependencies.getGitHubIssue ?? getIssue;
  const handleBlocker = dependencies.handleBlocker ?? handleWorktreeBlocker;
  const hydrate = dependencies.hydrate ?? hydrateWorktree;
  const planner = dependencies.planner ?? runPlannerRole;
  const builder = dependencies.builder ?? runBuilderOrchestration;
  const evaluationRunner = dependencies.evaluationRunner ?? runEvaluation;
  const runBenchmarks = dependencies.runBenchmarks ?? runBenchmarkSuite;
  const critic = dependencies.critic ?? runCriticRole;
  const reserve = dependencies.reserve ?? reserveWorktree;
  const persistArtifacts =
    dependencies.persistArtifacts ?? persistWorktreeArtifacts;
  const processFailureMemory =
    dependencies.processFailureMemory ?? processFailureFollowup;
  const pushAndCommit = dependencies.pushAndCommit ?? commitAndPushWorktree;
  const reject = dependencies.reject ?? rejectIssue;
  const defer = dependencies.defer ?? deferIssue;
  const transitionState =
    dependencies.transitionState ?? transitionIssueState;
  const syncIssueEvalLabel =
    dependencies.syncIssueEvalLabel ?? syncIssueEvaluationLabel;
  const syncPullRequestEvalLabel =
    dependencies.syncPullRequestEvalLabel ?? syncPullRequestEvaluationLabel;
  const syncPullRequestLabels =
    dependencies.syncPullRequestLabels ?? syncPullRequestLabelsFromIssue;
  const upsertPullRequest =
    dependencies.upsertPullRequest ?? upsertPullRequestFromBranch;
  const updateAttempt = dependencies.updateAttempt ?? updateAttemptRecord;
  const updateIssue = dependencies.updateIssue ?? updateIssueRecord;
  const updateWorktree = dependencies.updateWorktree ?? updateWorktreeRecord;
  const writeComment = dependencies.writeComment ?? writeStructuredIssueComment;
  const env = process.env;
  const issue = await getGitHubIssue(input.issueNumber);
  const classification = classifyIssue(issue as never);
  logger.info({
    eventName: 'issue-executor.issue.loaded',
    message: 'Loaded issue and classification for execution.',
    data: {
      kind: classification.kind,
      state: classification.state,
      ...(includeVerboseData
        ? {
            labels: classification.currentLabels,
            surfaces: classification.surfaces
          }
        : {})
    }
  });
  const plannerOutput = await planner({
    attemptId: undefined,
    body: issue.body ?? undefined,
    issueNumber: issue.number,
    kindHint: classification.kind.toLowerCase() as PlannerOutput['kind'],
    labels: classification.currentLabels,
    title: issue.title
  });
  logger.info({
    eventName: 'issue-executor.planner.completed',
    message: 'Planner completed for the selected issue.',
    data: {
      objective: plannerOutput.objective,
      recommendedApproach: plannerOutput.recommendedApproach,
      riskLevel: plannerOutput.riskLevel,
      ...(includeVerboseData
        ? {
            acceptanceCriteria: plannerOutput.acceptanceCriteria,
            capabilityTags: plannerOutput.capabilityTags,
            relevantSurfaces: plannerOutput.relevantSurfaces
          }
        : {})
    }
  });

  if (plannerOutput.recommendedApproach === 'reject') {
    logger.info({
      eventName: 'issue-executor.issue.rejected',
      message: 'Planner rejected the issue before execution.',
      data: {
        reasoningSummary: plannerOutput.reasoningSummary
      }
    });
    const rejectResult = await reject(issue.number, {
      status: plannerOutput.reasoningSummary,
      whatChanged: ['Planner determined the issue should not proceed.']
    });
    await syncLocalIssueState(
      issue.number,
      rejectResult.stateTransition,
      updateIssue,
      logger
    );

    return {
      issueNumber: issue.number,
      outcome: 'rejected'
    };
  }

  if (plannerOutput.recommendedApproach === 'defer') {
    logger.info({
      eventName: 'issue-executor.issue.deferred',
      message: 'Planner deferred the issue before execution.',
      data: {
        reasoningSummary: plannerOutput.reasoningSummary
      }
    });
    const deferResult = await defer(issue.number, {
      status: plannerOutput.reasoningSummary,
      whatChanged: ['Planner deferred this issue for a later execution window.']
    });
    await syncLocalIssueState(
      issue.number,
      deferResult.stateTransition,
      updateIssue,
      logger
    );

    return {
      issueNumber: issue.number,
      outcome: 'deferred'
    };
  }

  const selectedState = await transitionState(issue.number, 'SELECTED');

  await syncLocalIssueState(issue.number, selectedState, updateIssue, logger);
  await writeComment(issue.number, {
    commentKind: 'work-started',
    evidence: [
      `Planner objective: ${plannerOutput.objective}`,
      `Approach: ${plannerOutput.recommendedApproach}`
    ],
    nextStep: 'Create the worktree and begin the builder/evaluator loop.',
    status: 'Planning completed and the runtime is preparing execution.',
    whatChanged: [
      'The issue has been selected for execution.',
      'The runtime is moving into the implementation phase.'
    ]
  });

  const inProgressState = await transitionState(issue.number, 'IN_PROGRESS');

  await syncLocalIssueState(
    issue.number,
    inProgressState,
    updateIssue,
    logger
  );
  logger.info({
    eventName: 'issue-executor.execution.started',
    message: 'Issue moved into active execution.',
    data: {
      objective: plannerOutput.objective,
      approach: plannerOutput.recommendedApproach
    }
  });

  const activeWorktree = await findActiveWorktree(issue.number);

  if (activeWorktree) {
    logger.info({
      correlationIds: {
        worktreeId: activeWorktree.id
      },
      eventName: 'issue-executor.execution.skipped',
      message: 'Issue already has an active worktree, so execution was skipped.'
    });
    return {
      issueNumber: issue.number,
      outcome: 'skipped',
      worktreeId: activeWorktree.id
    };
  }

  const reservedWorktree = await reserve({
    baseRef: input.baseRef,
    issueNumber: issue.number,
    issueTitle: issue.title,
    worktreesRoot: input.worktreesRoot
  });
  logger.info({
    correlationIds: {
      worktreeId: reservedWorktree.worktree.id
    },
    eventName: 'issue-executor.worktree.reserved',
    message: 'Reserved a worktree for issue execution.',
    data: {
      branchName: reservedWorktree.branchName,
      ...(includeVerboseData
        ? {
            filesystemPath: reservedWorktree.filesystemPath
          }
        : {})
    }
  });

  await updateIssue({
    githubIssueNumber: issue.number,
    lastSyncedAt: new Date(),
    linkedBranch: reservedWorktree.branchName,
    linkedWorktreeId: reservedWorktree.worktree.id
  }).catch((error) => {
    logger.debug({
      correlationIds: {
        issueNumber: issue.number,
        worktreeId: reservedWorktree.worktree.id
      },
      error,
      eventName: 'issue-worktree.local-link.skipped',
      message:
        'Reserved worktree metadata was not written to the local issue cache.'
    });
  });

  try {
    await createReserved({
      worktreeId: reservedWorktree.worktree.id
    });
    logger.info({
      correlationIds: {
        worktreeId: reservedWorktree.worktree.id
      },
      eventName: 'issue-executor.worktree.created',
      message: 'Created the reserved worktree on disk.'
    });
  } catch (error) {
    await handleBlocker({
      error,
      issueNumber: issue.number,
      phase: 'creation',
      worktreeId: reservedWorktree.worktree.id
    });
    throw error;
  }

  let hydratedWorktree:
    | Awaited<ReturnType<typeof hydrate>>
    | undefined;

  try {
    hydratedWorktree = await hydrate({
      worktreeId: reservedWorktree.worktree.id
    });
    logger.info({
      correlationIds: {
        attemptId: hydratedWorktree.attemptId,
        worktreeId: reservedWorktree.worktree.id
      },
      eventName: 'issue-executor.worktree.hydrated',
      message: 'Hydrated the worktree and prepared the execution environment.',
      data: {
        installPerformed: hydratedWorktree.installPerformed,
        branchName: reservedWorktree.branchName
      }
    });
    await writeVerboseProgressComment(
      issue.number,
      {
        evidence: [
          `worktree-id=${reservedWorktree.worktree.id}`,
          `attempt-id=${hydratedWorktree.attemptId}`,
          `branch=${reservedWorktree.branchName}`
        ],
        nextStep: 'Run the builder and begin the evaluation loop.',
        status:
          'The execution environment is ready and the runtime is starting implementation.',
        title: 'Execution Environment Ready',
        whatChanged: [
          `Reserved branch ${reservedWorktree.branchName}.`,
          hydratedWorktree.installPerformed
            ? 'Dependencies were installed and the environment fingerprint was recorded.'
            : 'Environment verification completed without needing a fresh install.'
        ]
      },
      {
        logger,
        logging,
        writeComment
      }
    );
  } catch (error) {
    await handleBlocker({
      error,
      issueNumber: issue.number,
      phase: 'hydration',
      worktreeId: reservedWorktree.worktree.id
    });
    throw error;
  }

  let builderResult: RunBuilderOrchestrationResult | undefined;
  let evaluationResult: RunEvaluationResult | undefined;
  let criticResult: CriticOutput | undefined;
  let failureReflection: FailureReflection | undefined;
  let artifactManifestPath: string | undefined;
  const maxRepairAttempts = Math.max(0, input.maxRepairAttempts ?? 2);
  const capability = resolveCapability(classification.currentLabels, plannerOutput);

  for (let repairAttempt = 0; repairAttempt <= maxRepairAttempts; repairAttempt += 1) {
    const cycleStartedAt = new Date();
    logger.info({
      correlationIds: {
        attemptId: hydratedWorktree.attemptId,
        worktreeId: reservedWorktree.worktree.id
      },
      eventName: 'issue-executor.builder.attempt.started',
      message: 'Starting a builder attempt.',
      data: {
        attemptNumber: repairAttempt + 1,
        totalAttempts: maxRepairAttempts + 1,
        mode: criticResult ? 'repair' : 'initial'
      }
    });
    builderResult = await builder({
      attemptId: hydratedWorktree.attemptId,
      body: issue.body ?? undefined,
      capability: criticResult ? 'debugging' : capability,
      issueNumber: issue.number,
      journalPath: hydratedWorktree.attemptJournalPath,
      plannerOutput,
      title: issue.title,
      worktreeId: reservedWorktree.worktree.id,
      worktreePath: reservedWorktree.filesystemPath
    });

    await updateAttempt({
      id: hydratedWorktree.attemptId,
      summary: builderResult.builderOutput.summary
    });
    logger.info({
      correlationIds: {
        attemptId: hydratedWorktree.attemptId,
        worktreeId: reservedWorktree.worktree.id
      },
      eventName: 'issue-executor.builder.attempt.completed',
      message: 'Builder attempt completed and produced changes for evaluation.',
      data: {
        attemptNumber: repairAttempt + 1,
        changedFileCount: builderResult.builderOutput.filesActuallyChanged.length,
        summary: builderResult.builderOutput.summary,
        ...(includeVerboseData
          ? {
              changedFiles: builderResult.builderOutput.filesActuallyChanged
            }
          : {})
      }
    });
    await writeVerboseProgressComment(
      issue.number,
      {
        evidence: builderResult.builderOutput.filesActuallyChanged
          .slice(0, 5)
          .map((filePath) => `changed=${filePath}`),
        nextStep:
          'Run the evaluation plan and collect validation evidence for this attempt.',
        status:
          'The builder finished applying changes and the runtime is moving into evaluation.',
        title: `Builder Attempt ${String(repairAttempt + 1)} Completed`,
        whatChanged: [
          builderResult.builderOutput.summary,
          `Changed ${String(builderResult.builderOutput.filesActuallyChanged.length)} file(s).`
        ]
      },
      {
        logger,
        logging,
        writeComment
      }
    );
    await updateWorktree({
      id: reservedWorktree.worktree.id,
      status: 'AWAITING_EVAL'
    });

    const awaitingEvalState = await transitionState(issue.number, 'AWAITING_EVAL');

    await syncLocalIssueState(
      issue.number,
      awaitingEvalState,
      updateIssue,
      logger
    );
    logger.info({
      correlationIds: {
        attemptId: hydratedWorktree.attemptId,
        worktreeId: reservedWorktree.worktree.id
      },
      eventName: 'issue-executor.evaluation.started',
      message: 'Starting evaluation for the current builder attempt.',
      data: {
        attemptNumber: repairAttempt + 1
      }
    });

    evaluationResult = await evaluationRunner({
      acceptanceCriteria: plannerOutput.acceptanceCriteria,
      attemptId: hydratedWorktree.attemptId,
      builderSummary: builderResult.builderOutput.summary,
      capability,
      changedFiles: builderResult.builderOutput.filesActuallyChanged,
      env,
      evaluationPlan: plannerOutput.evaluationPlan,
      issueNumber: issue.number,
      journalPath: hydratedWorktree.attemptJournalPath,
      objective: plannerOutput.objective,
      smokeContract: resolveSmokeContract(input.smokeContract, env),
      worktreeId: reservedWorktree.worktree.id,
      worktreePath: reservedWorktree.filesystemPath
    });

    const evaluationStatus =
      mapEvaluatorOutputToEvaluationStatus(evaluationResult);
    const cycleCompletedAt = new Date();
    const benchmarkResult: RunBenchmarkSuiteResult = await runBenchmarks({
      attemptId: hydratedWorktree.attemptId,
      builderResult: {
        filesActuallyChanged: builderResult.builderOutput.filesActuallyChanged,
        summary: builderResult.builderOutput.summary
      },
      capabilityTags:
        plannerOutput.capabilityTags.length > 0
          ? plannerOutput.capabilityTags
          : [capability],
      cycleCompletedAt,
      cycleStartedAt,
      evaluationResult: {
        checkResults: evaluationResult.checkResults.map((checkResult) => ({
          name: checkResult.name,
          result: checkResult.result
        })),
        evaluatorOutput: {
          outcome: evaluationResult.evaluatorOutput.outcome,
          regressionRisk: evaluationResult.evaluatorOutput.regressionRisk,
          summary: evaluationResult.evaluatorOutput.summary
        },
        observedFailures: evaluationResult.observedFailures
      },
      issueNumber: issue.number,
      repairAttempt
    });

    await syncIssueEvalLabel(
      issue.number,
      mapEvaluationStatusToLabel(evaluationStatus)
    );
    await updateAttempt({
      evaluationStatus,
      id: hydratedWorktree.attemptId,
      outcome: mapEvaluatorOutputToAttemptOutcome(evaluationResult),
      summary: evaluationResult.evaluatorOutput.summary
    });
    logger.info({
      correlationIds: {
        attemptId: hydratedWorktree.attemptId,
        worktreeId: reservedWorktree.worktree.id
      },
      eventName: 'issue-executor.evaluation.completed',
      message: 'Evaluation completed for the current builder attempt.',
      data: {
        attemptNumber: repairAttempt + 1,
        outcome: evaluationResult.evaluatorOutput.outcome,
        regressionRisk: evaluationResult.evaluatorOutput.regressionRisk,
        shouldOpenPR: evaluationResult.evaluatorOutput.shouldOpenPR,
        checks: summarizeCheckResults(evaluationResult),
        benchmarkAverageScore: benchmarkResult.averageScore,
        benchmarkCount: benchmarkResult.benchmarkRuns.length,
        ...(includeVerboseData
          ? {
              benchmarkKeys: benchmarkResult.selectedBenchmarkKeys,
              observedFailures: evaluationResult.observedFailures
            }
          : {})
      }
    });

    if (
      evaluationResult.evaluatorOutput.shouldOpenPR &&
      builderResult.builderOutput.filesActuallyChanged.length > 0
    ) {
      const commitMessage = buildIssueCommitMessage(
        classification.kind.toLowerCase(),
        issue.number,
        issue.title
      );

      await pushAndCommit({
        branchName: reservedWorktree.branchName,
        commitMessage,
        journalPath: hydratedWorktree.attemptJournalPath,
        remoteName: input.gitRemote,
        worktreeId: reservedWorktree.worktree.id,
        worktreePath: reservedWorktree.filesystemPath
      });

      const pullRequest = await upsertPullRequest({
        base: input.baseRef ?? 'main',
        body: buildPullRequestBody(
          issue.number,
          plannerOutput,
          builderResult,
          evaluationResult
        ),
        branchName: reservedWorktree.branchName,
        title: `[Issue #${String(issue.number)}] ${issue.title}`
      });

      await updateWorktree({
        id: reservedWorktree.worktree.id,
        linkedPullRequestNumber: pullRequest.pullRequestNumber,
        status: 'COMPLETED'
      });
      await syncPullRequestLabels(issue.number, pullRequest.pullRequestNumber);
      await syncPullRequestEvalLabel(
        pullRequest.pullRequestNumber,
        mapEvaluationStatusToLabel(evaluationStatus)
      );

      const doneState = await transitionState(issue.number, 'DONE');

      await syncLocalIssueState(issue.number, doneState, updateIssue, logger);
      logger.info({
        correlationIds: {
          attemptId: hydratedWorktree.attemptId,
          worktreeId: reservedWorktree.worktree.id
        },
        eventName: 'issue-executor.pull-request.ready',
        message: 'Opened or updated a pull request for the completed issue.',
        data: {
          evaluationStatus,
          pullRequestNumber: pullRequest.pullRequestNumber,
          branchName: reservedWorktree.branchName
        }
      });

      const issueSummary = [
        `Issue #${String(issue.number)} completed in worktree ${reservedWorktree.worktree.id}.`,
        `PR #${String(pullRequest.pullRequestNumber)} is ready for review.`,
        evaluationResult.evaluatorOutput.summary
      ].join('\n');

      await writeComment(issue.number, {
        commentKind: 'evaluation-result',
        evidence: [
          `PR #${String(pullRequest.pullRequestNumber)}`,
          `Checks: ${evaluationResult.checkResults
            .map((checkResult) => `${checkResult.name}=${checkResult.result}`)
            .join(', ')}`
        ],
        nextStep: 'Review the generated pull request.',
        status: evaluationResult.evaluatorOutput.summary,
        whatChanged: [
          builderResult.builderOutput.summary,
          `Worktree branch ${reservedWorktree.branchName} was pushed and a pull request was opened.`
        ]
      });

      const persistedArtifacts = await persistArtifacts({
        artifacts: buildArtifactSet({
          builderResult,
          evaluationResult,
          summary: issueSummary
        }),
        attemptId: hydratedWorktree.attemptId,
        worktreeId: reservedWorktree.worktree.id
      });

      artifactManifestPath = persistedArtifacts.manifestPath;

      await cleanup({
        artifactManifestPath,
        worktreeId: reservedWorktree.worktree.id
      });

      await updateAttempt({
        endedAt: new Date(),
        evaluationStatus,
        id: hydratedWorktree.attemptId,
        outcome: mapEvaluatorOutputToAttemptOutcome(evaluationResult),
        summary: evaluationResult.evaluatorOutput.summary
      });

      return {
        artifactManifestPath,
        attemptId: hydratedWorktree.attemptId,
        issueNumber: issue.number,
        outcome: 'completed',
        pullRequestNumber: pullRequest.pullRequestNumber,
        worktreeId: reservedWorktree.worktree.id
      };
    }

    criticResult = await critic({
      acceptanceCriteria: plannerOutput.acceptanceCriteria,
      attemptId: hydratedWorktree.attemptId,
      changedFiles: builderResult.builderOutput.filesActuallyChanged,
      commandResults: evaluationResult.checkResults.map((checkResult) => ({
        command: checkResult.command,
        exitCode: checkResult.exitCode ?? -1,
        name: checkResult.name,
        stderrSnippet: checkResult.stderr,
        stdoutSnippet: checkResult.stdout
      })),
      implementationSummary: builderResult.builderOutput.summary,
      issueNumber: issue.number,
      objective: plannerOutput.objective,
      observedFailures: evaluationResult.observedFailures
    });
    logger.warn({
      correlationIds: {
        attemptId: hydratedWorktree.attemptId,
        worktreeId: reservedWorktree.worktree.id
      },
      eventName: 'issue-executor.critic.completed',
      message: 'Evaluation did not pass, so the critic produced next-step guidance.',
      data: {
        recommendedNextAction: criticResult.recommendedNextAction,
        isSystemic: criticResult.isSystemic,
        mutationRecommended: criticResult.mutationRecommended,
        ...(includeVerboseData
          ? {
              notes: criticResult.notes,
              primarySymptoms: criticResult.primarySymptoms
            }
          : {})
      }
    });

    const failureFollowup = await processFailureMemory({
      attemptId: hydratedWorktree.attemptId,
      capabilityKey: criticResult.isSystemic ? 'debugging' : capability,
      criticOutput: criticResult,
      issueNumber: issue.number,
      observedFailures: evaluationResult.observedFailures,
      plannerOutput
    });

    failureReflection = failureFollowup.reflection;
    logger.warn({
      correlationIds: {
        attemptId: hydratedWorktree.attemptId,
        worktreeId: reservedWorktree.worktree.id
      },
      eventName: 'issue-executor.failure-followup.completed',
      message: 'Failure memory and follow-up work were recorded for the failed attempt.',
      data: {
        createdFailureIssueNumber: failureFollowup.createdFailureIssueNumber,
        createdMutationIssueNumber: failureFollowup.createdMutationIssueNumber,
        failureRecordId: failureFollowup.failureRecordId,
        recurrenceCount: failureFollowup.recurrenceCount,
        recurrenceGroup: failureFollowup.recurrenceGroup,
        strategy: failureFollowup.strategy
      }
    });

    if (repairAttempt < maxRepairAttempts && failureFollowup.strategy === 'direct-fix') {
      const retryState = await transitionState(issue.number, 'IN_PROGRESS');

      await syncLocalIssueState(issue.number, retryState, updateIssue, logger);
      await updateWorktree({
        id: reservedWorktree.worktree.id,
        status: 'ACTIVE'
      });
      logger.info({
        correlationIds: {
          attemptId: hydratedWorktree.attemptId,
          worktreeId: reservedWorktree.worktree.id
        },
        eventName: 'issue-executor.retry.scheduled',
        message: 'Scheduling another builder attempt using a direct-fix strategy.',
        data: {
          nextAttemptNumber: repairAttempt + 2,
          remainingAttempts: maxRepairAttempts - repairAttempt,
          strategy: failureFollowup.strategy
        }
      });
      await writeVerboseProgressComment(
        issue.number,
        {
          evidence: [
            ...evaluationResult.observedFailures.slice(0, 5),
            `strategy=${failureFollowup.strategy}`
          ],
          nextStep:
            'Run another builder pass, then repeat the evaluation plan.',
          status:
            'The last attempt failed evaluation, and the runtime is applying a direct-fix repair pass.',
          title: `Retrying After Attempt ${String(repairAttempt + 1)}`,
          whatChanged: [
            evaluationResult.evaluatorOutput.summary,
            criticResult.notes[0] ?? 'The critic requested another direct repair attempt.'
          ]
        },
        {
          logger,
          logging,
          writeComment
        }
      );
      continue;
    }

    const failureState = buildFailureState(
      criticResult,
      failureFollowup.strategy
    );
    const failureTransition = await transitionState(issue.number, failureState);

    await syncLocalIssueState(
      issue.number,
      failureTransition,
      updateIssue,
      logger
    );

    const failureSummary = [
      `Issue #${String(issue.number)} failed after ${String(repairAttempt + 1)} builder/evaluator cycle(s).`,
      evaluationResult.evaluatorOutput.summary,
      `Failure memory recorded as ${failureFollowup.failureRecordId}.`,
      `Recurrence group: ${failureFollowup.recurrenceGroup} (${String(failureFollowup.recurrenceCount)} occurrence(s)).`,
      failureFollowup.createdFailureIssueNumber
        ? `Failure issue #${String(failureFollowup.createdFailureIssueNumber)} was created.`
        : '',
      failureFollowup.createdMutationIssueNumber
        ? `Mutation issue #${String(failureFollowup.createdMutationIssueNumber)} was created.`
        : '',
      ...failureFollowup.followupErrors,
      criticResult.notes.join('\n')
    ]
      .filter((line) => line.trim().length > 0)
      .join('\n');

    await writeComment(issue.number, {
      commentKind: 'evaluation-result',
      evidence: [
        ...evaluationResult.observedFailures,
        `recurrence-group=${failureFollowup.recurrenceGroup}`,
        ...failureFollowup.followupErrors
      ],
      nextStep: failureFollowup.createdMutationIssueNumber
        ? `Review mutation issue #${String(failureFollowup.createdMutationIssueNumber)} before retrying this work.`
        : failureFollowup.createdFailureIssueNumber
          ? `Review failure issue #${String(failureFollowup.createdFailureIssueNumber)} and decide the next repair step.`
          : criticResult.recommendedNextAction === 'defer'
            ? 'Revisit this issue when more context or capacity is available.'
            : 'Investigate the failure evidence before retrying.',
      status: evaluationResult.evaluatorOutput.summary,
      whatChanged: [
        builderResult.builderOutput.summary,
        `The runtime concluded with critic action "${criticResult.recommendedNextAction}" and failure strategy "${failureFollowup.strategy}".`
      ]
    });

    const persistedArtifacts = await persistArtifacts({
      artifacts: buildArtifactSet({
        builderResult,
        criticResult,
        evaluationResult,
        failureReflection,
        summary: failureSummary
      }),
      attemptId: hydratedWorktree.attemptId,
      worktreeId: reservedWorktree.worktree.id
    });

    artifactManifestPath = persistedArtifacts.manifestPath;

    await updateWorktree({
      id: reservedWorktree.worktree.id,
      status: 'FAILED'
    });
    logger.warn({
      correlationIds: {
        attemptId: hydratedWorktree.attemptId,
        worktreeId: reservedWorktree.worktree.id
      },
      eventName: 'issue-executor.execution.failed',
      message: 'Issue execution ended without a pull request.',
      data: {
        artifactManifestPath,
        finalState: failureState,
        outcome:
          failureState === 'DEFERRED' ? 'deferred' : 'failed'
      }
    });
    await cleanup({
      artifactManifestPath,
      worktreeId: reservedWorktree.worktree.id
    });
    await updateAttempt({
      endedAt: new Date(),
      evaluationStatus:
        mapEvaluatorOutputToEvaluationStatus(evaluationResult),
      id: hydratedWorktree.attemptId,
      outcome: mapEvaluatorOutputToAttemptOutcome(evaluationResult),
      summary: failureSummary
    });

    return {
      artifactManifestPath,
      attemptId: hydratedWorktree.attemptId,
      issueNumber: issue.number,
      outcome: failureState === 'DEFERRED' ? 'deferred' : 'failed',
      worktreeId: reservedWorktree.worktree.id
    };
  }

  throw new Error(
    `Issue #${String(issue.number)} exhausted the builder loop without producing a terminal outcome.`
  );
}
