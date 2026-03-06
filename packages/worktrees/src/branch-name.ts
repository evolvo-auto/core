const branchPrefix = 'issue';
const defaultFallbackSlug = 'work-item';
const defaultMaxBranchNameLength = 80;

export type MakeIssueBranchNameOptions = {
  fallbackSlug?: string;
  maxLength?: number;
};

function normalizeIssueNumber(issueNumber: number): number {
  if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
    throw new Error('Issue number must be a positive integer.');
  }

  return issueNumber;
}

function normalizeMaxLength(maxLength: number | undefined): number {
  const resolvedMaxLength = maxLength ?? defaultMaxBranchNameLength;

  if (!Number.isInteger(resolvedMaxLength) || resolvedMaxLength <= 0) {
    throw new Error('Branch maxLength must be a positive integer.');
  }

  return resolvedMaxLength;
}

function normalizeSlugSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.'’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function trimSlugToLength(slug: string, maxLength: number): string {
  if (slug.length <= maxLength) {
    return slug;
  }

  const trimmedSlug = slug.slice(0, maxLength).replace(/-+$/g, '');

  if (trimmedSlug.length > 0) {
    return trimmedSlug;
  }

  return slug.slice(0, maxLength);
}

function resolveSlug(
  title: string,
  fallbackSlug: string,
  maxSlugLength: number
): string {
  const normalizedTitleSlug = normalizeSlugSegment(title);
  const normalizedFallbackSlug =
    normalizeSlugSegment(fallbackSlug) || defaultFallbackSlug;
  const candidateSlug = normalizedTitleSlug || normalizedFallbackSlug;
  const trimmedSlug = trimSlugToLength(candidateSlug, maxSlugLength);

  if (!trimmedSlug) {
    throw new Error('Unable to derive a branch slug from issue title.');
  }

  return trimmedSlug;
}

export function makeIssueBranchName(
  issueNumber: number,
  title: string,
  options: MakeIssueBranchNameOptions = {}
): string {
  const normalizedIssueNumber = normalizeIssueNumber(issueNumber);
  const maxLength = normalizeMaxLength(options.maxLength);
  const prefix = `${branchPrefix}/${normalizedIssueNumber}-`;
  const maxSlugLength = maxLength - prefix.length;

  if (maxSlugLength < 1) {
    throw new Error(
      `Branch maxLength "${maxLength}" is too short for issue prefix "${prefix}".`
    );
  }

  const slug = resolveSlug(title, options.fallbackSlug ?? defaultFallbackSlug, maxSlugLength);

  return `${prefix}${slug}`;
}
