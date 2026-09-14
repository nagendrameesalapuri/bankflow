import { z } from 'zod';

export const transferInputSchema = z.object({
  fromAccountId: z.string().uuid(),
  beneficiaryId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  remarks: z.string().max(200).optional(),
});

export const verifyTransferOtpSchema = z.object({
  otp: z.string().length(6),
});
