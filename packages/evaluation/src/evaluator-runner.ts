import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

import { updateWorktreeRecord } from '@evolvo/api/worktree-record';
import type { CapabilityKey } from '@evolvo/core/model-routing-config';
import {
  runEvaluatorInterpreterRole,
  type EvaluatorInterpreterCheckInput
} from '@evolvo/orchestration/evaluator-interpreter-role';
import type {
  EvaluatorOutput,
  PlannerOutput
} from '@evolvo/schemas/role-output-schemas';
import {
  appendAttemptJournalCommand,
  type AttemptJournalCommandRecord
} from '@evolvo/worktrees/attempt-journal';
import { executeWorktreeCommand } from '@evolvo/worktrees/execution-engine';

import { runSmokeContract, type SmokeContract, type SmokeContractResult } from './smoke-contract.js';

export type EvaluationCheckResult = {
  args?: string[];
  command?: string;
  exitCode?: number;
  name: string;
  notes?: string;
  result: 'failed' | 'passed' | 'skipped';
  stderr?: string;
  stdout?: string;
  timedOut?: boolean;
};

export type RunEvaluationInput = {
  acceptanceCriteria?: string[];
  attemptId: string;
  builderSummary?: string;
  capability?: CapabilityKey;
  changedFiles?: string[];
  env?: NodeJS.ProcessEnv;
  evaluationPlan: PlannerOutput['evaluationPlan'];
  issueNumber: number;
  journalPath: string;
  objective?: string;
  smokeContract?: SmokeContract;
  worktreeId: string;
  worktreePath: string;
};

export type RunEvaluationResult = {
  checkResults: EvaluationCheckResult[];
  evaluatorOutput: EvaluatorOutput;
  observedFailures: string[];
  smokeResult?: SmokeContractResult;
};

type BackgroundCommandHandle = {
  args: string[];
  command: string;
  cwd: string;
  getExitCode: () => number | null;
  getStderr: () => string;
  getStdout: () => string;
  stop: () => Promise<void>;
};

export type RunEvaluationDependencies = {
  appendJournalCommand?: typeof appendAttemptJournalCommand;
  executeCommand?: typeof executeWorktreeCommand;
  fetchImpl?: typeof fetch;
  interpretEvaluation?: typeof runEvaluatorInterpreterRole;
  now?: () => Date;
  readRootPackageJson?: (worktreePath: string) => Promise<{
    scripts?: Record<string, string>;
  }>;
  runSmoke?: typeof runSmokeContract;
  startBackgroundCommand?: (input: {
    args: string[];
    command: string;
    cwd: string;
    env?: NodeJS.ProcessEnv;
  }) => Promise<BackgroundCommandHandle>;
  updateWorktree?: typeof updateWorktreeRecord;
  waitForUrl?: (input: {
    fetchImpl: typeof fetch;
    timeoutMs: number;
    url: string;
  }) => Promise<void>;
};

const installCommandArgs = ['install', '--frozen-lockfile'];
type StandardCheckName =
  | 'install'
  | 'typecheck'
  | 'lint'
  | 'tests'
  | 'build'
  | 'run'
  | 'smoke';

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`Evaluator runner ${fieldName} is required.`);
  }

  return normalizedValue;
}

function normalizeWorktreePath(worktreePath: string): string {
  return resolve(normalizeRequiredText(worktreePath, 'worktreePath'));
}

function getRootPackageJsonPath(worktreePath: string): string {
  return resolve(worktreePath, 'package.json');
}

async function defaultReadRootPackageJson(worktreePath: string): Promise<{
  scripts?: Record<string, string>;
}> {
  return JSON.parse(await readFile(getRootPackageJsonPath(worktreePath), 'utf-8')) as {
    scripts?: Record<string, string>;
  };
}

function buildCommandResult(
  name: string,
  command: string,
  args: string[],
  result: Awaited<ReturnType<typeof executeWorktreeCommand>>['result']
): EvaluationCheckResult {
  return {
    args,
    command,
    exitCode: result.exitCode,
    name,
    result: result.exitCode === 0 && !result.timedOut ? 'passed' : 'failed',
    stderr: result.stderr,
    stdout: result.stdout,
    timedOut: result.timedOut
  };
}

function buildSkippedResult(name: string, notes: string): EvaluationCheckResult {
  return {
    name,
    notes,
    result: 'skipped'
  };
}

function buildFailedRunResult(name: StandardCheckName, notes: string): EvaluationCheckResult {
  return {
    name,
    notes,
    result: 'failed'
  };
}

function buildCheckCommand(
  name: Exclude<StandardCheckName, 'run' | 'smoke'>,
  scriptName: string
): {
  args: string[];
  command: string;
} {
  if (name === 'install') {
    return {
      args: installCommandArgs,
      command: 'pnpm'
    };
  }

  return {
    args: ['run', scriptName],
    command: 'pnpm'
  };
}

function toInterpreterChecks(
  checkResults: EvaluationCheckResult[]
): EvaluatorInterpreterCheckInput[] {
  return checkResults.map((checkResult) => ({
    exitCode: checkResult.exitCode,
    name: checkResult.name,
    notes:
      checkResult.notes ??
      [
        checkResult.command ? `command=${checkResult.command}` : undefined,
        checkResult.stderr ? `stderr=${checkResult.stderr.trim().slice(0, 300)}` : undefined
      ]
        .filter((value): value is string => Boolean(value))
        .join('; '),
    result: checkResult.result
  }));
}

function collectObservedFailures(checkResults: EvaluationCheckResult[]): string[] {
  return checkResults
    .filter((checkResult) => checkResult.result === 'failed')
    .map((checkResult) => {
      const stderr = checkResult.stderr?.trim();
      const stdout = checkResult.stdout?.trim();
      const notes = checkResult.notes?.trim();

      return (
        stderr ||
        stdout ||
        notes ||
        `Evaluation check "${checkResult.name}" failed without additional output.`
      );
    });
}

async function defaultWaitForUrl(input: {
  fetchImpl: typeof fetch;
  timeoutMs: number;
  url: string;
}): Promise<void> {
  const deadline = Date.now() + input.timeoutMs;
  let lastError: string | undefined;

  while (Date.now() < deadline) {
    try {
      const response = await input.fetchImpl(input.url, {
        headers: {
          accept: '*/*'
        }
      });

      if (response.ok) {
        return;
      }

      lastError = `Received status ${response.status}.`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolvePromise) => {
      setTimeout(resolvePromise, 250);
    });
  }

  throw new Error(
    `Timed out waiting for ${input.url} to become ready.${lastError ? ` Last error: ${lastError}` : ''}`
  );
}

async function defaultStartBackgroundCommand(input: {
  args: string[];
  command: string;
  cwd: string;
  env?: NodeJS.ProcessEnv;
}): Promise<BackgroundCommandHandle> {
  const childProcess = spawn(input.command, input.args, {
    cwd: input.cwd,
    env: input.env,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let stdout = '';
  let stderr = '';
  let exitCode: number | null = null;
  let settleClosePromise:
    | Promise<void>
    | undefined;

  childProcess.stdout.on('data', (chunk: Buffer | string) => {
    stdout += chunk.toString();
  });
  childProcess.stderr.on('data', (chunk: Buffer | string) => {
    stderr += chunk.toString();
  });
  childProcess.on('close', (code) => {
    exitCode = code;
  });

  function waitForClose(): Promise<void> {
    if (exitCode !== null || childProcess.exitCode !== null) {
      return Promise.resolve();
    }

    settleClosePromise ??= new Promise((resolvePromise) => {
      childProcess.once('close', () => {
        resolvePromise();
      });
    });

    return settleClosePromise;
  }

  return {
    args: input.args,
    command: input.command,
    cwd: input.cwd,
    getExitCode: () => exitCode,
    getStderr: () => stderr,
    getStdout: () => stdout,
    async stop() {
      if (childProcess.exitCode === null && !childProcess.killed) {
        childProcess.kill('SIGTERM');
      }

      await waitForClose();
    }
  };
}

function buildBackgroundCommandRecord(
  handle: BackgroundCommandHandle,
  startedAt: Date,
  endedAt: Date
): AttemptJournalCommandRecord {
  return {
    args: handle.args,
    classification: 'run',
    command: handle.command,
    cwd: handle.cwd,
    durationMs: Math.max(0, endedAt.getTime() - startedAt.getTime()),
    endedAt: endedAt.toISOString(),
    exitCode: handle.getExitCode() ?? 0,
    startedAt: startedAt.toISOString(),
    stderr: handle.getStderr(),
    stdout: handle.getStdout(),
    timedOut: false
  };
}

async function executeNamedCheck(
  input: {
    args: string[];
    command: string;
    journalPath: string;
    name: StandardCheckName | string;
    timeoutMs?: number;
    worktreeId: string;
    worktreePath: string;
    env?: NodeJS.ProcessEnv;
  },
  executeCommand: NonNullable<RunEvaluationDependencies['executeCommand']>
): Promise<EvaluationCheckResult> {
  const executionResult = await executeCommand({
    args: input.args,
    command: input.command,
    cwd: input.worktreePath,
    env: input.env,
    journalPath: input.journalPath,
    throwOnNonZeroExit: false,
    timeoutMs: input.timeoutMs,
    worktreeId: input.worktreeId
  });

  return buildCommandResult(
    input.name,
    input.command,
    input.args,
    executionResult.result
  );
}

export async function runEvaluation(
  input: RunEvaluationInput,
  dependencies: RunEvaluationDependencies = {}
): Promise<RunEvaluationResult> {
  const appendJournalCommand =
    dependencies.appendJournalCommand ?? appendAttemptJournalCommand;
  const executeCommand =
    dependencies.executeCommand ?? executeWorktreeCommand;
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const interpretEvaluation =
    dependencies.interpretEvaluation ?? runEvaluatorInterpreterRole;
  const now = dependencies.now ?? (() => new Date());
  const readRootPackageJson =
    dependencies.readRootPackageJson ?? defaultReadRootPackageJson;
  const runSmoke = dependencies.runSmoke ?? runSmokeContract;
  const startBackgroundCommand =
    dependencies.startBackgroundCommand ?? defaultStartBackgroundCommand;
  const updateWorktree = dependencies.updateWorktree ?? updateWorktreeRecord;
  const waitForUrl = dependencies.waitForUrl ?? defaultWaitForUrl;
  const worktreePath = normalizeWorktreePath(input.worktreePath);
  const rootPackageJson = await readRootPackageJson(worktreePath);
  const availableScripts = new Set(Object.keys(rootPackageJson.scripts ?? {}));
  const checkResults: EvaluationCheckResult[] = [];
  let installFailed = false;
  let buildFailed = false;
  let smokeResult: SmokeContractResult | undefined;

  if (input.evaluationPlan.requireInstall) {
    const installResult = await executeNamedCheck(
      {
        args: installCommandArgs,
        command: 'pnpm',
        env: input.env,
        journalPath: input.journalPath,
        name: 'install',
        worktreeId: input.worktreeId,
        worktreePath
      },
      executeCommand
    );

    checkResults.push(installResult);
    installFailed = installResult.result === 'failed';
  } else {
    checkResults.push(buildSkippedResult('install', 'Install check not required.'));
  }

  const scriptChecks: Array<{
    enabled: boolean;
    name: Exclude<StandardCheckName, 'install' | 'run' | 'smoke'>;
    scriptName: string;
  }> = [
    {
      enabled: input.evaluationPlan.requireTypecheck,
      name: 'typecheck',
      scriptName: 'typecheck'
    },
    {
      enabled: input.evaluationPlan.requireLint,
      name: 'lint',
      scriptName: 'lint'
    },
    {
      enabled: input.evaluationPlan.requireTests,
      name: 'tests',
      scriptName: 'test'
    },
    {
      enabled: input.evaluationPlan.requireBuild,
      name: 'build',
      scriptName: 'build'
    }
  ];

  for (const scriptCheck of scriptChecks) {
    if (!scriptCheck.enabled) {
      checkResults.push(
        buildSkippedResult(
          scriptCheck.name,
          `${scriptCheck.name} check not required.`
        )
      );
      continue;
    }

    if (installFailed) {
      checkResults.push(
        buildSkippedResult(
          scriptCheck.name,
          `Skipped because the install check failed earlier.`
        )
      );
      continue;
    }

    if (!availableScripts.has(scriptCheck.scriptName)) {
      checkResults.push(
        buildSkippedResult(
          scriptCheck.name,
          `Root package.json does not define a "${scriptCheck.scriptName}" script.`
        )
      );
      continue;
    }

    const executionResult = await executeNamedCheck(
      {
        ...buildCheckCommand(scriptCheck.name, scriptCheck.scriptName),
        env: input.env,
        journalPath: input.journalPath,
        name: scriptCheck.name,
        timeoutMs: scriptCheck.name === 'tests' ? 300_000 : undefined,
        worktreeId: input.worktreeId,
        worktreePath
      },
      executeCommand
    );

    checkResults.push(executionResult);

    if (scriptCheck.name === 'build' && executionResult.result === 'failed') {
      buildFailed = true;
    }
  }

  for (const extraCheckName of input.evaluationPlan.extraChecks) {
    const normalizedExtraCheckName = extraCheckName.trim();

    if (!normalizedExtraCheckName) {
      continue;
    }

    if (installFailed) {
      checkResults.push(
        buildSkippedResult(
          normalizedExtraCheckName,
          'Skipped because the install check failed earlier.'
        )
      );
      continue;
    }

    if (!availableScripts.has(normalizedExtraCheckName)) {
      checkResults.push(
        buildSkippedResult(
          normalizedExtraCheckName,
          `Root package.json does not define a "${normalizedExtraCheckName}" script.`
        )
      );
      continue;
    }

    checkResults.push(
      await executeNamedCheck(
        {
          args: ['run', normalizedExtraCheckName],
          command: 'pnpm',
          env: input.env,
          journalPath: input.journalPath,
          name: normalizedExtraCheckName,
          worktreeId: input.worktreeId,
          worktreePath
        },
        executeCommand
      )
    );
  }

  if (input.evaluationPlan.requireRun || input.evaluationPlan.requireSmoke) {
    if (!input.smokeContract?.startupCommand) {
      const failedRunResult = buildFailedRunResult(
        'run',
        'A smoke contract startupCommand is required for run/smoke evaluation.'
      );

      checkResults.push(failedRunResult);

      if (input.evaluationPlan.requireSmoke) {
        checkResults.push(
          buildSkippedResult(
            'smoke',
            'Skipped because no startup command was provided.'
          )
        );
      } else {
        checkResults.push(
          buildSkippedResult('smoke', 'Smoke check not required.')
        );
      }
    } else if (buildFailed && input.evaluationPlan.requireBuild) {
      checkResults.push(
        buildSkippedResult(
          'run',
          'Skipped because the build check failed earlier.'
        )
      );
      checkResults.push(
        buildSkippedResult(
          'smoke',
          'Skipped because the build check failed earlier.'
        )
      );
    } else {
      const startupCommand = input.smokeContract.startupCommand;
      const startedAt = now();
      const handle = await startBackgroundCommand({
        args: startupCommand.args ?? [],
        command: startupCommand.command,
        cwd: resolve(worktreePath, startupCommand.cwd?.trim() || '.'),
        env: input.env
      });
      const readyUrl = new URL(
        startupCommand.readyPath?.trim() || '/api/health',
        `${input.smokeContract.baseUrl.replace(/\/+$/, '')}/`
      ).toString();

      try {
        await waitForUrl({
          fetchImpl,
          timeoutMs: startupCommand.startupTimeoutMs ?? 30_000,
          url: readyUrl
        });

        checkResults.push({
          args: handle.args,
          command: handle.command,
          exitCode: 0,
          name: 'run',
          notes: `Service became ready at ${readyUrl}.`,
          result: 'passed',
          stderr: handle.getStderr(),
          stdout: handle.getStdout()
        });

        if (input.evaluationPlan.requireSmoke) {
          smokeResult = await runSmoke(input.smokeContract, {
            fetchImpl
          });
          checkResults.push({
            name: 'smoke',
            notes: smokeResult.notes.join(' '),
            result: smokeResult.passed ? 'passed' : 'failed'
          });
        } else {
          checkResults.push(
            buildSkippedResult('smoke', 'Smoke check not required.')
          );
        }
      } catch (error) {
        checkResults.push({
          args: handle.args,
          command: handle.command,
          exitCode: handle.getExitCode() ?? 1,
          name: 'run',
          notes: error instanceof Error ? error.message : String(error),
          result: 'failed',
          stderr: handle.getStderr(),
          stdout: handle.getStdout()
        });
        checkResults.push(
          buildSkippedResult(
            'smoke',
            'Skipped because the run check failed before smoke execution.'
          )
        );
      } finally {
        await handle.stop();

        const endedAt = now();

        await appendJournalCommand({
          journalPath: input.journalPath,
          record: buildBackgroundCommandRecord(handle, startedAt, endedAt)
        });
        await updateWorktree({
          id: input.worktreeId,
          lastCommandAt: endedAt
        });
      }
    }
  } else {
    checkResults.push(buildSkippedResult('run', 'Run check not required.'));
    checkResults.push(buildSkippedResult('smoke', 'Smoke check not required.'));
  }

  const observedFailures = collectObservedFailures(checkResults);
  const evaluatorOutput = await interpretEvaluation({
    acceptanceCriteria: input.acceptanceCriteria,
    attemptId: input.attemptId,
    builderSummary: input.builderSummary,
    capability: input.capability,
    changedFiles: input.changedFiles,
    checks: toInterpreterChecks(checkResults),
    issueNumber: input.issueNumber,
    objective: input.objective,
    observedFailures
  });

  return {
    checkResults,
    evaluatorOutput,
    observedFailures,
    smokeResult
  };
}
