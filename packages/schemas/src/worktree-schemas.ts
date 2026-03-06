import { z } from 'zod';

const positiveIntegerSchema = z.number().int().positive();
const nonNegativeIntegerSchema = z.number().int().nonnegative();

export const worktreeStatusSchema = z.enum([
  'RESERVED',
  'CREATING',
  'READY',
  'HYDRATING',
  'ACTIVE',
  'AWAITING_EVAL',
  'COMPLETED',
  'FAILED',
  'ARCHIVED',
  'CLEANED'
]);

export const worktreeDashboardBucketSchema = z.enum([
  'active',
  'failed',
  'completed'
]);

export const worktreeDashboardItemSchema = z.object({
  attemptCount: nonNegativeIntegerSchema,
  branchName: z.string().trim().min(1),
  bucket: worktreeDashboardBucketSchema,
  issueNumber: positiveIntegerSchema,
  linkedPullRequestNumber: positiveIntegerSchema.nullable(),
  status: worktreeStatusSchema,
  updatedAt: z.string().datetime({ offset: true }),
  worktreeId: z.string().trim().min(1)
});

export const worktreeDashboardSnapshotSchema = z.object({
  generatedAt: z.string().datetime({ offset: true }),
  summary: z.object({
    active: nonNegativeIntegerSchema,
    completed: nonNegativeIntegerSchema,
    failed: nonNegativeIntegerSchema,
    total: nonNegativeIntegerSchema
  }),
  worktrees: z.array(worktreeDashboardItemSchema)
});

export type WorktreeDashboardBucket = z.infer<
  typeof worktreeDashboardBucketSchema
>;
export type WorktreeDashboardItem = z.infer<typeof worktreeDashboardItemSchema>;
export type WorktreeDashboardSnapshot = z.infer<
  typeof worktreeDashboardSnapshotSchema
>;
export type WorktreeStatus = z.infer<typeof worktreeStatusSchema>;
