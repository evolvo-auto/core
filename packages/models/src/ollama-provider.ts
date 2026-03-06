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

type OllamaMessage = {
  content: string;
  role: 'system' | 'user';
};

type OllamaRequestPayload = {
  format?: 'json';
  messages: OllamaMessage[];
  model: string;
  options?: {
    num_predict?: number;
    temperature?: number;
  };
  stream: false;
};

export const modelsWorkspaceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../..'
);

export type CreateOllamaProviderOptions = {
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
    throw new Error('Ollama baseUrl is required.');
  }

  return normalizedBaseUrl.replace(/\/+$/, '');
}

function buildMessages(
  systemPrompt: string | undefined,
  userPrompt: string
): OllamaMessage[] {
  const messages: OllamaMessage[] = [];

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

function buildOllamaRequestPayload(
  request: ProviderInvocationRequest
): OllamaRequestPayload {
  const options: OllamaRequestPayload['options'] = {
    ...(request.maxTokens ? { num_predict: request.maxTokens } : {}),
    ...(request.temperature !== undefined
      ? { temperature: request.temperature }
      : {})
  };

  return {
    ...(request.responseMode === 'json' ? { format: 'json' } : {}),
    messages: buildMessages(request.systemPrompt, request.userPrompt),
    model: request.model,
    ...(Object.keys(options).length > 0 ? { options } : {}),
    stream: false
  };
}

function extractOllamaResponseText(responseBody: unknown): string {
  if (!isRecord(responseBody) || !isRecord(responseBody.message)) {
    throw new Error('Ollama response did not include a message payload.');
  }

  const content = responseBody.message.content;

  if (typeof content !== 'string') {
    throw new Error('Ollama response message content was not a string.');
  }

  const normalizedContent = content.trim();

  if (!normalizedContent) {
    throw new Error('Ollama response message content was empty.');
  }

  return normalizedContent;
}

function extractErrorMessage(payload: unknown): string | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  if (typeof payload.error === 'string') {
    return payload.error;
  }

  if (typeof payload.message === 'string') {
    return payload.message;
  }

  return undefined;
}

async function extractHttpErrorMessage(response: Response): Promise<string> {
  const responseText = (await response.text()).trim();

  if (!responseText) {
    return `Ollama API request failed with status ${response.status}.`;
  }

  try {
    const parsedResponse = JSON.parse(responseText);
    const errorMessage = extractErrorMessage(parsedResponse);

    if (errorMessage) {
      return `Ollama API request failed with status ${response.status}: ${errorMessage}`;
    }
  } catch {
    // Fallback to plain text response body.
  }

  return `Ollama API request failed with status ${response.status}: ${responseText}`;
}

export function createOllamaProvider(
  options: CreateOllamaProviderOptions = {}
): ModelProviderClient {
  const shouldLoadConfig = options.baseUrl === undefined;
  const ollamaConfig = shouldLoadConfig
    ? loadConfig({
        cwd: options.workspaceRoot ?? modelsWorkspaceRoot
      }).ollama
    : undefined;
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? ollamaConfig?.baseUrl ?? '');
  const fetchImplementation = options.fetchImplementation ?? fetch;

  return {
    invoke: async <TOutput = unknown>(
      request: ModelProviderInvocationRequest<TOutput>
    ) =>
      invokeWithRetryAndTimeout('ollama', request, async (nextRequest, signal) => {
        const response = await fetchImplementation(`${baseUrl}/api/chat`, {
          body: JSON.stringify(buildOllamaRequestPayload(nextRequest)),
          headers: {
            'content-type': 'application/json'
          },
          method: 'POST',
          signal
        });

        if (!response.ok) {
          throw new Error(await extractHttpErrorMessage(response));
        }

        const responseBody = await response.json().catch(() => emptyObject);

        return extractOllamaResponseText(responseBody);
      }),
    provider: 'ollama'
  };
}
