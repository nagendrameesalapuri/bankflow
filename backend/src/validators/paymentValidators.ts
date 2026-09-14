import { z } from 'zod';

export const billLookupSchema = z.object({
  category: z.enum(['ELECTRICITY', 'MOBILE', 'INTERNET', 'WATER', 'CREDIT_CARD', 'INSURANCE']),
  billerId: z.string().min(1),
  consumerNumber: z.string().min(4).max(20),
});

export const initiatePaymentSchema = z.object({
  accountId: z.string().uuid(),
  category: z.enum(['ELECTRICITY', 'MOBILE', 'INTERNET', 'WATER', 'CREDIT_CARD', 'INSURANCE']),
  billerName: z.string().min(2),
  consumerNumber: z.string().min(4).max(20),
  amount: z.coerce.number().positive(),
});

export const verifyPaymentOtpSchema = z.object({ otp: z.string().length(6) });

export const listPaymentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
