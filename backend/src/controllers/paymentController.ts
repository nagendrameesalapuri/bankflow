import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as paymentService from '../services/paymentService';

export const billers = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({ data: paymentService.listBillers(req.query.category as string | undefined) });
});

export const lookupBill = asyncHandler(async (req: Request, res: Response) => {
  const { category, billerId, consumerNumber } = req.body;
  res.status(200).json({ data: paymentService.lookupBill(category, billerId, consumerNumber) });
});

export const initiate = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentService.initiatePayment(req.user!.sub, req.body);
  res.status(202).json({ requiresOtp: true, ...result });
});

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentService.verifyPaymentOtp(req.user!.sub, req.params.id, req.body.otp);
  res.status(200).json({ data: result });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  res.status(200).json(await paymentService.listMyPayments(req.user!.sub, page, limit));
});
