import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { supportApi } from '../../services/resourceApis';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { StatusBadge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import type { Account, Transaction, User } from '../../types/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { IconUser } from '../../components/ui/icons';

export default function CustomerDetailPage() {
  const { id = '' } = useParams();
  const customerQuery = useQuery({ queryKey: ['support', 'customer', id], queryFn: () => supportApi.getCustomer(id) });
  const txQuery = useQuery({ queryKey: ['support', 'customer', id, 'tx'], queryFn: () => supportApi.getCustomerTransactions(id) });

  if (customerQuery.isLoading) return <SkeletonRows rows={6} cols={3} />;

  const customer = customerQuery.data as { user: User; accounts: Account[] } | undefined;
  if (!customer) return <EmptyState title="Customer not found" />;

  return (
    <div>
      <PageHeader
        title={customer.user.fullName}
        description={
          <span>
            {customer.user.username} &middot; <StatusBadge status={customer.user.status} />
          </span>
        }
        tone="teal"
        icon={<IconUser />}
      />

      <h2 className="mb-3 text-sm font-semibold uppercase text-ink-400">Accounts</h2>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {customer.accounts.map((a) => (
          <div key={a.id} className="card">
            <p className="text-xs font-semibold uppercase text-ink-400">{a.accountType}</p>
            <p className="font-mono text-sm text-ink-600">{a.maskedAccountNumber}</p>
            <p className="mt-2 text-lg font-bold text-ink-900">{formatCurrency(a.availableBalance, a.currency)}</p>
            <StatusBadge status={a.status} />
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase text-ink-400">Recent Transactions</h2>
      {txQuery.isLoading ? (
        <SkeletonRows rows={5} cols={4} />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-100 text-left text-xs uppercase text-ink-400">
              <tr>
                <th scope="col" className="px-4 py-3">Date</th>
                <th scope="col" className="px-4 py-3">Description</th>
                <th scope="col" className="px-4 py-3 text-right">Amount</th>
                <th scope="col" className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {((txQuery.data?.data as Transaction[] | undefined) ?? []).map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 text-ink-500">{formatDateTime(t.createdAt)}</td>
                  <td className="px-4 py-3 text-ink-800">{t.description}</td>
                  <td className={`px-4 py-3 text-right font-medium ${t.direction === 'CREDIT' ? 'text-emerald-600' : 'text-ink-800'}`}>
                    {t.direction === 'CREDIT' ? '+' : '-'}{formatCurrency(t.amount)}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
