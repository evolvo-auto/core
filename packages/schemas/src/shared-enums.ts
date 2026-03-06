import { z } from 'zod';

export const riskLevels = ['low', 'medium', 'high', 'systemic'] as const;
export const riskLevelSchema = z.enum(riskLevels);
export type RiskLevel = z.infer<typeof riskLevelSchema>;

export const issueKinds = [
  'idea',
  'challenge',
  'feature',
  'bug',
  'experiment',
  'failure',
  'mutation',
  'upgrade',
  'benchmark',
  'approval-request'
] as const;
export const issueKindSchema = z.enum(issueKinds);
export type IssueKind = z.infer<typeof issueKindSchema>;

export const outcomes = [
  'success',
  'partial',
  'failure',
  'blocked',
  'inconclusive'
] as const;
export const outcomeSchema = z.enum(outcomes);
export type Outcome = z.infer<typeof outcomeSchema>;

export const surfaces = [
  'prompts',
  'templates',
  'routing',
  'runtime',
  'evaluator',
  'benchmarks',
  'memory',
  'worktrees',
  'supervisor',
  'dashboard',
  'github-ops',
  'external-repo'
] as const;
export const surfaceSchema = z.enum(surfaces);
export type Surface = z.infer<typeof surfaceSchema>;
