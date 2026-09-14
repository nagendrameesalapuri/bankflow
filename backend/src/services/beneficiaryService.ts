import * as beneficiaryRepo from '../repositories/beneficiaryRepository';
import * as accountRepo from '../repositories/accountRepository';
import type { BeneficiaryRow } from '../repositories/beneficiaryRepository';
import { ApiError } from '../utils/ApiError';
import * as otpService from './otpService';
import { createNotification } from './notificationService';
import { pushAdminActivity } from './activityFeedService';

export const BANKFLOW_BANK_NAME = 'BankFlow';

export async function verifyAccountNumber(userId: string, accountNumber: string, bankName: string) {
  if (bankName.trim().toLowerCase() !== BANKFLOW_BANK_NAME.toLowerCase()) {
    return {
      verifiable: false,
      verified: false,
      message: 'BankFlow can only verify accounts held at BankFlow. Please double-check external account details before proceeding.',
    };
  }

  const account = await accountRepo.findByAccountNumber(accountNumber);
  if (!account) {
    throw ApiError.notFound('No BankFlow account was found with this account number. Please check and try again.');
  }
  if (account.user_id === userId) {
    throw ApiError.badRequest('You cannot add your own account as a beneficiary.');
  }

  return {
    verifiable: true,
    verified: true,
    accountHolderName: account.owner_name,
    accountType: account.account_type,
    bankName: BANKFLOW_BANK_NAME,
  };
}

export function toPublicBeneficiary(b: BeneficiaryRow) {
  return {
    id: b.id,
    name: b.name,
    nickname: b.nickname,
    accountNumber: b.account_number,
    maskedAccountNumber: `••••${b.account_number.slice(-4)}`,
    bankName: b.bank_name,
    ifsc: b.ifsc,
    status: b.status,
    createdAt: b.created_at,
  };
}

export async function listMyBeneficiaries(userId: string) {
  const rows = await beneficiaryRepo.listByUser(userId);
  return rows.map(toPublicBeneficiary);
}

export async function getOwnedBeneficiary(userId: string, id: string): Promise<BeneficiaryRow> {
  const beneficiary = await beneficiaryRepo.findById(id);
  if (!beneficiary || beneficiary.user_id !== userId) throw ApiError.notFound('Beneficiary not found.');
  return beneficiary;
}

export interface NewBeneficiaryInput {
  name: string;
  nickname?: string;
  accountNumber: string;
  bankName: string;
  ifsc: string;
}

export async function initiateAddBeneficiary(userId: string, input: NewBeneficiaryInput) {
  return otpService.issueOtp(userId, 'ADD_BENEFICIARY', { ...input, userId });
}

export async function confirmAddBeneficiary(userId: string, code: string) {
  const context = await otpService.verifyOtp(userId, 'ADD_BENEFICIARY', code);
  const input = context as unknown as NewBeneficiaryInput;
  const beneficiary = await beneficiaryRepo.create({ userId, ...input });
  await createNotification(
    userId,
    'New beneficiary added',
    `${beneficiary.name} was added to your beneficiary list.`,
    'SUCCESS',
  );
  pushAdminActivity('BENEFICIARY', `A customer added a new beneficiary: ${beneficiary.name}.`);
  return toPublicBeneficiary(beneficiary);
}

export async function updateBeneficiary(
  userId: string,
  id: string,
  fields: Partial<Omit<NewBeneficiaryInput, 'accountNumber'>>,
) {
  await getOwnedBeneficiary(userId, id);
  const updated = await beneficiaryRepo.update(id, fields);
  return toPublicBeneficiary(updated);
}

export async function setBeneficiaryStatus(userId: string, id: string, status: 'ACTIVE' | 'INACTIVE') {
  await getOwnedBeneficiary(userId, id);
  await beneficiaryRepo.setStatus(id, status);
}

export async function deleteBeneficiary(userId: string, id: string) {
  await getOwnedBeneficiary(userId, id);
  await beneficiaryRepo.remove(id);
}
