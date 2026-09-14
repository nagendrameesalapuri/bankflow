import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as statementService from '../services/statementService';

export const generate = asyncHandler(async (req: Request, res: Response) => {
  const { accountId, periodStart, periodEnd } = req.body;
  const statement = await statementService.generateStatement(req.user!.sub, accountId, periodStart, periodEnd);
  res.status(201).json({ data: statement });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { accountId } = req.query as unknown as { accountId: string };
  res.status(200).json({ data: await statementService.listStatements(req.user!.sub, accountId) });
});

export const downloadPdf = asyncHandler(async (req: Request, res: Response) => {
  const pdf = await statementService.buildStatementPdf(req.user!.sub, req.params.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="statement-${req.params.id}.pdf"`);
  res.status(200).send(pdf);
});

export const downloadCsv = asyncHandler(async (req: Request, res: Response) => {
  const csv = await statementService.buildStatementCsv(req.user!.sub, req.params.id);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="statement-${req.params.id}.csv"`);
  res.status(200).send(csv);
});
