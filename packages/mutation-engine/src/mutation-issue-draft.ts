import { buildIssuePriorityScore, resolvePriorityLabel } from '@evolvo/scoring/issue-priority';
import type { MutationProposal } from '@evolvo/schemas/role-output-schemas';

export type MutationIssueDraft = {
  body: string;
  labels: string[];
  title: string;
};

function mapPromotionImpactToRiskLabel(
  promotionImpact: MutationProposal['promotionImpact']
): 'risk:high' | 'risk:low' | 'risk:medium' {
  switch (promotionImpact) {
    case 'high':
      return 'risk:high';
    case 'medium':
      return 'risk:medium';
    case 'low':
    case 'none':
    default:
      return 'risk:low';
  }
}

export function buildMutationIssueDraft(
  proposal: MutationProposal
): MutationIssueDraft {
  const title = proposal.title.toLowerCase().startsWith('mutation:')
    ? proposal.title
    : `Mutation: ${proposal.title}`;
  const priorityLabel = resolvePriorityLabel(
    buildIssuePriorityScore({
      basePriorityScore: proposal.priorityScore,
      isSystemic: proposal.promotionImpact === 'high',
      mutationState: 'proposed',
      recurrenceCount: Math.max(1, proposal.sourceFailureIds.length)
    })
  );
  const labels = [
    'source:evolvo',
    'kind:mutation',
    'state:triage',
    `surface:${proposal.targetSurface}`,
    mapPromotionImpactToRiskLabel(proposal.promotionImpact),
    priorityLabel
  ];
  const body = [
    '## Why this exists',
    '',
    proposal.rationale,
    '',
    '## Evidence',
    '',
    ...proposal.evidence.map((evidenceLine) => `- ${evidenceLine}`),
    '',
    '## Proposed mutation',
    '',
    proposal.proposedChangeSummary,
    '',
    '## Expected benefit',
    '',
    ...proposal.expectedBenefits.map((benefit) => `- ${benefit}`),
    '',
    '## Risks',
    '',
    ...proposal.expectedRisks.map((risk) => `- ${risk}`),
    '',
    '## Validation plan',
    '',
    `Replay issues: ${proposal.validationPlan.replayIssueNumbers.join(', ') || 'none'}`,
    `Benchmarks: ${proposal.validationPlan.benchmarkIds.join(', ') || 'none'}`,
    `Require shadow mode: ${proposal.validationPlan.requireShadowMode ? 'yes' : 'no'}`,
    '',
    '## Promotion impact',
    '',
    proposal.promotionImpact
  ].join('\n');

  return {
    body,
    labels,
    title
  };
}
