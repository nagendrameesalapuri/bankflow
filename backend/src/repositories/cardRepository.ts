import { query } from '../db/pool';

export interface CardRow {
  id: string;
  user_id: string;
  account_id: string;
  card_type: 'DEBIT' | 'CREDIT';
  card_number: string;
  card_holder_name: string;
  expiry_month: number;
  expiry_year: number;
  status: 'ACTIVE' | 'BLOCKED' | 'FROZEN';
  credit_limit: string | null;
  available_limit: string | null;
  online_enabled: boolean;
  international_enabled: boolean;
  pin_hash: string | null;
  created_at: Date;
}

export async function listByUser(userId: string): Promise<CardRow[]> {
  const { rows } = await query<CardRow>('SELECT * FROM cards WHERE user_id = $1 ORDER BY created_at ASC', [userId]);
  return rows;
}

export async function findById(id: string): Promise<CardRow | null> {
  const { rows } = await query<CardRow>('SELECT * FROM cards WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function setStatus(id: string, status: CardRow['status']): Promise<CardRow> {
  const { rows } = await query<CardRow>('UPDATE cards SET status = $2 WHERE id = $1 RETURNING *', [id, status]);
  return rows[0];
}

export async function updateLimit(id: string, creditLimit: number): Promise<CardRow> {
  const { rows } = await query<CardRow>(
    `UPDATE cards SET credit_limit = $2,
       available_limit = LEAST(available_limit, $2)
     WHERE id = $1 RETURNING *`,
    [id, creditLimit],
  );
  return rows[0];
}

export async function updateControls(
  id: string,
  controls: Partial<{ onlineEnabled: boolean; internationalEnabled: boolean }>,
): Promise<CardRow> {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (controls.onlineEnabled !== undefined) {
    params.push(controls.onlineEnabled);
    sets.push(`online_enabled = $${params.length}`);
  }
  if (controls.internationalEnabled !== undefined) {
    params.push(controls.internationalEnabled);
    sets.push(`international_enabled = $${params.length}`);
  }
  params.push(id);
  const { rows } = await query<CardRow>(
    `UPDATE cards SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params,
  );
  return rows[0];
}

export async function setPinHash(id: string, pinHash: string): Promise<void> {
  await query('UPDATE cards SET pin_hash = $2 WHERE id = $1', [id, pinHash]);
}

export async function create(input: {
  userId: string;
  accountId: string;
  cardType: 'DEBIT' | 'CREDIT';
  cardNumber: string;
  cardHolderName: string;
  expiryMonth: number;
  expiryYear: number;
  creditLimit?: number;
}): Promise<CardRow> {
  const { rows } = await query<CardRow>(
    `INSERT INTO cards (user_id, account_id, card_type, card_number, card_holder_name, expiry_month, expiry_year, status, credit_limit, available_limit)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', $8, $8) RETURNING *`,
    [
      input.userId,
      input.accountId,
      input.cardType,
      input.cardNumber,
      input.cardHolderName,
      input.expiryMonth,
      input.expiryYear,
      input.creditLimit ?? null,
    ],
  );
  return rows[0];
}

export async function countByUser(userId: string): Promise<number> {
  const { rows } = await query<{ count: string }>('SELECT COUNT(*) FROM cards WHERE user_id = $1', [userId]);
  return Number(rows[0].count);
}
