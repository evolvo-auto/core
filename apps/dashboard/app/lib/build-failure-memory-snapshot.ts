import 'server-only';

import { listCapabilityRecords } from '@evolvo/api/capability-record';
import { listFailureRecords } from '@evolvo/api/failure-record';
import { listMutationProposals } from '@evolvo/api/mutation-proposal';
import { clusterFailureRecords } from '@evolvo/memory/recurrence-clustering';
import {
  failureMemoryDashboardSnapshotSchema,
  type CapabilityDashboardItem,
  type FailureDashboardItem,
  type FailureMemoryDashboardSnapshot,
  type MutationProposalDashboardItem
} from '@evolvo/schemas/failure-memory-schemas';

import { loadDashboardEnv } from '../../env';

loadDashboardEnv();

export type BuildFailureMemorySnapshotOptions = {
  listCapabilities?: typeof listCapabilityRecords;
  listFailures?: typeof listFailureRecords;
  listMutations?: typeof listMutationProposals;
  now?: Date;
};

function toSharedEnum(value: string): string {
  return value.toLowerCase().replace(/_/g, '-');
}

function buildFailureItems(
  failures: Awaited<ReturnType<typeof listFailureRecords>>
): FailureDashboardItem[] {
  return failures.map((failure) => ({
    category: toSharedEnum(failure.category) as FailureDashboardItem['category'],
    createdAt: failure.createdAt.toISOString(),
    id: failure.id,
    isSystemic: failure.isSystemic,
    issueNumber: failure.issueNumber,
    linkedIssueNumber: failure.linkedIssueNumber ?? null,
    phase: toSharedEnum(failure.phase) as FailureDashboardItem['phase'],
    recurrenceCount: failure.recurrenceCount,
    recurrenceGroup: failure.recurrenceGroup ?? null,
    severity: toSharedEnum(failure.severity) as FailureDashboardItem['severity']
  }));
}

function buildMutationItems(
  mutations: Awaited<ReturnType<typeof listMutationProposals>>
): MutationProposalDashboardItem[] {
  return mutations.map((mutation) => ({
    confidenceScore: mutation.confidenceScore ?? null,
    createdAt: mutation.createdAt.toISOString(),
    id: mutation.id,
    linkedIssueNumber: mutation.linkedIssueNumber ?? null,
    priorityScore: mutation.priorityScore ?? null,
    sourceIssueNumber: mutation.sourceIssueNumber ?? null,
    state: toSharedEnum(mutation.state) as MutationProposalDashboardItem['state'],
    targetSurface: toSharedEnum(
      mutation.targetSurface
    ) as MutationProposalDashboardItem['targetSurface'],
    title: mutation.title
  }));
}

function buildCapabilityItems(
  capabilities: Awaited<ReturnType<typeof listCapabilityRecords>>
): CapabilityDashboardItem[] {
  return capabilities.map((capability) => ({
    attempts: capability.attempts,
    capabilityKey: capability.capabilityKey,
    confidenceScore: capability.confidenceScore,
    failures: capability.failures,
    lastIssueNumber: capability.lastIssueNumber ?? null,
    recurringFailureModes:
      Array.isArray(capability.recurringFailureModes)
        ? capability.recurringFailureModes
            .filter((mode): mode is string => typeof mode === 'string')
            .slice(0, 5)
        : [],
    successes: capability.successes
  }));
}

function buildSummary(
  snapshot: Pick<
    FailureMemoryDashboardSnapshot,
    'capabilities' | 'clusters' | 'failures' | 'mutations'
  >
): FailureMemoryDashboardSnapshot['summary'] {
  return {
    openMutationProposals: snapshot.mutations.filter((mutation) =>
      ['proposed', 'selected', 'in-progress', 'validated'].includes(
        mutation.state
      )
    ).length,
    recurringClusters: snapshot.clusters.length,
    totalFailures: snapshot.failures.length,
    weakCapabilities: snapshot.capabilities.filter(
      (capability) => capability.confidenceScore < 50
    ).length
  };
}

export async function buildFailureMemorySnapshot(
  options: BuildFailureMemorySnapshotOptions = {}
): Promise<FailureMemoryDashboardSnapshot> {
  const listCapabilities = options.listCapabilities ?? listCapabilityRecords;
  const listFailures = options.listFailures ?? listFailureRecords;
  const listMutations = options.listMutations ?? listMutationProposals;
  const now = options.now ?? new Date();
  const failures = await listFailures({
    limit: 50
  });
  const failureItems = buildFailureItems(failures);
  const capabilityItems = buildCapabilityItems(
    await listCapabilities({
      limit: 20
    })
  );
  const mutationItems = buildMutationItems(
    await listMutations({
      limit: 20
    })
  );
  const clusters = clusterFailureRecords(
    failureItems.map((failure) => ({
      category: failure.category,
      createdAt: failure.createdAt,
      id: failure.id,
      isSystemic: failure.isSystemic,
      issueNumber: failure.issueNumber,
      phase: failure.phase,
      recurrenceGroup: failure.recurrenceGroup,
      severity: failure.severity
    }))
  );

  return failureMemoryDashboardSnapshotSchema.parse({
    capabilities: capabilityItems,
    clusters,
    failures: failureItems,
    generatedAt: now.toISOString(),
    mutations: mutationItems,
    summary: buildSummary({
      capabilities: capabilityItems,
      clusters,
      failures: failureItems,
      mutations: mutationItems
    })
  });
}
