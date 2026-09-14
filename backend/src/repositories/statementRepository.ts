import { query } from '../db/pool';

export interface StatementRow {
  id: string;
  account_id: string;
  period_start: Date;
  period_end: Date;
  opening_balance: string;
  closing_balance: string;
  generated_at: Date;
}

export async function create(input: {
  accountId: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
}): Promise<StatementRow> {
  const { rows } = await query<StatementRow>(
    `INSERT INTO statements (account_id, period_start, period_end, opening_balance, closing_balance)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [input.accountId, input.periodStart, input.periodEnd, input.openingBalance, input.closingBalance],
  );
  return rows[0];
}

export async function findById(id: string): Promise<StatementRow | null> {
  const { rows } = await query<StatementRow>('SELECT * FROM statements WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function listByAccount(accountId: string): Promise<StatementRow[]> {
  const { rows } = await query<StatementRow>(
    'SELECT * FROM statements WHERE account_id = $1 ORDER BY generated_at DESC',
    [accountId],
  );
  return rows;
}
