import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadConfig } from '@evolvo/core/config-loader';

import {
  invokeWithRetryAndTimeout,
  type ModelProviderClient,
  type ModelProviderInvocationRequest,
  type ProviderInvocationRequest
} from './model-provider.js';

const emptyObject = {};

type OpenAITextFormat =
  | {
      type: 'json_object';
    }
  | {
      type: 'text';
    };

type OpenAIResponseOutputText = {
  text: string;
  type: 'output_text';
};

type OpenAIRequestPayload = {
  input: string;
  instructions?: string;
  max_output_tokens?: number;
  model: string;
  text?: {
    format: OpenAITextFormat;
  };
  temperature?: number;
};

export const modelsWorkspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../..'
);

export type CreateOpenAIProviderOptions = {
  apiKey?: string;
  baseUrl?: string;
  fetchImplementation?: typeof fetch;
  workspaceRoot?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeBaseUrl(baseUrl: string): string {
  const normalizedBaseUrl = baseUrl.trim();

  if (!normalizedBaseUrl) {
    throw new Error('OpenAI baseUrl is required.');
  }

  return normalizedBaseUrl.replace(/\/+$/, '');
}

function normalizeApiKey(apiKey: string): string {
  const normalizedApiKey = apiKey.trim();

  if (!normalizedApiKey) {
    throw new Error('OpenAI API key is required.');
  }

  return normalizedApiKey;
}

function buildOpenAIRequestPayload(
  request: ProviderInvocationRequest
): OpenAIRequestPayload {
  return {
    input: request.userPrompt,
    ...(request.systemPrompt ? { instructions: request.systemPrompt } : {}),
    ...(request.maxTokens ? { max_output_tokens: request.maxTokens } : {}),
    model: request.model,
    ...(request.responseMode === 'json'
      ? {
          text: {
            format: {
              type: 'json_object'
            }
          }
        }
      : {}),
    ...(request.temperature !== undefined
      ? { temperature: request.temperature }
      : {})
  };
}

function extractOpenAIResponseText(responseBody: unknown): string {
  if (!isRecord(responseBody)) {
    throw new Error('OpenAI response body must be an object.');
  }

  const output = responseBody.output;

  if (!Array.isArray(output) || output.length === 0) {
    throw new Error('OpenAI response did not include any output items.');
  }

  const outputTexts = output.flatMap((item) => {
    if (!isRecord(item) || item.type !== 'message') {
      return [];
    }

    const content = item.content;

    if (!Array.isArray(content)) {
      return [];
    }

    return content.flatMap((part): OpenAIResponseOutputText[] => {
      if (
        !isRecord(part) ||
        part.type !== 'output_text' ||
        typeof part.text !== 'string'
      ) {
        return [];
      }

      return [
        {
          text: part.text,
          type: 'output_text'
        }
      ];
    });
  });

  const contentFromParts = outputTexts
    .map((part) => part.text)
    .join('')
    .trim();

  if (!contentFromParts) {
    throw new Error('OpenAI response did not include any output_text content.');
  }

  return contentFromParts;
}

function extractErrorMessage(payload: unknown): string | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  if (typeof payload.error === 'string') {
    return payload.error;
  }

  if (isRecord(payload.error) && typeof payload.error.message === 'string') {
    return payload.error.message;
  }

  if (typeof payload.message === 'string') {
    return payload.message;
  }

  return undefined;
}

async function extractHttpErrorMessage(response: Response): Promise<string> {
  const responseText = (await response.text()).trim();

  if (!responseText) {
    return `OpenAI API request failed with status ${response.status}.`;
  }

  try {
    const parsedResponse = JSON.parse(responseText);
    const errorMessage = extractErrorMessage(parsedResponse);

    if (errorMessage) {
      return `OpenAI API request failed with status ${response.status}: ${errorMessage}`;
    }
  } catch {
    // Fallback to plain text error body.
  }

  return `OpenAI API request failed with status ${response.status}: ${responseText}`;
}

export function createOpenAIProvider(
  options: CreateOpenAIProviderOptions = {}
): ModelProviderClient {
  const shouldLoadConfig =
    options.baseUrl === undefined || options.apiKey === undefined;
  const openAiConfig = shouldLoadConfig
    ? loadConfig({
        cwd: options.workspaceRoot ?? modelsWorkspaceRoot
      }).openai
    : undefined;
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? openAiConfig?.baseUrl ?? '');
  const apiKey = normalizeApiKey(options.apiKey ?? openAiConfig?.apiKey ?? '');
  const fetchImplementation = options.fetchImplementation ?? fetch;

  return {
    invoke: async <TOutput = unknown>(
      request: ModelProviderInvocationRequest<TOutput>
    ) =>
      invokeWithRetryAndTimeout('openai', request, async (nextRequest, signal) => {
        const response = await fetchImplementation(`${baseUrl}/responses`, {
          body: JSON.stringify(buildOpenAIRequestPayload(nextRequest)),
          headers: {
            authorization: `Bearer ${apiKey}`,
            'content-type': 'application/json'
          },
          method: 'POST',
          signal
        });

        if (!response.ok) {
          throw new Error(await extractHttpErrorMessage(response));
        }

        const responseBody = await response.json().catch(() => emptyObject);

        return extractOpenAIResponseText(responseBody);
      }),
    provider: 'openai'
  };
}
