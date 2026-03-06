
# 3. Model routing config

Use a single config file, likely `genome/routing/model-routing.ts` or `.json`.

---

## 3.1 Type definitions

```ts
export type ModelProvider = "openai" | "ollama";

export type RoleName =
  | "governor"
  | "planner"
  | "builder"
  | "critic"
  | "evaluator-interpreter"
  | "mutator"
  | "archivist"
  | "narrator";

export type CapabilityKey =
  | "general"
  | "nextjs"
  | "nestjs"
  | "typescript"
  | "ci"
  | "debugging"
  | "repo-generation"
  | "benchmark-design"
  | "prompt-mutation"
  | "runtime-upgrade";

export type RoleModelConfig = {
  role: RoleName;
  provider: ModelProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  maxRetries: number;
  fallback?: {
    provider: ModelProvider;
    model: string;
  };
};

export type CapabilityOverrideConfig = {
  capability: CapabilityKey;
  appliesToRoles: RoleName[];
  provider: ModelProvider;
  model: string;
  reason: string;
};

export type RoutingPolicyConfig = {
  defaultRoleRouting: RoleModelConfig[];
  capabilityOverrides: CapabilityOverrideConfig[];
  providerPriority: ModelProvider[];
  allowAutomaticMutation: boolean;
  requirePRForRoutingChange: boolean;
  requireBenchmarkEvidenceForRoutingChange: boolean;
};
```

---

## 3.2 Initial routing config

This matches your requirements.

```ts
export const routingPolicy: RoutingPolicyConfig = {
  defaultRoleRouting: [
    {
      role: "governor",
      provider: "ollama",
      model: "qwen3:30b-a3b-thinking-2507-q4_K_M",
      temperature: 0.1,
      maxTokens: 8000,
      timeoutMs: 120000,
      maxRetries: 1
    },
    {
      role: "planner",
      provider: "ollama",
      model: "qwen3:30b-a3b-thinking-2507-q4_K_M",
      temperature: 0.15,
      maxTokens: 12000,
      timeoutMs: 120000,
      maxRetries: 1
    },
    {
      role: "builder",
      provider: "openai",
      model: "gpt-5.3-codex",
      temperature: 0.1,
      maxTokens: 16000,
      timeoutMs: 180000,
      maxRetries: 1
    },
    {
      role: "critic",
      provider: "ollama",
      model: "qwen3:30b-a3b-thinking-2507-q4_K_M",
      temperature: 0.1,
      maxTokens: 10000,
      timeoutMs: 120000,
      maxRetries: 1
    },
    {
      role: "evaluator-interpreter",
      provider: "ollama",
      model: "qwen3:30b-instruct",
      temperature: 0.05,
      maxTokens: 10000,
      timeoutMs: 120000,
      maxRetries: 1
    },
    {
      role: "mutator",
      provider: "ollama",
      model: "qwen3:30b-a3b-thinking-2507-q4_K_M",
      temperature: 0.2,
      maxTokens: 12000,
      timeoutMs: 120000,
      maxRetries: 1
    },
    {
      role: "archivist",
      provider: "ollama",
      model: "qwen3:14b-q4_K_M",
      temperature: 0.05,
      maxTokens: 6000,
      timeoutMs: 60000,
      maxRetries: 1
    },
    {
      role: "narrator",
      provider: "ollama",
      model: "qwen3:14b-q4_K_M",
      temperature: 0.2,
      maxTokens: 6000,
      timeoutMs: 60000,
      maxRetries: 1
    }
  ],
  capabilityOverrides: [
    {
      capability: "debugging",
      appliesToRoles: ["builder", "critic"],
      provider: "openai",
      model: "gpt-5.3-codex",
      reason: "Use stronger reasoning for complex failure diagnosis and repair."
    },
    {
      capability: "repo-generation",
      appliesToRoles: ["builder"],
      provider: "openai",
      model: "gpt-5.3-codex",
      reason: "Initial repo generation quality is critical."
    }
  ],
  providerPriority: ["ollama", "openai"],
  allowAutomaticMutation: true,
  requirePRForRoutingChange: true,
  requireBenchmarkEvidenceForRoutingChange: true
};
```

---

## 3.3 Resolution rules

Routing should resolve in this order:

1. explicit runtime override for a specific invocation
2. capability override
3. default role routing
4. fallback if configured and needed

## 3.4 Mutation rules for routing

If Evolvo wants to change model routing:

* it must create or work under a `kind:mutation` issue
* open a PR showing the routing diff
* justify why it expects the change to help
* include benchmark evidence after testing
* merge only after evaluation

---
