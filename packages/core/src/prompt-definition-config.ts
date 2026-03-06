import { z } from 'zod';

import { roleNameSchema } from './model-routing-config.ts';

const nonEmptyStringSchema = z.string().trim().min(1);

export const promptResponseModeSchema = z.enum(['json', 'text']);
export type PromptResponseMode = z.infer<typeof promptResponseModeSchema>;

export const promptDefinitionConfigSchema = z.object({
  lineageParentVersion: z.number().int().positive().nullable().optional(),
  lineageReason: nonEmptyStringSchema.nullable().optional(),
  promptKey: nonEmptyStringSchema,
  responseMode: promptResponseModeSchema.default('json'),
  role: roleNameSchema,
  sourceMutationId: nonEmptyStringSchema.nullable().optional(),
  title: nonEmptyStringSchema,
  version: z.number().int().positive()
});
export type PromptDefinitionConfig = z.infer<
  typeof promptDefinitionConfigSchema
>;

export function parsePromptDefinitionConfig(
  value: unknown
): PromptDefinitionConfig {
  return promptDefinitionConfigSchema.parse(value);
}
