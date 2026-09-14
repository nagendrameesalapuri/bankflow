import { z } from 'zod';

const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

export const createUserSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_.]+$/, 'Username can only contain letters, numbers, dots, and underscores'),
  email: z.string().email(),
  password: passwordRule,
  fullName: z.string().min(2).max(100),
  phone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/)
    .optional(),
  address: z.string().max(200).optional(),
  role: z.enum(['CUSTOMER', 'SUPPORT_AGENT', 'ADMIN']).default('CUSTOMER'),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/)
    .optional(),
  address: z.string().max(200).optional(),
  role: z.enum(['CUSTOMER', 'SUPPORT_AGENT', 'ADMIN']).optional(),
});

export const listUsersSchema = z.object({
  search: z.string().optional(),
  role: z.enum(['CUSTOMER', 'SUPPORT_AGENT', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'LOCKED', 'DISABLED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const listAccountsSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'DORMANT', 'CLOSED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const listTransactionsSchema = z.object({
  status: z.enum(['SUCCESS', 'PENDING', 'FAILED', 'REVERSED']).optional(),
  type: z.enum(['TRANSFER', 'PAYMENT', 'DEPOSIT', 'WITHDRAWAL', 'FEE', 'INTEREST']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const auditLogsSchema = z.object({
  action: z.string().optional(),
  result: z.enum(['SUCCESS', 'FAILURE']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
