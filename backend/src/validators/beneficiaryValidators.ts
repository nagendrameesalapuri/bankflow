import { z } from 'zod';

export const newBeneficiarySchema = z.object({
  name: z.string().min(2).max(100),
  nickname: z.string().max(50).optional(),
  accountNumber: z.string().min(6).max(20),
  bankName: z.string().min(2).max(100),
  ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid IFSC code (e.g. HDFC0001234)'),
});

export const verifyAccountSchema = z.object({
  accountNumber: z.string().min(6).max(20),
  bankName: z.string().min(2).max(100),
});

export const confirmOtpSchema = z.object({
  otp: z.string().length(6),
});

export const updateBeneficiarySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  nickname: z.string().max(50).optional(),
  bankName: z.string().min(2).max(100).optional(),
  ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/).optional(),
});
