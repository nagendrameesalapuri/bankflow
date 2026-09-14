import { query } from '../db/pool';

export interface BeneficiaryRow {
  id: string;
  user_id: string;
  name: string;
  nickname: string | null;
  account_number: string;
  bank_name: string;
  ifsc: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: Date;
  updated_at: Date;
}

export async function listByUser(userId: string): Promise<BeneficiaryRow[]> {
  const { rows } = await query<BeneficiaryRow>(
    'SELECT * FROM beneficiaries WHERE user_id = $1 ORDER BY created_at DESC',
    [userId],
  );
  return rows;
}

export async function findById(id: string): Promise<BeneficiaryRow | null> {
  const { rows } = await query<BeneficiaryRow>('SELECT * FROM beneficiaries WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function create(input: {
  userId: string;
  name: string;
  nickname?: string;
  accountNumber: string;
  bankName: string;
  ifsc: string;
}): Promise<BeneficiaryRow> {
  const { rows } = await query<BeneficiaryRow>(
    `INSERT INTO beneficiaries (user_id, name, nickname, account_number, bank_name, ifsc)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [input.userId, input.name, input.nickname?.trim() || null, input.accountNumber, input.bankName, input.ifsc],
  );
  return rows[0];
}

export async function update(
  id: string,
  fields: Partial<{ name: string; nickname: string; bankName: string; ifsc: string }>,
): Promise<BeneficiaryRow> {
  const sets: string[] = [];
  const params: unknown[] = [];
  const map: Record<string, string> = { name: 'name', nickname: 'nickname', bankName: 'bank_name', ifsc: 'ifsc' };
  for (const [key, column] of Object.entries(map)) {
    const value = (fields as Record<string, string | undefined>)[key];
    if (value !== undefined) {
      params.push(key === 'nickname' ? value.trim() || null : value);
      sets.push(`${column} = $${params.length}`);
    }
  }
  params.push(id);
  const { rows } = await query<BeneficiaryRow>(
    `UPDATE beneficiaries SET ${sets.join(', ')}, updated_at = now() WHERE id = $${params.length} RETURNING *`,
    params,
  );
  return rows[0];
}

export async function setStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<void> {
  await query('UPDATE beneficiaries SET status = $2, updated_at = now() WHERE id = $1', [id, status]);
}

export async function remove(id: string): Promise<void> {
  await query('DELETE FROM beneficiaries WHERE id = $1', [id]);
}
