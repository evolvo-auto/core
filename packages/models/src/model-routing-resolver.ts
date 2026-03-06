import { z } from 'zod';

import { routingPolicy as defaultRoutingPolicy } from '../../../genome/routing/model-routing.js';
import {
  parseRoutingPolicy,
  type CapabilityKey,
  type CapabilityOverrideConfig,
  type ModelProvider,
  type RoleModelConfig,
  type RoleName,
  type RoutingPolicyConfig
} from '@evolvo/core/model-routing-config';

const nonEmptyStringSchema = z.string().trim().min(1);
const temperatureSchema = z.number().min(0).max(1);
const positiveIntegerSchema = z.number().int().positive();
const nonNegativeIntegerSchema = z.number().int().min(0);

const runtimeModelRouteOverrideSchema = z.object({
  fallback: z
    .object({
      model: nonEmptyStringSchema,
      provider: z.enum(['openai', 'ollama'])
    })
    .optional(),
  maxRetries: nonNegativeIntegerSchema.optional(),
  maxTokens: positiveIntegerSchema.optional(),
  model: nonEmptyStringSchema,
  provider: z.enum(['openai', 'ollama']),
  temperature: temperatureSchema.optional(),
  timeoutMs: positiveIntegerSchema.optional()
});

export type RuntimeModelRouteOverride = z.infer<
  typeof runtimeModelRouteOverrideSchema
>;

export type ResolveModelRouteInput = {
  capability?: CapabilityKey;
  policy?: unknown;
  role: RoleName;
  runtimeOverride?: RuntimeModelRouteOverride;
  useFallback?: boolean;
};

export type ModelRouteResolutionSource =
  | 'runtime-override'
  | 'capability-override'
  | 'default-role-routing'
  | 'role-fallback';

export type ResolvedModelRoute = {
  capability: CapabilityKey;
  capabilityOverrideReason?: string;
  fallback?: {
    model: string;
    provider: ModelProvider;
  };
  maxRetries: number;
  maxTokens: number;
  model: string;
  provider: ModelProvider;
  role: RoleName;
  source: ModelRouteResolutionSource;
  temperature: number;
  timeoutMs: number;
};

function resolveRoutingPolicy(policy: unknown): RoutingPolicyConfig {
  return parseRoutingPolicy(policy);
}

function findRoleRouteConfig(
  role: RoleName,
  policy: RoutingPolicyConfig
): RoleModelConfig {
  const route = policy.defaultRoleRouting.find((entry) => entry.role === role);

  if (!route) {
    throw new Error(`Missing role route configuration for role "${role}".`);
  }

  return route;
}

function findCapabilityOverride(
  role: RoleName,
  capability: CapabilityKey,
  policy: RoutingPolicyConfig
): CapabilityOverrideConfig | undefined {
  const matchingOverrides = policy.capabilityOverrides.filter(
    (override) =>
      override.capability === capability && override.appliesToRoles.includes(role)
  );

  if (matchingOverrides.length <= 1) {
    return matchingOverrides[0];
  }

  throw new Error(
    `Ambiguous capability override for role "${role}" and capability "${capability}".`
  );
}

function applyCapabilityOverride(
  route: RoleModelConfig,
  capabilityOverride: CapabilityOverrideConfig | undefined
): RoleModelConfig {
  if (!capabilityOverride) {
    return route;
  }

  return {
    ...route,
    model: capabilityOverride.model,
    provider: capabilityOverride.provider
  };
}

function applyRuntimeOverride(
  route: RoleModelConfig,
  runtimeOverride: RuntimeModelRouteOverride | undefined
): RoleModelConfig {
  if (!runtimeOverride) {
    return route;
  }

  const normalizedRuntimeOverride =
    runtimeModelRouteOverrideSchema.parse(runtimeOverride);

  return {
    ...route,
    fallback: normalizedRuntimeOverride.fallback ?? route.fallback,
    maxRetries: normalizedRuntimeOverride.maxRetries ?? route.maxRetries,
    maxTokens: normalizedRuntimeOverride.maxTokens ?? route.maxTokens,
    model: normalizedRuntimeOverride.model,
    provider: normalizedRuntimeOverride.provider,
    temperature: normalizedRuntimeOverride.temperature ?? route.temperature,
    timeoutMs: normalizedRuntimeOverride.timeoutMs ?? route.timeoutMs
  };
}

function applyRoleFallback(
  route: RoleModelConfig,
  role: RoleName
): RoleModelConfig {
  if (!route.fallback) {
    throw new Error(`No fallback is configured for role "${role}".`);
  }

  return {
    ...route,
    model: route.fallback.model,
    provider: route.fallback.provider
  };
}

export function resolveModelRoute(
  input: ResolveModelRouteInput
): ResolvedModelRoute {
  const capability = input.capability ?? 'general';
  const policy = resolveRoutingPolicy(input.policy ?? defaultRoutingPolicy);
  const roleRouteConfig = findRoleRouteConfig(input.role, policy);
  const capabilityOverride = findCapabilityOverride(input.role, capability, policy);
  const routeAfterCapability = applyCapabilityOverride(
    roleRouteConfig,
    capabilityOverride
  );
  const routeAfterRuntimeOverride = applyRuntimeOverride(
    routeAfterCapability,
    input.runtimeOverride
  );
  const useFallback = input.useFallback ?? false;
  const route = useFallback
    ? applyRoleFallback(routeAfterRuntimeOverride, input.role)
    : routeAfterRuntimeOverride;
  const source: ModelRouteResolutionSource = useFallback
    ? 'role-fallback'
    : input.runtimeOverride
      ? 'runtime-override'
      : capabilityOverride
        ? 'capability-override'
        : 'default-role-routing';

  return {
    capability,
    capabilityOverrideReason: capabilityOverride?.reason,
    fallback: route.fallback,
    maxRetries: route.maxRetries,
    maxTokens: route.maxTokens,
    model: route.model,
    provider: route.provider,
    role: input.role,
    source,
    temperature: route.temperature,
    timeoutMs: route.timeoutMs
  };
}
