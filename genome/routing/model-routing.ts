import type { RoutingPolicyConfig } from '../../packages/core/src/model-routing-config.js';

export const routingPolicy: RoutingPolicyConfig = {
  defaultRoleRouting: [
    {
      role: 'governor',
      provider: 'ollama',
      model: 'qwen3:30b-a3b-thinking-2507-q4_K_M',
      temperature: 0.1,
      maxTokens: 8000,
      timeoutMs: 120000,
      maxRetries: 1
    },
    {
      role: 'planner',
      provider: 'ollama',
      model: 'qwen3:30b-a3b-thinking-2507-q4_K_M',
      temperature: 0.15,
      maxTokens: 12000,
      timeoutMs: 120000,
      maxRetries: 1
    },
    {
      role: 'builder',
      provider: 'openai',
      model: 'gpt-5.3-codex',
      temperature: 0.1,
      maxTokens: 16000,
      timeoutMs: 180000,
      maxRetries: 1
    },
    {
      role: 'critic',
      provider: 'ollama',
      model: 'qwen3:30b-a3b-thinking-2507-q4_K_M',
      temperature: 0.1,
      maxTokens: 10000,
      timeoutMs: 120000,
      maxRetries: 1
    },
    {
      role: 'evaluator-interpreter',
      provider: 'ollama',
      model: 'qwen3:30b-instruct',
      temperature: 0.05,
      maxTokens: 10000,
      timeoutMs: 120000,
      maxRetries: 1
    },
    {
      role: 'mutator',
      provider: 'ollama',
      model: 'qwen3:30b-a3b-thinking-2507-q4_K_M',
      temperature: 0.2,
      maxTokens: 12000,
      timeoutMs: 120000,
      maxRetries: 1
    },
    {
      role: 'archivist',
      provider: 'ollama',
      model: 'qwen3:14b-q4_K_M',
      temperature: 0.05,
      maxTokens: 6000,
      timeoutMs: 60000,
      maxRetries: 1
    },
    {
      role: 'narrator',
      provider: 'ollama',
      model: 'qwen3:14b-q4_K_M',
      temperature: 0.2,
      maxTokens: 6000,
      timeoutMs: 60000,
      maxRetries: 1
    }
  ],
  capabilityOverrides: [
    {
      capability: 'debugging',
      appliesToRoles: ['builder', 'critic'],
      provider: 'openai',
      model: 'gpt-5.3-codex',
      reason: 'Use stronger reasoning for complex failure diagnosis and repair.'
    },
    {
      capability: 'repo-generation',
      appliesToRoles: ['builder'],
      provider: 'openai',
      model: 'gpt-5.3-codex',
      reason: 'Initial repo generation quality is critical.'
    }
  ],
  providerPriority: ['ollama', 'openai'],
  allowAutomaticMutation: true,
  requirePRForRoutingChange: true,
  requireBenchmarkEvidenceForRoutingChange: true
};
