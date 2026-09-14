import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { accountsApi, cardsApi, notificationsApi, paymentsApi, profileApi, transactionsApi } from '../services/resourceApis';
import { formatCurrency, formatDate } from '../utils/format';
import { SkeletonRows } from '../components/ui/Skeleton';
import { StatusBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

const DEFAULT_WIDGET_ORDER = ['balances', 'quick-actions', 'spending-chart', 'recent-transactions', 'cards', 'attention', 'notifications'];

const WIDGET_TITLES: Record<string, string> = {
  balances: 'Balances',
  'quick-actions': 'Quick Actions',
  'spending-chart': 'Monthly Spending',
  'recent-transactions': 'Recent Transactions',
  cards: 'Cards',
  attention: 'Needs Attention',
  notifications: 'Notifications',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const accountsQuery = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list });
  const transactionsQuery = useQuery({
    queryKey: ['transactions', 'recent'],
    queryFn: () => transactionsApi.search({ page: 1, limit: 8, sort: 'date_desc' }),
  });
  const cardsQuery = useQuery({ queryKey: ['cards'], queryFn: cardsApi.list });
  const paymentsQuery = useQuery({ queryKey: ['payments', 'dashboard'], queryFn: () => paymentsApi.list(1, 10) });
  const notificationsQuery = useQuery({ queryKey: ['notifications', 'dashboard'], queryFn: () => notificationsApi.list(1, 4) });

  const savedOrder = (user?.preferences?.widgetOrder as string[] | undefined) ?? DEFAULT_WIDGET_ORDER;
  const [order, setOrder] = useState<string[]>(savedOrder.length ? savedOrder : DEFAULT_WIDGET_ORDER);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const ratingRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ratingRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      const value = (e as CustomEvent<{ value: number }>).detail.value;
      profileApi.updatePreferences({ lastFeedbackRating: value });
    };
    el.addEventListener('rating-change', handler);
    return () => el.removeEventListener('rating-change', handler);
  }, []);

  const totalBalance = useMemo(
    () => (accountsQuery.data ?? []).reduce((sum, a) => sum + a.currentBalance, 0),
    [accountsQuery.data],
  );
  const availableBalance = useMemo(
    () => (accountsQuery.data ?? []).reduce((sum, a) => sum + a.availableBalance, 0),
    [accountsQuery.data],
  );

  const spendingByMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactionsQuery.data?.data ?? []) {
      if (t.direction !== 'DEBIT') continue;
      const key = new Date(t.createdAt).toLocaleString('en-IN', { month: 'short' });
      map.set(key, (map.get(key) ?? 0) + t.amount);
    }
    return Array.from(map.entries()).map(([month, amount]) => ({ month, amount: Math.round(amount) }));
  }, [transactionsQuery.data]);

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...order];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setOrder(next);
    setDragIndex(null);
    profileApi.updatePreferences({ widgetOrder: next }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    });
  }

  const attentionPayments = (paymentsQuery.data?.data ?? []).filter((p) => p.status !== 'SUCCESS');

  function renderWidget(id: string) {
    switch (id) {
      case 'balances':
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <bf-balance-card label="Total Balance" value={formatCurrency(totalBalance)} trend="+2.4% this month" tone="brand" />
            <bf-balance-card label="Available Balance" value={formatCurrency(availableBalance)} tone="teal" />
          </div>
        );
      case 'quick-actions':
        return (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <QuickAction to="/transfer" label="Transfer Money" tone="brand" icon={<QaTransfer />} />
            <QuickAction to="/payments" label="Pay Bill" tone="sunset" icon={<QaReceipt />} />
            <QuickAction to="/beneficiaries" label="Add Beneficiary" tone="violet" icon={<QaUsers />} />
            <QuickAction to="/transactions" label="View Transactions" tone="teal" icon={<QaList />} />
            <QuickAction to="/statements" label="Download Statement" tone="rose" icon={<QaDoc />} />
          </div>
        );
      case 'spending-chart':
        return spendingByMonth.length === 0 ? (
          <EmptyState title="No spending yet" description="Debit transactions will appear here once you start using your accounts." />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendingByMonth}>
                <defs>
                  <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8a55ef" />
                    <stop offset="100%" stopColor="#3a6bfa" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <ChartTooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: 12, border: '1px solid #eef0f4', boxShadow: '0 8px 24px -6px rgba(30,44,132,0.18)' }}
                />
                <Bar dataKey="amount" fill="url(#spendGradient)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      case 'recent-transactions':
        return transactionsQuery.isLoading ? (
          <SkeletonRows rows={5} cols={3} />
        ) : (transactionsQuery.data?.data.length ?? 0) === 0 ? (
          <EmptyState title="No transactions yet" />
        ) : (
          <ul className="divide-y divide-ink-100">
            {transactionsQuery.data!.data.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-ink-800">{t.description}</p>
                  <p className="text-xs text-ink-400">{formatDate(t.createdAt)} &middot; {t.referenceNumber}</p>
                </div>
                <div className="text-right">
                  <p className={t.direction === 'CREDIT' ? 'font-semibold text-emerald-600' : 'font-semibold text-ink-800'}>
                    {t.direction === 'CREDIT' ? '+' : '-'}
                    {formatCurrency(t.amount)}
                  </p>
                  <StatusBadge status={t.status} />
                </div>
              </li>
            ))}
          </ul>
        );
      case 'cards':
        return cardsQuery.isLoading ? (
          <SkeletonRows rows={2} cols={2} />
        ) : (cardsQuery.data?.length ?? 0) === 0 ? (
          <EmptyState title="No cards issued" />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {cardsQuery.data!.map((c) => (
              <div
                key={c.id}
                className={`rounded-xl p-4 text-white shadow-sm ${
                  c.cardType === 'CREDIT' ? 'bg-gradient-to-br from-ink-800 to-violet-950' : 'bg-gradient-to-br from-brand-600 to-brand-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{c.cardType} card</p>
                  <StatusBadge status={c.status} />
                </div>
                <p className="mt-3 font-mono text-sm tracking-widest">{c.maskedCardNumber}</p>
                {c.cardType === 'CREDIT' && (
                  <p className="mt-1 text-xs text-white/70">Available limit: {formatCurrency(c.availableLimit ?? 0)}</p>
                )}
              </div>
            ))}
          </div>
        );
      case 'attention':
        return attentionPayments.length === 0 ? (
          <EmptyState title="Nothing needs your attention" description="Pending or failed bill payments will show up here." />
        ) : (
          <ul className="space-y-2">
            {attentionPayments.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm">
                <span>{p.billerName} &middot; {formatCurrency(p.amount)}</span>
                <StatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        );
      case 'notifications':
        return (notificationsQuery.data?.data.length ?? 0) === 0 ? (
          <EmptyState title="No notifications" />
        ) : (
          <ul className="space-y-2">
            {notificationsQuery.data!.data.map((n) => (
              <li key={n.id} className="text-sm">
                <p className="font-medium text-ink-800">{n.title}</p>
                <p className="text-ink-500">{n.message}</p>
              </li>
            ))}
          </ul>
        );
      default:
        return null;
    }
  }

  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-sidebar-gradient p-6 text-white shadow-card-lg sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-mesh-glow" aria-hidden="true" />
        <p className="relative section-eyebrow text-brand-300">Dashboard</p>
        <h1 className="relative mt-1 text-2xl font-bold">Welcome back, {user?.fullName?.split(' ')[0]}</h1>
        <p className="relative mt-1 text-sm text-white/60">Here's what's happening with your money today. Drag widgets to rearrange.</p>
      </div>

      {accountsQuery.isLoading ? (
        <SkeletonRows rows={3} cols={2} />
      ) : (
        <div className="space-y-6">
          {order.map((widgetId, index) => (
            <section
              key={widgetId}
              draggable
              data-testid={`widget-${widgetId}`}
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(index)}
              className="card cursor-grab active:cursor-grabbing"
              aria-label={`${WIDGET_TITLES[widgetId]} widget, draggable`}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink-800">{WIDGET_TITLES[widgetId]}</h2>
                <span className="text-ink-300" aria-hidden="true">
                  ⠿
                </span>
              </div>
              {renderWidget(widgetId)}
            </section>
          ))}
        </div>
      )}

      <section className="card mt-6" aria-label="Feedback">
        <h2 className="mb-2 text-sm font-semibold text-ink-800">How's your BankFlow experience?</h2>
        <bf-rating-widget value="0" ref={ratingRef} />
      </section>
    </div>
  );
}

const QUICK_ACTION_TONES: Record<string, { bg: string; icon: string }> = {
  brand: { bg: 'bg-brand-50 group-hover:bg-brand-100', icon: 'text-brand-600' },
  teal: { bg: 'bg-teal-50 group-hover:bg-teal-100', icon: 'text-teal-600' },
  violet: { bg: 'bg-violet-50 group-hover:bg-violet-100', icon: 'text-violet-600' },
  sunset: { bg: 'bg-sunset-50 group-hover:bg-sunset-100', icon: 'text-sunset-600' },
  rose: { bg: 'bg-rose-50 group-hover:bg-rose-100', icon: 'text-rose-600' },
};

function QuickAction({ to, label, tone, icon }: { to: string; label: string; tone: keyof typeof QUICK_ACTION_TONES; icon: ReactNode }) {
  const t = QUICK_ACTION_TONES[tone];
  return (
    <Link
      to={to}
      className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-ink-100 p-4 text-center text-xs font-semibold text-ink-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-card-lg"
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${t.bg} ${t.icon}`}>{icon}</span>
      {label}
    </Link>
  );
}

const qaIconProps = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none' as const, 'aria-hidden': true as const };
function QaTransfer() {
  return (
    <svg {...qaIconProps}>
      <path d="M4 8h13l-3-3M20 16H7l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function QaReceipt() {
  return (
    <svg {...qaIconProps}>
      <path d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-18z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 8h6M9 12h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function QaUsers() {
  return (
    <svg {...qaIconProps}>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 5.5a3 3 0 010 5.8M20 20c0-2.6-1.8-4.8-4.2-5.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function QaList() {
  return (
    <svg {...qaIconProps}>
      <path d="M8 6h13M8 12h13M8 18h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="3.5" cy="6" r="1.3" fill="currentColor" />
      <circle cx="3.5" cy="12" r="1.3" fill="currentColor" />
      <circle cx="3.5" cy="18" r="1.3" fill="currentColor" />
    </svg>
  );
}
function QaDoc() {
  return (
    <svg {...qaIconProps}>
      <path d="M7 3h7l4 4v14H7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M14 3v4h4M9.5 13h5M9.5 16.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
