import { describe, expect, it } from 'vitest';

import type { RoutingPolicyConfig } from '@evolvo/core/model-routing-config';

import { resolveModelRoute } from './model-routing-resolver.js';

const routingPolicyFixture: RoutingPolicyConfig = {
  allowAutomaticMutation: true,
  capabilityOverrides: [
    {
      appliesToRoles: ['builder', 'critic'],
      capability: 'debugging',
      model: 'gpt-5.3-codex',
      provider: 'openai',
      reason: 'Use stronger debugging model.'
    }
  ],
  defaultRoleRouting: [
    {
      maxRetries: 1,
      maxTokens: 8000,
      model: 'qwen3:30b-a3b-thinking-2507-q4_K_M',
      provider: 'ollama',
      role: 'governor',
      temperature: 0.1,
      timeoutMs: 120000
    },
    {
      maxRetries: 1,
      maxTokens: 12000,
      model: 'qwen3:30b-a3b-thinking-2507-q4_K_M',
      provider: 'ollama',
      role: 'planner',
      temperature: 0.15,
      timeoutMs: 120000
    },
    {
      fallback: {
        model: 'qwen3:30b-a3b-thinking-2507-q4_K_M',
        provider: 'ollama'
      },
      maxRetries: 1,
      maxTokens: 16000,
      model: 'gpt-5.3-codex',
      provider: 'openai',
      role: 'builder',
      temperature: 0.1,
      timeoutMs: 180000
    },
    {
      maxRetries: 1,
      maxTokens: 10000,
      model: 'qwen3:30b-a3b-thinking-2507-q4_K_M',
      provider: 'ollama',
      role: 'critic',
      temperature: 0.1,
      timeoutMs: 120000
    },
    {
      maxRetries: 1,
      maxTokens: 10000,
      model: 'qwen3:30b-instruct',
      provider: 'ollama',
      role: 'evaluator-interpreter',
      temperature: 0.05,
      timeoutMs: 120000
    },
    {
      maxRetries: 1,
      maxTokens: 12000,
      model: 'qwen3:30b-a3b-thinking-2507-q4_K_M',
      provider: 'ollama',
      role: 'mutator',
      temperature: 0.2,
      timeoutMs: 120000
    },
    {
      maxRetries: 1,
      maxTokens: 6000,
      model: 'qwen3:14b-q4_K_M',
      provider: 'ollama',
      role: 'archivist',
      temperature: 0.05,
      timeoutMs: 60000
    },
    {
      maxRetries: 1,
      maxTokens: 6000,
      model: 'qwen3:14b-q4_K_M',
      provider: 'ollama',
      role: 'narrator',
      temperature: 0.2,
      timeoutMs: 60000
    }
  ],
  providerPriority: ['ollama', 'openai'],
  requireBenchmarkEvidenceForRoutingChange: true,
  requirePRForRoutingChange: true
};

describe('model routing resolver', () => {
  it('resolves default role routing when no override applies', () => {
    expect(
      resolveModelRoute({
        policy: routingPolicyFixture,
        role: 'planner'
      })
    ).toEqual({
      capability: 'general',
      capabilityOverrideReason: undefined,
      fallback: undefined,
      maxRetries: 1,
      maxTokens: 12000,
      model: 'qwen3:30b-a3b-thinking-2507-q4_K_M',
      provider: 'ollama',
      role: 'planner',
      source: 'default-role-routing',
      temperature: 0.15,
      timeoutMs: 120000
    });
  });

  it('resolves capability override ahead of default role provider and model', () => {
    expect(
      resolveModelRoute({
        capability: 'debugging',
        policy: routingPolicyFixture,
        role: 'critic'
      })
    ).toEqual({
      capability: 'debugging',
      capabilityOverrideReason: 'Use stronger debugging model.',
      fallback: undefined,
      maxRetries: 1,
      maxTokens: 10000,
      model: 'gpt-5.3-codex',
      provider: 'openai',
      role: 'critic',
      source: 'capability-override',
      temperature: 0.1,
      timeoutMs: 120000
    });
  });

  it('resolves runtime override ahead of capability and default routing', () => {
    expect(
      resolveModelRoute({
        capability: 'debugging',
        policy: routingPolicyFixture,
        role: 'builder',
        runtimeOverride: {
          maxRetries: 3,
          maxTokens: 9000,
          model: 'gpt-5.3-mini',
          provider: 'openai',
          temperature: 0.25,
          timeoutMs: 240000
        }
      })
    ).toEqual({
      capability: 'debugging',
      capabilityOverrideReason: 'Use stronger debugging model.',
      fallback: {
        model: 'qwen3:30b-a3b-thinking-2507-q4_K_M',
        provider: 'ollama'
      },
      maxRetries: 3,
      maxTokens: 9000,
      model: 'gpt-5.3-mini',
      provider: 'openai',
      role: 'builder',
      source: 'runtime-override',
      temperature: 0.25,
      timeoutMs: 240000
    });
  });

  it('applies role fallback route when requested', () => {
    expect(
      resolveModelRoute({
        policy: routingPolicyFixture,
        role: 'builder',
        useFallback: true
      })
    ).toEqual({
      capability: 'general',
      capabilityOverrideReason: undefined,
      fallback: {
        model: 'qwen3:30b-a3b-thinking-2507-q4_K_M',
        provider: 'ollama'
      },
      maxRetries: 1,
      maxTokens: 16000,
      model: 'qwen3:30b-a3b-thinking-2507-q4_K_M',
      provider: 'ollama',
      role: 'builder',
      source: 'role-fallback',
      temperature: 0.1,
      timeoutMs: 180000
    });
  });

  it('rejects fallback requests when no fallback is configured for the role', () => {
    expect(() =>
      resolveModelRoute({
        policy: routingPolicyFixture,
        role: 'planner',
        useFallback: true
      })
    ).toThrow('No fallback is configured for role "planner".');
  });

  it('rejects ambiguous capability overrides for the same role and capability pair', () => {
    expect(() =>
      resolveModelRoute({
        capability: 'debugging',
        policy: {
          ...routingPolicyFixture,
          capabilityOverrides: [
            ...routingPolicyFixture.capabilityOverrides,
            {
              appliesToRoles: ['critic'],
              capability: 'debugging',
              model: 'gpt-5.3',
              provider: 'openai',
              reason: 'Second conflicting override.'
            }
          ]
        },
        role: 'critic'
      })
    ).toThrow(
      'Ambiguous capability override for role "critic" and capability "debugging".'
    );
  });

  it('validates runtime override fields before resolving route', () => {
    expect(() =>
      resolveModelRoute({
        policy: routingPolicyFixture,
        role: 'builder',
        runtimeOverride: {
          model: '',
          provider: 'openai'
        }
      })
    ).toThrow();
  });
});
