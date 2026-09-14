import * as accountRepo from '../repositories/accountRepository';
import * as transactionRepo from '../repositories/transactionRepository';
import type { TransactionRow } from '../repositories/transactionRepository';
import { ApiError } from '../utils/ApiError';

export function toPublicTransaction(t: TransactionRow) {
  return {
    id: t.id,
    accountId: t.account_id,
    type: t.type,
    description: t.description,
    amount: Number(t.amount),
    direction: t.direction,
    status: t.status,
    counterpartyName: t.counterparty_name,
    referenceNumber: t.reference_number,
    balanceAfter: t.balance_after !== null ? Number(t.balance_after) : null,
    createdAt: t.created_at,
  };
}

export interface TransactionQuery {
  accountId?: string;
  page: number;
  limit: number;
  type?: string;
  status?: string;
  direction?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  q?: string;
  sort?: string;
}

export async function searchMyTransactions(userId: string, filters: TransactionQuery) {
  const myAccounts = await accountRepo.listByUser(userId);
  const myAccountIds = myAccounts.map((a) => a.id);

  let accountIds = myAccountIds;
  if (filters.accountId) {
    if (!myAccountIds.includes(filters.accountId)) {
      throw ApiError.forbidden('You do not have access to this account.');
    }
    accountIds = [filters.accountId];
  }

  if (accountIds.length === 0) {
    return { data: [], pagination: { page: filters.page, limit: filters.limit, total: 0, totalPages: 0 } };
  }

  const { rows, total } = await transactionRepo.search({ ...filters, accountIds });
  return {
    data: rows.map(toPublicTransaction),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
}
