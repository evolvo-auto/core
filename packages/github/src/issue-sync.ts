import {
  upsertBenchmarkDefinition
} from '@evolvo/api/benchmark-definition';
import {
  upsertChallengeRecord
} from '@evolvo/api/challenge-record';
import {
  upsertIssueRecords,
  type UpsertIssueRecordInput
} from '@evolvo/api/issue-record';
import {
  syncFixedBenchmarkRegistry,
  buildChallengeBenchmarkDefinitionInput
} from '@evolvo/benchmarks/registry';
import {
  normalizeChallenge,
  type NormalizedChallengeDefinition
} from '@evolvo/challenges/normalize-challenge';

import { getGitHubContext } from './auth.js';
import { classifyIssue } from './issue-classification.js';
import { listRepositoryIssues } from './issues.js';
import type {
  GitHubContext,
  GitHubIssueClassification,
  GitHubIssueListItem,
  ListRepositoryIssuesOptions
} from './types.js';

export type ListAllRepositoryIssuesOptions = Pick<
  ListRepositoryIssuesOptions,
  'direction' | 'perPage' | 'since' | 'sort' | 'state'
>;

export type SyncRepositoryIssuesOptions = ListAllRepositoryIssuesOptions & {
  dryRun?: boolean;
};

export type SyncRepositoryIssuesResult = {
  classifiedIssues: GitHubIssueClassification[];
  dryRun: boolean;
  fetchedCount: number;
  ignoredPullRequestCount: number;
  normalizedChallenges: NormalizedChallengeDefinition[];
  persistedBenchmarkDefinitionCount: number;
  persistedChallengeCount: number;
  normalizedRecords: UpsertIssueRecordInput[];
  persistedCount: number;
};

export type SyncRepositoryIssuesDependencies = {
  normalizeChallengeDefinition?: typeof normalizeChallenge;
  syncFixedRegistry?: typeof syncFixedBenchmarkRegistry;
  upsertBenchmark?: typeof upsertBenchmarkDefinition;
  upsertChallenge?: typeof upsertChallengeRecord;
};

function isPullRequestIssue(issue: GitHubIssueListItem): boolean {
  return issue.pull_request !== undefined;
}

export function normalizeIssueForCache(
  issue: GitHubIssueListItem
): UpsertIssueRecordInput {
  const classification = classifyIssue(issue);

  return {
    currentLabels: classification.currentLabels,
    githubIssueNumber: classification.githubIssueNumber,
    kind: classification.kind,
    priorityScore: classification.priorityScore,
    riskLevel: classification.riskLevel,
    source: classification.source,
    state: classification.state,
    title: classification.title
  };
}

export async function listAllRepositoryIssues(
  options: ListAllRepositoryIssuesOptions = {},
  context: GitHubContext = getGitHubContext()
): Promise<GitHubIssueListItem[]> {
  const issues: GitHubIssueListItem[] = [];
  let page = 1;
  const perPage = options.perPage ?? 100;

  while (true) {
    const batch = await listRepositoryIssues(
      {
        direction: options.direction,
        page,
        perPage,
        since: options.since,
        sort: options.sort,
        state: options.state ?? 'open'
      },
      context
    );

    issues.push(...batch);

    if (batch.length < perPage) {
      return issues;
    }

    page += 1;
  }
}

export async function syncRepositoryIssues(
  options: SyncRepositoryIssuesOptions = {},
  context: GitHubContext = getGitHubContext(),
  dependencies: SyncRepositoryIssuesDependencies = {}
): Promise<SyncRepositoryIssuesResult> {
  const normalizeChallengeDefinition =
    dependencies.normalizeChallengeDefinition ?? normalizeChallenge;
  const syncFixedRegistry =
    dependencies.syncFixedRegistry ?? syncFixedBenchmarkRegistry;
  const upsertBenchmark =
    dependencies.upsertBenchmark ?? upsertBenchmarkDefinition;
  const upsertChallenge = dependencies.upsertChallenge ?? upsertChallengeRecord;
  const allItems = await listAllRepositoryIssues(options, context);
  const issueItems = allItems.filter((item) => !isPullRequestIssue(item));
  const classifiedIssues = issueItems.map((issue) => classifyIssue(issue));
  const normalizedRecords = classifiedIssues.map((classification) => ({
    currentLabels: classification.currentLabels,
    githubIssueNumber: classification.githubIssueNumber,
    kind: classification.kind,
    priorityScore: classification.priorityScore,
    riskLevel: classification.riskLevel,
    source: classification.source,
    state: classification.state,
    title: classification.title
  }));
  const normalizedChallenges = issueItems.flatMap((issue) => {
    const classification = classifyIssue(issue);

    if (classification.kind !== 'CHALLENGE') {
      return [];
    }

    return [
      normalizeChallengeDefinition({
        body: issue.body ?? undefined,
        labels: classification.currentLabels,
        source: classification.source === 'EVOLVO' ? 'evolvo' : 'human',
        sourceIssueNumber: classification.githubIssueNumber,
        title: classification.title
      })
    ];
  });

  if (!options.dryRun && normalizedRecords.length > 0) {
    await upsertIssueRecords({
      records: normalizedRecords
    });
  }

  let persistedChallengeCount = 0;
  let persistedBenchmarkDefinitionCount = 0;

  if (!options.dryRun) {
    await syncFixedRegistry();

    for (const normalizedChallenge of normalizedChallenges) {
      const challengeRecord = await upsertChallenge({
        artifactExpectationsJson: normalizedChallenge.artifactExpectations,
        capabilityTags: normalizedChallenge.capabilityTags,
        category:
          normalizedChallenge.category
            .toUpperCase()
            .replace(/-/g, '_') as 'BUG_FIXING' | 'CI_SETUP' | 'FEATURE_IMPLEMENTATION' | 'FRESH_REPO_GENERATION' | 'GENERAL' | 'MODEL_ROUTING_QUALITY' | 'PROMPT_MUTATION_IMPACT' | 'REFACTOR' | 'RUNTIME_UPGRADE_STABILITY' | 'TEST_GENERATION',
        constraintsJson: normalizedChallenge.constraints,
        intent: normalizedChallenge.intent,
        issueSource: normalizedChallenge.source === 'evolvo' ? 'EVOLVO' : 'HUMAN',
        scoringNotesJson: normalizedChallenge.scoringNotes,
        sourceFingerprint: normalizedChallenge.sourceFingerprint,
        sourceIssueNumber: normalizedChallenge.sourceIssueNumber,
        successSignal: normalizedChallenge.successSignal,
        title: normalizedChallenge.title,
        validationStepsJson: normalizedChallenge.validationSteps
      });

      persistedChallengeCount += 1;
      await upsertBenchmark(
        buildChallengeBenchmarkDefinitionInput(
          normalizedChallenge,
          challengeRecord.id
        )
      );
      persistedBenchmarkDefinitionCount += 1;
    }
  }

  return {
    classifiedIssues,
    dryRun: options.dryRun ?? false,
    fetchedCount: allItems.length,
    ignoredPullRequestCount: allItems.length - issueItems.length,
    normalizedChallenges,
    persistedBenchmarkDefinitionCount,
    persistedChallengeCount,
    normalizedRecords,
    persistedCount: options.dryRun ? 0 : normalizedRecords.length
  };
}
