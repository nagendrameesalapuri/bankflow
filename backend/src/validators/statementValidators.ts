import { z } from 'zod';

export const generateStatementSchema = z.object({
  accountId: z.string().uuid(),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const listStatementsSchema = z.object({
  accountId: z.string().uuid(),
});
