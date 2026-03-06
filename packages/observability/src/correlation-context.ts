const correlationIdKeys = [
  'attemptId',
  'runtimeVersionId',
  'worktreeId'
] as const;

export type CorrelationContext = {
  issueNumber?: number;
  attemptId?: string;
  runtimeVersionId?: string;
  worktreeId?: string;
};

function normalizeIssueNumber(issueNumber: number): number {
  if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
    throw new TypeError('issueNumber must be a positive integer');
  }

  return issueNumber;
}

function normalizeCorrelationId(
  key: (typeof correlationIdKeys)[number],
  value: string
): string {
  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    throw new TypeError(`${key} must be a non-empty string`);
  }

  return trimmedValue;
}

export function normalizeCorrelationContext(
  context: CorrelationContext = {}
): CorrelationContext {
  const normalizedContext: CorrelationContext = {};

  if (context.issueNumber !== undefined) {
    normalizedContext.issueNumber = normalizeIssueNumber(context.issueNumber);
  }

  for (const key of correlationIdKeys) {
    const value = context[key];

    if (value !== undefined) {
      normalizedContext[key] = normalizeCorrelationId(key, value);
    }
  }

  return normalizedContext;
}

export function mergeCorrelationContexts(
  ...contexts: Array<CorrelationContext | undefined>
): CorrelationContext {
  const mergedContext: CorrelationContext = {};

  for (const context of contexts) {
    if (context === undefined) {
      continue;
    }

    const normalizedContext = normalizeCorrelationContext(context);

    if (normalizedContext.issueNumber !== undefined) {
      mergedContext.issueNumber = normalizedContext.issueNumber;
    }

    for (const key of correlationIdKeys) {
      const value = normalizedContext[key];

      if (value !== undefined) {
        mergedContext[key] = value;
      }
    }
  }

  return mergedContext;
}
