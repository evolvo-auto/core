import { describe, expect, it } from 'vitest';

import { runCommand } from './command-runner.js';

describe('runCommand', () => {
  it('executes commands and captures stdout/stderr', async () => {
    const result = await runCommand({
      args: ['-e', "process.stdout.write('ok'); process.stderr.write('warn');"],
      command: 'node'
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('ok');
    expect(result.stderr).toBe('warn');
    expect(result.timedOut).toBe(false);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('returns non-zero exit codes without throwing', async () => {
    const result = await runCommand({
      args: ['-e', "process.stderr.write('boom'); process.exit(3);"],
      command: 'node'
    });

    expect(result.exitCode).toBe(3);
    expect(result.stderr).toBe('boom');
  });

  it('throws when a command exceeds timeoutMs', async () => {
    await expect(
      runCommand({
        args: ['-e', 'setTimeout(() => {}, 2000);'],
        command: 'node',
        timeoutMs: 20
      })
    ).rejects.toThrow('timed out after 20ms');
  });
});
