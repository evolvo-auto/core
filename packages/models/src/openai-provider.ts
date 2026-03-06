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

type OpenAIMessage = {
  content: string;
  role: 'system' | 'user';
};

type OpenAIRequestPayload = {
  max_completion_tokens?: number;
  messages: OpenAIMessage[];
  model: string;
  response_format?: {
    type: 'json_object';
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

function buildMessages(
  systemPrompt: string | undefined,
  userPrompt: string
): OpenAIMessage[] {
  const messages: OpenAIMessage[] = [];

  if (systemPrompt) {
    messages.push({
      content: systemPrompt,
      role: 'system'
    });
  }

  messages.push({
    content: userPrompt,
    role: 'user'
  });

  return messages;
}

function buildOpenAIRequestPayload(
  request: ProviderInvocationRequest
): OpenAIRequestPayload {
  return {
    ...(request.maxTokens ? { max_completion_tokens: request.maxTokens } : {}),
    messages: buildMessages(request.systemPrompt, request.userPrompt),
    model: request.model,
    ...(request.responseMode === 'json'
      ? {
          response_format: {
            type: 'json_object'
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

  const choices = responseBody.choices;

  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error('OpenAI response did not include any choices.');
  }

  const firstChoice = choices[0];

  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) {
    throw new Error('OpenAI response did not include a message payload.');
  }

  const content = firstChoice.message.content;

  if (typeof content === 'string') {
    const normalizedContent = content.trim();

    if (!normalizedContent) {
      throw new Error('OpenAI response message content was empty.');
    }

    return normalizedContent;
  }

  if (!Array.isArray(content)) {
    throw new Error('OpenAI response message content was not string-like.');
  }

  const contentFromParts = content
    .map((part) => {
      if (!isRecord(part) || typeof part.text !== 'string') {
        return '';
      }

      return part.text;
    })
    .join('')
    .trim();

  if (!contentFromParts) {
    throw new Error('OpenAI response message content parts were empty.');
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
        const response = await fetchImplementation(`${baseUrl}/chat/completions`, {
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
