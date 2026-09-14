import * as cardRepo from '../repositories/cardRepository';
import * as accountRepo from '../repositories/accountRepository';
import * as transactionRepo from '../repositories/transactionRepository';
import type { CardRow } from '../repositories/cardRepository';
import { ApiError } from '../utils/ApiError';
import { maskCardNumber, generateCardNumber } from '../utils/format';
import { toPublicTransaction } from './transactionService';
import { createNotification } from './notificationService';
import { pushAdminActivity } from './activityFeedService';
import { hashValue } from '../utils/password';

const MAX_CARDS_PER_USER = 5;
const DEFAULT_CREDIT_LIMIT = 50_000;

export function toPublicCard(c: CardRow) {
  return {
    id: c.id,
    accountId: c.account_id,
    cardType: c.card_type,
    maskedCardNumber: maskCardNumber(c.card_number),
    cardHolderName: c.card_holder_name,
    expiryMonth: c.expiry_month,
    expiryYear: c.expiry_year,
    status: c.status,
    creditLimit: c.credit_limit !== null ? Number(c.credit_limit) : null,
    availableLimit: c.available_limit !== null ? Number(c.available_limit) : null,
    onlineEnabled: c.online_enabled,
    internationalEnabled: c.international_enabled,
    hasPinSet: !!c.pin_hash,
  };
}

export async function listMyCards(userId: string) {
  const cards = await cardRepo.listByUser(userId);
  return cards.map(toPublicCard);
}

async function getOwnedCard(userId: string, id: string): Promise<CardRow> {
  const card = await cardRepo.findById(id);
  if (!card || card.user_id !== userId) throw ApiError.notFound('Card not found.');
  return card;
}

export async function blockCard(userId: string, id: string) {
  await getOwnedCard(userId, id);
  return toPublicCard(await cardRepo.setStatus(id, 'BLOCKED'));
}

export async function unblockCard(userId: string, id: string) {
  await getOwnedCard(userId, id);
  return toPublicCard(await cardRepo.setStatus(id, 'ACTIVE'));
}

export async function freezeCard(userId: string, id: string) {
  await getOwnedCard(userId, id);
  return toPublicCard(await cardRepo.setStatus(id, 'FROZEN'));
}

export async function changeLimit(userId: string, id: string, newLimit: number) {
  const card = await getOwnedCard(userId, id);
  if (card.card_type !== 'CREDIT') throw ApiError.unprocessable('Only credit cards support a limit change.');
  if (newLimit < 1000 || newLimit > 1_000_000) {
    throw ApiError.badRequest('Limit must be between ₹1,000 and ₹10,00,000.');
  }
  return toPublicCard(await cardRepo.updateLimit(id, newLimit));
}

export async function listCardTransactions(userId: string, id: string, page: number, limit: number) {
  const card = await getOwnedCard(userId, id);
  const { rows, total } = await transactionRepo.search({
    accountIds: [card.account_id],
    page,
    limit,
    sort: 'date_desc',
  });
  return {
    data: rows.map(toPublicTransaction),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function requestNewCard(userId: string, accountId: string, cardType: 'DEBIT' | 'CREDIT', cardHolderName: string) {
  const account = await accountRepo.findById(accountId);
  if (!account || account.user_id !== userId) throw ApiError.notFound('Account not found.');
  if (account.status !== 'ACTIVE') throw ApiError.unprocessable('Cards can only be linked to an active account.');

  const existingCount = await cardRepo.countByUser(userId);
  if (existingCount >= MAX_CARDS_PER_USER) {
    throw ApiError.unprocessable(`You've reached the maximum of ${MAX_CARDS_PER_USER} cards per customer.`);
  }

  const now = new Date();
  const card = await cardRepo.create({
    userId,
    accountId,
    cardType,
    cardNumber: generateCardNumber(),
    cardHolderName: cardHolderName.toUpperCase(),
    expiryMonth: now.getMonth() + 1,
    expiryYear: now.getFullYear() + 4,
    creditLimit: cardType === 'CREDIT' ? DEFAULT_CREDIT_LIMIT : undefined,
  });

  await createNotification(
    userId,
    'New card issued',
    `Your new ${cardType.toLowerCase()} card ending in ${card.card_number.slice(-4)} is ready to use.`,
    'SUCCESS',
  );
  pushAdminActivity('CARD', `A new ${cardType.toLowerCase()} card was issued to a customer.`);

  return toPublicCard(card);
}

export async function updateControls(
  userId: string,
  id: string,
  controls: Partial<{ onlineEnabled: boolean; internationalEnabled: boolean }>,
) {
  const card = await getOwnedCard(userId, id);
  if (card.status !== 'ACTIVE') {
    throw ApiError.unprocessable('Card controls can only be changed on an active card.');
  }
  return toPublicCard(await cardRepo.updateControls(id, controls));
}

export async function setPin(userId: string, id: string, pin: string) {
  const card = await getOwnedCard(userId, id);
  if (card.status !== 'ACTIVE') throw ApiError.unprocessable('Only an active card can have its PIN set.');
  if (!/^\d{4}$/.test(pin)) throw ApiError.badRequest('PIN must be exactly 4 digits.');

  const pinHash = await hashValue(pin);
  await cardRepo.setPinHash(id, pinHash);
  await createNotification(userId, 'Card PIN updated', `The PIN for your card ending in ${card.card_number.slice(-4)} was changed.`, 'SECURITY');
  return { message: 'PIN set successfully.' };
}
