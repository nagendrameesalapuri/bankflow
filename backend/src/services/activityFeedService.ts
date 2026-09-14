import { v4 as uuid } from 'uuid';
import { emitToAdmins } from '../sockets/io';

export type ActivityType = 'LOGIN' | 'TRANSACTION' | 'USER' | 'BENEFICIARY' | 'CARD' | 'CHAOS' | 'SECURITY';

/**
 * Pushes a live event to every connected ADMIN session - powers the "Live
 * Activity" feed on the admin dashboard. Fire-and-forget: never awaited,
 * never allowed to fail the calling request.
 */
export function pushAdminActivity(type: ActivityType, message: string, meta?: Record<string, unknown>) {
  try {
    emitToAdmins('admin:activity', {
      id: uuid(),
      type,
      message,
      meta: meta ?? {},
      createdAt: new Date().toISOString(),
    });
  } catch {
    // never let telemetry break the request that triggered it
  }
}
