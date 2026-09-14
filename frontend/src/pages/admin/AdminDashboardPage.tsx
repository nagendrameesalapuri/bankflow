import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/resourceApis';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { IconGrid } from '../../components/ui/icons';
import { useSocket } from '../../context/SocketContext';
import { formatDateTime } from '../../utils/format';
import type { AdminActivityEvent } from '../../types/api';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  disabledUsers: number;
  totalTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  successfulTransactions: number;
}

interface Health {
  status: string;
  database: string;
  uptimeSeconds: number;
  memoryUsageMb: number;
}

export default function AdminDashboardPage() {
  const statsQuery = useQuery({ queryKey: ['admin', 'stats'], queryFn: adminApi.stats, refetchInterval: 15000 });
  const healthQuery = useQuery({ queryKey: ['admin', 'health'], queryFn: adminApi.systemHealth, refetchInterval: 15000 });

  const stats = statsQuery.data as Stats | undefined;
  const health = healthQuery.data as Health | undefined;

  return (
    <div>
      <PageHeader title="Admin Dashboard" description="System-wide overview of BankFlow." tone="violet" icon={<IconGrid />} />

      {statsQuery.isLoading ? (
        <SkeletonRows rows={2} cols={4} />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Total Users" value={stats?.totalUsers ?? 0} />
          <StatCard label="Active Users" value={stats?.activeUsers ?? 0} />
          <StatCard label="Locked Users" value={stats?.lockedUsers ?? 0} tone="warning" />
          <StatCard label="Disabled Users" value={stats?.disabledUsers ?? 0} tone="danger" />
          <StatCard label="Total Transactions" value={stats?.totalTransactions ?? 0} />
          <StatCard label="Successful" value={stats?.successfulTransactions ?? 0} tone="success" />
          <StatCard label="Pending" value={stats?.pendingTransactions ?? 0} tone="warning" />
          <StatCard label="Failed" value={stats?.failedTransactions ?? 0} tone="danger" />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <h2 className="mb-3 font-semibold text-ink-800">System Health</h2>
          {healthQuery.isLoading ? (
            <SkeletonRows rows={1} cols={4} />
          ) : (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <Row label="Status" value={health?.status ?? '-'} />
              <Row label="Database" value={health?.database ?? '-'} />
              <Row label="Uptime" value={`${health?.uptimeSeconds ?? 0}s`} />
              <Row label="Memory" value={`${health?.memoryUsageMb ?? 0} MB`} />
            </dl>
          )}
        </div>
        <LiveActivityFeed />
      </div>
    </div>
  );
}

const ACTIVITY_DOT: Record<AdminActivityEvent['type'], string> = {
  LOGIN: 'bg-brand-500',
  TRANSACTION: 'bg-emerald-500',
  USER: 'bg-violet-500',
  BENEFICIARY: 'bg-teal-500',
  CARD: 'bg-sky-500',
  CHAOS: 'bg-amber-500',
  SECURITY: 'bg-red-500',
};

function LiveActivityFeed() {
  const socket = useSocket();
  const queryClient = useQueryClient();
  const [events, setEvents] = useState<AdminActivityEvent[]>([]);

  useEffect(() => {
    if (!socket) return;
    function handleActivity(event: AdminActivityEvent) {
      setEvents((prev) => [event, ...prev].slice(0, 20));
      if (event.type === 'TRANSACTION' || event.type === 'USER') {
        queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      }
    }
    socket.on('admin:activity', handleActivity);
    return () => {
      socket.off('admin:activity', handleActivity);
    };
  }, [socket, queryClient]);

  return (
    <div className="card lg:col-span-2">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-ink-800">Live Activity</h2>
        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
          Live
        </span>
      </div>
      {events.length === 0 ? (
        <EmptyState title="Watching for activity..." description="Logins, transactions, and admin actions will appear here in real time." />
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto" data-testid="live-activity-list">
          {events.map((event) => (
            <li key={event.id} className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-ink-50">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${ACTIVITY_DOT[event.type]}`} aria-hidden="true" />
              <div>
                <p className="text-ink-800">{event.message}</p>
                <p className="text-xs text-ink-400">{formatDateTime(event.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'warning' | 'danger' }) {
  const toneClass = tone === 'success' ? 'text-emerald-600' : tone === 'warning' ? 'text-amber-600' : tone === 'danger' ? 'text-red-600' : 'text-ink-900';
  return (
    <div className="card">
      <p className="text-xs font-semibold uppercase text-ink-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink-400">{label}</dt>
      <dd className="font-medium text-ink-800">{value}</dd>
    </div>
  );
}
