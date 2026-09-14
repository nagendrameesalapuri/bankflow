import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(3, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

export const verifyOtpSchema = z.object({
  loginToken: z.string().min(10),
  otp: z.string().length(6, 'Enter the 6-digit code'),
});

export const resendOtpSchema = z.object({
  loginToken: z.string().min(10),
});

export const forgotPasswordSchema = z.object({
  email: z.string().min(3),
});

const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: passwordRule,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordRule,
});
