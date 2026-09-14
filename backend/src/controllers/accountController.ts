import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as accountService from '../services/accountService';

export const listAccounts = asyncHandler(async (req: Request, res: Response) => {
  const accounts = await accountService.listMyAccounts(req.user!.sub);
  res.status(200).json({ data: accounts });
});

export const getAccount = asyncHandler(async (req: Request, res: Response) => {
  const account = await accountService.getAccountDetail(req.user!.sub, req.params.id);
  res.status(200).json({ data: account });
});
