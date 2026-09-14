import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as transferService from '../services/transferService';

export const quote = asyncHandler(async (req: Request, res: Response) => {
  const result = await transferService.quoteTransfer(req.user!.sub, req.body);
  res.status(200).json({ data: result });
});

export const initiate = asyncHandler(async (req: Request, res: Response) => {
  const result = await transferService.initiateTransfer(req.user!.sub, req.body);
  res.status(202).json({ requiresOtp: true, ...result });
});

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const result = await transferService.verifyTransferOtp(req.user!.sub, req.params.id, req.body.otp);
  res.status(200).json({ data: result });
});
