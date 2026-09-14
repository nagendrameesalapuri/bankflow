import { withTransaction } from '../db/pool';
import * as accountRepo from '../repositories/accountRepository';
import * as beneficiaryRepo from '../repositories/beneficiaryRepository';
import * as transferRepo from '../repositories/transferRepository';
import * as transactionRepo from '../repositories/transactionRepository';
import * as userRepo from '../repositories/userRepository';
import { ApiError } from '../utils/ApiError';
import * as otpService from './otpService';
import { createNotification } from './notificationService';
import { toPublicTransaction } from './transactionService';
import { emitAccountUpdated, emitTransactionCreated } from './realtimeService';
import { pushAdminActivity } from './activityFeedService';

export const MAX_TRANSFER_LIMIT = 500_000;

interface TransferInput {
  fromAccountId: string;
  beneficiaryId: string;
  amount: number;
  remarks?: string;
}

async function validateTransfer(userId: string, input: TransferInput) {
  const account = await accountRepo.findById(input.fromAccountId);
  if (!account || account.user_id !== userId) throw ApiError.notFound('Source account not found.');
  if (account.status !== 'ACTIVE') throw ApiError.unprocessable('Source account is not active.');

  const beneficiary = await beneficiaryRepo.findById(input.beneficiaryId);
  if (!beneficiary || beneficiary.user_id !== userId) throw ApiError.notFound('Beneficiary not found.');
  if (beneficiary.status !== 'ACTIVE') {
    throw ApiError.unprocessable('This beneficiary is inactive. Activate it before transferring funds.');
  }

  if (input.amount <= 0) throw ApiError.badRequest('Enter a valid amount.');
  if (input.amount > MAX_TRANSFER_LIMIT) {
    throw ApiError.unprocessable(`Amount exceeds the maximum transfer limit of ${MAX_TRANSFER_LIMIT}.`);
  }
  if (Number(account.available_balance) < input.amount) {
    throw ApiError.unprocessable('Insufficient balance to complete this transfer.');
  }

  return { account, beneficiary };
}

export async function quoteTransfer(userId: string, input: TransferInput) {
  const { account, beneficiary } = await validateTransfer(userId, input);
  return {
    fromAccount: { id: account.id, availableBalance: Number(account.available_balance) },
    beneficiary: { id: beneficiary.id, name: beneficiary.name, bankName: beneficiary.bank_name },
    amount: input.amount,
    fee: 0,
    total: input.amount,
  };
}

export async function initiateTransfer(userId: string, input: TransferInput) {
  await validateTransfer(userId, input);
  const transfer = await transferRepo.create(input);
  const otp = await otpService.issueOtp(userId, 'TRANSFER', { transferId: transfer.id, userId });
  return { transferId: transfer.id, ...otp };
}

export async function verifyTransferOtp(userId: string, transferId: string, code: string) {
  const context = await otpService.verifyOtp(userId, 'TRANSFER', code);
  if ((context as { transferId?: string }).transferId !== transferId) {
    throw ApiError.badRequest('This OTP does not match the requested transfer.');
  }

  const transfer = await transferRepo.findById(transferId);
  if (!transfer) throw ApiError.notFound('Transfer not found.');
  if (transfer.status !== 'PENDING_OTP') throw ApiError.conflict('This transfer has already been processed.');

  const beneficiary = await beneficiaryRepo.findById(transfer.beneficiary_id);
  const amount = Number(transfer.amount);

  // If the beneficiary's account number matches a real BankFlow account,
  // this is effectively an internal transfer between two customers - the
  // recipient's actual account must be credited, not just the sender
  // debited. An external-bank beneficiary has no ledger of ours to credit
  // into, so that case stays debit-only (as a real inter-bank transfer
  // would look from our side).
  const recipientAccount = beneficiary ? await accountRepo.findByAccountNumber(beneficiary.account_number) : null;
  const senderUser = await userRepo.findById(userId);

  try {
    const result = await withTransaction(async (client) => {
      const account = await accountRepo.findByIdForUpdate(client, transfer.from_account_id);
      if (!account) throw ApiError.notFound('Source account not found.');
      if (Number(account.available_balance) < amount) {
        throw ApiError.unprocessable('Insufficient balance to complete this transfer.');
      }

      const updatedAccount = await accountRepo.adjustBalances(client, account.id, -amount);
      const transaction = await transactionRepo.insertTransaction(client, {
        accountId: account.id,
        type: 'TRANSFER',
        description: `Transfer to ${beneficiary?.name ?? 'beneficiary'}`,
        amount,
        direction: 'DEBIT',
        status: 'SUCCESS',
        counterpartyName: beneficiary?.name,
        balanceAfter: Number(updatedAccount.available_balance),
      });

      let credit: { account: typeof updatedAccount; transaction: typeof transaction; userId: string } | null = null;
      if (recipientAccount && recipientAccount.id !== account.id) {
        const lockedRecipient = await accountRepo.findByIdForUpdate(client, recipientAccount.id);
        if (lockedRecipient) {
          const updatedRecipient = await accountRepo.adjustBalances(client, lockedRecipient.id, amount);
          const creditTransaction = await transactionRepo.insertTransaction(client, {
            accountId: lockedRecipient.id,
            type: 'TRANSFER',
            description: `Transfer from ${senderUser?.full_name ?? 'a BankFlow customer'}`,
            amount,
            direction: 'CREDIT',
            status: 'SUCCESS',
            counterpartyName: senderUser?.full_name,
            balanceAfter: Number(updatedRecipient.available_balance),
          });
          credit = { account: updatedRecipient, transaction: creditTransaction, userId: lockedRecipient.user_id };
        }
      }

      await transferRepo.markStatus(client, transferId, 'SUCCESS', { transactionId: transaction.id });
      return { transaction, account: updatedAccount, credit };
    });

    await createNotification(
      userId,
      'Transfer successful',
      `₹${amount.toLocaleString('en-IN')} transferred to ${beneficiary?.name ?? 'beneficiary'} successfully.`,
      'SUCCESS',
    );
    emitAccountUpdated(userId, result.account);
    emitTransactionCreated(userId, result.transaction);

    if (result.credit) {
      await createNotification(
        result.credit.userId,
        'Money received',
        `₹${amount.toLocaleString('en-IN')} received from ${senderUser?.full_name ?? 'a BankFlow customer'}.`,
        'SUCCESS',
      );
      emitAccountUpdated(result.credit.userId, result.credit.account);
      emitTransactionCreated(result.credit.userId, result.credit.transaction);
    }

    pushAdminActivity('TRANSACTION', `Transfer of ₹${amount.toLocaleString('en-IN')} completed by a customer.`, {
      amount,
      referenceNumber: result.transaction.reference_number,
      internal: !!result.credit,
    });

    return {
      status: 'SUCCESS' as const,
      transaction: toPublicTransaction(result.transaction),
    };
  } catch (err) {
    await withTransaction(async (client) => {
      await transferRepo.markStatus(client, transferId, 'FAILED', {
        failureReason: err instanceof Error ? err.message : 'Unknown error',
      });
    });
    await createNotification(
      userId,
      'Transfer failed',
      `Your transfer of ₹${amount.toLocaleString('en-IN')} could not be completed.`,
      'WARNING',
    );
    throw err;
  }
}
