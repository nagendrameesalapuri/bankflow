import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { accountsApi, statementsApi, transactionsApi } from '../services/resourceApis';
import { formatCurrency, formatDate, formatDateTime } from '../utils/format';
import { SkeletonRows } from '../components/ui/Skeleton';
import { ErrorState, EmptyState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { downloadAuthenticatedFile } from '../utils/download';

export default function AccountDetailPage() {
  const { id = '' } = useParams();
  const accountQuery = useQuery({ queryKey: ['accounts', id], queryFn: () => accountsApi.get(id) });
  const txQuery = useQuery({
    queryKey: ['transactions', { accountId: id }],
    queryFn: () => transactionsApi.search({ accountId: id, page: 1, limit: 15 }),
    enabled: !!id,
  });
  const statementsQuery = useQuery({
    queryKey: ['statements', id],
    queryFn: () => statementsApi.list(id),
    enabled: !!id,
  });

  if (accountQuery.isLoading) return <SkeletonRows rows={5} cols={3} />;
  if (accountQuery.isError || !accountQuery.data) return <ErrorState message="Account not found." onRetry={() => accountQuery.refetch()} />;

  const account = accountQuery.data;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">{account.accountType.replace('_', ' ')}</h1>
          <p className="font-mono text-sm text-ink-500">{account.accountNumber}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/transfer" className="btn-primary">
            Transfer Money
          </Link>
          <Link to="/statements" className="btn-secondary">
            Get Statement
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-xs font-semibold uppercase text-ink-400">Available Balance</p>
          <p className="mt-1 text-xl font-bold text-ink-900">{formatCurrency(account.availableBalance, account.currency)}</p>
        </div>
        <div className="card">
          <p className="text-xs font-semibold uppercase text-ink-400">Current Balance</p>
          <p className="mt-1 text-xl font-bold text-ink-900">{formatCurrency(account.currentBalance, account.currency)}</p>
        </div>
        <div className="card">
          <p className="text-xs font-semibold uppercase text-ink-400">Status</p>
          <p className="mt-2">
            <StatusBadge status={account.status} />
          </p>
        </div>
      </div>

      <div className="card">
        <Tabs
          tabs={[
            {
              id: 'overview',
              label: 'Account Information',
              content: (
                <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                  <Row label="Account type" value={account.accountType.replace('_', ' ')} />
                  <Row label="Currency" value={account.currency} />
                  <Row label="Opened on" value={formatDate(account.openedAt)} />
                  <Row label="Interest rate" value={`${account.interestRate}% p.a.`} />
                  <Row label="Interest accrued (est. this year)" value={formatCurrency(account.interest.accruedThisYear)} />
                </dl>
              ),
            },
            {
              id: 'transactions',
              label: 'Transaction History',
              content: txQuery.isLoading ? (
                <SkeletonRows rows={5} cols={4} />
              ) : (txQuery.data?.data.length ?? 0) === 0 ? (
                <EmptyState title="No transactions on this account yet" />
              ) : (
                <ul className="divide-y divide-ink-100">
                  {txQuery.data!.data.map((t) => (
                    <li key={t.id} className="flex items-center justify-between py-3 text-sm">
                      <div>
                        <p className="font-medium text-ink-800">{t.description}</p>
                        <p className="text-xs text-ink-400">{formatDateTime(t.createdAt)}</p>
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
              ),
            },
            {
              id: 'statements',
              label: 'Statements',
              content: statementsQuery.isLoading ? (
                <SkeletonRows rows={3} cols={2} />
              ) : (statementsQuery.data?.length ?? 0) === 0 ? (
                <EmptyState
                  title="No statements generated yet"
                  description="Go to the Statements page to generate one for this account."
                  action={
                    <Link to="/statements" className="btn-secondary mt-2">
                      Generate a statement
                    </Link>
                  }
                />
              ) : (
                <ul className="space-y-2">
                  {statementsQuery.data!.map((s) => (
                    <li key={s.id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-sm">
                      <span>
                        {formatDate(s.periodStart)} - {formatDate(s.periodEnd)}
                      </span>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          className="font-medium text-brand-600 hover:underline"
                          onClick={() => downloadAuthenticatedFile(statementsApi.downloadPath(s.id, 'pdf'), `statement-${s.id}.pdf`)}
                        >
                          PDF
                        </button>
                        <button
                          type="button"
                          className="font-medium text-brand-600 hover:underline"
                          onClick={() => downloadAuthenticatedFile(statementsApi.downloadPath(s.id, 'csv'), `statement-${s.id}.csv`)}
                        >
                          CSV
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ),
            },
          ]}
        />
      </div>
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
