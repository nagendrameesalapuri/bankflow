import { z } from 'zod';

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  address: z.string().max(200).optional(),
});

export const sensitiveUpdateSchema = z.object({
  email: z.string().email().optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/)
    .optional(),
});

export const confirmSensitiveUpdateSchema = z.object({
  otp: z.string().length(6),
});

export const preferencesSchema = z.object({
  widgetOrder: z.array(z.string()).optional(),
}).passthrough();
