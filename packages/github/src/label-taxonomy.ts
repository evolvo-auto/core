import type { GitHubLabelDefinition, GitHubLabelGroup } from './types.js';

function createLabelDefinition(
  group: GitHubLabelGroup,
  name: string,
  color: string,
  description: string
): GitHubLabelDefinition {
  return {
    color,
    description,
    group,
    name
  };
}

export const sourceLabels = [
  createLabelDefinition(
    'source',
    'source:human',
    '1f6feb',
    'Work originated from a human.'
  ),
  createLabelDefinition(
    'source',
    'source:evolvo',
    '238636',
    'Work originated from Evolvo.'
  )
] as const;

export const kindLabels = [
  createLabelDefinition(
    'kind',
    'kind:idea',
    '0a7ea4',
    'Exploratory idea or proposal.'
  ),
  createLabelDefinition(
    'kind',
    'kind:challenge',
    '0a7ea4',
    'Challenge issue used to test the system.'
  ),
  createLabelDefinition(
    'kind',
    'kind:feature',
    '0a7ea4',
    'Feature implementation work.'
  ),
  createLabelDefinition(
    'kind',
    'kind:bug',
    '0a7ea4',
    'Bug fix or regression issue.'
  ),
  createLabelDefinition(
    'kind',
    'kind:experiment',
    '0a7ea4',
    'Experiment comparing approaches or outcomes.'
  ),
  createLabelDefinition(
    'kind',
    'kind:failure',
    '0a7ea4',
    'Failure report created from execution evidence.'
  ),
  createLabelDefinition(
    'kind',
    'kind:mutation',
    '0a7ea4',
    'Self-modification or mutation proposal.'
  ),
  createLabelDefinition(
    'kind',
    'kind:upgrade',
    '0a7ea4',
    'Upgrade or promotion-related change.'
  ),
  createLabelDefinition(
    'kind',
    'kind:benchmark',
    '0a7ea4',
    'Benchmark definition or result work.'
  ),
  createLabelDefinition(
    'kind',
    'kind:approval-request',
    '0a7ea4',
    'Explicit request for human approval.'
  )
] as const;

export const stateLabels = [
  createLabelDefinition(
    'state',
    'state:triage',
    'fbca04',
    'Awaiting classification and routing.'
  ),
  createLabelDefinition(
    'state',
    'state:planned',
    'c2e0ff',
    'Planned for future execution.'
  ),
  createLabelDefinition(
    'state',
    'state:selected',
    '1f6feb',
    'Selected as the next unit of work.'
  ),
  createLabelDefinition(
    'state',
    'state:in-progress',
    '0969da',
    'Actively being implemented or executed.'
  ),
  createLabelDefinition(
    'state',
    'state:awaiting-eval',
    'dbab09',
    'Implementation is complete and awaiting evaluation.'
  ),
  createLabelDefinition(
    'state',
    'state:awaiting-promotion',
    '8250df',
    'Candidate change is waiting for promotion review.'
  ),
  createLabelDefinition(
    'state',
    'state:blocked',
    'da3633',
    'Work is blocked pending an external dependency or decision.'
  ),
  createLabelDefinition(
    'state',
    'state:done',
    '238636',
    'Work is complete and accepted.'
  ),
  createLabelDefinition(
    'state',
    'state:rejected',
    '8b949e',
    'Work was reviewed and explicitly rejected.'
  ),
  createLabelDefinition(
    'state',
    'state:deferred',
    'd2a8ff',
    'Work is intentionally deferred for later.'
  )
] as const;

export const riskLabels = [
  createLabelDefinition('risk', 'risk:low', '2da44e', 'Low-risk change.'),
  createLabelDefinition(
    'risk',
    'risk:medium',
    'bf8700',
    'Moderate-risk change.'
  ),
  createLabelDefinition('risk', 'risk:high', 'fb8500', 'High-risk change.'),
  createLabelDefinition(
    'risk',
    'risk:systemic',
    'b60205',
    'Systemic change with broad cross-cutting impact.'
  )
] as const;

export const surfaceLabels = [
  createLabelDefinition(
    'surface',
    'surface:prompts',
    '5319e7',
    'Affects prompts.'
  ),
  createLabelDefinition(
    'surface',
    'surface:templates',
    '5319e7',
    'Affects templates.'
  ),
  createLabelDefinition(
    'surface',
    'surface:routing',
    '5319e7',
    'Affects model routing.'
  ),
  createLabelDefinition(
    'surface',
    'surface:runtime',
    '5319e7',
    'Affects runtime behavior.'
  ),
  createLabelDefinition(
    'surface',
    'surface:evaluator',
    '5319e7',
    'Affects evaluator behavior.'
  ),
  createLabelDefinition(
    'surface',
    'surface:benchmarks',
    '5319e7',
    'Affects benchmark definitions or runs.'
  ),
  createLabelDefinition(
    'surface',
    'surface:memory',
    '5319e7',
    'Affects memory or persistence.'
  ),
  createLabelDefinition(
    'surface',
    'surface:worktrees',
    '5319e7',
    'Affects worktree lifecycle.'
  ),
  createLabelDefinition(
    'surface',
    'surface:supervisor',
    '5319e7',
    'Affects supervisor or promotion control.'
  ),
  createLabelDefinition(
    'surface',
    'surface:dashboard',
    '5319e7',
    'Affects dashboard behavior.'
  ),
  createLabelDefinition(
    'surface',
    'surface:github-ops',
    '5319e7',
    'Affects GitHub operations and automation.'
  ),
  createLabelDefinition(
    'surface',
    'surface:external-repo',
    '5319e7',
    'Affects spawned or external repositories.'
  )
] as const;

export const capabilityLabels = [
  createLabelDefinition(
    'capability',
    'capability:nextjs',
    '0e8a16',
    'Next.js capability.'
  ),
  createLabelDefinition(
    'capability',
    'capability:nestjs',
    '0e8a16',
    'NestJS capability.'
  ),
  createLabelDefinition(
    'capability',
    'capability:typescript',
    '0e8a16',
    'TypeScript capability.'
  ),
  createLabelDefinition(
    'capability',
    'capability:ci',
    '0e8a16',
    'CI capability.'
  ),
  createLabelDefinition(
    'capability',
    'capability:testing',
    '0e8a16',
    'Testing capability.'
  ),
  createLabelDefinition(
    'capability',
    'capability:debugging',
    '0e8a16',
    'Debugging capability.'
  ),
  createLabelDefinition(
    'capability',
    'capability:repo-generation',
    '0e8a16',
    'Repository generation capability.'
  ),
  createLabelDefinition(
    'capability',
    'capability:self-upgrade',
    '0e8a16',
    'Self-upgrade capability.'
  ),
  createLabelDefinition(
    'capability',
    'capability:model-routing',
    '0e8a16',
    'Model routing capability.'
  )
] as const;

export const humanPolicyLabels = [
  createLabelDefinition(
    'human-policy',
    'human-made-challenge',
    'ffb86b',
    'Challenge issue created by a human.'
  ),
  createLabelDefinition(
    'human-policy',
    'evolvo-made-challenge',
    'ffb86b',
    'Challenge issue created by Evolvo.'
  ),
  createLabelDefinition(
    'human-policy',
    'human-approval-needed',
    'ffb86b',
    'Human approval is required before proceeding.'
  )
] as const;

export const evaluationLabels = [
  createLabelDefinition(
    'evaluation',
    'eval:pending',
    'dbab09',
    'Evaluation has not completed yet.'
  ),
  createLabelDefinition(
    'evaluation',
    'eval:passed',
    '238636',
    'Evaluation passed.'
  ),
  createLabelDefinition(
    'evaluation',
    'eval:partial',
    'bf8700',
    'Evaluation partially passed.'
  ),
  createLabelDefinition(
    'evaluation',
    'eval:failed',
    'da3633',
    'Evaluation failed.'
  ),
  createLabelDefinition(
    'evaluation',
    'eval:regressed',
    '8b1e3f',
    'Evaluation detected a regression.'
  )
] as const;

export const priorityLabels = [
  createLabelDefinition(
    'priority',
    'priority:p0',
    'b60205',
    'Highest priority.'
  ),
  createLabelDefinition('priority', 'priority:p1', 'fb8500', 'High priority.'),
  createLabelDefinition(
    'priority',
    'priority:p2',
    'bf8700',
    'Medium priority.'
  ),
  createLabelDefinition('priority', 'priority:p3', '8c959f', 'Lower priority.')
] as const;

export const canonicalGitHubLabels = [
  ...sourceLabels,
  ...kindLabels,
  ...stateLabels,
  ...riskLabels,
  ...surfaceLabels,
  ...capabilityLabels,
  ...humanPolicyLabels,
  ...evaluationLabels,
  ...priorityLabels
] as const satisfies readonly GitHubLabelDefinition[];

export function getCanonicalGitHubLabel(
  name: string
): GitHubLabelDefinition | undefined {
  return canonicalGitHubLabels.find((label) => label.name === name);
}
