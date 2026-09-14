import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './config/logger';
import { apiLimiter } from './middleware/rateLimiters';
import { notFoundHandler, errorHandler } from './middleware/errorMiddleware';

import authRoutes from './routes/authRoutes';
import accountRoutes from './routes/accountRoutes';
import transactionRoutes from './routes/transactionRoutes';
import transferRoutes from './routes/transferRoutes';
import beneficiaryRoutes from './routes/beneficiaryRoutes';
import paymentRoutes from './routes/paymentRoutes';
import cardRoutes from './routes/cardRoutes';
import statementRoutes from './routes/statementRoutes';
import notificationRoutes from './routes/notificationRoutes';
import profileRoutes from './routes/profileRoutes';
import securityRoutes from './routes/securityRoutes';
import adminRoutes from './routes/adminRoutes';
import supportRoutes from './routes/supportRoutes';
import devRoutes from './routes/devRoutes';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: '2mb' }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));
  app.use(apiLimiter);

  app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok', demo: 'BankFlow - fictional demo bank' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/accounts', accountRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/transfers', transferRoutes);
  app.use('/api/beneficiaries', beneficiaryRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/cards', cardRoutes);
  app.use('/api/statements', statementRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/security', securityRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/support', supportRoutes);
  app.use('/api/dev', devRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
