import type {
  GitHubIssueClassification,
  GitHubIssueListItem,
  GitHubIssueSurface
} from './types.js';

const issueStateLabelMap: Record<string, GitHubIssueClassification['state']> = {
  'state:awaiting-eval': 'AWAITING_EVAL',
  'state:awaiting-promotion': 'AWAITING_PROMOTION',
  'state:blocked': 'BLOCKED',
  'state:deferred': 'DEFERRED',
  'state:done': 'DONE',
  'state:in-progress': 'IN_PROGRESS',
  'state:planned': 'PLANNED',
  'state:rejected': 'REJECTED',
  'state:selected': 'SELECTED',
  'state:triage': 'TRIAGE'
};

const issueKindLabelMap: Record<string, GitHubIssueClassification['kind']> = {
  'kind:approval-request': 'APPROVAL_REQUEST',
  'kind:benchmark': 'BENCHMARK',
  'kind:bug': 'BUG',
  'kind:challenge': 'CHALLENGE',
  'kind:experiment': 'EXPERIMENT',
  'kind:failure': 'FAILURE',
  'kind:feature': 'FEATURE',
  'kind:idea': 'IDEA',
  'kind:mutation': 'MUTATION',
  'kind:upgrade': 'UPGRADE'
};

const issueSourceLabelMap: Record<string, GitHubIssueClassification['source']> =
  {
    'source:evolvo': 'EVOLVO',
    'source:human': 'HUMAN'
  };

const issueRiskLabelMap: Record<
  string,
  GitHubIssueClassification['riskLevel']
> = {
  'risk:high': 'HIGH',
  'risk:low': 'LOW',
  'risk:medium': 'MEDIUM',
  'risk:systemic': 'SYSTEMIC'
};

const issuePriorityScoreLabelMap: Record<string, number> = {
  'priority:p0': 100,
  'priority:p1': 75,
  'priority:p2': 50,
  'priority:p3': 25
};

const surfaceLabelMap: Record<string, GitHubIssueSurface> = {
  'surface:benchmarks': 'BENCHMARKS',
  'surface:dashboard': 'DASHBOARD',
  'surface:evaluator': 'EVALUATOR',
  'surface:external-repo': 'EXTERNAL_REPO',
  'surface:github-ops': 'GITHUB_OPS',
  'surface:memory': 'MEMORY',
  'surface:prompts': 'PROMPTS',
  'surface:routing': 'ROUTING',
  'surface:runtime': 'RUNTIME',
  'surface:supervisor': 'SUPERVISOR',
  'surface:templates': 'TEMPLATES',
  'surface:worktrees': 'WORKTREES'
};

const evolvoIssuePrefixKindMap: Array<{
  kind: GitHubIssueClassification['kind'];
  prefix: string;
}> = [
  { kind: 'CHALLENGE', prefix: 'challenge:' },
  { kind: 'FAILURE', prefix: 'failure:' },
  { kind: 'MUTATION', prefix: 'mutation:' },
  { kind: 'UPGRADE', prefix: 'upgrade:' },
  { kind: 'EXPERIMENT', prefix: 'experiment:' },
  { kind: 'IDEA', prefix: 'capability gap:' },
  { kind: 'APPROVAL_REQUEST', prefix: 'approval request:' }
];

const evolvoIssuePrefixes = new Set(
  evolvoIssuePrefixKindMap.map((entry) => entry.prefix)
);

const issueKeywordKindMap: Array<{
  kind: GitHubIssueClassification['kind'];
  keywords: string[];
}> = [
  { kind: 'APPROVAL_REQUEST', keywords: ['approval', 'approve'] },
  { kind: 'BENCHMARK', keywords: ['benchmark', 'regression pack'] },
  { kind: 'BUG', keywords: ['bug', 'regression', 'broken', 'fix'] },
  { kind: 'EXPERIMENT', keywords: ['experiment', 'compare', 'trial'] },
  { kind: 'FAILURE', keywords: ['failure', 'failed', 'error'] },
  { kind: 'MUTATION', keywords: ['mutation', 'self-modification'] },
  { kind: 'UPGRADE', keywords: ['upgrade', 'promote runtime', 'promotion'] },
  { kind: 'FEATURE', keywords: ['feature', 'implement', 'add support'] }
];

const issueKeywordSurfaceMap: Array<{
  keywords: string[];
  surface: GitHubIssueSurface;
}> = [
  { keywords: ['prompt'], surface: 'PROMPTS' },
  { keywords: ['template', 'scaffold'], surface: 'TEMPLATES' },
  { keywords: ['routing', 'model route'], surface: 'ROUTING' },
  { keywords: ['runtime', 'worker process'], surface: 'RUNTIME' },
  { keywords: ['evaluator', 'evaluation flow'], surface: 'EVALUATOR' },
  { keywords: ['benchmark'], surface: 'BENCHMARKS' },
  { keywords: ['memory', 'database', 'postgres', 'prisma'], surface: 'MEMORY' },
  { keywords: ['worktree', 'branch reservation'], surface: 'WORKTREES' },
  {
    keywords: ['supervisor', 'promotion', 'shadow mode'],
    surface: 'SUPERVISOR'
  },
  { keywords: ['dashboard', 'nextjs', 'ui'], surface: 'DASHBOARD' },
  {
    keywords: ['github', 'pull request', 'issue label', 'octokit'],
    surface: 'GITHUB_OPS'
  },
  {
    keywords: ['external repo', 'spawned repo', 'repo generation'],
    surface: 'EXTERNAL_REPO'
  }
];

function normalizeLabelName(labelName: string): string {
  return labelName.trim().toLowerCase();
}

function normalizeIssueTitle(title: string, issueNumber: number): string {
  const normalizedTitle = title.trim();

  if (normalizedTitle.length > 0) {
    return normalizedTitle;
  }

  return `Issue ${issueNumber}`;
}

function pickMappedLabelValue<T>(
  labelNames: string[],
  labelMap: Record<string, T>
): T | undefined {
  for (const labelName of labelNames) {
    if (Object.prototype.hasOwnProperty.call(labelMap, labelName)) {
      return labelMap[labelName];
    }
  }

  return undefined;
}

function includesKeyword(haystack: string, keywords: string[]): boolean {
  for (const keyword of keywords) {
    if (haystack.includes(keyword)) {
      return true;
    }
  }

  return false;
}

export function extractNormalizedIssueLabelNames(
  issue: GitHubIssueListItem
): string[] {
  const normalizedLabelNames: string[] = [];
  const seenLabels = new Set<string>();

  for (const rawLabel of issue.labels) {
    if (typeof rawLabel === 'string') {
      const normalizedName = normalizeLabelName(rawLabel);

      if (!normalizedName || seenLabels.has(normalizedName)) {
        continue;
      }

      seenLabels.add(normalizedName);
      normalizedLabelNames.push(normalizedName);
      continue;
    }

    const normalizedName = normalizeLabelName(rawLabel.name ?? '');

    if (!normalizedName || seenLabels.has(normalizedName)) {
      continue;
    }

    seenLabels.add(normalizedName);
    normalizedLabelNames.push(normalizedName);
  }

  return normalizedLabelNames;
}

function inferKindFromPrefix(
  title: string
): GitHubIssueClassification['kind'] | undefined {
  for (const entry of evolvoIssuePrefixKindMap) {
    if (title.startsWith(entry.prefix)) {
      return entry.kind;
    }
  }

  return undefined;
}

function inferKindFromKeywords(
  text: string
): GitHubIssueClassification['kind'] | undefined {
  for (const entry of issueKeywordKindMap) {
    if (includesKeyword(text, entry.keywords)) {
      return entry.kind;
    }
  }

  return undefined;
}

function inferSourceFromIssue(
  labelNames: string[],
  normalizedTitle: string,
  issue: GitHubIssueListItem
): GitHubIssueClassification['source'] {
  const sourceFromLabel = pickMappedLabelValue(labelNames, issueSourceLabelMap);

  if (sourceFromLabel) {
    return sourceFromLabel;
  }

  if (labelNames.includes('human-made-challenge')) {
    return 'HUMAN';
  }

  if (labelNames.includes('evolvo-made-challenge')) {
    return 'EVOLVO';
  }

  for (const prefix of evolvoIssuePrefixes) {
    if (normalizedTitle.startsWith(prefix)) {
      return 'EVOLVO';
    }
  }

  if (issue.user?.type === 'Bot') {
    return 'EVOLVO';
  }

  return 'HUMAN';
}

function inferKindFromIssue(
  labelNames: string[],
  normalizedTitle: string,
  body: string
): GitHubIssueClassification['kind'] {
  const kindFromLabel = pickMappedLabelValue(labelNames, issueKindLabelMap);

  if (kindFromLabel) {
    return kindFromLabel;
  }

  if (
    labelNames.includes('human-made-challenge') ||
    labelNames.includes('evolvo-made-challenge')
  ) {
    return 'CHALLENGE';
  }

  const kindFromPrefix = inferKindFromPrefix(normalizedTitle);

  if (kindFromPrefix) {
    return kindFromPrefix;
  }

  const textForKeywordInference = `${normalizedTitle}\n${body}`;
  const kindFromKeywords = inferKindFromKeywords(textForKeywordInference);

  if (kindFromKeywords) {
    return kindFromKeywords;
  }

  return 'IDEA';
}

function inferSurfacesFromIssue(
  labelNames: string[],
  text: string
): GitHubIssueSurface[] {
  const surfaceSet = new Set<GitHubIssueSurface>();

  for (const labelName of labelNames) {
    const mappedSurface = surfaceLabelMap[labelName];

    if (mappedSurface) {
      surfaceSet.add(mappedSurface);
    }
  }

  if (surfaceSet.size > 0) {
    return Array.from(surfaceSet);
  }

  for (const entry of issueKeywordSurfaceMap) {
    if (includesKeyword(text, entry.keywords)) {
      surfaceSet.add(entry.surface);
    }
  }

  return Array.from(surfaceSet);
}

export function classifyIssue(
  issue: GitHubIssueListItem
): GitHubIssueClassification {
  const labelNames = extractNormalizedIssueLabelNames(issue);
  const title = normalizeIssueTitle(issue.title, issue.number);
  const normalizedTitle = title.toLowerCase();
  const body = (issue.body ?? '').toLowerCase();

  return {
    currentLabels: labelNames,
    githubIssueNumber: issue.number,
    kind: inferKindFromIssue(labelNames, normalizedTitle, body),
    priorityScore: pickMappedLabelValue(labelNames, issuePriorityScoreLabelMap),
    riskLevel: pickMappedLabelValue(labelNames, issueRiskLabelMap),
    source: inferSourceFromIssue(labelNames, normalizedTitle, issue),
    state: pickMappedLabelValue(labelNames, issueStateLabelMap) ?? 'TRIAGE',
    surfaces: inferSurfacesFromIssue(labelNames, `${normalizedTitle}\n${body}`),
    title
  };
}
