import { z } from 'zod';

import {
  failureCategorySchema,
  failurePhaseSchema,
  mutationStateSchema,
  riskLevelSchema,
  surfaceSchema
} from './shared-enums.js';

const nonEmptyStringSchema = z.string().trim().min(1);
const positiveIntegerSchema = z.number().int().positive();
const nonNegativeIntegerSchema = z.number().int().nonnegative();
const scoreSchema = z.number().int().min(0).max(100);

export const failureDashboardItemSchema = z.object({
  category: failureCategorySchema,
  createdAt: z.string().datetime({ offset: true }),
  id: nonEmptyStringSchema,
  isSystemic: z.boolean(),
  issueNumber: positiveIntegerSchema,
  linkedIssueNumber: positiveIntegerSchema.nullable(),
  phase: failurePhaseSchema,
  recurrenceCount: positiveIntegerSchema,
  recurrenceGroup: nonEmptyStringSchema.nullable(),
  severity: riskLevelSchema
});

export const failureRecurrenceClusterSchema = z.object({
  category: failureCategorySchema,
  issueNumbers: z.array(positiveIntegerSchema),
  latestOccurredAt: z.string().datetime({ offset: true }),
  phase: failurePhaseSchema,
  recurrenceGroup: nonEmptyStringSchema,
  systemicCount: nonNegativeIntegerSchema,
  totalFailures: positiveIntegerSchema
});

export const mutationProposalDashboardItemSchema = z.object({
  confidenceScore: scoreSchema.nullable(),
  createdAt: z.string().datetime({ offset: true }),
  id: nonEmptyStringSchema,
  linkedIssueNumber: positiveIntegerSchema.nullable(),
  priorityScore: scoreSchema.nullable(),
  sourceIssueNumber: positiveIntegerSchema.nullable(),
  state: mutationStateSchema,
  targetSurface: surfaceSchema,
  title: nonEmptyStringSchema
});

export const capabilityDashboardItemSchema = z.object({
  attempts: nonNegativeIntegerSchema,
  capabilityKey: nonEmptyStringSchema,
  confidenceScore: scoreSchema,
  failures: nonNegativeIntegerSchema,
  lastIssueNumber: positiveIntegerSchema.nullable(),
  recurringFailureModes: z.array(nonEmptyStringSchema),
  successes: nonNegativeIntegerSchema
});

export const failureMemoryDashboardSnapshotSchema = z.object({
  capabilities: z.array(capabilityDashboardItemSchema),
  clusters: z.array(failureRecurrenceClusterSchema),
  failures: z.array(failureDashboardItemSchema),
  generatedAt: z.string().datetime({ offset: true }),
  mutations: z.array(mutationProposalDashboardItemSchema),
  summary: z.object({
    openMutationProposals: nonNegativeIntegerSchema,
    recurringClusters: nonNegativeIntegerSchema,
    totalFailures: nonNegativeIntegerSchema,
    weakCapabilities: nonNegativeIntegerSchema
  })
});

export type CapabilityDashboardItem = z.infer<typeof capabilityDashboardItemSchema>;
export type FailureDashboardItem = z.infer<typeof failureDashboardItemSchema>;
export type FailureMemoryDashboardSnapshot = z.infer<
  typeof failureMemoryDashboardSnapshotSchema
>;
export type FailureRecurrenceCluster = z.infer<
  typeof failureRecurrenceClusterSchema
>;
export type MutationProposalDashboardItem = z.infer<
  typeof mutationProposalDashboardItemSchema
>;
