import { createServer } from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { initPool, getPool } from './db/pool';
import { runMigrations } from './db/runMigrations';
import { setupSocket } from './sockets/setupSocket';

async function main() {
  await initPool();

  // Convenience for `docker compose up` on a fresh volume: always bring the
  // schema up to date, and seed only if the database is genuinely empty so
  // a container restart never wipes existing data. Local dev still uses the
  // explicit `npm run db:migrate` / `npm run db:seed` commands.
  if (env.autoMigrate) {
    await runMigrations();
  }
  if (env.autoSeedIfEmpty) {
    const { rows } = await getPool().query<{ count: string }>('SELECT COUNT(*) FROM users').catch(() => ({ rows: [{ count: '0' }] }));
    if (Number(rows[0]?.count ?? 0) === 0) {
      logger.info('Database is empty - running initial seed...');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { seed } = require('../../database/seeds/seed') as { seed: () => Promise<void> };
      await seed();
    }
  }

  const app = createApp();
  const httpServer = createServer(app);
  setupSocket(httpServer);

  httpServer.listen(env.port, () => {
    logger.info(`BankFlow API listening on http://localhost:${env.port} (${env.nodeEnv})`);
    logger.info('This is a fictional demo banking application. No real funds or accounts are involved.');
  });

  const shutdown = () => {
    logger.info('Shutting down...');
    httpServer.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error(err, 'Failed to start BankFlow API');
  process.exit(1);
});
