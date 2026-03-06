import { listFailureRecords } from '@evolvo/api/failure-record';
import { listIssueRecords } from '@evolvo/api/issue-record';
import { deferIssue, rejectIssue } from '@evolvo/github/issue-disposition';
import { syncRepositoryIssues } from '@evolvo/github/issue-sync';
import { createLogger } from '@evolvo/observability/logger';
import { runSelectorRole } from '@evolvo/orchestration/selector-role';
import { buildIssuePriorityScore } from '@evolvo/scoring/issue-priority';
import type { SmokeContract } from '@evolvo/evaluation/smoke-contract';

import {
  executeIssueAttempt,
  type ExecuteIssueAttemptInput,
  type ExecuteIssueAttemptResult
} from './issue-executor.js';

export type RuntimeLoopStatus = {
  consecutiveFailures: number;
  lastCycleCompletedAt?: string;
  lastCycleStartedAt?: string;
  lastDecisionType?: string;
  lastErrorMessage?: string;
  lastOutcome?: ExecuteIssueAttemptResult['outcome'] | 'idle';
  lastSelectedIssueNumber?: number;
  state: 'error' | 'executing' | 'idle' | 'sleeping' | 'syncing';
};

export type CreateRuntimeLoopInput = {
  baseRef?: string;
  gitRemote?: string;
  intervalMs: number;
  maxRepairAttempts?: number;
  smokeContract?: SmokeContract;
  worktreesRoot?: string;
};

export type CreateRuntimeLoopDependencies = {
  defer?: typeof deferIssue;
  executeIssue?: typeof executeIssueAttempt;
  listFailures?: typeof listFailureRecords;
  listIssues?: typeof listIssueRecords;
  now?: () => Date;
  reject?: typeof rejectIssue;
  selectIssue?: typeof runSelectorRole;
  syncIssues?: typeof syncRepositoryIssues;
};

const logger = createLogger({
  source: 'execution/runtime-loop'
});

function toRiskLevel(
  riskLevel: 'HIGH' | 'LOW' | 'MEDIUM' | 'SYSTEMIC' | null | undefined
): 'high' | 'low' | 'medium' | 'systemic' | undefined {
  if (!riskLevel) {
    return undefined;
  }

  return riskLevel.toLowerCase() as 'high' | 'low' | 'medium' | 'systemic';
}

function buildBackoffDelayMs(
  intervalMs: number,
  consecutiveFailures: number
): number {
  return intervalMs * Math.min(5, Math.max(1, consecutiveFailures + 1));
}

export function createRuntimeLoop(
  input: CreateRuntimeLoopInput,
  dependencies: CreateRuntimeLoopDependencies = {}
) {
  const defer = dependencies.defer ?? deferIssue;
  const executeIssue = dependencies.executeIssue ?? executeIssueAttempt;
  const listFailures = dependencies.listFailures ?? listFailureRecords;
  const listIssues = dependencies.listIssues ?? listIssueRecords;
  const now = dependencies.now ?? (() => new Date());
  const reject = dependencies.reject ?? rejectIssue;
  const selectIssue = dependencies.selectIssue ?? runSelectorRole;
  const syncIssues = dependencies.syncIssues ?? syncRepositoryIssues;
  const status: RuntimeLoopStatus = {
    consecutiveFailures: 0,
    state: 'idle'
  };
  let running = false;
  let stopped = true;
  let timer: NodeJS.Timeout | undefined;

  async function runOnce(): Promise<void> {
    if (running) {
      return;
    }

    running = true;
    status.lastCycleStartedAt = now().toISOString();
    status.lastErrorMessage = undefined;
    status.state = 'syncing';

    try {
      await syncIssues({
        state: 'open'
      });

      const candidateIssues = await listIssues({
        states: ['PLANNED', 'TRIAGE']
      });
      const recordedFailures = await listFailures({
        limit: 500
      });

      if (candidateIssues.length === 0) {
        status.consecutiveFailures = 0;
        status.lastOutcome = 'idle';
        status.state = 'idle';
        return;
      }

      const failureCountsByIssue = new Map<
        number,
        {
          systemicCount: number;
          totalFailures: number;
        }
      >();

      for (const failureRecord of recordedFailures) {
        const currentStats = failureCountsByIssue.get(failureRecord.issueNumber) ?? {
          systemicCount: 0,
          totalFailures: 0
        };

        currentStats.totalFailures += 1;

        if (failureRecord.isSystemic) {
          currentStats.systemicCount += 1;
        }

        failureCountsByIssue.set(failureRecord.issueNumber, currentStats);
      }

      const selection = await selectIssue({
        candidateIssues: candidateIssues.map((issueRecord) => ({
          issueNumber: issueRecord.githubIssueNumber,
          kind: issueRecord.kind,
          priorityScore: buildIssuePriorityScore({
            basePriorityScore: issueRecord.priorityScore ?? undefined,
            isSystemic:
              (failureCountsByIssue.get(issueRecord.githubIssueNumber)?.systemicCount ??
                0) > 0,
            recurrenceCount:
              failureCountsByIssue.get(issueRecord.githubIssueNumber)?.totalFailures ??
              1,
            riskLevel: toRiskLevel(issueRecord.riskLevel)
          }),
          riskLevel: issueRecord.riskLevel ?? undefined,
          summary: (() => {
            const failureStats = failureCountsByIssue.get(
              issueRecord.githubIssueNumber
            );

            if (!failureStats) {
              return undefined;
            }

            return `Recorded failures: ${String(failureStats.totalFailures)} total, ${String(
              failureStats.systemicCount
            )} systemic.`;
          })(),
          state: issueRecord.state,
          title: issueRecord.title
        })),
        strategyNotes: [...failureCountsByIssue.entries()]
          .filter(([, failureStats]) => failureStats.totalFailures >= 2)
          .slice(0, 5)
          .map(
            ([issueNumber, failureStats]) =>
              `Issue #${String(issueNumber)} has ${String(failureStats.totalFailures)} recorded failures (${String(failureStats.systemicCount)} systemic).`
          )
      });

      status.lastDecisionType = selection.decisionType;

      if (
        selection.decisionType === 'defer-issue' &&
        selection.targetIssueNumber !== undefined
      ) {
        await defer(selection.targetIssueNumber, {
          status: selection.reason,
          whatChanged: [selection.nextStep]
        });
        status.consecutiveFailures = 0;
        status.lastOutcome = 'deferred';
        status.state = 'idle';
        return;
      }

      if (
        selection.decisionType === 'reject-issue' &&
        selection.targetIssueNumber !== undefined
      ) {
        await reject(selection.targetIssueNumber, {
          status: selection.reason,
          whatChanged: [selection.nextStep]
        });
        status.consecutiveFailures = 0;
        status.lastOutcome = 'rejected';
        status.state = 'idle';
        return;
      }

      if (
        !selection.targetIssueNumber ||
        !['select-experiment', 'select-issue'].includes(selection.decisionType)
      ) {
        status.consecutiveFailures = 0;
        status.lastOutcome = 'idle';
        status.state = 'idle';
        return;
      }

      status.lastSelectedIssueNumber = selection.targetIssueNumber;
      status.state = 'executing';

      const result = await executeIssue({
        baseRef: input.baseRef,
        gitRemote: input.gitRemote,
        issueNumber: selection.targetIssueNumber,
        maxRepairAttempts: input.maxRepairAttempts,
        smokeContract: input.smokeContract,
        worktreesRoot: input.worktreesRoot
      } satisfies ExecuteIssueAttemptInput);

      status.consecutiveFailures = result.outcome === 'failed' ? 1 : 0;
      status.lastOutcome = result.outcome;
      status.state = 'idle';
    } catch (error) {
      status.consecutiveFailures += 1;
      status.lastErrorMessage = error instanceof Error ? error.message : String(error);
      status.lastOutcome = 'failed';
      status.state = 'error';
      logger.error({
        correlationIds: {
          issueNumber: status.lastSelectedIssueNumber
        },
        error,
        eventName: 'runtime-loop.cycle.failed',
        message: 'Runtime loop cycle failed.'
      });
    } finally {
      status.lastCycleCompletedAt = now().toISOString();
      running = false;
    }
  }

  function scheduleNextTick(): void {
    if (stopped) {
      return;
    }

    const delayMs =
      status.consecutiveFailures > 0
        ? buildBackoffDelayMs(input.intervalMs, status.consecutiveFailures)
        : input.intervalMs;

    status.state = 'sleeping';
    timer = setTimeout(async () => {
      await runOnce();
      scheduleNextTick();
    }, delayMs);
  }

  return {
    getStatus(): RuntimeLoopStatus {
      return {
        ...status
      };
    },
    async runOnce(): Promise<void> {
      await runOnce();
    },
    start(): void {
      if (!stopped) {
        return;
      }

      stopped = false;
      void runOnce().finally(() => {
        scheduleNextTick();
      });
    },
    async stop(): Promise<void> {
      stopped = true;

      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
    }
  };
}
