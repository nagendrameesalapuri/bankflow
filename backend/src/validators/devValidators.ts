import { z } from 'zod';

export const upsertChaosRuleSchema = z.object({
  routeKey: z.string().min(3),
  enabled: z.boolean().optional(),
  delayMs: z.coerce.number().int().min(0).max(30000).optional(),
  failTimes: z.coerce.number().int().min(0).max(20).optional(),
  failStatusCode: z.coerce.number().int().min(400).max(599).optional(),
  simulateTimeout: z.boolean().optional(),
});
