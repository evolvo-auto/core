import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createModelInvocation } from '@evolvo/api/model-invocation';

import { invokeWithRetryAndTimeout } from './model-provider.js';

vi.mock('@evolvo/api/model-invocation', () => ({
  createModelInvocation: vi.fn()
}));

const mockedCreateModelInvocation = vi.mocked(createModelInvocation);

describe('model provider abstraction', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns freeform text output with text mode defaults and persists metrics', async () => {
    const invokeOnce = vi.fn().mockResolvedValue('freeform output');
    mockedCreateModelInvocation.mockResolvedValue({
      id: 'inv_1'
    } as never);

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
      fallbackUsed: false,
      metadata: undefined,
      model: 'gpt-5.3-codex',
      output: 'freeform output',
      provider: 'openai',
      rawText: 'freeform output',
      repairAttempted: false,
      repairSucceeded: false,
      responseMode: 'text',
      role: 'builder',
      schemaValid: null,
      taskKind: 'general'
    });
    expect(invokeOnce).toHaveBeenCalledTimes(1);
    expect(invokeOnce).toHaveBeenCalledWith(
      {
        attemptId: undefined,
        costEstimate: undefined,
        fallbackUsed: false,
        maxRetries: 0,
        maxTokens: undefined,
        metadata: undefined,
        model: 'gpt-5.3-codex',
        persistMetrics: true,
        responseMode: 'text',
        role: 'builder',
        schema: undefined,
        systemPrompt: undefined,
        taskKind: 'general',
        temperature: undefined,
        timeoutMs: undefined,
        userPrompt: 'Summarize this.'
      },
      undefined
    );
    expect(mockedCreateModelInvocation).toHaveBeenCalledTimes(1);
    expect(mockedCreateModelInvocation).toHaveBeenCalledWith(
      expect.objectContaining({
        fallbackUsed: false,
        model: 'gpt-5.3-codex',
        provider: 'openai',
        role: 'builder',
        schemaValid: null,
        success: true,
        taskKind: 'general'
      })
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
    mockedCreateModelInvocation.mockResolvedValue({
      id: 'inv_2'
    } as never);

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
    expect(result.schemaValid).toBe(true);
    expect(result.output).toEqual({
      confidence: 82,
      decision: 'promote'
    });
    expect(mockedCreateModelInvocation).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'ollama',
        schemaValid: true,
        success: true
      })
    );
  });

  it('attempts structured repair when schema validation fails and succeeds on repair', async () => {
    const invokeOnce = vi
      .fn()
      .mockResolvedValueOnce('{"decision":"promote"}')
      .mockResolvedValueOnce('{"decision":"promote","confidence":77}');
    const schema = z.object({
      confidence: z.number().min(0).max(100),
      decision: z.enum(['promote', 'reject'])
    });
    mockedCreateModelInvocation.mockResolvedValue({
      id: 'inv_3'
    } as never);

    const result = await invokeWithRetryAndTimeout(
      'openai',
      {
        model: 'gpt-5.3-codex',
        role: 'builder',
        schema,
        userPrompt: 'Return decision JSON.'
      },
      invokeOnce
    );

    expect(result.attempts).toBe(2);
    expect(result.repairAttempted).toBe(true);
    expect(result.repairSucceeded).toBe(true);
    expect(result.output).toEqual({
      confidence: 77,
      decision: 'promote'
    });
    expect(invokeOnce).toHaveBeenCalledTimes(2);
  });

  it('retries failed attempts until one succeeds', async () => {
    const invokeOnce = vi
      .fn()
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce('retry succeeded');
    mockedCreateModelInvocation.mockResolvedValue({
      id: 'inv_4'
    } as never);

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

  it('persists failure metrics and throws wrapped provider error after exhausting retries', async () => {
    const invokeOnce = vi.fn().mockRejectedValue(new Error('service offline'));
    mockedCreateModelInvocation.mockResolvedValue({
      id: 'inv_5'
    } as never);

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
    expect(mockedCreateModelInvocation).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'ollama',
        schemaValid: null,
        success: false
      })
    );
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
    expect(mockedCreateModelInvocation).not.toHaveBeenCalled();
  });

  it('validates numeric controls for retries, timeout, token count, temperature, and cost', async () => {
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
    await expect(
      invokeWithRetryAndTimeout(
        'openai',
        {
          costEstimate: -1,
          model: 'gpt-5.3-codex',
          role: 'builder',
          userPrompt: 'Hello'
        },
        invokeOnce
      )
    ).rejects.toThrow('Model invocation costEstimate must be non-negative.');
    expect(invokeOnce).not.toHaveBeenCalled();
  });
});
