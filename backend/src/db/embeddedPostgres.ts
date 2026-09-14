import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { logger } from '../config/logger';

// embedded-postgres is ESM-only; this backend runs as CommonJS, so it must
// be loaded via a dynamic import() rather than a static `import` statement.
type EmbeddedPostgresInstance = {
  initialise: () => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  createDatabase: (name: string) => Promise<void>;
};
type EmbeddedPostgresCtor = new (options: Record<string, unknown>) => EmbeddedPostgresInstance;

let instance: EmbeddedPostgresInstance | null = null;

/**
 * Boots a real local Postgres binary (no Docker/admin required) for
 * environments where Docker isn't available. Only used when
 * USE_EMBEDDED_POSTGRES=true. Data persists under backend/.embedded-postgres
 * so seeded data survives restarts until an explicit reset.
 */
export async function startEmbeddedPostgresIfNeeded(): Promise<string> {
  if (!env.useEmbeddedPostgres) {
    return env.databaseUrl;
  }

  const dataDir = path.resolve(__dirname, '../../.embedded-postgres');
  const mod = await import('embedded-postgres');
  const EmbeddedPostgres = mod.default as unknown as EmbeddedPostgresCtor;

  instance = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: 'bankflow',
    password: 'bankflow',
    port: env.embeddedPostgresPort,
    persistent: true,
    // Force UTF8/C locale - Windows' locale-detected default (e.g. WIN1252)
    // can't represent characters like the Rupee sign used in seed data.
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
  });

  logger.info({ dataDir, port: env.embeddedPostgresPort }, 'Starting embedded PostgreSQL...');
  const alreadyInitialised = fs.existsSync(path.join(dataDir, 'PG_VERSION'));
  if (!alreadyInitialised) {
    await instance.initialise();
  }
  await instance.start();

  try {
    await instance.createDatabase('bankflow');
  } catch {
    // database already exists on subsequent boots - fine
  }

  const url = `postgresql://bankflow:bankflow@localhost:${env.embeddedPostgresPort}/bankflow`;
  logger.info('Embedded PostgreSQL is ready.');
  return url;
}

export async function stopEmbeddedPostgres(): Promise<void> {
  if (instance) {
    await instance.stop();
    instance = null;
  }
}
