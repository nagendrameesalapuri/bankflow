import { z } from 'zod';

export const changeLimitSchema = z.object({
  creditLimit: z.coerce.number().positive(),
});

export const listCardTxSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const requestCardSchema = z.object({
  accountId: z.string().uuid(),
  cardType: z.enum(['DEBIT', 'CREDIT']),
  cardHolderName: z.string().min(2).max(60),
});

export const updateControlsSchema = z.object({
  onlineEnabled: z.boolean().optional(),
  internationalEnabled: z.boolean().optional(),
});

export const setPinSchema = z
  .object({
    pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
    confirmPin: z.string().regex(/^\d{4}$/),
  })
  .refine((data) => data.pin === data.confirmPin, { message: 'PINs do not match.', path: ['confirmPin'] });
