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

export const failurePhases = [
  'planning',
  'implementation',
  'environment',
  'evaluation',
  'promotion',
  'runtime'
] as const;
export const failurePhaseSchema = z.enum(failurePhases);
export type FailurePhase = z.infer<typeof failurePhaseSchema>;

export const failureCategories = [
  'planning-failure',
  'requirement-misunderstanding',
  'code-generation-defect',
  'environment-setup-failure',
  'dependency-configuration-issue',
  'runtime-failure',
  'smoke-e2e-failure',
  'evaluator-mismatch',
  'model-quality-issue',
  'mutation-regression',
  'benchmark-integrity-issue'
] as const;
export const failureCategorySchema = z.enum(failureCategories);
export type FailureCategory = z.infer<typeof failureCategorySchema>;

export const challengeCategories = [
  'general',
  'feature-implementation',
  'bug-fixing',
  'refactor',
  'test-generation',
  'fresh-repo-generation',
  'ci-setup',
  'runtime-upgrade-stability',
  'prompt-mutation-impact',
  'model-routing-quality'
] as const;
export const challengeCategorySchema = z.enum(challengeCategories);
export type ChallengeCategory = z.infer<typeof challengeCategorySchema>;

export const benchmarkTypes = [
  'fixed',
  'human-challenge',
  'evolvo-challenge',
  'regression-pack',
  'holdout-pack'
] as const;
export const benchmarkTypeSchema = z.enum(benchmarkTypes);
export type BenchmarkType = z.infer<typeof benchmarkTypeSchema>;

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

export const mutationStates = [
  'proposed',
  'selected',
  'in-progress',
  'validated',
  'adopted',
  'rejected',
  'reverted'
] as const;
export const mutationStateSchema = z.enum(mutationStates);
export type MutationState = z.infer<typeof mutationStateSchema>;
