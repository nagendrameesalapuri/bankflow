import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as transactionService from '../services/transactionService';

export const listTransactions = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as unknown as transactionService.TransactionQuery;
  const result = await transactionService.searchMyTransactions(req.user!.sub, q);
  res.status(200).json(result);
});
