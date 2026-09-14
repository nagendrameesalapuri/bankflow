import { Pool, type QueryResultRow } from 'pg';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { startEmbeddedPostgresIfNeeded } from './embeddedPostgres';

let pool: Pool | null = null;

export async function initPool(): Promise<Pool> {
  if (pool) return pool;
  const connectionString = await startEmbeddedPostgresIfNeeded();
  pool = new Pool({
    connectionString,
    ssl: env.databaseSsl ? { rejectUnauthorized: false } : undefined,
  });
  pool.on('error', (err) => logger.error({ err }, 'Unexpected idle Postgres client error'));
  await pool.query('SELECT 1');
  logger.info('Connected to PostgreSQL.');
  return pool;
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initPool() before querying.');
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
) {
  return getPool().query<T>(text, params as never[]);
}

export async function withTransaction<T>(fn: (client: import('pg').PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
