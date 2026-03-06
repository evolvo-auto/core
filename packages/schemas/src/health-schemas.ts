import { z } from 'zod';

export const serviceNameSchema = z.enum(['dashboard', 'runtime', 'supervisor']);

export const serviceHealthStatusSchema = z.enum([
  'degraded',
  'healthy',
  'unavailable'
]);

export const serviceCheckStatusSchema = z.enum(['fail', 'pass', 'warn']);

export const serviceHealthCheckSchema = z.object({
  detail: z.string().trim().min(1),
  name: z.string().trim().min(1),
  status: serviceCheckStatusSchema
});

export const serviceHealthSchema = z.object({
  checks: z.array(serviceHealthCheckSchema).min(1),
  endpoint: z.string().trim().min(1).optional(),
  observedAt: z.string().datetime({ offset: true }),
  responseTimeMs: z.number().nonnegative().optional(),
  service: serviceNameSchema,
  startedAt: z.string().datetime({ offset: true }),
  status: serviceHealthStatusSchema,
  uptimeMs: z.number().int().nonnegative(),
  version: z.string().trim().min(1)
});

export const platformHealthSnapshotSchema = z.object({
  generatedAt: z.string().datetime({ offset: true }),
  services: z
    .array(serviceHealthSchema)
    .length(3)
    .refine(
      (services) =>
        new Set(services.map((service) => service.service)).size ===
        services.length,
      {
        message: 'services must contain unique service names'
      }
    )
});

export type PlatformHealthSnapshot = z.infer<
  typeof platformHealthSnapshotSchema
>;
export type ServiceHealth = z.infer<typeof serviceHealthSchema>;
export type ServiceHealthCheck = z.infer<typeof serviceHealthCheckSchema>;
export type ServiceHealthCheckStatus = z.infer<typeof serviceCheckStatusSchema>;
export type ServiceHealthStatus = z.infer<typeof serviceHealthStatusSchema>;
export type ServiceName = z.infer<typeof serviceNameSchema>;
