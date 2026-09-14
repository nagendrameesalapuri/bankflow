import { query } from '../db/pool';

export interface TransferRow {
  id: string;
  from_account_id: string;
  beneficiary_id: string;
  amount: string;
  remarks: string | null;
  status: 'PENDING_OTP' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  failure_reason: string | null;
  transaction_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function create(input: {
  fromAccountId: string;
  beneficiaryId: string;
  amount: number;
  remarks?: string;
}): Promise<TransferRow> {
  const { rows } = await query<TransferRow>(
    `INSERT INTO transfers (from_account_id, beneficiary_id, amount, remarks) VALUES ($1, $2, $3, $4) RETURNING *`,
    [input.fromAccountId, input.beneficiaryId, input.amount, input.remarks ?? null],
  );
  return rows[0];
}

export async function findById(id: string): Promise<TransferRow | null> {
  const { rows } = await query<TransferRow>('SELECT * FROM transfers WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function markStatus(
  client: import('pg').PoolClient,
  id: string,
  status: TransferRow['status'],
  extra: { transactionId?: string; failureReason?: string } = {},
): Promise<void> {
  await client.query(
    `UPDATE transfers SET status = $2, transaction_id = COALESCE($3, transaction_id), failure_reason = $4, updated_at = now() WHERE id = $1`,
    [id, status, extra.transactionId ?? null, extra.failureReason ?? null],
  );
}
