import { describe, expect, it, vi } from 'vitest';

import { executeWorktreeCommand } from './execution-engine.js';

describe('executeWorktreeCommand', () => {
  it('executes a command, classifies it, appends to the journal, and updates lastCommandAt', async () => {
    const appendCommand = vi.fn().mockResolvedValue(undefined);
    const appendNote = vi.fn().mockResolvedValue(undefined);
    const executeCommand = vi.fn().mockResolvedValue({
      args: ['run', 'test'],
      command: 'pnpm',
      cwd: '/repo/worktrees/issue-400',
      durationMs: 1200,
      exitCode: 0,
      stderr: '',
      stdout: 'ok',
      timedOut: false
    });
    const now = vi
      .fn()
      .mockReturnValueOnce(new Date('2026-03-06T15:15:00.000Z'))
      .mockReturnValueOnce(new Date('2026-03-06T15:15:01.200Z'));
    const updateRecord = vi.fn().mockResolvedValue({
      id: 'wt_400'
    });

    const result = await executeWorktreeCommand(
      {
        args: ['run', 'test'],
        command: 'pnpm',
        cwd: '/repo/worktrees/issue-400',
        journalPath: '/repo/worktrees/issue-400/.evolvo/attempt-journal.json',
        worktreeId: 'wt_400'
      },
      {
        appendCommand,
        appendNote,
        executeCommand,
        now,
        updateRecord
      }
    );

    expect(result.classification).toBe('test');
    expect(appendCommand).toHaveBeenCalledWith({
      journalPath: '/repo/worktrees/issue-400/.evolvo/attempt-journal.json',
      record: {
        args: ['run', 'test'],
        classification: 'test',
        command: 'pnpm',
        cwd: '/repo/worktrees/issue-400',
        durationMs: 1200,
        endedAt: '2026-03-06T15:15:01.200Z',
        exitCode: 0,
        startedAt: '2026-03-06T15:15:00.000Z',
        stderr: '',
        stdout: 'ok',
        timedOut: false
      }
    });
    expect(updateRecord).toHaveBeenCalledWith({
      id: 'wt_400',
      lastCommandAt: new Date('2026-03-06T15:15:01.200Z')
    });
    expect(appendNote).not.toHaveBeenCalled();
  });

  it('records synthetic failures and writes failure notes when command execution throws', async () => {
    const appendCommand = vi.fn().mockResolvedValue(undefined);
    const appendNote = vi.fn().mockResolvedValue(undefined);
    const executeCommand = vi
      .fn()
      .mockRejectedValue(new Error('Command "pnpm" timed out after 20ms.'));
    const updateRecord = vi.fn().mockResolvedValue({
      id: 'wt_401'
    });
    const now = vi
      .fn()
      .mockReturnValueOnce(new Date('2026-03-06T15:16:00.000Z'))
      .mockReturnValueOnce(new Date('2026-03-06T15:16:00.020Z'));

    const result = await executeWorktreeCommand(
      {
        args: ['install'],
        command: 'pnpm',
        cwd: '/repo/worktrees/issue-401',
        journalPath: '/repo/worktrees/issue-401/.evolvo/attempt-journal.json',
        timeoutMs: 20,
        worktreeId: 'wt_401'
      },
      {
        appendCommand,
        appendNote,
        executeCommand,
        now,
        updateRecord
      }
    );

    expect(result.result.exitCode).toBe(-1);
    expect(result.result.timedOut).toBe(true);
    expect(result.result.stderr).toContain('timed out after 20ms');
    expect(appendNote).toHaveBeenCalledWith({
      journalPath: '/repo/worktrees/issue-401/.evolvo/attempt-journal.json',
      message: 'Command "pnpm" finished with exit code -1.',
      source: 'execution-engine'
    });
  });

  it('throws for non-zero exits when configured', async () => {
    const appendCommand = vi.fn().mockResolvedValue(undefined);
    const appendNote = vi.fn().mockResolvedValue(undefined);
    const executeCommand = vi.fn().mockResolvedValue({
      args: ['run', 'lint'],
      command: 'pnpm',
      cwd: '/repo/worktrees/issue-402',
      durationMs: 100,
      exitCode: 2,
      stderr: 'lint failed',
      stdout: '',
      timedOut: false
    });
    const updateRecord = vi.fn().mockResolvedValue({
      id: 'wt_402'
    });

    await expect(
      executeWorktreeCommand(
        {
          args: ['run', 'lint'],
          command: 'pnpm',
          journalPath: '/repo/worktrees/issue-402/.evolvo/attempt-journal.json',
          throwOnNonZeroExit: true,
          worktreeId: 'wt_402'
        },
        {
          appendCommand,
          appendNote,
          executeCommand,
          updateRecord
        }
      )
    ).rejects.toThrow(
      'Command "pnpm" failed with exit code 2: lint failed'
    );

    expect(appendCommand).toHaveBeenCalledTimes(1);
    expect(appendNote).toHaveBeenCalledTimes(1);
  });
});
