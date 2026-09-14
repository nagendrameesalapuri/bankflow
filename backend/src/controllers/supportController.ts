import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as userRepo from '../repositories/userRepository';
import * as accountRepo from '../repositories/accountRepository';
import * as transactionRepo from '../repositories/transactionRepository';
import { toPublicUser } from '../types/domain';
import { toPublicAccount } from '../services/accountService';
import { toPublicTransaction } from '../services/transactionService';
import { ApiError } from '../utils/ApiError';

export const searchCustomers = asyncHandler(async (req: Request, res: Response) => {
  const { search, page, limit } = req.query as unknown as { search?: string; page: number; limit: number };
  const { rows, total } = await userRepo.listUsers({ search, role: 'CUSTOMER', page, limit });
  res.status(200).json({
    data: rows.map(toPublicUser),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const user = await userRepo.findById(req.params.id);
  if (!user || user.role_name !== 'CUSTOMER') throw ApiError.notFound('Customer not found.');
  const accounts = await accountRepo.listByUser(user.id);
  res.status(200).json({
    data: {
      user: toPublicUser(user),
      accounts: accounts.map((a) => toPublicAccount(a)),
    },
  });
});

export const getCustomerTransactions = asyncHandler(async (req: Request, res: Response) => {
  const user = await userRepo.findById(req.params.id);
  if (!user || user.role_name !== 'CUSTOMER') throw ApiError.notFound('Customer not found.');
  const accounts = await accountRepo.listByUser(user.id);
  const accountIds = accounts.map((a) => a.id);
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  if (accountIds.length === 0) {
    return res.status(200).json({ data: [], pagination: { page, limit, total: 0, totalPages: 0 } });
  }
  const { rows, total } = await transactionRepo.search({ accountIds, page, limit, sort: 'date_desc' });
  res.status(200).json({
    data: rows.map(toPublicTransaction),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});
