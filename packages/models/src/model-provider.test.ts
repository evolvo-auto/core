import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { invokeWithRetryAndTimeout } from './model-provider.js';

describe('model provider abstraction', () => {
  it('returns freeform text output with text mode defaults', async () => {
    const invokeOnce = vi.fn().mockResolvedValue('freeform output');

    const result = await invokeWithRetryAndTimeout(
      'openai',
      {
        model: 'gpt-5.3-codex',
        role: 'builder',
        userPrompt: 'Summarize this.'
      },
      invokeOnce
    );

    expect(result).toEqual({
      attempts: 1,
      durationMs: expect.any(Number),
      metadata: undefined,
      model: 'gpt-5.3-codex',
      output: 'freeform output',
      provider: 'openai',
      rawText: 'freeform output',
      responseMode: 'text',
      role: 'builder'
    });
    expect(invokeOnce).toHaveBeenCalledTimes(1);
    expect(invokeOnce).toHaveBeenCalledWith(
      {
        maxRetries: 0,
        maxTokens: undefined,
        metadata: undefined,
        model: 'gpt-5.3-codex',
        responseMode: 'text',
        role: 'builder',
        schema: undefined,
        systemPrompt: undefined,
        temperature: undefined,
        timeoutMs: undefined,
        userPrompt: 'Summarize this.'
      },
      undefined
    );
  });

  it('parses and validates structured JSON output when a schema is provided', async () => {
    const invokeOnce = vi
      .fn()
      .mockResolvedValue('{"decision":"promote","confidence":82}');
    const schema = z.object({
      confidence: z.number().min(0).max(100),
      decision: z.enum(['promote', 'reject'])
    });

    const result = await invokeWithRetryAndTimeout(
      'ollama',
      {
        model: 'qwen3:30b-a3b-thinking-2507-q4_K_M',
        role: 'governor',
        schema,
        userPrompt: 'Decide if this candidate should be promoted.'
      },
      invokeOnce
    );

    expect(result.responseMode).toBe('json');
    expect(result.output).toEqual({
      confidence: 82,
      decision: 'promote'
    });
  });

  it('retries failed attempts until one succeeds', async () => {
    const invokeOnce = vi
      .fn()
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce('retry succeeded');

    const result = await invokeWithRetryAndTimeout(
      'openai',
      {
        maxRetries: 1,
        model: 'gpt-5.3-codex',
        role: 'builder',
        userPrompt: 'Generate a title.'
      },
      invokeOnce
    );

    expect(result.attempts).toBe(2);
    expect(result.output).toBe('retry succeeded');
    expect(invokeOnce).toHaveBeenCalledTimes(2);
  });

  it('throws a wrapped provider error after exhausting retries', async () => {
    const invokeOnce = vi.fn().mockRejectedValue(new Error('service offline'));

    await expect(
      invokeWithRetryAndTimeout(
        'ollama',
        {
          maxRetries: 2,
          model: 'qwen3:14b-q4_K_M',
          role: 'narrator',
          userPrompt: 'Write progress notes.'
        },
        invokeOnce
      )
    ).rejects.toThrow(
      'ollama model invocation failed for model "qwen3:14b-q4_K_M" after 3 attempt(s): service offline'
    );
    expect(invokeOnce).toHaveBeenCalledTimes(3);
  });

  it('rejects schema requests that force text mode', async () => {
    const invokeOnce = vi.fn();

    await expect(
      invokeWithRetryAndTimeout(
        'openai',
        {
          model: 'gpt-5.3-codex',
          responseMode: 'text',
          role: 'builder',
          schema: z.object({
            ok: z.boolean()
          }),
          userPrompt: 'Return a structured object.'
        },
        invokeOnce
      )
    ).rejects.toThrow('Model invocation schema requires json response mode.');
    expect(invokeOnce).not.toHaveBeenCalled();
  });

  it('validates numeric controls for retries, timeout, token count, and temperature', async () => {
    const invokeOnce = vi.fn();

    await expect(
      invokeWithRetryAndTimeout(
        'openai',
        {
          maxRetries: -1,
          model: 'gpt-5.3-codex',
          role: 'builder',
          userPrompt: 'Hello'
        },
        invokeOnce
      )
    ).rejects.toThrow(
      'Model invocation maxRetries must be a non-negative integer.'
    );
    await expect(
      invokeWithRetryAndTimeout(
        'openai',
        {
          model: 'gpt-5.3-codex',
          role: 'builder',
          timeoutMs: 0,
          userPrompt: 'Hello'
        },
        invokeOnce
      )
    ).rejects.toThrow(
      'Model invocation timeoutMs must be a positive integer.'
    );
    await expect(
      invokeWithRetryAndTimeout(
        'openai',
        {
          maxTokens: 0,
          model: 'gpt-5.3-codex',
          role: 'builder',
          userPrompt: 'Hello'
        },
        invokeOnce
      )
    ).rejects.toThrow(
      'Model invocation maxTokens must be a positive integer.'
    );
    await expect(
      invokeWithRetryAndTimeout(
        'openai',
        {
          model: 'gpt-5.3-codex',
          role: 'builder',
          temperature: 1.2,
          userPrompt: 'Hello'
        },
        invokeOnce
      )
    ).rejects.toThrow(
      'Model invocation temperature must be between 0 and 1.'
    );
    expect(invokeOnce).not.toHaveBeenCalled();
  });
});
