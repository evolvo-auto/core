import {
  failureReflectionSchema,
  type CriticOutput,
  type FailureReflection
} from '@evolvo/schemas/role-output-schemas';

export type BuildFailureReflectionInput = {
  attemptId: string;
  criticOutput: CriticOutput;
  issueNumber: number;
  recurrenceCount: number;
  recurrenceGroup: string;
  symptom: string;
};

function buildImmediateFollowups(
  input: BuildFailureReflectionInput
): FailureReflection['immediateFollowups'] {
  const followups: FailureReflection['immediateFollowups'] = [];

  if (input.criticOutput.directFixRecommended) {
    followups.push({
      summary: 'Attempt another direct fix in the current issue path.',
      title: 'Retry direct repair',
      type: 'fix'
    });
  }

  if (input.criticOutput.mutationRecommended) {
    followups.push({
      summary: `Investigate mutation opportunities for recurrence group ${input.recurrenceGroup}.`,
      title: 'Create mutation proposal',
      type: 'mutation'
    });
  }

  if (followups.length === 0) {
    followups.push({
      summary: 'Retry only after gathering more evidence from this failure cluster.',
      title: 'Collect more evidence',
      type: 'retry'
    });
  }

  return followups;
}

export function buildFailureReflection(
  input: BuildFailureReflectionInput
): FailureReflection {
  return failureReflectionSchema.parse({
    attemptId: input.attemptId,
    immediateFollowups: buildImmediateFollowups(input),
    issueNumber: input.issueNumber,
    localVsSystemic: input.criticOutput.isSystemic
      ? 'systemic'
      : input.criticOutput.directFixRecommended
        ? 'local'
        : 'unclear',
    likelyRootCauses: input.criticOutput.likelyRootCauses,
    phase:
      input.criticOutput.outcome === 'blocked'
        ? 'environment'
        : input.criticOutput.outcome === 'inconclusive'
          ? 'runtime'
          : 'evaluation',
    recurrenceHints: [
      `recurrence-group:${input.recurrenceGroup}`,
      `recurrence-count:${String(input.recurrenceCount)}`
    ],
    shouldCreateFailureIssue:
      input.criticOutput.recommendedNextAction === 'open-failure' ||
      input.recurrenceCount >= 2,
    shouldCreateMutationIssue:
      input.criticOutput.mutationRecommended ||
      (input.criticOutput.isSystemic && input.recurrenceCount >= 2),
    symptom: input.symptom
  });
}
