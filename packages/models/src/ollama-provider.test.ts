import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createOllamaProvider } from './ollama-provider.js';

describe('ollama provider', () => {
  it('invokes Ollama chat endpoint for freeform text output', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          message: {
            content: 'Local model response'
          }
        }),
        {
          status: 200
        }
      )
    );
    const provider = createOllamaProvider({
      baseUrl: 'http://127.0.0.1:11434/',
      fetchImplementation: fetchMock as unknown as typeof fetch
    });

    const result = await provider.invoke({
      maxTokens: 6000,
      model: 'qwen3:30b-a3b-thinking-2507-q4_K_M',
      role: 'planner',
      systemPrompt: 'You are the planning role.',
      temperature: 0.2,
      userPrompt: 'Produce a short plan.'
    });

    expect(result.provider).toBe('ollama');
    expect(result.output).toBe('Local model response');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:11434/api/chat',
      expect.objectContaining({
        headers: {
          'content-type': 'application/json'
        },
        method: 'POST'
      })
    );

    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));

    expect(payload).toEqual({
      messages: [
        {
          content: 'You are the planning role.',
          role: 'system'
        },
        {
          content: 'Produce a short plan.',
          role: 'user'
        }
      ],
      model: 'qwen3:30b-a3b-thinking-2507-q4_K_M',
      options: {
        num_predict: 6000,
        temperature: 0.2
      },
      stream: false
    });
  });

  it('supports structured output with json format mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          message: {
            content: '{"shouldPromote":true}'
          }
        }),
        {
          status: 200
        }
      )
    );
    const provider = createOllamaProvider({
      baseUrl: 'http://127.0.0.1:11434',
      fetchImplementation: fetchMock as unknown as typeof fetch
    });
    const schema = z.object({
      shouldPromote: z.boolean()
    });

    const result = await provider.invoke({
      model: 'qwen3:14b-q4_K_M',
      role: 'governor',
      schema,
      userPrompt: 'Return JSON.'
    });

    expect(result.responseMode).toBe('json');
    expect(result.output).toEqual({
      shouldPromote: true
    });

    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));

    expect(payload.format).toBe('json');
  });

  it('retries on failures and eventually returns a response', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('temporary outage', {
          status: 503
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: {
              content: 'Recovered local output'
            }
          }),
          {
            status: 200
          }
        )
      );
    const provider = createOllamaProvider({
      baseUrl: 'http://127.0.0.1:11434',
      fetchImplementation: fetchMock as unknown as typeof fetch
    });

    const result = await provider.invoke({
      maxRetries: 1,
      model: 'qwen3:14b-q4_K_M',
      role: 'critic',
      userPrompt: 'Retry if necessary.'
    });

    expect(result.attempts).toBe(2);
    expect(result.output).toBe('Recovered local output');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('surfaces structured API error messages from Ollama', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: 'model not found'
        }),
        {
          status: 404
        }
      )
    );
    const provider = createOllamaProvider({
      baseUrl: 'http://127.0.0.1:11434',
      fetchImplementation: fetchMock as unknown as typeof fetch
    });

    await expect(
      provider.invoke({
        model: 'missing-model',
        role: 'critic',
        userPrompt: 'Test missing model.'
      })
    ).rejects.toThrow('Ollama API request failed with status 404: model not found');
  });

  it('validates baseUrl at provider creation time', () => {
    expect(() =>
      createOllamaProvider({
        baseUrl: '   '
      })
    ).toThrow('Ollama baseUrl is required.');
  });
});
