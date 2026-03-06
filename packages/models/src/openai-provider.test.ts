import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createOpenAIProvider } from './openai-provider.js';

describe('openai provider', () => {
  it('invokes chat completions for freeform text output', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: 'Generated answer'
              }
            }
          ]
        }),
        {
          status: 200
        }
      )
    );
    const provider = createOpenAIProvider({
      apiKey: 'openai-token',
      baseUrl: 'https://api.openai.com/v1/',
      fetchImplementation: fetchMock as unknown as typeof fetch
    });

    const result = await provider.invoke({
      maxTokens: 1200,
      model: 'gpt-5.3-codex',
      role: 'builder',
      systemPrompt: 'You are a strict code assistant.',
      temperature: 0.1,
      userPrompt: 'Return a short answer.'
    });

    expect(result.provider).toBe('openai');
    expect(result.output).toBe('Generated answer');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        headers: {
          authorization: 'Bearer openai-token',
          'content-type': 'application/json'
        },
        method: 'POST'
      })
    );

    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));

    expect(payload).toEqual({
      max_completion_tokens: 1200,
      messages: [
        {
          content: 'You are a strict code assistant.',
          role: 'system'
        },
        {
          content: 'Return a short answer.',
          role: 'user'
        }
      ],
      model: 'gpt-5.3-codex',
      temperature: 0.1
    });
  });

  it('supports structured output and requests json response format', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: '{"decision":"accept","confidence":88}'
              }
            }
          ]
        }),
        {
          status: 200
        }
      )
    );
    const provider = createOpenAIProvider({
      apiKey: 'openai-token',
      baseUrl: 'https://api.openai.com/v1',
      fetchImplementation: fetchMock as unknown as typeof fetch
    });
    const schema = z.object({
      confidence: z.number(),
      decision: z.enum(['accept', 'reject'])
    });

    const result = await provider.invoke({
      model: 'gpt-5.3-codex',
      role: 'governor',
      schema,
      userPrompt: 'Return decision JSON.'
    });

    expect(result.responseMode).toBe('json');
    expect(result.output).toEqual({
      confidence: 88,
      decision: 'accept'
    });

    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));

    expect(payload.response_format).toEqual({
      type: 'json_object'
    });
  });

  it('retries when the first request fails and later succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('connection reset'))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: 'Recovered response'
                }
              }
            ]
          }),
          {
            status: 200
          }
        )
      );
    const provider = createOpenAIProvider({
      apiKey: 'openai-token',
      baseUrl: 'https://api.openai.com/v1',
      fetchImplementation: fetchMock as unknown as typeof fetch
    });

    const result = await provider.invoke({
      maxRetries: 1,
      model: 'gpt-5.3-codex',
      role: 'builder',
      userPrompt: 'Retry test'
    });

    expect(result.attempts).toBe(2);
    expect(result.output).toBe('Recovered response');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('surfaces API error details from non-2xx responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            message: 'invalid auth token'
          }
        }),
        {
          status: 401
        }
      )
    );
    const provider = createOpenAIProvider({
      apiKey: 'openai-token',
      baseUrl: 'https://api.openai.com/v1',
      fetchImplementation: fetchMock as unknown as typeof fetch
    });

    await expect(
      provider.invoke({
        model: 'gpt-5.3-codex',
        role: 'builder',
        userPrompt: 'Trigger auth error'
      })
    ).rejects.toThrow(
      'OpenAI API request failed with status 401: invalid auth token'
    );
  });

  it('validates baseUrl and apiKey at provider creation time', () => {
    expect(() =>
      createOpenAIProvider({
        apiKey: 'openai-token',
        baseUrl: '   '
      })
    ).toThrow('OpenAI baseUrl is required.');
    expect(() =>
      createOpenAIProvider({
        apiKey: '   ',
        baseUrl: 'https://api.openai.com/v1'
      })
    ).toThrow('OpenAI API key is required.');
  });
});
