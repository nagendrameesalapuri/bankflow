import { query } from '../db/pool';
import { generateReferenceNumber } from '../utils/format';

export interface TransactionRow {
  id: string;
  account_id: string;
  type: string;
  description: string;
  amount: string;
  direction: 'DEBIT' | 'CREDIT';
  status: string;
  counterparty_name: string | null;
  reference_number: string;
  balance_after: string | null;
  created_at: Date;
}

export interface TransactionFilters {
  accountIds: string[];
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

const SORT_MAP: Record<string, string> = {
  date_desc: 'created_at DESC',
  date_asc: 'created_at ASC',
  amount_desc: 'amount DESC',
  amount_asc: 'amount ASC',
};

export async function search(filters: TransactionFilters) {
  const conditions: string[] = ['account_id = ANY($1)'];
  const params: unknown[] = [filters.accountIds];

  if (filters.type) {
    params.push(filters.type);
    conditions.push(`type = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`status = $${params.length}`);
  }
  if (filters.direction) {
    params.push(filters.direction);
    conditions.push(`direction = $${params.length}`);
  }
  if (filters.dateFrom) {
    params.push(filters.dateFrom);
    conditions.push(`created_at >= $${params.length}`);
  }
  if (filters.dateTo) {
    params.push(filters.dateTo);
    conditions.push(`created_at <= $${params.length}`);
  }
  if (filters.amountMin !== undefined) {
    params.push(filters.amountMin);
    conditions.push(`amount >= $${params.length}`);
  }
  if (filters.amountMax !== undefined) {
    params.push(filters.amountMax);
    conditions.push(`amount <= $${params.length}`);
  }
  if (filters.q) {
    params.push(`%${filters.q.toLowerCase()}%`);
    conditions.push(
      `(lower(description) LIKE $${params.length} OR lower(reference_number) LIKE $${params.length} OR lower(coalesce(counterparty_name, '')) LIKE $${params.length})`,
    );
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const { rows: countRows } = await query<{ count: string }>(
    `SELECT COUNT(*) FROM transactions ${where}`,
    params,
  );
  const total = Number(countRows[0].count);

  const orderBy = SORT_MAP[filters.sort ?? 'date_desc'] ?? SORT_MAP.date_desc;
  params.push(filters.limit, (filters.page - 1) * filters.limit);
  const { rows } = await query<TransactionRow>(
    `SELECT * FROM transactions ${where} ORDER BY ${orderBy} LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return { rows, total };
}

export async function findById(id: string): Promise<TransactionRow | null> {
  const { rows } = await query<TransactionRow>('SELECT * FROM transactions WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function insertTransaction(
  client: import('pg').PoolClient,
  input: {
    accountId: string;
    type: string;
    description: string;
    amount: number;
    direction: 'DEBIT' | 'CREDIT';
    status?: string;
    counterpartyName?: string;
    balanceAfter?: number;
  },
): Promise<TransactionRow> {
  const { rows } = await client.query<TransactionRow>(
    `INSERT INTO transactions (account_id, type, description, amount, direction, status, counterparty_name, reference_number, balance_after)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      input.accountId,
      input.type,
      input.description,
      input.amount,
      input.direction,
      input.status ?? 'SUCCESS',
      input.counterpartyName ?? null,
      generateReferenceNumber(),
      input.balanceAfter ?? null,
    ],
  );
  return rows[0];
}

export async function listInRange(accountId: string, periodStart: string, periodEnd: string) {
  const { rows } = await query<TransactionRow>(
    `SELECT * FROM transactions WHERE account_id = $1 AND created_at >= $2 AND created_at < ($3::date + interval '1 day')
     ORDER BY created_at ASC`,
    [accountId, periodStart, periodEnd],
  );
  return rows;
}

export async function listRecentForAccounts(accountIds: string[], limit: number) {
  const { rows } = await query<TransactionRow>(
    `SELECT * FROM transactions WHERE account_id = ANY($1) ORDER BY created_at DESC LIMIT $2`,
    [accountIds, limit],
  );
  return rows;
}

export async function adminSearch(opts: {
  page: number;
  limit: number;
  status?: string;
  type?: string;
}) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (opts.status) {
    params.push(opts.status);
    conditions.push(`t.status = $${params.length}`);
  }
  if (opts.type) {
    params.push(opts.type);
    conditions.push(`t.type = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows: countRows } = await query<{ count: string }>(
    `SELECT COUNT(*) FROM transactions t ${where}`,
    params,
  );
  params.push(opts.limit, (opts.page - 1) * opts.limit);
  const { rows } = await query<TransactionRow & { account_number: string; owner_name: string }>(
    `SELECT t.*, a.account_number, u.full_name AS owner_name
     FROM transactions t
     JOIN accounts a ON a.id = t.account_id
     JOIN users u ON u.id = a.user_id
     ${where} ORDER BY t.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return { rows, total: Number(countRows[0].count) };
}
