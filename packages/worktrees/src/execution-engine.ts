import { updateWorktreeRecord } from '@evolvo/api/worktree-record';

import {
  appendAttemptJournalCommand,
  appendAttemptJournalNote,
  type AttemptJournalCommandRecord,
  type WorktreeCommandClassification
} from './attempt-journal.js';
import { runCommand, type CommandExecutionResult } from './command-runner.js';

export type ExecuteWorktreeCommandInput = {
  args?: string[];
  classification?: WorktreeCommandClassification;
  command: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  journalPath: string;
  throwOnNonZeroExit?: boolean;
  timeoutMs?: number;
  worktreeId: string;
};

export type ExecuteWorktreeCommandResult = {
  classification: WorktreeCommandClassification;
  result: CommandExecutionResult;
};

export type ExecuteWorktreeCommandDependencies = {
  appendCommand?: typeof appendAttemptJournalCommand;
  appendNote?: typeof appendAttemptJournalNote;
  executeCommand?: typeof runCommand;
  now?: () => Date;
  updateRecord?: typeof updateWorktreeRecord;
};

const commandClassifications = ['inspect', 'typecheck', 'lint', 'test', 'build'] as const;

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`Execution engine ${fieldName} is required.`);
  }

  return normalizedValue;
}

function resolveClassificationFromCommand(
  command: string,
  args: string[]
): WorktreeCommandClassification {
  const normalizedCommand = command.toLowerCase();
  const firstArg = args[0]?.toLowerCase();

  if (normalizedCommand === 'git') {
    if (firstArg === 'diff' || firstArg === 'status') {
      return 'inspect';
    }

    return 'custom';
  }

  if (normalizedCommand === 'pnpm' || normalizedCommand === 'npm') {
    if (firstArg === 'install' || firstArg === 'ci') {
      return 'install';
    }

    if (firstArg === 'run' && args[1]) {
      const scriptName = args[1].toLowerCase();

      if (
        commandClassifications.includes(
          scriptName as (typeof commandClassifications)[number]
        )
      ) {
        return scriptName as WorktreeCommandClassification;
      }

      if (scriptName === 'dev' || scriptName === 'start') {
        return 'run';
      }

      if (scriptName === 'smoke') {
        return 'smoke';
      }
    }

    if (firstArg === 'exec' && args[1]?.toLowerCase() === 'playwright') {
      return 'smoke';
    }
  }

  if (normalizedCommand === 'node') {
    return 'run';
  }

  return 'custom';
}

function createSyntheticFailureResult(
  input: ExecuteWorktreeCommandInput,
  startedAtMs: number,
  error: unknown
): CommandExecutionResult {
  const message =
    error instanceof Error ? error.message : 'Command failed unexpectedly.';

  return {
    args: input.args ?? [],
    command: normalizeRequiredText(input.command, 'command'),
    cwd: input.cwd ?? process.cwd(),
    durationMs: Math.max(0, Date.now() - startedAtMs),
    exitCode: -1,
    stderr: message,
    stdout: '',
    timedOut: /timed out/i.test(message)
  };
}

function buildCommandRecord(
  result: CommandExecutionResult,
  classification: WorktreeCommandClassification,
  startedAt: Date,
  endedAt: Date
): AttemptJournalCommandRecord {
  return {
    args: result.args,
    classification,
    command: result.command,
    cwd: result.cwd,
    durationMs: result.durationMs,
    endedAt: endedAt.toISOString(),
    exitCode: result.exitCode,
    startedAt: startedAt.toISOString(),
    stderr: result.stderr,
    stdout: result.stdout,
    timedOut: result.timedOut
  };
}

function assertExitCode(
  result: CommandExecutionResult,
  throwOnNonZeroExit: boolean
): void {
  if (!throwOnNonZeroExit || result.exitCode === 0) {
    return;
  }

  const outputSummary = result.stderr.trim() || result.stdout.trim() || 'No output.';

  throw new Error(
    `Command "${result.command}" failed with exit code ${result.exitCode}: ${outputSummary}`
  );
}

export async function executeWorktreeCommand(
  input: ExecuteWorktreeCommandInput,
  dependencies: ExecuteWorktreeCommandDependencies = {}
): Promise<ExecuteWorktreeCommandResult> {
  const executeCommand = dependencies.executeCommand ?? runCommand;
  const appendCommand = dependencies.appendCommand ?? appendAttemptJournalCommand;
  const appendNote = dependencies.appendNote ?? appendAttemptJournalNote;
  const updateRecord = dependencies.updateRecord ?? updateWorktreeRecord;
  const now = dependencies.now ?? (() => new Date());
  const command = normalizeRequiredText(input.command, 'command');
  const worktreeId = normalizeRequiredText(input.worktreeId, 'worktreeId');
  const journalPath = normalizeRequiredText(input.journalPath, 'journalPath');
  const args = input.args ?? [];
  const startedAt = now();
  const startedAtMs = Date.now();
  const classification =
    input.classification ?? resolveClassificationFromCommand(command, args);
  let result: CommandExecutionResult;

  try {
    result = await executeCommand({
      args,
      command,
      cwd: input.cwd,
      env: input.env,
      timeoutMs: input.timeoutMs
    });
  } catch (error) {
    result = createSyntheticFailureResult(input, startedAtMs, error);
  }

  const endedAt = now();
  const record = buildCommandRecord(result, classification, startedAt, endedAt);

  await appendCommand({
    journalPath,
    record
  });
  await updateRecord({
    id: worktreeId,
    lastCommandAt: endedAt
  });

  if (result.exitCode !== 0 || result.timedOut) {
    await appendNote({
      journalPath,
      message: `Command "${command}" finished with exit code ${result.exitCode}.`,
      source: 'execution-engine'
    });
  }

  assertExitCode(result, input.throwOnNonZeroExit ?? false);

  return {
    classification,
    result
  };
}
