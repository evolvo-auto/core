import type { Outcome } from '@evolvo/schemas/shared-enums';

export type CapabilitySnapshot = {
  attempts: number;
  capabilityKey: string;
  confidenceScore: number;
  failures: number;
  lastIssueNumber: number | null;
  recurringFailureModes: string[];
  successes: number;
};

export type BuildCapabilitySnapshotInput = {
  capabilityKey: string;
  existing?: Partial<CapabilitySnapshot>;
  issueNumber?: number;
  outcome: Outcome;
  recurrenceGroup?: string | null;
};

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

function uniqueModes(modes: string[]): string[] {
  const seenModes = new Set<string>();
  const normalizedModes: string[] = [];

  for (const mode of modes) {
    const normalizedMode = mode.trim();

    if (!normalizedMode || seenModes.has(normalizedMode)) {
      continue;
    }

    seenModes.add(normalizedMode);
    normalizedModes.push(normalizedMode);
  }

  return normalizedModes.slice(0, 5);
}

function resolveConfidenceDelta(outcome: Outcome): number {
  switch (outcome) {
    case 'success':
      return 6;
    case 'partial':
      return 2;
    case 'failure':
      return -8;
    case 'blocked':
      return -10;
    case 'inconclusive':
    default:
      return -4;
  }
}

export function buildCapabilitySnapshot(
  input: BuildCapabilitySnapshotInput
): CapabilitySnapshot {
  const existing = input.existing ?? {};
  const failures =
    (existing.failures ?? 0) +
    (input.outcome === 'failure' || input.outcome === 'blocked' ? 1 : 0);
  const successes =
    (existing.successes ?? 0) +
    (input.outcome === 'success' || input.outcome === 'partial' ? 1 : 0);
  const recurringFailureModes = uniqueModes([
    ...(input.recurrenceGroup ? [input.recurrenceGroup] : []),
    ...(existing.recurringFailureModes ?? [])
  ]);

  return {
    attempts: (existing.attempts ?? 0) + 1,
    capabilityKey: input.capabilityKey.trim(),
    confidenceScore: clampScore(
      (existing.confidenceScore ?? 50) + resolveConfidenceDelta(input.outcome)
    ),
    failures,
    lastIssueNumber: input.issueNumber ?? existing.lastIssueNumber ?? null,
    recurringFailureModes,
    successes
  };
}
