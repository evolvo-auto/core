import type {
  FailureCategory,
  FailurePhase,
  RiskLevel
} from '@evolvo/schemas/shared-enums';

export type FailureClusterRecord = {
  category: FailureCategory;
  createdAt: string;
  id: string;
  isSystemic: boolean;
  issueNumber: number;
  phase: FailurePhase;
  recurrenceGroup?: string | null;
  severity: RiskLevel;
};

export type FailureRecurrenceCluster = {
  category: FailureCategory;
  issueNumbers: number[];
  latestOccurredAt: string;
  phase: FailurePhase;
  recurrenceGroup: string;
  systemicCount: number;
  totalFailures: number;
};

export type BuildRecurrenceGroupInput = {
  capabilityKey?: string;
  category: FailureCategory;
  likelyRootCauses?: string[];
  phase: FailurePhase;
  symptom: string;
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeRootCauseHint(
  likelyRootCauses: string[] | undefined,
  symptom: string
): string {
  const sourceText = [...(likelyRootCauses ?? []), symptom]
    .map((value) => value.trim())
    .find((value) => value.length > 0);

  if (!sourceText) {
    return 'unknown-signal';
  }

  const slug = slugify(sourceText.split(/\s+/).slice(0, 5).join(' '));

  return slug || 'unknown-signal';
}

export function buildFailureRecurrenceGroup(
  input: BuildRecurrenceGroupInput
): string {
  const parts = [
    slugify(input.category),
    slugify(input.phase),
    input.capabilityKey ? slugify(input.capabilityKey) : undefined,
    normalizeRootCauseHint(input.likelyRootCauses, input.symptom)
  ].filter((value): value is string => Boolean(value));

  return parts.join('/');
}

export function clusterFailureRecords(
  records: FailureClusterRecord[]
): FailureRecurrenceCluster[] {
  const clusterMap = new Map<string, FailureRecurrenceCluster>();

  for (const record of records) {
    const recurrenceGroup =
      record.recurrenceGroup?.trim() ||
      buildFailureRecurrenceGroup({
        category: record.category,
        phase: record.phase,
        symptom: record.id
      });
    const existingCluster = clusterMap.get(recurrenceGroup);

    if (!existingCluster) {
      clusterMap.set(recurrenceGroup, {
        category: record.category,
        issueNumbers: [record.issueNumber],
        latestOccurredAt: record.createdAt,
        phase: record.phase,
        recurrenceGroup,
        systemicCount: record.isSystemic ? 1 : 0,
        totalFailures: 1
      });
      continue;
    }

    existingCluster.totalFailures += 1;

    if (record.isSystemic) {
      existingCluster.systemicCount += 1;
    }

    if (!existingCluster.issueNumbers.includes(record.issueNumber)) {
      existingCluster.issueNumbers.push(record.issueNumber);
    }

    if (record.createdAt > existingCluster.latestOccurredAt) {
      existingCluster.latestOccurredAt = record.createdAt;
    }
  }

  return [...clusterMap.values()].sort((left, right) => {
    if (right.totalFailures !== left.totalFailures) {
      return right.totalFailures - left.totalFailures;
    }

    return right.latestOccurredAt.localeCompare(left.latestOccurredAt);
  });
}
