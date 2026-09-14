import path from 'path';
import dotenv from 'dotenv';

// Load repo-root .env first (shared by docker-compose), then let a local
// backend/.env override individual values for non-docker development.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',

  databaseUrl: required('DATABASE_URL', 'postgresql://bankflow:bankflow@localhost:5432/bankflow'),
  useEmbeddedPostgres: (process.env.USE_EMBEDDED_POSTGRES ?? 'false').toLowerCase() === 'true',
  embeddedPostgresPort: Number(process.env.EMBEDDED_POSTGRES_PORT ?? 54329),
  // Managed Postgres providers (Neon, Supabase, Render Postgres, RDS, ...)
  // require SSL and typically present a certificate Node's default CA store
  // doesn't recognize - rejectUnauthorized:false trusts it without needing
  // the provider's CA bundle, which is the standard approach for these.
  databaseSsl: (process.env.DATABASE_SSL ?? 'false').toLowerCase() === 'true',

  jwtAccessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret-change-me'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',

  otpExpiresInSeconds: Number(process.env.OTP_EXPIRES_IN_SECONDS ?? 120),
  otpLength: Number(process.env.OTP_LENGTH ?? 6),

  loginMaxAttempts: Number(process.env.LOGIN_MAX_ATTEMPTS ?? 5),
  loginLockoutMinutes: Number(process.env.LOGIN_LOCKOUT_MINUTES ?? 15),

  // Set to "true" when the frontend and backend are deployed on different
  // domains (e.g. Vercel + Render) so the refresh-token cookie is sent as
  // SameSite=None; Secure - required for a cross-site fetch() to carry it
  // at all. Leave "false" for same-origin deployments (Docker/nginx, or
  // local dev), where SameSite=Lax is the safer default.
  crossSiteCookies: (process.env.CROSS_SITE_COOKIES ?? 'false').toLowerCase() === 'true',

  // Docker convenience flags - see server.ts. Off by default for local dev,
  // where `npm run db:migrate` / `npm run db:seed` are run explicitly.
  autoMigrate: (process.env.AUTO_MIGRATE ?? 'false').toLowerCase() === 'true',
  autoSeedIfEmpty: (process.env.AUTO_SEED_IF_EMPTY ?? 'false').toLowerCase() === 'true',

  // This app never wires up a real SMS/email provider - OTPs only ever exist
  // to be echoed back to the caller (API response / dev tools) for
  // automation and demo purposes. Defaults to true so a production deploy
  // (NODE_ENV=production) doesn't silently lock everyone out of OTP-gated
  // flows with no way to see the code. Set EXPOSE_DEV_OTP=false to hide it.
  exposeDevOtp: (process.env.EXPOSE_DEV_OTP ?? 'true').toLowerCase() === 'true',
};

export const isDevTool = !env.isProduction;
