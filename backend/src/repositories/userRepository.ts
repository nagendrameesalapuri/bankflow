import { query } from '../db/pool';
import type { UserRow } from '../types/domain';

const BASE_SELECT = `
  SELECT u.*, r.name AS role_name
  FROM users u
  JOIN roles r ON r.id = u.role_id
`;

export async function findByUsernameOrEmail(identifier: string): Promise<UserRow | null> {
  const { rows } = await query<UserRow>(
    `${BASE_SELECT} WHERE lower(u.username) = lower($1) OR lower(u.email) = lower($1)`,
    [identifier],
  );
  return rows[0] ?? null;
}

export async function findById(id: string): Promise<UserRow | null> {
  const { rows } = await query<UserRow>(`${BASE_SELECT} WHERE u.id = $1`, [id]);
  return rows[0] ?? null;
}

export async function listUsers(opts: {
  search?: string;
  role?: string;
  status?: string;
  page: number;
  limit: number;
}) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts.search) {
    params.push(`%${opts.search.toLowerCase()}%`);
    conditions.push(
      `(lower(u.username) LIKE $${params.length} OR lower(u.email) LIKE $${params.length} OR lower(u.full_name) LIKE $${params.length})`,
    );
  }
  if (opts.role) {
    params.push(opts.role);
    conditions.push(`r.name = $${params.length}`);
  }
  if (opts.status) {
    params.push(opts.status);
    conditions.push(`u.status = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows: countRows } = await query<{ count: string }>(
    `SELECT COUNT(*) FROM users u JOIN roles r ON r.id = u.role_id ${where}`,
    params,
  );
  const total = Number(countRows[0].count);

  params.push(opts.limit, (opts.page - 1) * opts.limit);
  const { rows } = await query<UserRow>(
    `${BASE_SELECT} ${where} ORDER BY u.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return { rows, total };
}

export async function incrementFailedAttempts(userId: string): Promise<UserRow> {
  const { rows } = await query<UserRow>(
    `UPDATE users SET failed_login_attempts = failed_login_attempts + 1, updated_at = now()
     WHERE id = $1 RETURNING *`,
    [userId],
  );
  return rows[0];
}

export async function lockUser(userId: string, until: Date): Promise<void> {
  await query(`UPDATE users SET status = 'LOCKED', locked_until = $2, updated_at = now() WHERE id = $1`, [
    userId,
    until,
  ]);
}

export async function unlockUser(userId: string): Promise<void> {
  await query(
    `UPDATE users SET status = 'ACTIVE', locked_until = NULL, failed_login_attempts = 0, updated_at = now() WHERE id = $1`,
    [userId],
  );
}

export async function setUserStatus(userId: string, status: 'ACTIVE' | 'LOCKED' | 'DISABLED'): Promise<void> {
  await query(`UPDATE users SET status = $2, updated_at = now() WHERE id = $1`, [userId, status]);
}

export async function resetFailedAttempts(userId: string): Promise<void> {
  await query(`UPDATE users SET failed_login_attempts = 0, updated_at = now() WHERE id = $1`, [userId]);
}

export async function updatePasswordHash(userId: string, hash: string): Promise<void> {
  await query(`UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1`, [userId, hash]);
}

export async function updateProfile(
  userId: string,
  fields: Partial<{ fullName: string; phone: string; address: string; email: string; profilePhotoUrl: string }>,
): Promise<UserRow> {
  const sets: string[] = [];
  const params: unknown[] = [];
  const map: Record<string, string> = {
    fullName: 'full_name',
    phone: 'phone',
    address: 'address',
    email: 'email',
    profilePhotoUrl: 'profile_photo_url',
  };
  for (const [key, column] of Object.entries(map)) {
    const value = (fields as Record<string, string | undefined>)[key];
    if (value !== undefined) {
      params.push(value);
      sets.push(`${column} = $${params.length}`);
    }
  }
  params.push(userId);
  const { rows } = await query<UserRow>(
    `UPDATE users SET ${sets.join(', ')}, updated_at = now() WHERE id = $${params.length}
     RETURNING id`,
    params,
  );
  return (await findById(rows[0].id))!;
}

export async function createUser(input: {
  username: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone?: string;
  address?: string;
  role: 'CUSTOMER' | 'SUPPORT_AGENT' | 'ADMIN';
}): Promise<UserRow> {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO users (username, email, password_hash, full_name, phone, address, role_id, mfa_enabled)
     VALUES ($1, $2, $3, $4, $5, $6, (SELECT id FROM roles WHERE name = $7), true)
     RETURNING id`,
    [input.username, input.email, input.passwordHash, input.fullName, input.phone ?? null, input.address ?? null, input.role],
  );
  return (await findById(rows[0].id))!;
}

export async function updateRole(userId: string, role: 'CUSTOMER' | 'SUPPORT_AGENT' | 'ADMIN'): Promise<void> {
  await query(`UPDATE users SET role_id = (SELECT id FROM roles WHERE name = $2), updated_at = now() WHERE id = $1`, [
    userId,
    role,
  ]);
}

export async function findByUsername(username: string): Promise<UserRow | null> {
  const { rows } = await query<UserRow>(`${BASE_SELECT} WHERE lower(u.username) = lower($1)`, [username]);
  return rows[0] ?? null;
}

export async function findByEmail(email: string): Promise<UserRow | null> {
  const { rows } = await query<UserRow>(`${BASE_SELECT} WHERE lower(u.email) = lower($1)`, [email]);
  return rows[0] ?? null;
}

export async function updatePreferences(userId: string, preferences: Record<string, unknown>): Promise<void> {
  await query(`UPDATE users SET preferences = $2, updated_at = now() WHERE id = $1`, [
    userId,
    JSON.stringify(preferences),
  ]);
}
