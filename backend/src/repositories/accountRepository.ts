import { query } from '../db/pool';

export interface AccountRow {
  id: string;
  account_number: string;
  user_id: string;
  account_type: 'SAVINGS' | 'CURRENT' | 'FIXED_DEPOSIT';
  currency: string;
  available_balance: string;
  current_balance: string;
  interest_rate: string;
  status: 'ACTIVE' | 'DORMANT' | 'CLOSED';
  opened_at: Date;
  created_at: Date;
  updated_at: Date;
}

export async function listByUser(userId: string): Promise<AccountRow[]> {
  const { rows } = await query<AccountRow>(
    'SELECT * FROM accounts WHERE user_id = $1 ORDER BY created_at ASC',
    [userId],
  );
  return rows;
}

export async function findById(id: string): Promise<AccountRow | null> {
  const { rows } = await query<AccountRow>('SELECT * FROM accounts WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function listByUserIds(userIds: string[]): Promise<AccountRow[]> {
  if (userIds.length === 0) return [];
  const { rows } = await query<AccountRow>(
    'SELECT * FROM accounts WHERE user_id = ANY($1) ORDER BY created_at ASC',
    [userIds],
  );
  return rows;
}

export async function findByAccountNumber(
  accountNumber: string,
): Promise<(AccountRow & { owner_name: string }) | null> {
  const { rows } = await query<AccountRow & { owner_name: string }>(
    `SELECT a.*, u.full_name AS owner_name FROM accounts a JOIN users u ON u.id = a.user_id WHERE a.account_number = $1`,
    [accountNumber],
  );
  return rows[0] ?? null;
}

export async function createAccount(input: {
  userId: string;
  accountNumber: string;
  accountType: 'SAVINGS' | 'CURRENT' | 'FIXED_DEPOSIT';
  openingBalance?: number;
  interestRate?: number;
}): Promise<AccountRow> {
  const { rows } = await query<AccountRow>(
    `INSERT INTO accounts (account_number, user_id, account_type, currency, available_balance, current_balance, interest_rate)
     VALUES ($1, $2, $3, 'INR', $4, $4, $5) RETURNING *`,
    [
      input.accountNumber,
      input.userId,
      input.accountType,
      input.openingBalance ?? 0,
      input.interestRate ?? (input.accountType === 'SAVINGS' ? 3.5 : input.accountType === 'FIXED_DEPOSIT' ? 6.5 : 0),
    ],
  );
  return rows[0];
}

export async function listAll(opts: { page: number; limit: number; search?: string; status?: string }) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (opts.search) {
    params.push(`%${opts.search.toLowerCase()}%`);
    conditions.push(`(lower(a.account_number) LIKE $${params.length} OR lower(u.full_name) LIKE $${params.length})`);
  }
  if (opts.status) {
    params.push(opts.status);
    conditions.push(`a.status = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows: countRows } = await query<{ count: string }>(
    `SELECT COUNT(*) FROM accounts a JOIN users u ON u.id = a.user_id ${where}`,
    params,
  );
  params.push(opts.limit, (opts.page - 1) * opts.limit);
  const { rows } = await query<AccountRow & { owner_name: string; owner_username: string }>(
    `SELECT a.*, u.full_name AS owner_name, u.username AS owner_username
     FROM accounts a JOIN users u ON u.id = a.user_id
     ${where} ORDER BY a.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return { rows, total: Number(countRows[0].count) };
}

export async function findByIdForUpdate(
  client: import('pg').PoolClient,
  id: string,
): Promise<AccountRow | null> {
  const { rows } = await client.query<AccountRow>('SELECT * FROM accounts WHERE id = $1 FOR UPDATE', [id]);
  return rows[0] ?? null;
}

export async function adjustBalances(
  client: import('pg').PoolClient,
  accountId: string,
  delta: number,
): Promise<AccountRow> {
  const { rows } = await client.query<AccountRow>(
    `UPDATE accounts SET available_balance = available_balance + $2, current_balance = current_balance + $2, updated_at = now()
     WHERE id = $1 RETURNING *`,
    [accountId, delta],
  );
  return rows[0];
}
