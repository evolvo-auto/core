import { createHash } from 'node:crypto';

import { createModelInvocation } from '@evolvo/api/model-invocation';
import type { ModelProvider, RoleName } from '@evolvo/core/model-routing-config';
import { ZodError, type z } from 'zod';

export const modelResponseModes = ['text', 'json'] as const;
export type ModelResponseMode = (typeof modelResponseModes)[number];

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = {
  [key: string]: JsonValue;
};

export type ModelInvocationMetadata = JsonObject;

export type ModelProviderInvocationRequest<TOutput = unknown> = {
  attemptId?: string;
  costEstimate?: number;
  fallbackUsed?: boolean;
  maxRetries?: number;
  maxTokens?: number;
  metadata?: ModelInvocationMetadata;
  model: string;
  persistMetrics?: boolean;
  responseMode?: ModelResponseMode;
  role: RoleName;
  schema?: z.ZodType<TOutput>;
  systemPrompt?: string;
  taskKind?: string;
  temperature?: number;
  timeoutMs?: number;
  userPrompt: string;
};

export type ModelProviderInvocationResult<TOutput = unknown> = {
  attempts: number;
  durationMs: number;
  fallbackUsed: boolean;
  metadata?: ModelInvocationMetadata;
  model: string;
  output: TOutput;
  provider: ModelProvider;
  rawText: string;
  repairAttempted: boolean;
  repairSucceeded: boolean;
  responseMode: ModelResponseMode;
  role: RoleName;
  schemaValid: boolean | null;
  taskKind: string;
};

export type ModelProviderClient = {
  invoke<TOutput = unknown>(
    request: ModelProviderInvocationRequest<TOutput>
  ): Promise<ModelProviderInvocationResult<TOutput>>;
  provider: ModelProvider;
};

export type ProviderInvocationRequest<TOutput = unknown> = Omit<
  ModelProviderInvocationRequest<TOutput>,
  | 'costEstimate'
  | 'maxRetries'
  | 'persistMetrics'
  | 'responseMode'
  | 'systemPrompt'
  | 'taskKind'
  | 'timeoutMs'
  | 'userPrompt'
> & {
  costEstimate?: number;
  fallbackUsed: boolean;
  maxRetries: number;
  persistMetrics: boolean;
  responseMode: ModelResponseMode;
  systemPrompt?: string;
  taskKind: string;
  timeoutMs?: number;
  userPrompt: string;
};

export type ProviderInvokeOnce = <TOutput = unknown>(
  request: ProviderInvocationRequest<TOutput>,
  signal: AbortSignal | undefined
) => Promise<string>;

class StructuredOutputValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StructuredOutputValidationError';
  }
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return undefined;
  }

  return normalizedValue;
}

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`Model invocation ${fieldName} is required.`);
  }

  return normalizedValue;
}

function normalizeTaskKind(taskKind: string | undefined): string {
  return normalizeRequiredText(taskKind ?? 'general', 'taskKind');
}

function normalizeRetryCount(maxRetries: number | undefined): number {
  if (maxRetries === undefined) {
    return 0;
  }

  if (!Number.isInteger(maxRetries) || maxRetries < 0) {
    throw new Error(
      'Model invocation maxRetries must be a non-negative integer.'
    );
  }

  return maxRetries;
}

function normalizeTimeout(timeoutMs: number | undefined): number | undefined {
  if (timeoutMs === undefined) {
    return undefined;
  }

  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('Model invocation timeoutMs must be a positive integer.');
  }

  return timeoutMs;
}

function normalizeMaxTokens(maxTokens: number | undefined): number | undefined {
  if (maxTokens === undefined) {
    return undefined;
  }

  if (!Number.isInteger(maxTokens) || maxTokens <= 0) {
    throw new Error('Model invocation maxTokens must be a positive integer.');
  }

  return maxTokens;
}

function normalizeTemperature(
  temperature: number | undefined
): number | undefined {
  if (temperature === undefined) {
    return undefined;
  }

  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 1) {
    throw new Error('Model invocation temperature must be between 0 and 1.');
  }

  return temperature;
}

function normalizeCostEstimate(
  costEstimate: number | undefined
): number | undefined {
  if (costEstimate === undefined) {
    return undefined;
  }

  if (!Number.isFinite(costEstimate) || costEstimate < 0) {
    throw new Error('Model invocation costEstimate must be non-negative.');
  }

  return costEstimate;
}

function resolveResponseMode(
  request: ModelProviderInvocationRequest<unknown>
): ModelResponseMode {
  const responseMode = request.responseMode ?? (request.schema ? 'json' : 'text');

  if (request.schema && responseMode !== 'json') {
    throw new Error('Model invocation schema requires json response mode.');
  }

  return responseMode;
}

function normalizeInvocationRequest<TOutput = unknown>(
  request: ModelProviderInvocationRequest<TOutput>
): ProviderInvocationRequest<TOutput> {
  return {
    attemptId: normalizeOptionalText(request.attemptId),
    costEstimate: normalizeCostEstimate(request.costEstimate),
    fallbackUsed: request.fallbackUsed ?? false,
    maxRetries: normalizeRetryCount(request.maxRetries),
    maxTokens: normalizeMaxTokens(request.maxTokens),
    metadata: request.metadata,
    model: normalizeRequiredText(request.model, 'model'),
    persistMetrics: request.persistMetrics ?? true,
    responseMode: resolveResponseMode(request),
    role: request.role,
    schema: request.schema,
    systemPrompt: normalizeOptionalText(request.systemPrompt),
    taskKind: normalizeTaskKind(request.taskKind),
    temperature: normalizeTemperature(request.temperature),
    timeoutMs: normalizeTimeout(request.timeoutMs),
    userPrompt: normalizeRequiredText(request.userPrompt, 'userPrompt')
  };
}

function parseStructuredOutput<TOutput = unknown>(
  rawText: string,
  request: ProviderInvocationRequest<TOutput>
): {
  output: TOutput;
  schemaValid: boolean | null;
} {
  if (!request.schema && request.responseMode === 'text') {
    return {
      output: rawText as TOutput,
      schemaValid: null
    };
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(rawText);
  } catch (error) {
    const parseError =
      error instanceof Error ? error.message : 'Unknown JSON parse failure.';

    throw new StructuredOutputValidationError(
      `Model invocation expected JSON output but received invalid JSON: ${parseError}`
    );
  }

  if (!request.schema) {
    return {
      output: parsedJson as TOutput,
      schemaValid: true
    };
  }

  try {
    return {
      output: request.schema.parse(parsedJson),
      schemaValid: true
    };
  } catch (error) {
    if (error instanceof ZodError) {
      throw new StructuredOutputValidationError(
        `Model invocation schema validation failed: ${error.issues
          .map((issue) => {
            const path =
              issue.path.length > 0 ? issue.path.join('.') : '<root>';

            return `${path}: ${issue.message}`;
          })
          .join('; ')}`
      );
    }

    throw error;
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function buildPromptHash(
  systemPrompt: string | undefined,
  userPrompt: string
): string {
  const hash = createHash('sha256');
  hash.update(systemPrompt ?? '');
  hash.update('\n\n');
  hash.update(userPrompt);

  return hash.digest('hex');
}

function buildRepairUserPrompt(
  request: ProviderInvocationRequest,
  invalidRawText: string,
  validationErrorMessage: string
): string {
  return [
    'You previously returned output that did not satisfy the required JSON contract.',
    'Return only valid JSON with no markdown, no thinking, and no additional commentary.',
    'Do not omit required keys.',
    'If a required array has no items, return an empty array [].',
    'If a required boolean is uncertain, return false rather than omitting the key.',
    'If a required string is uncertain, infer the safest non-empty string from the original prompt.',
    'Enum fields must use one of the allowed literal values exactly as shown in the validation error.',
    '',
    `Role: ${request.role}`,
    `Task kind: ${request.taskKind}`,
    `Validation error: ${validationErrorMessage}`,
    '',
    'Original prompt:',
    request.userPrompt,
    '',
    'Invalid output:',
    invalidRawText
  ].join('\n');
}

function buildRepairRequest<TOutput = unknown>(
  request: ProviderInvocationRequest<TOutput>,
  invalidRawText: string,
  validationErrorMessage: string
): ProviderInvocationRequest<TOutput> {
  return {
    ...request,
    responseMode: 'json',
    systemPrompt: request.systemPrompt
      ? `${request.systemPrompt}\n\nYou must return strictly valid JSON with every required key present.`
      : 'Return strictly valid JSON with every required key present.',
    userPrompt: buildRepairUserPrompt(
      request,
      invalidRawText,
      validationErrorMessage
    )
  };
}

function buildInvocationMetadata(
  request: ProviderInvocationRequest,
  options: {
    attempts: number;
    failureError?: unknown;
    repairAttempted: boolean;
    repairSucceeded: boolean;
    schemaValid: boolean | null;
    validationErrorMessage?: string;
  }
): ModelInvocationMetadata {
  const metadata: ModelInvocationMetadata = {
    ...(request.metadata ?? {}),
    attempts: options.attempts,
    repairAttempted: options.repairAttempted,
    repairSucceeded: options.repairSucceeded,
    responseMode: request.responseMode,
    schemaValid: options.schemaValid
  };

  if (options.validationErrorMessage) {
    metadata.validationErrorMessage = options.validationErrorMessage;
  }

  if (options.failureError) {
    metadata.failureError = toErrorMessage(options.failureError);
  }

  return metadata;
}

async function persistModelInvocationMetrics(
  provider: ModelProvider,
  request: ProviderInvocationRequest,
  options: {
    attempts: number;
    durationMs: number;
    failureError?: unknown;
    repairAttempted: boolean;
    repairSucceeded: boolean;
    schemaValid: boolean | null;
    success: boolean;
    validationErrorMessage?: string;
  }
): Promise<void> {
  if (!request.persistMetrics) {
    return;
  }

  try {
    await createModelInvocation({
      attemptId: request.attemptId,
      costEstimate: request.costEstimate,
      durationMs: options.durationMs,
      fallbackUsed: request.fallbackUsed,
      metadataJson: buildInvocationMetadata(request, options),
      model: request.model,
      promptHash: buildPromptHash(request.systemPrompt, request.userPrompt),
      provider,
      role: request.role,
      schemaValid: options.schemaValid,
      success: options.success,
      taskKind: request.taskKind
    });
  } catch {
    // Model invocation metrics are best-effort and must not break execution flow.
  }
}

function createAbortSignal(timeoutMs: number | undefined): {
  clearTimeoutHandle: () => void;
  signal: AbortSignal | undefined;
} {
  if (timeoutMs === undefined) {
    return {
      clearTimeoutHandle: () => {},
      signal: undefined
    };
  }

  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => {
    abortController.abort(new Error(`Request timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  return {
    clearTimeoutHandle: () => {
      clearTimeout(timeoutHandle);
    },
    signal: abortController.signal
  };
}

function buildInvocationFailureError(
  provider: ModelProvider,
  model: string,
  attempts: number,
  error: unknown
): Error {
  return new Error(
    `${provider} model invocation failed for model "${model}" after ${attempts} attempt(s): ${toErrorMessage(error)}`
  );
}

export async function invokeWithRetryAndTimeout<TOutput = unknown>(
  provider: ModelProvider,
  request: ModelProviderInvocationRequest<TOutput>,
  invokeOnce: ProviderInvokeOnce
): Promise<ModelProviderInvocationResult<TOutput>> {
  const normalizedRequest = normalizeInvocationRequest(request);
  const maxPrimaryAttempts = normalizedRequest.maxRetries + 1;
  const startedAt = Date.now();
  let attempts = 0;
  let repairAttempted = false;
  let repairSucceeded = false;
  let sawStructuredValidationFailure = false;
  let validationErrorMessage: string | undefined;
  let latestError: unknown;

  for (
    let primaryAttempt = 0;
    primaryAttempt < maxPrimaryAttempts;
    primaryAttempt += 1
  ) {
    const { clearTimeoutHandle, signal } = createAbortSignal(
      normalizedRequest.timeoutMs
    );

    try {
      attempts += 1;
      const rawText = await invokeOnce(normalizedRequest, signal);

      try {
        const parsedOutput = parseStructuredOutput(rawText, normalizedRequest);
        const durationMs = Date.now() - startedAt;

        await persistModelInvocationMetrics(provider, normalizedRequest, {
          attempts,
          durationMs,
          repairAttempted,
          repairSucceeded,
          schemaValid: parsedOutput.schemaValid,
          success: true,
          validationErrorMessage
        });

        return {
          attempts,
          durationMs,
          fallbackUsed: normalizedRequest.fallbackUsed,
          metadata: normalizedRequest.metadata,
          model: normalizedRequest.model,
          output: parsedOutput.output,
          provider,
          rawText,
          repairAttempted,
          repairSucceeded,
          responseMode: normalizedRequest.responseMode,
          role: normalizedRequest.role,
          schemaValid: parsedOutput.schemaValid,
          taskKind: normalizedRequest.taskKind
        };
      } catch (error) {
        if (
          !(error instanceof StructuredOutputValidationError) ||
          normalizedRequest.responseMode !== 'json'
        ) {
          throw error;
        }

        repairAttempted = true;
        sawStructuredValidationFailure = true;
        validationErrorMessage = error.message;

        attempts += 1;
        const repairedRawText = await invokeOnce(
          buildRepairRequest(normalizedRequest, rawText, error.message),
          signal
        );
        const repairedOutput = parseStructuredOutput(
          repairedRawText,
          normalizedRequest
        );
        const durationMs = Date.now() - startedAt;

        repairSucceeded = true;

        await persistModelInvocationMetrics(provider, normalizedRequest, {
          attempts,
          durationMs,
          repairAttempted,
          repairSucceeded,
          schemaValid: repairedOutput.schemaValid,
          success: true,
          validationErrorMessage
        });

        return {
          attempts,
          durationMs,
          fallbackUsed: normalizedRequest.fallbackUsed,
          metadata: normalizedRequest.metadata,
          model: normalizedRequest.model,
          output: repairedOutput.output,
          provider,
          rawText: repairedRawText,
          repairAttempted,
          repairSucceeded,
          responseMode: normalizedRequest.responseMode,
          role: normalizedRequest.role,
          schemaValid: repairedOutput.schemaValid,
          taskKind: normalizedRequest.taskKind
        };
      }
    } catch (error) {
      latestError = error;

      if (error instanceof StructuredOutputValidationError) {
        sawStructuredValidationFailure = true;
        validationErrorMessage = error.message;
      }
    } finally {
      clearTimeoutHandle();
    }
  }

  const durationMs = Date.now() - startedAt;

  await persistModelInvocationMetrics(provider, normalizedRequest, {
    attempts,
    durationMs,
    failureError: latestError,
    repairAttempted,
    repairSucceeded,
    schemaValid: sawStructuredValidationFailure ? false : null,
    success: false,
    validationErrorMessage
  });

  throw buildInvocationFailureError(
    provider,
    normalizedRequest.model,
    attempts,
    latestError
  );
}
