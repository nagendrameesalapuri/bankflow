import { withTransaction } from '../db/pool';
import * as accountRepo from '../repositories/accountRepository';
import * as paymentRepo from '../repositories/paymentRepository';
import * as transactionRepo from '../repositories/transactionRepository';
import { ApiError } from '../utils/ApiError';
import * as otpService from './otpService';
import { createNotification } from './notificationService';
import { toPublicTransaction } from './transactionService';
import { emitAccountUpdated, emitTransactionCreated } from './realtimeService';
import { pushAdminActivity } from './activityFeedService';
import type { PaymentRow } from '../repositories/paymentRepository';

export const BILLERS: Record<string, { id: string; name: string }[]> = {
  ELECTRICITY: [
    { id: 'pwr-north', name: 'Northgrid Power Co.' },
    { id: 'pwr-city', name: 'MetroCity Electric' },
  ],
  MOBILE: [
    { id: 'mob-orbit', name: 'Orbit Mobile' },
    { id: 'mob-wave', name: 'WaveLink Telecom' },
  ],
  INTERNET: [
    { id: 'net-fiber', name: 'FiberStream Broadband' },
    { id: 'net-sky', name: 'SkyNet Internet' },
  ],
  WATER: [{ id: 'wtr-city', name: 'City Water Board' }],
  CREDIT_CARD: [
    { id: 'cc-bankflow', name: 'BankFlow Credit Card' },
    { id: 'cc-partner', name: 'Partner Bank Credit Card' },
  ],
  INSURANCE: [
    { id: 'ins-life', name: 'Sureway Life Insurance' },
    { id: 'ins-auto', name: 'Guardian Auto Insurance' },
  ],
};

export function listBillers(category?: string) {
  if (category) return { [category]: BILLERS[category] ?? [] };
  return BILLERS;
}

function deterministicAmount(consumerNumber: string): number {
  let hash = 0;
  for (const ch of consumerNumber) hash = (hash * 31 + ch.charCodeAt(0)) % 100000;
  return Math.round((200 + (hash % 4800)) * 100) / 100;
}

export function lookupBill(category: string, billerId: string, consumerNumber: string) {
  const biller = (BILLERS[category] ?? []).find((b) => b.id === billerId);
  if (!biller) throw ApiError.notFound('Biller not found.');
  if (!/^[A-Za-z0-9]{4,20}$/.test(consumerNumber)) {
    throw ApiError.badRequest('Enter a valid customer/account number.');
  }
  return {
    billerId: biller.id,
    billerName: biller.name,
    category,
    consumerNumber,
    amountDue: deterministicAmount(consumerNumber + billerId),
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  };
}

export function toPublicPayment(p: PaymentRow) {
  return {
    id: p.id,
    accountId: p.account_id,
    category: p.category,
    billerName: p.biller_name,
    consumerNumber: p.consumer_number,
    amount: Number(p.amount),
    status: p.status,
    transactionId: p.transaction_id,
    createdAt: p.created_at,
  };
}

interface InitiatePaymentInput {
  accountId: string;
  category: string;
  billerName: string;
  consumerNumber: string;
  amount: number;
}

export async function initiatePayment(userId: string, input: InitiatePaymentInput) {
  const account = await accountRepo.findById(input.accountId);
  if (!account || account.user_id !== userId) throw ApiError.notFound('Account not found.');
  if (Number(account.available_balance) < input.amount) {
    throw ApiError.unprocessable('Insufficient balance for this payment.');
  }

  const duplicate = await paymentRepo.findRecentDuplicate(input.accountId, input.consumerNumber, input.amount);
  if (duplicate) {
    throw ApiError.conflict('A matching payment was already made in the last few minutes.');
  }

  const payment = await paymentRepo.create({ userId, ...input });
  const otp = await otpService.issueOtp(userId, 'PAYMENT', { paymentId: payment.id, userId });
  return { paymentId: payment.id, ...otp };
}

export async function verifyPaymentOtp(userId: string, paymentId: string, code: string) {
  const context = await otpService.verifyOtp(userId, 'PAYMENT', code);
  if ((context as { paymentId?: string }).paymentId !== paymentId) {
    throw ApiError.badRequest('This OTP does not match the requested payment.');
  }

  const payment = await paymentRepo.findById(paymentId);
  if (!payment) throw ApiError.notFound('Payment not found.');
  if (payment.status !== 'PENDING') throw ApiError.conflict('This payment has already been processed.');

  const amount = Number(payment.amount);
  try {
    const result = await withTransaction(async (client) => {
      const account = await accountRepo.findByIdForUpdate(client, payment.account_id);
      if (!account) throw ApiError.notFound('Account not found.');
      if (Number(account.available_balance) < amount) {
        throw ApiError.unprocessable('Insufficient balance for this payment.');
      }
      const updatedAccount = await accountRepo.adjustBalances(client, account.id, -amount);
      const tx = await transactionRepo.insertTransaction(client, {
        accountId: account.id,
        type: 'PAYMENT',
        description: `${payment.category} bill payment - ${payment.biller_name}`,
        amount,
        direction: 'DEBIT',
        status: 'SUCCESS',
        counterpartyName: payment.biller_name,
        balanceAfter: Number(updatedAccount.available_balance),
      });
      await paymentRepo.markStatus(client, paymentId, 'SUCCESS', tx.id);
      return { transaction: tx, account: updatedAccount };
    });

    await createNotification(userId, 'Bill payment successful', `₹${amount.toLocaleString('en-IN')} paid to ${payment.biller_name}.`, 'SUCCESS');
    emitAccountUpdated(userId, result.account);
    emitTransactionCreated(userId, result.transaction);
    pushAdminActivity('TRANSACTION', `Bill payment of ₹${amount.toLocaleString('en-IN')} completed.`, {
      amount,
      biller: payment.biller_name,
    });
    return { status: 'SUCCESS' as const, transaction: toPublicTransaction(result.transaction) };
  } catch (err) {
    await withTransaction((client) => paymentRepo.markStatus(client, paymentId, 'FAILED'));
    await createNotification(userId, 'Bill payment failed', `Your payment to ${payment.biller_name} could not be completed.`, 'WARNING');
    throw err;
  }
}

export async function listMyPayments(userId: string, page: number, limit: number) {
  const { rows, total } = await paymentRepo.listByUser(userId, page, limit);
  return {
    data: rows.map(toPublicPayment),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
