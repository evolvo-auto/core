import type { ModelProvider, RoleName } from '@evolvo/core/model-routing-config';
import type { z } from 'zod';

export const modelResponseModes = ['text', 'json'] as const;
export type ModelResponseMode = (typeof modelResponseModes)[number];

export type ModelInvocationMetadata = Record<string, unknown>;

export type ModelProviderInvocationRequest<TOutput = unknown> = {
  maxRetries?: number;
  maxTokens?: number;
  metadata?: ModelInvocationMetadata;
  model: string;
  responseMode?: ModelResponseMode;
  role: RoleName;
  schema?: z.ZodType<TOutput>;
  systemPrompt?: string;
  temperature?: number;
  timeoutMs?: number;
  userPrompt: string;
};

export type ModelProviderInvocationResult<TOutput = unknown> = {
  attempts: number;
  durationMs: number;
  metadata?: ModelInvocationMetadata;
  model: string;
  output: TOutput;
  provider: ModelProvider;
  rawText: string;
  responseMode: ModelResponseMode;
  role: RoleName;
};

export type ModelProviderClient = {
  invoke<TOutput = unknown>(
    request: ModelProviderInvocationRequest<TOutput>
  ): Promise<ModelProviderInvocationResult<TOutput>>;
  provider: ModelProvider;
};

export type ProviderInvocationRequest<TOutput = unknown> = Omit<
  ModelProviderInvocationRequest<TOutput>,
  'maxRetries' | 'responseMode' | 'systemPrompt' | 'timeoutMs' | 'userPrompt'
> & {
  maxRetries: number;
  responseMode: ModelResponseMode;
  systemPrompt?: string;
  timeoutMs?: number;
  userPrompt: string;
};

export type ProviderInvokeOnce = <TOutput = unknown>(
  request: ProviderInvocationRequest<TOutput>,
  signal: AbortSignal | undefined
) => Promise<string>;

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
    maxRetries: normalizeRetryCount(request.maxRetries),
    maxTokens: normalizeMaxTokens(request.maxTokens),
    metadata: request.metadata,
    model: normalizeRequiredText(request.model, 'model'),
    responseMode: resolveResponseMode(request),
    role: request.role,
    schema: request.schema,
    systemPrompt: normalizeOptionalText(request.systemPrompt),
    temperature: normalizeTemperature(request.temperature),
    timeoutMs: normalizeTimeout(request.timeoutMs),
    userPrompt: normalizeRequiredText(request.userPrompt, 'userPrompt')
  };
}

function parseStructuredOutput<TOutput = unknown>(
  rawText: string,
  request: ProviderInvocationRequest<TOutput>
): TOutput {
  if (!request.schema && request.responseMode === 'text') {
    return rawText as TOutput;
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(rawText);
  } catch (error) {
    const parseError =
      error instanceof Error ? error.message : 'Unknown JSON parse failure.';

    throw new Error(
      `Model invocation expected JSON output but received invalid JSON: ${parseError}`
    );
  }

  if (!request.schema) {
    return parsedJson as TOutput;
  }

  return request.schema.parse(parsedJson);
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
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
  const maxAttempts = normalizedRequest.maxRetries + 1;
  const startedAt = Date.now();
  let attempts = 0;
  let latestError: unknown;

  while (attempts < maxAttempts) {
    attempts += 1;
    const { clearTimeoutHandle, signal } = createAbortSignal(
      normalizedRequest.timeoutMs
    );

    try {
      const rawText = await invokeOnce(normalizedRequest, signal);
      const output = parseStructuredOutput(rawText, normalizedRequest);

      return {
        attempts,
        durationMs: Date.now() - startedAt,
        metadata: normalizedRequest.metadata,
        model: normalizedRequest.model,
        output,
        provider,
        rawText,
        responseMode: normalizedRequest.responseMode,
        role: normalizedRequest.role
      };
    } catch (error) {
      latestError = error;
    } finally {
      clearTimeoutHandle();
    }
  }

  throw buildInvocationFailureError(
    provider,
    normalizedRequest.model,
    attempts,
    latestError
  );
}
