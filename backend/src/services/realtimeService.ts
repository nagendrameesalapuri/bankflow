import { emitToUser } from '../sockets/io';
import { toPublicAccount } from './accountService';
import { toPublicTransaction } from './transactionService';
import type { AccountRow } from '../repositories/accountRepository';
import type { TransactionRow } from '../repositories/transactionRepository';

/**
 * Pushes a balance change to every open tab/device the account owner is
 * connected from, so a transfer made in one tab is reflected instantly in
 * any other open BankFlow session for the same user - no manual refresh.
 */
export function emitAccountUpdated(userId: string, account: AccountRow) {
  emitToUser(userId, 'account:updated', toPublicAccount(account, { reveal: true }));
}

export function emitTransactionCreated(userId: string, transaction: TransactionRow) {
  emitToUser(userId, 'transaction:created', toPublicTransaction(transaction));
}
