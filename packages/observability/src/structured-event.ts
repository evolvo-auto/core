import { z } from 'zod';

import {
  normalizeCorrelationContext,
  type CorrelationContext
} from './correlation-context.js';

const nonEmptyStringSchema = z.string().trim().min(1);

export const logLevels = ['debug', 'info', 'warn', 'error'] as const;
export const logLevelSchema = z.enum(logLevels);
export type LogLevel = z.infer<typeof logLevelSchema>;

export const correlationContextSchema = z.object({
  issueNumber: z.number().int().positive().optional(),
  attemptId: nonEmptyStringSchema.optional(),
  runtimeVersionId: nonEmptyStringSchema.optional(),
  worktreeId: nonEmptyStringSchema.optional()
});
export type StructuredCorrelationContext = z.infer<
  typeof correlationContextSchema
>;

export const structuredEventErrorSchema = z.object({
  name: nonEmptyStringSchema,
  message: nonEmptyStringSchema,
  code: nonEmptyStringSchema.optional(),
  stack: nonEmptyStringSchema.optional()
});
export type StructuredEventError = z.infer<typeof structuredEventErrorSchema>;

export const structuredEventSchema = z.object({
  timestamp: z.string().datetime({ offset: true }),
  level: logLevelSchema,
  eventName: nonEmptyStringSchema,
  source: nonEmptyStringSchema,
  message: nonEmptyStringSchema,
  correlationIds: correlationContextSchema,
  data: z.record(z.string(), z.unknown()).optional(),
  error: structuredEventErrorSchema.optional()
});
export type StructuredEvent = z.infer<typeof structuredEventSchema>;

export type CreateStructuredEventInput = {
  data?: Record<string, unknown>;
  error?: unknown;
  eventName: string;
  correlationIds?: CorrelationContext;
  level: LogLevel;
  message: string;
  source: string;
};

type CreateStructuredEventOptions = {
  now?: () => Date;
};

function normalizeErrorCode(error: object): string | undefined {
  const { code } = error as { code?: unknown };

  if (code === undefined) {
    return undefined;
  }

  return String(code);
}

function describeUnknownError(error: unknown): string {
  if (typeof error === 'string') {
    return error.trim().length > 0 ? error.trim() : 'Unknown error';
  }

  if (error instanceof Error) {
    return error.message.trim().length > 0 ? error.message : error.name;
  }

  if (error && typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch {
      return '[unserializable error payload]';
    }
  }

  return String(error);
}

export function normalizeStructuredEventError(
  error: unknown
): StructuredEventError {
  if (error instanceof Error) {
    return structuredEventErrorSchema.parse({
      name: error.name,
      message: error.message,
      code: normalizeErrorCode(error),
      stack: error.stack
    });
  }

  if (error && typeof error === 'object') {
    const candidateError = error as {
      message?: unknown;
      name?: unknown;
      stack?: unknown;
    };

    return structuredEventErrorSchema.parse({
      name:
        typeof candidateError.name === 'string' ? candidateError.name : 'Error',
      message:
        typeof candidateError.message === 'string'
          ? candidateError.message
          : describeUnknownError(error),
      code: normalizeErrorCode(error),
      stack:
        typeof candidateError.stack === 'string'
          ? candidateError.stack
          : undefined
    });
  }

  return structuredEventErrorSchema.parse({
    name: 'Error',
    message: describeUnknownError(error)
  });
}

export function createStructuredEvent(
  input: CreateStructuredEventInput,
  options: CreateStructuredEventOptions = {}
): StructuredEvent {
  return structuredEventSchema.parse({
    timestamp: (options.now ?? (() => new Date()))().toISOString(),
    level: input.level,
    eventName: input.eventName,
    source: input.source,
    message: input.message,
    correlationIds: normalizeCorrelationContext(input.correlationIds),
    data: input.data,
    error:
      input.error === undefined
        ? undefined
        : normalizeStructuredEventError(input.error)
  });
}

export function serializeStructuredEvent(event: StructuredEvent): string {
  return JSON.stringify(structuredEventSchema.parse(event));
}
