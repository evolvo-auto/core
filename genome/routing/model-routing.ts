import type { RoutingPolicyConfig } from '../../packages/core/src/model-routing-config.js';

export const routingPolicy: RoutingPolicyConfig = {
  defaultRoleRouting: [
  {
    role: 'governor',
    provider: 'openai',
    model: 'gpt-5',
    temperature: 0.1,
    maxTokens: 8000,
    timeoutMs: 120000,
    maxRetries: 1
  },
  {
    role: 'planner',
    provider: 'openai',
    model: 'gpt-5',
    temperature: 0.15,
    maxTokens: 12000,
    timeoutMs: 120000,
    maxRetries: 1
  },
  {
    role: 'builder',
    provider: 'openai',
    model: 'gpt-5.4',
    temperature: 0.1,
    maxTokens: 16000,
    timeoutMs: 180000,
    maxRetries: 1
  },
  {
    role: 'critic',
    provider: 'openai',
    model: 'gpt-5',
    temperature: 0.1,
    maxTokens: 10000,
    timeoutMs: 120000,
    maxRetries: 1
  },
  {
    role: 'evaluator-interpreter',
    provider: 'openai',
    model: 'gpt-5-mini',
    temperature: 0.05,
    maxTokens: 10000,
    timeoutMs: 120000,
    maxRetries: 1
  },
  {
    role: 'mutator',
    provider: 'openai',
    model: 'gpt-5',
    temperature: 0.2,
    maxTokens: 12000,
    timeoutMs: 120000,
    maxRetries: 1
  },
  {
    role: 'archivist',
    provider: 'openai',
    model: 'gpt-5-mini',
    temperature: 0.05,
    maxTokens: 6000,
    timeoutMs: 60000,
    maxRetries: 1
  },
  {
    role: 'narrator',
    provider: 'openai',
    model: 'gpt-5-mini',
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
    model: 'gpt-5.4',
    reason: 'Use the strongest model for complex failure diagnosis and repair.'
  },
  {
    capability: 'repo-generation',
    appliesToRoles: ['builder'],
    provider: 'openai',
    model: 'gpt-5.4',
    reason: 'Initial repo generation quality is critical.'
  }
],
  providerPriority: ['ollama', 'openai'],
  allowAutomaticMutation: true,
  requirePRForRoutingChange: true,
  requireBenchmarkEvidenceForRoutingChange: true
};
