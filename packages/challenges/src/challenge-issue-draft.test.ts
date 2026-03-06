import { describe, expect, it } from 'vitest';

import { buildGeneratedChallengeIssueDraft } from './challenge-issue-draft.js';

describe('buildGeneratedChallengeIssueDraft', () => {
  it('builds an Evolvo challenge issue draft with normalized metadata', () => {
    const draft = buildGeneratedChallengeIssueDraft({
      capabilityKey: 'debugging',
      evidence: ['Three failures shared the same root symptom'],
      recurrenceCount: 3,
      recurrenceGroup: 'model-quality/runtime/openai',
      sourceIssueNumber: 14,
      weaknessSummary:
        'Probe whether the runtime can recover from the recurring OpenAI structured-output failure mode.'
    });

    expect(draft.issue).toEqual({
      body: expect.stringContaining('## Goal'),
      labels: expect.arrayContaining([
        'source:evolvo',
        'kind:challenge',
        'evolvo-made-challenge',
        'state:triage',
        'surface:benchmarks',
        'capability:debugging'
      ]),
      title:
        'Challenge: Stress Debugging resilience for model-quality/runtime/openai'
    });
    expect(draft.dedupeFingerprint).toHaveLength(64);
  });
});
