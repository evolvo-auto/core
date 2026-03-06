import { describe, expect, it, vi } from 'vitest';

import type { RoutingPolicyConfig } from '@evolvo/core/model-routing-config';
import type {
  ModelProviderClient,
  ModelProviderInvocationResult
} from '@evolvo/models/model-provider';
import {
  narratorOutputSchema,
  type NarratorOutput
} from '@evolvo/schemas/role-output-schemas';

import { invokeRoutedStructuredRole } from './role-runner.js';

function buildRoutingPolicyWithNarratorRoute(
  route: RoutingPolicyConfig['defaultRoleRouting'][number]
): RoutingPolicyConfig {
  return {
    allowAutomaticMutation: true,
    capabilityOverrides: [],
    defaultRoleRouting: [
      {
        maxRetries: 0,
        maxTokens: 5000,
        model: 'default-governor-model',
        provider: 'ollama',
        role: 'governor',
        temperature: 0.1,
        timeoutMs: 120000
      },
      {
        maxRetries: 0,
        maxTokens: 5000,
        model: 'default-planner-model',
        provider: 'ollama',
        role: 'planner',
        temperature: 0.1,
        timeoutMs: 120000
      },
      {
        maxRetries: 0,
        maxTokens: 5000,
        model: 'default-builder-model',
        provider: 'openai',
        role: 'builder',
        temperature: 0.1,
        timeoutMs: 120000
      },
      {
        maxRetries: 0,
        maxTokens: 5000,
        model: 'default-critic-model',
        provider: 'ollama',
        role: 'critic',
        temperature: 0.1,
        timeoutMs: 120000
      },
      {
        maxRetries: 0,
        maxTokens: 5000,
        model: 'default-evaluator-model',
        provider: 'ollama',
        role: 'evaluator-interpreter',
        temperature: 0.1,
        timeoutMs: 120000
      },
      {
        maxRetries: 0,
        maxTokens: 5000,
        model: 'default-mutator-model',
        provider: 'ollama',
        role: 'mutator',
        temperature: 0.1,
        timeoutMs: 120000
      },
      {
        maxRetries: 0,
        maxTokens: 5000,
        model: 'default-archivist-model',
        provider: 'ollama',
        role: 'archivist',
        temperature: 0.1,
        timeoutMs: 120000
      },
      route
    ],
    providerPriority: ['ollama', 'openai'],
    requireBenchmarkEvidenceForRoutingChange: true,
    requirePRForRoutingChange: true
  };
}

function buildNarratorInvocationResult(
  provider: 'openai' | 'ollama',
  model: string,
  output: NarratorOutput,
  fallbackUsed: boolean
): ModelProviderInvocationResult<NarratorOutput> {
  return {
    attempts: 1,
    durationMs: 42,
    fallbackUsed,
    metadata: undefined,
    model,
    output,
    provider,
    rawText: JSON.stringify(output),
    repairAttempted: false,
    repairSucceeded: false,
    responseMode: 'json',
    role: 'narrator',
    schemaValid: true,
    taskKind: 'github-narration'
  };
}

function buildProviderClient(
  provider: 'openai' | 'ollama',
  invoke: ModelProviderClient['invoke']
): ModelProviderClient {
  return {
    invoke,
    provider
  };
}

describe('invokeRoutedStructuredRole', () => {
  it('invokes the primary resolved route and returns structured output', async () => {
    const expectedOutput: NarratorOutput = {
      body: 'Execution started.',
      commentKind: 'work-started',
      target: 'issue',
      targetNumber: 77,
      title: 'Work started'
    };
    const openaiInvoke = vi.fn().mockResolvedValue(
      buildNarratorInvocationResult(
        'openai',
        'gpt-5.3-codex',
        expectedOutput,
        false
      )
    );
    const ollamaInvoke = vi.fn();
    const policy = buildRoutingPolicyWithNarratorRoute({
      maxRetries: 1,
      maxTokens: 6000,
      model: 'gpt-5.3-codex',
      provider: 'openai',
      role: 'narrator',
      temperature: 0.2,
      timeoutMs: 90000
    });

    const result = await invokeRoutedStructuredRole({
      capability: 'general',
      policy,
      providerClients: {
        ollama: buildProviderClient('ollama', ollamaInvoke),
        openai: buildProviderClient('openai', openaiInvoke)
      },
      role: 'narrator',
      schema: narratorOutputSchema,
      systemPrompt: 'Narrate the latest execution status.',
      taskKind: 'github-narration',
      userPrompt: 'Issue 77 started.'
    });

    expect(result.output).toEqual(expectedOutput);
    expect(result.route.provider).toBe('openai');
    expect(result.usedFallback).toBe(false);
    expect(openaiInvoke).toHaveBeenCalledTimes(1);
    expect(openaiInvoke).toHaveBeenCalledWith(
      expect.objectContaining({
        fallbackUsed: false,
        maxRetries: 1,
        maxTokens: 6000,
        model: 'gpt-5.3-codex',
        responseMode: 'json',
        role: 'narrator',
        schema: narratorOutputSchema,
        taskKind: 'github-narration',
        temperature: 0.2,
        timeoutMs: 90000
      })
    );
    expect(ollamaInvoke).not.toHaveBeenCalled();
  });

  it('falls back to the configured fallback route when the primary route fails', async () => {
    const expectedOutput: NarratorOutput = {
      body: 'Fallback provider completed the narration.',
      commentKind: 'progress',
      target: 'issue',
      targetNumber: 78,
      title: 'Fallback narration'
    };
    const openaiInvoke = vi
      .fn()
      .mockRejectedValue(new Error('primary provider unavailable'));
    const ollamaInvoke = vi.fn().mockResolvedValue(
      buildNarratorInvocationResult(
        'ollama',
        'qwen3:14b-q4_K_M',
        expectedOutput,
        true
      )
    );
    const policy = buildRoutingPolicyWithNarratorRoute({
      fallback: {
        model: 'qwen3:14b-q4_K_M',
        provider: 'ollama'
      },
      maxRetries: 1,
      maxTokens: 6000,
      model: 'gpt-5.3-codex',
      provider: 'openai',
      role: 'narrator',
      temperature: 0.2,
      timeoutMs: 90000
    });

    const result = await invokeRoutedStructuredRole({
      policy,
      providerClients: {
        ollama: buildProviderClient('ollama', ollamaInvoke),
        openai: buildProviderClient('openai', openaiInvoke)
      },
      role: 'narrator',
      schema: narratorOutputSchema,
      systemPrompt: 'Narrate the latest execution status.',
      taskKind: 'github-narration',
      userPrompt: 'Issue 78 update.'
    });

    expect(result.output).toEqual(expectedOutput);
    expect(result.route.provider).toBe('ollama');
    expect(result.usedFallback).toBe(true);
    expect(openaiInvoke).toHaveBeenCalledTimes(1);
    expect(ollamaInvoke).toHaveBeenCalledTimes(1);
    expect(ollamaInvoke).toHaveBeenCalledWith(
      expect.objectContaining({
        fallbackUsed: true,
        model: 'qwen3:14b-q4_K_M'
      })
    );
  });

  it('throws a combined error when both primary and fallback routes fail', async () => {
    const openaiInvoke = vi
      .fn()
      .mockRejectedValue(new Error('primary timeout'));
    const ollamaInvoke = vi
      .fn()
      .mockRejectedValue(new Error('fallback schema mismatch'));
    const policy = buildRoutingPolicyWithNarratorRoute({
      fallback: {
        model: 'qwen3:14b-q4_K_M',
        provider: 'ollama'
      },
      maxRetries: 1,
      maxTokens: 6000,
      model: 'gpt-5.3-codex',
      provider: 'openai',
      role: 'narrator',
      temperature: 0.2,
      timeoutMs: 90000
    });

    await expect(
      invokeRoutedStructuredRole({
        policy,
        providerClients: {
          ollama: buildProviderClient('ollama', ollamaInvoke),
          openai: buildProviderClient('openai', openaiInvoke)
        },
        role: 'narrator',
        schema: narratorOutputSchema,
        systemPrompt: 'Narrate the latest execution status.',
        taskKind: 'github-narration',
        userPrompt: 'Issue 79 update.'
      })
    ).rejects.toThrow(
      'Role "narrator" invocation failed on primary route (openai/gpt-5.3-codex) and fallback route (ollama/qwen3:14b-q4_K_M): primary=primary timeout; fallback=fallback schema mismatch'
    );
  });
});
