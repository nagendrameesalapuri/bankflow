import * as accountRepo from '../repositories/accountRepository';
import { ApiError } from '../utils/ApiError';
import { maskAccountNumber } from '../utils/format';
import type { AccountRow } from '../repositories/accountRepository';

export function toPublicAccount(a: AccountRow, opts: { reveal?: boolean } = {}) {
  return {
    id: a.id,
    accountNumber: opts.reveal ? a.account_number : maskAccountNumber(a.account_number),
    maskedAccountNumber: maskAccountNumber(a.account_number),
    accountType: a.account_type,
    currency: a.currency,
    availableBalance: Number(a.available_balance),
    currentBalance: Number(a.current_balance),
    interestRate: Number(a.interest_rate),
    status: a.status,
    openedAt: a.opened_at,
  };
}

export async function listMyAccounts(userId: string) {
  const accounts = await accountRepo.listByUser(userId);
  return accounts.map((a) => toPublicAccount(a));
}

export async function getAccountForUser(userId: string, accountId: string): Promise<AccountRow> {
  const account = await accountRepo.findById(accountId);
  if (!account || account.user_id !== userId) {
    throw ApiError.notFound('Account not found.');
  }
  return account;
}

export async function getAccountDetail(userId: string, accountId: string) {
  const account = await getAccountForUser(userId, accountId);
  return {
    ...toPublicAccount(account, { reveal: true }),
    interest: {
      rate: Number(account.interest_rate),
      accruedThisYear: Math.round(Number(account.current_balance) * (Number(account.interest_rate) / 100) * 100) / 100,
    },
  };
}
