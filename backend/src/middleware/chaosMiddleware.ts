import type { NextFunction, Request, Response } from 'express';
import { consumeChaosHit } from '../services/chaosService';
import { logger } from '../config/logger';

function routeKeyFor(req: Request): string {
  // Use the matched route path (e.g. "/api/transfers/:id") when available so
  // rules configured against a template match real requests with real ids.
  const templatePath = req.route?.path ? req.baseUrl + req.route.path : req.path;
  return `${req.method} ${templatePath}`;
}

/**
 * Chaos Mode middleware. No-ops unless an admin has explicitly enabled a
 * rule for this exact "METHOD path-template" key via the Chaos Control
 * Panel / dev API. Never active for customers, never active in production.
 */
export function chaosMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const routeKey = routeKeyFor(req);
      const rule = await consumeChaosHit(routeKey);
      if (!rule) return next();

      logger.warn({ routeKey, rule }, 'Chaos Mode intercepted request');

      if (rule.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, rule.delayMs));
      }

      if (rule.simulateTimeout) {
        // Never respond - the client will hit its own timeout, exactly like
        // a hung upstream service would.
        return;
      }

      if (rule.failTimes > 0) {
        return res.status(rule.failStatusCode).json({
          error: {
            code: 'CHAOS_INJECTED_FAILURE',
            message: `Chaos Mode: simulated ${rule.failStatusCode} response`,
          },
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
