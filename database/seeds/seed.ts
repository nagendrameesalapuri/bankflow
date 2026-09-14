/**
 * Thin re-export wrapper. The actual implementation lives at
 * backend/src/db/seed.ts, so it compiles into backend/dist as plain JS and
 * is loadable in production (no TypeScript loader there). This file exists
 * so `npm run db:seed` and the documented database/ project structure still
 * work as expected for local development via tsx.
 */
import { seed } from '../../backend/src/db/seed';

export { seed };

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
