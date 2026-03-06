import { afterEach, describe, expect, it, vi } from 'vitest';

import { upsertBenchmarkDefinition } from '@evolvo/api/benchmark-definition';
import { upsertChallengeRecord } from '@evolvo/api/challenge-record';
import { upsertIssueRecords } from '@evolvo/api/issue-record';
import { syncFixedBenchmarkRegistry } from '@evolvo/benchmarks/registry';

import { normalizeIssueForCache, syncRepositoryIssues } from './issue-sync.js';
import type {
  GitHubContext,
  GitHubIssueListItem,
  GitHubRestClient
} from './types.js';

vi.mock('@evolvo/api/issue-record', () => ({
  upsertIssueRecords: vi.fn()
}));
vi.mock('@evolvo/api/challenge-record', () => ({
  upsertChallengeRecord: vi.fn()
}));
vi.mock('@evolvo/api/benchmark-definition', () => ({
  upsertBenchmarkDefinition: vi.fn()
}));
vi.mock('@evolvo/benchmarks/registry', async () => {
  const actual = await vi.importActual<typeof import('@evolvo/benchmarks/registry')>(
    '@evolvo/benchmarks/registry'
  );

  return {
    ...actual,
    syncFixedBenchmarkRegistry: vi.fn()
  };
});

const mockedUpsertIssueRecords = vi.mocked(upsertIssueRecords);
const mockedSyncFixedBenchmarkRegistry = vi.mocked(syncFixedBenchmarkRegistry);
const mockedUpsertChallengeRecord = vi.mocked(upsertChallengeRecord);
const mockedUpsertBenchmarkDefinition = vi.mocked(upsertBenchmarkDefinition);

describe('issue sync service', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes labels and derives workflow metadata', () => {
    const issue = {
      labels: [
        {
          name: ' STATE:PLANNED '
        },
        {
          name: 'kind:feature'
        },
        {
          name: 'source:evolvo'
        },
        {
          name: 'risk:high'
        },
        {
          name: 'priority:p1'
        },
        {
          name: 'state:triage'
        },
        {
          name: 'kind:feature'
        },
        'surface:runtime'
      ],
      number: 31,
      title: '  Build cache  '
    } as unknown as GitHubIssueListItem;

    const normalized = normalizeIssueForCache(issue);

    expect(normalized).toEqual({
      currentLabels: [
        'state:planned',
        'kind:feature',
        'source:evolvo',
        'risk:high',
        'priority:p1',
        'state:triage',
        'surface:runtime'
      ],
      githubIssueNumber: 31,
      kind: 'FEATURE',
      priorityScore: 75,
      riskLevel: 'HIGH',
      source: 'EVOLVO',
      state: 'PLANNED',
      title: 'Build cache'
    });
  });

  it('syncs paginated repository issues and ignores pull requests', async () => {
    const listForRepo = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            labels: [{ name: 'kind:idea' }],
            number: 1,
            title: 'First issue'
          },
          {
            labels: [],
            number: 200,
            pull_request: {
              diff_url: null,
              html_url: null,
              patch_url: null,
              url: null
            },
            title: 'PR item'
          }
        ] as unknown as GitHubIssueListItem[]
      })
      .mockResolvedValueOnce({
        data: [
          {
            labels: [{ name: 'state:done' }, { name: 'source:evolvo' }],
            number: 2,
            title: 'Second issue'
          }
        ] as unknown as GitHubIssueListItem[]
      });
    const context: GitHubContext = {
      octokit: {
        rest: {
          issues: {
            listForRepo
          }
        }
      } as unknown as GitHubRestClient,
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    mockedUpsertIssueRecords.mockResolvedValue(2);
    mockedSyncFixedBenchmarkRegistry.mockResolvedValue([]);

    const result = await syncRepositoryIssues(
      {
        perPage: 2
      },
      context
    );

    expect(listForRepo).toHaveBeenNthCalledWith(1, {
      direction: undefined,
      labels: undefined,
      owner: 'evolvo-auto',
      page: 1,
      per_page: 2,
      repo: 'core',
      since: undefined,
      sort: undefined,
      state: 'open'
    });
    expect(listForRepo).toHaveBeenNthCalledWith(2, {
      direction: undefined,
      labels: undefined,
      owner: 'evolvo-auto',
      page: 2,
      per_page: 2,
      repo: 'core',
      since: undefined,
      sort: undefined,
      state: 'open'
    });
    expect(mockedUpsertIssueRecords).toHaveBeenCalledWith({
      records: [
        {
          currentLabels: ['kind:idea'],
          githubIssueNumber: 1,
          kind: 'IDEA',
          priorityScore: undefined,
          riskLevel: undefined,
          source: 'HUMAN',
          state: 'TRIAGE',
          title: 'First issue'
        },
        {
          currentLabels: ['state:done', 'source:evolvo'],
          githubIssueNumber: 2,
          kind: 'IDEA',
          priorityScore: undefined,
          riskLevel: undefined,
          source: 'EVOLVO',
          state: 'DONE',
          title: 'Second issue'
        }
      ]
    });
    expect(result).toEqual({
      classifiedIssues: [
        {
          currentLabels: ['kind:idea'],
          githubIssueNumber: 1,
          kind: 'IDEA',
          priorityScore: undefined,
          riskLevel: undefined,
          source: 'HUMAN',
          state: 'TRIAGE',
          surfaces: [],
          title: 'First issue'
        },
        {
          currentLabels: ['state:done', 'source:evolvo'],
          githubIssueNumber: 2,
          kind: 'IDEA',
          priorityScore: undefined,
          riskLevel: undefined,
          source: 'EVOLVO',
          state: 'DONE',
          surfaces: [],
          title: 'Second issue'
        }
      ],
      dryRun: false,
      fetchedCount: 3,
      ignoredPullRequestCount: 1,
      normalizedChallenges: [],
      persistedBenchmarkDefinitionCount: 0,
      persistedChallengeCount: 0,
      normalizedRecords: [
        {
          currentLabels: ['kind:idea'],
          githubIssueNumber: 1,
          kind: 'IDEA',
          priorityScore: undefined,
          riskLevel: undefined,
          source: 'HUMAN',
          state: 'TRIAGE',
          title: 'First issue'
        },
        {
          currentLabels: ['state:done', 'source:evolvo'],
          githubIssueNumber: 2,
          kind: 'IDEA',
          priorityScore: undefined,
          riskLevel: undefined,
          source: 'EVOLVO',
          state: 'DONE',
          title: 'Second issue'
        }
      ],
      persistedCount: 2
    });
  });

  it('supports dry-run mode without persisting records', async () => {
    const listForRepo = vi.fn().mockResolvedValue({
      data: []
    });
    const context: GitHubContext = {
      octokit: {
        rest: {
          issues: {
            listForRepo
          }
        }
      } as unknown as GitHubRestClient,
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    const result = await syncRepositoryIssues(
      {
        dryRun: true
      },
      context
    );

    expect(result.persistedCount).toBe(0);
    expect(mockedUpsertIssueRecords).not.toHaveBeenCalled();
  });

  it('normalizes challenge issues into challenge records and benchmark definitions', async () => {
    const listForRepo = vi.fn().mockResolvedValue({
      data: [
        {
          body: '## Goal\n\nImprove the dashboard loading path.\n\n## Validation steps\n\n- pnpm test',
          labels: [
            { name: 'kind:challenge' },
            { name: 'source:human' },
            { name: 'capability:nextjs' }
          ],
          number: 32,
          title: 'Improve the dashboard loading path'
        }
      ] as unknown as GitHubIssueListItem[]
    });
    const context: GitHubContext = {
      octokit: {
        rest: {
          issues: {
            listForRepo
          }
        }
      } as unknown as GitHubRestClient,
      repository: {
        owner: 'evolvo-auto',
        repo: 'core'
      }
    };

    mockedSyncFixedBenchmarkRegistry.mockResolvedValue([]);
    mockedUpsertIssueRecords.mockResolvedValue(1);
    mockedUpsertChallengeRecord.mockResolvedValue({
      id: 'challenge_32'
    } as never);
    mockedUpsertBenchmarkDefinition.mockResolvedValue({
      id: 'benchmark_32'
    } as never);

    const result = await syncRepositoryIssues({}, context);

    expect(mockedUpsertChallengeRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        capabilityTags: ['nextjs'],
        category: 'FEATURE_IMPLEMENTATION',
        issueSource: 'HUMAN',
        sourceIssueNumber: 32
      })
    );
    expect(mockedUpsertBenchmarkDefinition).toHaveBeenCalledWith(
      expect.objectContaining({
        benchmarkKey: 'challenge-issue-32',
        benchmarkType: 'HUMAN_CHALLENGE',
        challengeId: 'challenge_32'
      })
    );
    expect(result.normalizedChallenges).toEqual([
      expect.objectContaining({
        benchmarkType: 'human-challenge',
        sourceIssueNumber: 32
      })
    ]);
    expect(result.persistedChallengeCount).toBe(1);
    expect(result.persistedBenchmarkDefinitionCount).toBe(1);
  });
});
