import { z } from 'zod';

const nonEmptyStringSchema = z.string().trim().min(1);
const scoreSchema = z.number().min(0).max(1);
const positiveIntegerSchema = z.number().int().positive();

export const modelProviders = ['openai', 'ollama'] as const;
export const modelProviderSchema = z.enum(modelProviders);
export type ModelProvider = z.infer<typeof modelProviderSchema>;

export const roleNames = [
  'governor',
  'planner',
  'builder',
  'critic',
  'evaluator-interpreter',
  'mutator',
  'archivist',
  'narrator'
] as const;
export const roleNameSchema = z.enum(roleNames);
export type RoleName = z.infer<typeof roleNameSchema>;

export const capabilityKeys = [
  'general',
  'nextjs',
  'nestjs',
  'typescript',
  'ci',
  'debugging',
  'repo-generation',
  'benchmark-design',
  'prompt-mutation',
  'runtime-upgrade'
] as const;
export const capabilityKeySchema = z.enum(capabilityKeys);
export type CapabilityKey = z.infer<typeof capabilityKeySchema>;

export const roleModelConfigSchema = z.object({
  role: roleNameSchema,
  provider: modelProviderSchema,
  model: nonEmptyStringSchema,
  temperature: scoreSchema,
  maxTokens: positiveIntegerSchema,
  timeoutMs: positiveIntegerSchema,
  maxRetries: z.number().int().min(0),
  fallback: z
    .object({
      provider: modelProviderSchema,
      model: nonEmptyStringSchema
    })
    .optional()
});
export type RoleModelConfig = z.infer<typeof roleModelConfigSchema>;

export const capabilityOverrideConfigSchema = z.object({
  capability: capabilityKeySchema,
  appliesToRoles: z.array(roleNameSchema).min(1),
  provider: modelProviderSchema,
  model: nonEmptyStringSchema,
  reason: nonEmptyStringSchema
});
export type CapabilityOverrideConfig = z.infer<
  typeof capabilityOverrideConfigSchema
>;

export const routingPolicyConfigSchema = z.object({
  defaultRoleRouting: z
    .array(roleModelConfigSchema)
    .min(1)
    .superRefine((value, context) => {
      const seenRoles = new Set<RoleName>();

      for (const entry of value) {
        if (seenRoles.has(entry.role)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate routing entry for role: ${entry.role}`
          });
        }

        seenRoles.add(entry.role);
      }

      for (const role of roleNames) {
        if (!seenRoles.has(role)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Missing default routing entry for role: ${role}`
          });
        }
      }
    }),
  capabilityOverrides: z.array(capabilityOverrideConfigSchema),
  providerPriority: z
    .array(modelProviderSchema)
    .min(1)
    .superRefine((value, context) => {
      const uniqueProviders = new Set(value);

      if (uniqueProviders.size !== value.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'providerPriority must not contain duplicates'
        });
      }
    }),
  allowAutomaticMutation: z.boolean(),
  requirePRForRoutingChange: z.boolean(),
  requireBenchmarkEvidenceForRoutingChange: z.boolean()
});
export type RoutingPolicyConfig = z.infer<typeof routingPolicyConfigSchema>;

export function parseRoutingPolicy(value: unknown): RoutingPolicyConfig {
  return routingPolicyConfigSchema.parse(value);
}
