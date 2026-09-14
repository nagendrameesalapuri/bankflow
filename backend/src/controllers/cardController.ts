import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as cardService from '../services/cardService';

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({ data: await cardService.listMyCards(req.user!.sub) });
});

export const block = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({ data: await cardService.blockCard(req.user!.sub, req.params.id) });
});

export const unblock = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({ data: await cardService.unblockCard(req.user!.sub, req.params.id) });
});

export const freeze = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({ data: await cardService.freezeCard(req.user!.sub, req.params.id) });
});

export const changeLimit = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({ data: await cardService.changeLimit(req.user!.sub, req.params.id, req.body.creditLimit) });
});

export const transactions = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  res.status(200).json(await cardService.listCardTransactions(req.user!.sub, req.params.id, page, limit));
});

export const requestCard = asyncHandler(async (req: Request, res: Response) => {
  const { accountId, cardType, cardHolderName } = req.body;
  const card = await cardService.requestNewCard(req.user!.sub, accountId, cardType, cardHolderName);
  res.status(201).json({ data: card });
});

export const updateControls = asyncHandler(async (req: Request, res: Response) => {
  const card = await cardService.updateControls(req.user!.sub, req.params.id, req.body);
  res.status(200).json({ data: card });
});

export const setPin = asyncHandler(async (req: Request, res: Response) => {
  const result = await cardService.setPin(req.user!.sub, req.params.id, req.body.pin);
  res.status(200).json(result);
});
