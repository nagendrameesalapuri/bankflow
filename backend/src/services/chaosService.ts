import { query } from '../db/pool';

export interface ChaosRule {
  routeKey: string;
  enabled: boolean;
  delayMs: number;
  failTimes: number;
  failStatusCode: number;
  simulateTimeout: boolean;
  hitCount: number;
  updatedAt: string;
}

interface ChaosConfigRow {
  route_key: string;
  enabled: boolean;
  delay_ms: number;
  fail_times: number;
  fail_status_code: number;
  simulate_timeout: boolean;
  hit_count: number;
  updated_at: Date;
}

function toRule(row: ChaosConfigRow): ChaosRule {
  return {
    routeKey: row.route_key,
    enabled: row.enabled,
    delayMs: row.delay_ms,
    failTimes: row.fail_times,
    failStatusCode: row.fail_status_code,
    simulateTimeout: row.simulate_timeout,
    hitCount: row.hit_count,
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function listChaosRules(): Promise<ChaosRule[]> {
  const { rows } = await query<ChaosConfigRow>('SELECT * FROM chaos_config ORDER BY route_key');
  return rows.map(toRule);
}

export async function getChaosRule(routeKey: string): Promise<ChaosRule | null> {
  const { rows } = await query<ChaosConfigRow>('SELECT * FROM chaos_config WHERE route_key = $1', [routeKey]);
  return rows[0] ? toRule(rows[0]) : null;
}

export async function upsertChaosRule(
  routeKey: string,
  input: Partial<Pick<ChaosRule, 'enabled' | 'delayMs' | 'failTimes' | 'failStatusCode' | 'simulateTimeout'>>,
): Promise<ChaosRule> {
  const existing = await getChaosRule(routeKey);
  const merged = {
    enabled: input.enabled ?? existing?.enabled ?? false,
    delayMs: input.delayMs ?? existing?.delayMs ?? 0,
    failTimes: input.failTimes ?? existing?.failTimes ?? 0,
    failStatusCode: input.failStatusCode ?? existing?.failStatusCode ?? 500,
    simulateTimeout: input.simulateTimeout ?? existing?.simulateTimeout ?? false,
  };
  const { rows } = await query<ChaosConfigRow>(
    `INSERT INTO chaos_config (route_key, enabled, delay_ms, fail_times, fail_status_code, simulate_timeout, hit_count, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE((SELECT hit_count FROM chaos_config WHERE route_key = $1), 0), now())
     ON CONFLICT (route_key) DO UPDATE SET
       enabled = $2, delay_ms = $3, fail_times = $4, fail_status_code = $5, simulate_timeout = $6, updated_at = now()
     RETURNING *`,
    [routeKey, merged.enabled, merged.delayMs, merged.failTimes, merged.failStatusCode, merged.simulateTimeout],
  );
  return toRule(rows[0]);
}

export async function resetAllChaosRules(): Promise<void> {
  await query('DELETE FROM chaos_config');
}

/**
 * Called on each matching request. Decrements fail_times (so "fail N times
 * then succeed" scenarios self-resolve) and bumps hit_count for the API lab
 * to display. Returns the rule snapshot to apply for *this* request.
 */
export async function consumeChaosHit(routeKey: string): Promise<ChaosRule | null> {
  const rule = await getChaosRule(routeKey);
  if (!rule || !rule.enabled) return null;

  const shouldFail = rule.failTimes > 0;
  const nextFailTimes = shouldFail ? rule.failTimes - 1 : 0;

  await query(
    `UPDATE chaos_config SET fail_times = $2, hit_count = hit_count + 1, updated_at = now() WHERE route_key = $1`,
    [routeKey, nextFailTimes],
  );

  return { ...rule, failTimes: shouldFail ? 1 : 0 };
}
