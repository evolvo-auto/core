import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import {
  appendAttemptJournalCommand,
  appendAttemptJournalNote,
  appendAttemptJournalStatusTransition,
  initializeAttemptJournal,
  readAttemptJournal
} from './attempt-journal.js';

describe('attempt journal', () => {
  const createdDirectories: string[] = [];

  afterEach(async () => {
    while (createdDirectories.length > 0) {
      const directory = createdDirectories.pop();

      if (!directory) {
        continue;
      }

      await rm(directory, {
        force: true,
        recursive: true
      });
    }
  });

  it('initializes and reads a journal with the initial status transition', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'evolvo-journal-'));
    createdDirectories.push(rootPath);
    const journalPath = join(rootPath, '.evolvo', 'attempt-journal.json');

    const createdJournal = await initializeAttemptJournal({
      attemptId: 'att_100',
      branchName: 'issue/100-journal-test',
      initialStatus: 'HYDRATING',
      initialStatusNote: 'Hydration started.',
      issueNumber: 100,
      journalPath,
      worktreeId: 'wt_100'
    });

    const loadedJournal = await readAttemptJournal(journalPath);

    expect(createdJournal).toEqual(loadedJournal);
    expect(loadedJournal.statusTransitions).toEqual([
      {
        at: loadedJournal.createdAt,
        note: 'Hydration started.',
        toStatus: 'HYDRATING'
      }
    ]);
  });

  it('appends command, note, and status transition entries', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'evolvo-journal-events-'));
    createdDirectories.push(rootPath);
    const journalPath = join(rootPath, '.evolvo', 'attempt-journal.json');

    await initializeAttemptJournal({
      attemptId: 'att_101',
      branchName: 'issue/101-journal-events',
      issueNumber: 101,
      journalPath,
      worktreeId: 'wt_101'
    });
    await appendAttemptJournalCommand({
      journalPath,
      record: {
        args: ['lint'],
        classification: 'lint',
        command: 'pnpm',
        cwd: '/repo/worktrees/issue-101',
        durationMs: 1234,
        endedAt: '2026-03-06T15:10:01.000Z',
        exitCode: 0,
        startedAt: '2026-03-06T15:09:59.766Z',
        stderr: '',
        stdout: 'ok',
        timedOut: false
      }
    });
    await appendAttemptJournalNote({
      journalPath,
      message: 'Lint finished without errors.',
      source: 'execution-engine'
    });
    const updatedJournal = await appendAttemptJournalStatusTransition({
      fromStatus: 'ACTIVE',
      journalPath,
      note: 'Builder signaled completion.',
      toStatus: 'AWAITING_EVAL'
    });

    expect(updatedJournal.commands).toHaveLength(1);
    expect(updatedJournal.commands[0]).toMatchObject({
      classification: 'lint',
      command: 'pnpm',
      exitCode: 0
    });
    expect(updatedJournal.notes).toHaveLength(1);
    expect(updatedJournal.notes[0]).toMatchObject({
      message: 'Lint finished without errors.',
      source: 'execution-engine'
    });
    expect(updatedJournal.statusTransitions.at(-1)).toMatchObject({
      fromStatus: 'ACTIVE',
      note: 'Builder signaled completion.',
      toStatus: 'AWAITING_EVAL'
    });
  });

  it('rejects invalid journal payloads during read', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'evolvo-journal-invalid-'));
    createdDirectories.push(rootPath);
    const journalPath = join(rootPath, '.evolvo', 'attempt-journal.json');

    await mkdir(join(rootPath, '.evolvo'), {
      recursive: true
    });
    await writeFile(journalPath, '{"invalid":true}\n', {
      encoding: 'utf-8'
    });

    await expect(readAttemptJournal(journalPath)).rejects.toThrow(
      `Attempt journal "${journalPath}" is invalid: missing attemptId.`
    );
  });
});
