import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as chaosService from '../services/chaosService';
import * as devService from '../services/devService';
import { KNOWN_CHAOS_ROUTES } from '../services/chaosRoutes';
import { API_LAB_ENDPOINTS } from '../services/apiLabCatalog';
import { pushAdminActivity } from '../services/activityFeedService';

export const listChaosRoutes = asyncHandler(async (_req: Request, res: Response) => {
  const rules = await chaosService.listChaosRules();
  const rulesByKey = new Map(rules.map((r) => [r.routeKey, r]));
  res.status(200).json({
    data: KNOWN_CHAOS_ROUTES.map((routeKey) => ({
      routeKey,
      enabled: false,
      delayMs: 0,
      failTimes: 0,
      failStatusCode: 500,
      simulateTimeout: false,
      hitCount: 0,
      ...rulesByKey.get(routeKey),
    })),
  });
});

export const upsertChaosRule = asyncHandler(async (req: Request, res: Response) => {
  const { routeKey, ...rest } = req.body;
  const rule = await chaosService.upsertChaosRule(routeKey, rest);
  if (rule.enabled) {
    pushAdminActivity('CHAOS', `Chaos Mode enabled on ${routeKey} (delay ${rule.delayMs}ms, fail ${rule.failTimes}x).`);
  }
  res.status(200).json({ data: rule });
});

export const resetChaos = asyncHandler(async (_req: Request, res: Response) => {
  await chaosService.resetAllChaosRules();
  res.status(200).json({ message: 'Chaos Mode reset to normal for all routes.' });
});

export const resetEnvironment = asyncHandler(async (_req: Request, res: Response) => {
  await devService.resetDemoEnvironment();
  res.status(200).json({ message: 'Demo environment reset to the original seeded state.' });
});

export const apiLabEndpoints = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json({ data: API_LAB_ENDPOINTS });
});

export const challenges = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json({ data: devService.CHALLENGE_LAB });
});

export const resetChallenge = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const challenge = devService.CHALLENGE_LAB.find((c) => c.id === id);
  if (!challenge) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Challenge not found.' } });
  await devService.resetDemoEnvironment();
  res.status(200).json({ message: `Environment reset for challenge #${id}: ${challenge.title}.` });
});
