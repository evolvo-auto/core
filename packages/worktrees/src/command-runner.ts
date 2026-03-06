import { spawn } from 'node:child_process';

export type CommandExecutionInput = {
  args?: string[];
  command: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
};

export type CommandExecutionResult = {
  args: string[];
  command: string;
  cwd: string;
  durationMs: number;
  exitCode: number;
  stderr: string;
  stdout: string;
  timedOut: boolean;
};

function normalizeCommand(command: string): string {
  const normalizedCommand = command.trim();

  if (!normalizedCommand) {
    throw new Error('Command is required.');
  }

  return normalizedCommand;
}

function normalizeTimeout(timeoutMs: number | undefined): number | undefined {
  if (timeoutMs === undefined) {
    return undefined;
  }

  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('Command timeoutMs must be a positive integer.');
  }

  return timeoutMs;
}

export async function runCommand(
  input: CommandExecutionInput
): Promise<CommandExecutionResult> {
  const command = normalizeCommand(input.command);
  const args = input.args ?? [];
  const cwd = input.cwd ?? process.cwd();
  const timeoutMs = normalizeTimeout(input.timeoutMs);
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const childProcess = spawn(command, args, {
      cwd,
      env: input.env ?? process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let settled = false;
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let timeoutHandle: NodeJS.Timeout | undefined;

    const finalize = <T>(callback: (value: T) => void, value: T) => {
      if (settled) {
        return;
      }

      settled = true;

      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      callback(value);
    };

    childProcess.stdout.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    childProcess.stderr.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    childProcess.once('error', (error) => {
      finalize(reject, error);
    });

    childProcess.once('close', (exitCode) => {
      if (timedOut) {
        finalize(
          reject,
          new Error(`Command "${command}" timed out after ${timeoutMs}ms.`)
        );

        return;
      }

      finalize(resolve, {
        args,
        command,
        cwd,
        durationMs: Date.now() - startedAt,
        exitCode: exitCode ?? -1,
        stderr,
        stdout,
        timedOut: false
      });
    });

    if (timeoutMs !== undefined) {
      timeoutHandle = setTimeout(() => {
        timedOut = true;
        childProcess.kill('SIGTERM');

        setTimeout(() => {
          if (!childProcess.killed) {
            childProcess.kill('SIGKILL');
          }
        }, 1000);
      }, timeoutMs);
    }
  });
}
