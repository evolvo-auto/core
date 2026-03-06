import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export type WorktreeCommandClassification =
  | 'inspect'
  | 'install'
  | 'typecheck'
  | 'lint'
  | 'test'
  | 'build'
  | 'run'
  | 'smoke'
  | 'debug'
  | 'custom';

export type WorktreeLifecycleStatus =
  | 'RESERVED'
  | 'CREATING'
  | 'READY'
  | 'HYDRATING'
  | 'ACTIVE'
  | 'AWAITING_EVAL'
  | 'COMPLETED'
  | 'FAILED'
  | 'ARCHIVED'
  | 'CLEANED';

export type AttemptJournalStatusTransition = {
  at: string;
  fromStatus?: WorktreeLifecycleStatus;
  note?: string;
  toStatus: WorktreeLifecycleStatus;
};

export type AttemptJournalNote = {
  at: string;
  message: string;
  source?: string;
};

export type AttemptJournalCommandRecord = {
  args: string[];
  classification: WorktreeCommandClassification;
  command: string;
  cwd: string;
  durationMs: number;
  endedAt: string;
  exitCode: number;
  startedAt: string;
  stderr: string;
  stdout: string;
  timedOut: boolean;
};

export type AttemptJournal = {
  attemptId: string;
  branchName: string;
  commands: AttemptJournalCommandRecord[];
  createdAt: string;
  issueNumber: number;
  notes: AttemptJournalNote[];
  statusTransitions: AttemptJournalStatusTransition[];
  updatedAt: string;
  worktreeId: string;
};

export type InitializeAttemptJournalInput = {
  attemptId: string;
  branchName: string;
  createdAt?: Date;
  initialStatus?: WorktreeLifecycleStatus;
  initialStatusNote?: string;
  issueNumber: number;
  journalPath: string;
  worktreeId: string;
};

export type AppendAttemptJournalNoteInput = {
  at?: Date;
  journalPath: string;
  message: string;
  source?: string;
};

export type AppendAttemptJournalStatusTransitionInput = {
  at?: Date;
  fromStatus?: WorktreeLifecycleStatus;
  journalPath: string;
  note?: string;
  toStatus: WorktreeLifecycleStatus;
};

export type AppendAttemptJournalCommandInput = {
  journalPath: string;
  record: AttemptJournalCommandRecord;
};

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`Attempt journal ${fieldName} is required.`);
  }

  return normalizedValue;
}

function normalizeIssueNumber(issueNumber: number): number {
  if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
    throw new Error('Attempt journal issueNumber must be a positive integer.');
  }

  return issueNumber;
}

function normalizeDate(date: Date | undefined): string {
  return (date ?? new Date()).toISOString();
}

function normalizeAttemptJournalPath(journalPath: string): string {
  return resolve(normalizeRequiredText(journalPath, 'journalPath'));
}

async function writeAttemptJournal(
  journalPath: string,
  journal: AttemptJournal
): Promise<void> {
  const normalizedPath = normalizeAttemptJournalPath(journalPath);

  await mkdir(dirname(normalizedPath), {
    recursive: true
  });
  await writeFile(normalizedPath, `${JSON.stringify(journal, null, 2)}\n`, {
    encoding: 'utf-8'
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseAttemptJournal(raw: string, journalPath: string): AttemptJournal {
  const parsedValue: unknown = JSON.parse(raw);

  if (!isRecord(parsedValue)) {
    throw new Error(
      `Attempt journal "${journalPath}" is invalid: expected an object payload.`
    );
  }

  const attemptId = parsedValue.attemptId;
  const branchName = parsedValue.branchName;
  const commands = parsedValue.commands;
  const createdAt = parsedValue.createdAt;
  const issueNumber = parsedValue.issueNumber;
  const notes = parsedValue.notes;
  const statusTransitions = parsedValue.statusTransitions;
  const updatedAt = parsedValue.updatedAt;
  const worktreeId = parsedValue.worktreeId;

  if (typeof attemptId !== 'string' || !attemptId.trim()) {
    throw new Error(
      `Attempt journal "${journalPath}" is invalid: missing attemptId.`
    );
  }

  if (typeof branchName !== 'string' || !branchName.trim()) {
    throw new Error(
      `Attempt journal "${journalPath}" is invalid: missing branchName.`
    );
  }

  if (typeof createdAt !== 'string' || !createdAt.trim()) {
    throw new Error(
      `Attempt journal "${journalPath}" is invalid: missing createdAt.`
    );
  }

  if (typeof issueNumber !== 'number' || !Number.isInteger(issueNumber) || issueNumber <= 0) {
    throw new Error(
      `Attempt journal "${journalPath}" is invalid: missing issueNumber.`
    );
  }

  if (!Array.isArray(commands)) {
    throw new Error(
      `Attempt journal "${journalPath}" is invalid: commands must be an array.`
    );
  }

  if (!Array.isArray(notes)) {
    throw new Error(
      `Attempt journal "${journalPath}" is invalid: notes must be an array.`
    );
  }

  if (!Array.isArray(statusTransitions)) {
    throw new Error(
      `Attempt journal "${journalPath}" is invalid: statusTransitions must be an array.`
    );
  }

  if (typeof updatedAt !== 'string' || !updatedAt.trim()) {
    throw new Error(
      `Attempt journal "${journalPath}" is invalid: missing updatedAt.`
    );
  }

  if (typeof worktreeId !== 'string' || !worktreeId.trim()) {
    throw new Error(
      `Attempt journal "${journalPath}" is invalid: missing worktreeId.`
    );
  }

  return parsedValue as AttemptJournal;
}

async function readAndUpdateAttemptJournal(
  journalPath: string,
  updater: (journal: AttemptJournal) => AttemptJournal
): Promise<AttemptJournal> {
  const normalizedPath = normalizeAttemptJournalPath(journalPath);
  const currentJournal = parseAttemptJournal(
    await readFile(normalizedPath, 'utf-8'),
    normalizedPath
  );
  const updatedJournal = updater(currentJournal);

  await writeAttemptJournal(normalizedPath, updatedJournal);

  return updatedJournal;
}

export async function initializeAttemptJournal(
  input: InitializeAttemptJournalInput
): Promise<AttemptJournal> {
  const createdAt = normalizeDate(input.createdAt);
  const initialStatus = input.initialStatus ?? 'HYDRATING';
  const initialStatusNote = input.initialStatusNote?.trim();
  const statusTransitions: AttemptJournalStatusTransition[] = [
    {
      at: createdAt,
      note: initialStatusNote || undefined,
      toStatus: initialStatus
    }
  ];
  const journal: AttemptJournal = {
    attemptId: normalizeRequiredText(input.attemptId, 'attemptId'),
    branchName: normalizeRequiredText(input.branchName, 'branchName'),
    commands: [],
    createdAt,
    issueNumber: normalizeIssueNumber(input.issueNumber),
    notes: [],
    statusTransitions,
    updatedAt: createdAt,
    worktreeId: normalizeRequiredText(input.worktreeId, 'worktreeId')
  };

  await writeAttemptJournal(input.journalPath, journal);

  return journal;
}

export async function readAttemptJournal(
  journalPath: string
): Promise<AttemptJournal> {
  const normalizedPath = normalizeAttemptJournalPath(journalPath);

  return parseAttemptJournal(await readFile(normalizedPath, 'utf-8'), normalizedPath);
}

export async function appendAttemptJournalNote(
  input: AppendAttemptJournalNoteInput
): Promise<AttemptJournal> {
  const message = normalizeRequiredText(input.message, 'message');

  return readAndUpdateAttemptJournal(input.journalPath, (journal) => {
    const at = normalizeDate(input.at);

    return {
      ...journal,
      notes: [
        ...journal.notes,
        {
          at,
          message,
          source: input.source?.trim() || undefined
        }
      ],
      updatedAt: at
    };
  });
}

export async function appendAttemptJournalStatusTransition(
  input: AppendAttemptJournalStatusTransitionInput
): Promise<AttemptJournal> {
  return readAndUpdateAttemptJournal(input.journalPath, (journal) => {
    const at = normalizeDate(input.at);

    return {
      ...journal,
      statusTransitions: [
        ...journal.statusTransitions,
        {
          at,
          fromStatus: input.fromStatus,
          note: input.note?.trim() || undefined,
          toStatus: input.toStatus
        }
      ],
      updatedAt: at
    };
  });
}

export async function appendAttemptJournalCommand(
  input: AppendAttemptJournalCommandInput
): Promise<AttemptJournal> {
  return readAndUpdateAttemptJournal(input.journalPath, (journal) => ({
    ...journal,
    commands: [...journal.commands, input.record],
    updatedAt: input.record.endedAt
  }));
}
