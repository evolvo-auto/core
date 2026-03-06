import { describe, expect, it } from 'vitest';

import { failureMemoryDashboardSnapshotSchema } from './failure-memory-schemas.js';

describe('failure memory schemas', () => {
  it('parses a valid failure memory dashboard snapshot', () => {
    expect(
      failureMemoryDashboardSnapshotSchema.parse({
        capabilities: [
          {
            attempts: 8,
            capabilityKey: 'debugging',
            confidenceScore: 41,
            failures: 5,
            lastIssueNumber: 32,
            recurringFailureModes: ['model-quality/runtime/openai'],
            successes: 3
          }
        ],
        clusters: [
          {
            category: 'model-quality-issue',
            issueNumbers: [14, 32],
            latestOccurredAt: '2026-03-06T18:40:00.000Z',
            phase: 'runtime',
            recurrenceGroup: 'model-quality/runtime/openai',
            systemicCount: 2,
            totalFailures: 3
          }
        ],
        failures: [
          {
            category: 'model-quality-issue',
            createdAt: '2026-03-06T18:35:00.000Z',
            id: 'failure_1',
            isSystemic: true,
            issueNumber: 14,
            linkedIssueNumber: 41,
            phase: 'runtime',
            recurrenceCount: 3,
            recurrenceGroup: 'model-quality/runtime/openai',
            severity: 'systemic'
          }
        ],
        generatedAt: '2026-03-06T18:45:00.000Z',
        mutations: [
          {
            confidenceScore: 72,
            createdAt: '2026-03-06T18:44:00.000Z',
            id: 'mutation_1',
            linkedIssueNumber: 42,
            priorityScore: 81,
            sourceIssueNumber: 14,
            state: 'proposed',
            targetSurface: 'prompts',
            title: 'Improve prompt contract guidance'
          }
        ],
        summary: {
          openMutationProposals: 1,
          recurringClusters: 1,
          totalFailures: 1,
          weakCapabilities: 1
        }
      })
    ).toMatchObject({
      summary: {
        totalFailures: 1
      }
    });
  });
});
