import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createModelInvocation } from '@evolvo/api/model-invocation';

import { createOpenAIProvider } from './openai-provider.js';

vi.mock('@evolvo/api/model-invocation', () => ({
  createModelInvocation: vi.fn()
}));

const mockedCreateModelInvocation = vi.mocked(createModelInvocation);

describe('openai provider', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('invokes responses api for freeform text output', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          output: [
            {
              content: [
                {
                  text: 'Generated answer',
                  type: 'output_text'
                }
              ],
              role: 'assistant',
              type: 'message'
            }
          ]
        }),
        {
          status: 200
        }
      )
    );
    mockedCreateModelInvocation.mockResolvedValue({ id: 'inv_1' } as never);

    const provider = createOpenAIProvider({
      apiKey: 'openai-token',
      baseUrl: 'https://api.openai.com/v1/',
      fetchImplementation: fetchMock as unknown as typeof fetch
    });

    const result = await provider.invoke({
      maxTokens: 1200,
      model: 'gpt-4o-mini',
      role: 'builder',
      systemPrompt: 'You are a strict code assistant.',
      temperature: 0.1,
      userPrompt: 'Return a short answer.'
    });

    expect(result.provider).toBe('openai');
    expect(result.output).toBe('Generated answer');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
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
      input: 'Return a short answer.',
      instructions: 'You are a strict code assistant.',
      max_output_tokens: 1200,
      model: 'gpt-4o-mini',
      temperature: 0.1
    });
    expect(mockedCreateModelInvocation).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'openai',
        success: true
      })
    );
  });

  it('supports structured output and requests json response format', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          output: [
            {
              content: [
                {
                  text: '{"decision":"accept","confidence":88}',
                  type: 'output_text'
                }
              ],
              role: 'assistant',
              type: 'message'
            }
          ]
        }),
        {
          status: 200
        }
      )
    );
    mockedCreateModelInvocation.mockResolvedValue({ id: 'inv_2' } as never);

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

    expect(payload.text).toEqual({
      format: {
        type: 'json_object'
      }
    });
  });

  it('omits temperature for gpt-5 family models', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          output: [
            {
              content: [
                {
                  text: 'Generated answer',
                  type: 'output_text'
                }
              ],
              role: 'assistant',
              type: 'message'
            }
          ]
        }),
        {
          status: 200
        }
      )
    );
    mockedCreateModelInvocation.mockResolvedValue({ id: 'inv_2b' } as never);

    const provider = createOpenAIProvider({
      apiKey: 'openai-token',
      baseUrl: 'https://api.openai.com/v1/',
      fetchImplementation: fetchMock as unknown as typeof fetch
    });

    await expect(
      provider.invoke({
        model: 'gpt-5',
        role: 'planner',
        systemPrompt: 'Return JSON.',
        temperature: 0.2,
        userPrompt: 'Return a short answer.'
      })
    ).resolves.toMatchObject({
      output: 'Generated answer',
      provider: 'openai'
    });

    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));

    expect(payload).toEqual({
      input: 'Return a short answer.',
      instructions: 'Return JSON.',
      model: 'gpt-5'
    });
    expect(payload.temperature).toBeUndefined();
  });

  it('omits temperature for o-series models', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          output: [
            {
              content: [
                {
                  text: 'Reasoned answer',
                  type: 'output_text'
                }
              ],
              role: 'assistant',
              type: 'message'
            }
          ]
        }),
        {
          status: 200
        }
      )
    );
    mockedCreateModelInvocation.mockResolvedValue({ id: 'inv_2c' } as never);

    const provider = createOpenAIProvider({
      apiKey: 'openai-token',
      baseUrl: 'https://api.openai.com/v1/',
      fetchImplementation: fetchMock as unknown as typeof fetch
    });

    await expect(
      provider.invoke({
        model: 'o3',
        role: 'planner',
        temperature: 0.2,
        userPrompt: 'Return a short answer.'
      })
    ).resolves.toMatchObject({
      output: 'Reasoned answer',
      provider: 'openai'
    });

    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));

    expect(payload).toEqual({
      input: 'Return a short answer.',
      model: 'o3'
    });
    expect(payload.temperature).toBeUndefined();
  });

  it('retries when the first request fails and later succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('connection reset'))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            output: [
              {
                content: [
                  {
                    text: 'Recovered response',
                    type: 'output_text'
                  }
                ],
                role: 'assistant',
                type: 'message'
              }
            ]
          }),
          {
            status: 200
          }
        )
      );
    mockedCreateModelInvocation.mockResolvedValue({ id: 'inv_3' } as never);

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

  it('ignores non-message output items and extracts assistant output_text content', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          output: [
            {
              id: 'rs_123',
              summary: null,
              type: 'reasoning'
            },
            {
              content: [
                {
                  annotations: [],
                  text: 'Structured assistant response',
                  type: 'output_text'
                }
              ],
              role: 'assistant',
              type: 'message'
            }
          ]
        }),
        {
          status: 200
        }
      )
    );
    mockedCreateModelInvocation.mockResolvedValue({ id: 'inv_3b' } as never);

    const provider = createOpenAIProvider({
      apiKey: 'openai-token',
      baseUrl: 'https://api.openai.com/v1',
      fetchImplementation: fetchMock as unknown as typeof fetch
    });

    await expect(
      provider.invoke({
        model: 'gpt-5.3-codex',
        role: 'builder',
        userPrompt: 'Return a short answer.'
      })
    ).resolves.toMatchObject({
      output: 'Structured assistant response',
      provider: 'openai'
    });
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
    mockedCreateModelInvocation.mockResolvedValue({ id: 'inv_4' } as never);

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
    expect(mockedCreateModelInvocation).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'openai',
        success: false
      })
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
