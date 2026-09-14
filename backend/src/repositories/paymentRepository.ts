import { query } from '../db/pool';

export interface PaymentRow {
  id: string;
  user_id: string;
  account_id: string;
  category: string;
  biller_name: string;
  consumer_number: string;
  amount: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  transaction_id: string | null;
  created_at: Date;
}

export async function create(input: {
  userId: string;
  accountId: string;
  category: string;
  billerName: string;
  consumerNumber: string;
  amount: number;
}): Promise<PaymentRow> {
  const { rows } = await query<PaymentRow>(
    `INSERT INTO payments (user_id, account_id, category, biller_name, consumer_number, amount)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [input.userId, input.accountId, input.category, input.billerName, input.consumerNumber, input.amount],
  );
  return rows[0];
}

export async function findById(id: string): Promise<PaymentRow | null> {
  const { rows } = await query<PaymentRow>('SELECT * FROM payments WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function findRecentDuplicate(
  accountId: string,
  consumerNumber: string,
  amount: number,
): Promise<PaymentRow | null> {
  const { rows } = await query<PaymentRow>(
    `SELECT * FROM payments WHERE account_id = $1 AND consumer_number = $2 AND amount = $3
     AND status = 'SUCCESS' AND created_at > now() - interval '5 minutes'
     ORDER BY created_at DESC LIMIT 1`,
    [accountId, consumerNumber, amount],
  );
  return rows[0] ?? null;
}

export async function markStatus(
  client: import('pg').PoolClient,
  id: string,
  status: PaymentRow['status'],
  transactionId?: string,
): Promise<void> {
  await client.query('UPDATE payments SET status = $2, transaction_id = COALESCE($3, transaction_id) WHERE id = $1', [
    id,
    status,
    transactionId ?? null,
  ]);
}

export async function listByUser(userId: string, page: number, limit: number) {
  const { rows: countRows } = await query<{ count: string }>('SELECT COUNT(*) FROM payments WHERE user_id = $1', [
    userId,
  ]);
  const { rows } = await query<PaymentRow>(
    'SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [userId, limit, (page - 1) * limit],
  );
  return { rows, total: Number(countRows[0].count) };
}
