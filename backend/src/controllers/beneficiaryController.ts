import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as beneficiaryService from '../services/beneficiaryService';

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({ data: await beneficiaryService.listMyBeneficiaries(req.user!.sub) });
});

export const verifyAccount = asyncHandler(async (req: Request, res: Response) => {
  const { accountNumber, bankName } = req.body;
  const result = await beneficiaryService.verifyAccountNumber(req.user!.sub, accountNumber, bankName);
  res.status(200).json({ data: result });
});

export const initiate = asyncHandler(async (req: Request, res: Response) => {
  const otp = await beneficiaryService.initiateAddBeneficiary(req.user!.sub, req.body);
  res.status(202).json({ requiresOtp: true, ...otp });
});

export const confirm = asyncHandler(async (req: Request, res: Response) => {
  const beneficiary = await beneficiaryService.confirmAddBeneficiary(req.user!.sub, req.body.otp);
  res.status(201).json({ data: beneficiary });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const beneficiary = await beneficiaryService.updateBeneficiary(req.user!.sub, req.params.id, req.body);
  res.status(200).json({ data: beneficiary });
});

export const activate = asyncHandler(async (req: Request, res: Response) => {
  await beneficiaryService.setBeneficiaryStatus(req.user!.sub, req.params.id, 'ACTIVE');
  res.status(200).json({ message: 'Beneficiary activated.' });
});

export const deactivate = asyncHandler(async (req: Request, res: Response) => {
  await beneficiaryService.setBeneficiaryStatus(req.user!.sub, req.params.id, 'INACTIVE');
  res.status(200).json({ message: 'Beneficiary deactivated.' });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await beneficiaryService.deleteBeneficiary(req.user!.sub, req.params.id);
  res.status(204).send();
});
