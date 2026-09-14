import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/resourceApis';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { StatusBadge } from '../../components/ui/Badge';
import { PageHeader } from '../../components/ui/PageHeader';
import { IconList } from '../../components/ui/icons';

interface AdminTxRow {
  id: string;
  description: string;
  accountNumber: string;
  ownerName: string;
  amount: number;
  direction: 'DEBIT' | 'CREDIT';
  status: string;
  createdAt: string;
}

export default function AdminTransactionsPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'transactions', { status, page }],
    queryFn: () => adminApi.transactions({ status: status || undefined, page, limit: 15 }),
    placeholderData: (prev) => prev,
  });

  return (
    <div>
      <PageHeader title="Transactions" description="System-wide transaction activity." tone="violet" icon={<IconList />} />

      <select className="input mb-4 max-w-xs" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
        <option value="">All statuses</option>
        <option value="SUCCESS">Success</option>
        <option value="PENDING">Pending</option>
        <option value="FAILED">Failed</option>
        <option value="REVERSED">Reversed</option>
      </select>

      {isLoading ? (
        <SkeletonRows rows={8} cols={5} />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-100 text-left text-xs uppercase text-ink-400">
              <tr>
                <th scope="col" className="px-4 py-3">Date</th>
                <th scope="col" className="px-4 py-3">Description</th>
                <th scope="col" className="px-4 py-3">Account</th>
                <th scope="col" className="px-4 py-3">Owner</th>
                <th scope="col" className="px-4 py-3 text-right">Amount</th>
                <th scope="col" className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {(data?.data as AdminTxRow[] | undefined ?? []).map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 text-ink-500">{formatDateTime(t.createdAt)}</td>
                  <td className="px-4 py-3 text-ink-800">{t.description}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-500">{t.accountNumber}</td>
                  <td className="px-4 py-3">{t.ownerName}</td>
                  <td className={`px-4 py-3 text-right font-medium ${t.direction === 'CREDIT' ? 'text-emerald-600' : 'text-ink-800'}`}>
                    {t.direction === 'CREDIT' ? '+' : '-'}{formatCurrency(t.amount)}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-ink-100 px-4 py-3 text-sm text-ink-500">
            <span>Page {data?.pagination.page ?? 1} of {Math.max(1, data?.pagination.totalPages ?? 1)}</span>
            <div className="flex gap-2">
              <button className="btn-secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button className="btn-secondary" disabled={(data?.pagination.totalPages ?? 1) <= page} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
