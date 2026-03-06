import { describe, expect, it, vi } from 'vitest';

import {
  buildChallengeBenchmarkDefinitionInput,
  loadFixedBenchmarkRegistryConfig,
  selectBenchmarkDefinitionsForAttempt,
  syncFixedBenchmarkRegistry
} from './registry.js';

describe('benchmark registry', () => {
  it('loads and normalizes fixed registry config', async () => {
    const config = await loadFixedBenchmarkRegistryConfig({
      readConfig: vi.fn().mockResolvedValue(
        JSON.stringify({
          benchmarks: [
            {
              benchmarkKey: ' runtime-smoke ',
              benchmarkType: 'fixed',
              capabilityTags: [' runtime ', 'testing', 'runtime'],
              definition: {
                intent: ' Verify runtime health '
              },
              title: ' Runtime smoke '
            }
          ]
        })
      )
    });

    expect(config).toEqual({
      benchmarks: [
        {
          benchmarkKey: 'runtime-smoke',
          benchmarkType: 'fixed',
          capabilityTags: ['runtime', 'testing'],
          definition: {
            artifactExpectations: [],
            intent: 'Verify runtime health',
            scoringNotes: [],
            validationSteps: []
          },
          familyKey: undefined,
          isHoldout: false,
          isRegressionPack: false,
          scoringConfig: {},
          title: 'Runtime smoke'
        }
      ]
    });
  });

  it('builds challenge benchmark inputs and syncs fixed definitions', async () => {
    const upsertDefinition = vi.fn().mockResolvedValue({
      id: 'benchmark_1'
    });
    const challengeInput = buildChallengeBenchmarkDefinitionInput({
      artifactExpectations: ['PR'],
      benchmarkType: 'human-challenge',
      capabilityTags: ['nextjs'],
      category: 'feature-implementation',
      constraints: ['No inline styles'],
      intent: 'Improve the dashboard',
      scoringNotes: ['Prefer SSR-safe data loading'],
      source: 'human',
      sourceFingerprint: 'fingerprint_a',
      sourceIssueNumber: 32,
      successSignal: 'Dashboard renders correctly',
      title: 'Improve the dashboard',
      validationSteps: ['pnpm test']
    });

    expect(challengeInput).toEqual(
      expect.objectContaining({
        benchmarkKey: 'challenge-issue-32',
        benchmarkType: 'HUMAN_CHALLENGE',
        familyKey: 'human-challenges'
      })
    );

    await syncFixedBenchmarkRegistry({
      readConfig: vi.fn().mockResolvedValue(
        JSON.stringify({
          benchmarks: [
            {
              benchmarkKey: 'runtime-smoke',
              benchmarkType: 'fixed',
              capabilityTags: ['runtime'],
              definition: {
                intent: 'Verify runtime health'
              },
              title: 'Runtime smoke'
            }
          ]
        })
      ),
      upsertDefinition
    });

    expect(upsertDefinition).toHaveBeenCalledWith(
      expect.objectContaining({
        benchmarkKey: 'runtime-smoke',
        benchmarkType: 'FIXED'
      })
    );
  });

  it('selects fixed, matched pack, and issue-linked challenge benchmarks', () => {
    const selected = selectBenchmarkDefinitionsForAttempt({
      benchmarkDefinitions: [
        {
          benchmarkKey: 'core-runtime-smoke',
          benchmarkType: 'FIXED',
          capabilityTags: [],
          id: 'benchmark_1',
          isActive: true,
          sourceIssueNumber: null
        },
        {
          benchmarkKey: 'typescript-regression-pack',
          benchmarkType: 'REGRESSION_PACK',
          capabilityTags: ['typescript'],
          id: 'benchmark_2',
          isActive: true,
          sourceIssueNumber: null
        },
        {
          benchmarkKey: 'challenge-issue-32',
          benchmarkType: 'HUMAN_CHALLENGE',
          capabilityTags: ['nextjs'],
          id: 'benchmark_3',
          isActive: true,
          sourceIssueNumber: 32
        },
        {
          benchmarkKey: 'other-challenge',
          benchmarkType: 'EVOLVO_CHALLENGE',
          capabilityTags: ['debugging'],
          id: 'benchmark_4',
          isActive: true,
          sourceIssueNumber: 14
        }
      ] as never,
      capabilityTags: ['typescript', 'debugging'],
      issueNumber: 32
    });

    expect(selected.map((definition) => definition.benchmarkKey)).toEqual([
      'core-runtime-smoke',
      'typescript-regression-pack',
      'challenge-issue-32'
    ]);
  });
});
