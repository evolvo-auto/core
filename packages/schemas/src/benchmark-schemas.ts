import { z } from 'zod';

import {
  benchmarkTypeSchema,
  challengeCategorySchema
} from './shared-enums.js';

const nonEmptyStringSchema = z.string().trim().min(1);
const positiveIntegerSchema = z.number().int().positive();
const nonNegativeIntegerSchema = z.number().int().nonnegative();
const scoreSchema = z.number().min(0).max(100);
const benchmarkOutcomeSchema = z.enum([
  'passed',
  'failed',
  'partial',
  'regressed',
  'inconclusive'
]);
const challengeSourceSchema = z.enum(['human', 'evolvo']);

export const challengeDashboardItemSchema = z.object({
  capabilityTags: z.array(nonEmptyStringSchema),
  category: challengeCategorySchema,
  issueSource: challengeSourceSchema,
  sourceIssueNumber: positiveIntegerSchema,
  title: nonEmptyStringSchema
});

export const benchmarkTrendItemSchema = z.object({
  averageScore: scoreSchema.nullable(),
  benchmarkKey: nonEmptyStringSchema,
  benchmarkType: benchmarkTypeSchema,
  capabilityTags: z.array(nonEmptyStringSchema),
  isHoldout: z.boolean(),
  isRegressionPack: z.boolean(),
  lastRunAt: z.string().datetime({ offset: true }).nullable(),
  latestOutcome: benchmarkOutcomeSchema.nullable(),
  runCount: nonNegativeIntegerSchema,
  title: nonEmptyStringSchema,
  version: positiveIntegerSchema
});

export const benchmarkRunDashboardItemSchema = z.object({
  benchmarkKey: nonEmptyStringSchema,
  benchmarkType: benchmarkTypeSchema,
  benchmarkVersion: positiveIntegerSchema.nullable(),
  durationMs: nonNegativeIntegerSchema.nullable(),
  issueNumber: positiveIntegerSchema.nullable(),
  outcome: benchmarkOutcomeSchema,
  regressionCount: nonNegativeIntegerSchema,
  retryCount: nonNegativeIntegerSchema,
  score: scoreSchema.nullable(),
  startedAt: z.string().datetime({ offset: true })
});

export const benchmarkDashboardSnapshotSchema = z.object({
  challenges: z.array(challengeDashboardItemSchema),
  generatedAt: z.string().datetime({ offset: true }),
  recentRuns: z.array(benchmarkRunDashboardItemSchema),
  summary: z.object({
    activeBenchmarks: nonNegativeIntegerSchema,
    averageScore: scoreSchema.nullable(),
    challengeBenchmarks: nonNegativeIntegerSchema,
    holdoutBenchmarks: nonNegativeIntegerSchema,
    regressedRuns: nonNegativeIntegerSchema,
    regressionPacks: nonNegativeIntegerSchema,
    totalRuns: nonNegativeIntegerSchema
  }),
  trends: z.array(benchmarkTrendItemSchema)
});

export type BenchmarkDashboardSnapshot = z.infer<
  typeof benchmarkDashboardSnapshotSchema
>;
export type BenchmarkRunDashboardItem = z.infer<
  typeof benchmarkRunDashboardItemSchema
>;
export type BenchmarkTrendItem = z.infer<typeof benchmarkTrendItemSchema>;
export type ChallengeDashboardItem = z.infer<typeof challengeDashboardItemSchema>;
