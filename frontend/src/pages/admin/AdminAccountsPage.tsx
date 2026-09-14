import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/resourceApis';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { formatCurrency } from '../../utils/format';
import { useToast } from '../../context/ToastContext';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { StatusBadge } from '../../components/ui/Badge';
import { PageHeader } from '../../components/ui/PageHeader';
import { IconWallet } from '../../components/ui/icons';

interface AdminAccountRow {
  id: string;
  accountNumber: string;
  maskedAccountNumber: string;
  accountType: string;
  availableBalance: number;
  currency: string;
  status: string;
  ownerName: string;
  ownerUsername: string;
}

export default function AdminAccountsPage() {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'accounts', { search: debouncedSearch, page }],
    queryFn: () => adminApi.accounts({ search: debouncedSearch || undefined, page, limit: 10 }),
    placeholderData: (prev) => prev,
  });

  async function copyAccountNumber(accountNumber: string) {
    try {
      await navigator.clipboard.writeText(accountNumber);
      showToast({ title: 'Account number copied', variant: 'success' });
    } catch {
      showToast({ title: 'Could not copy to clipboard', variant: 'error' });
    }
  }

  return (
    <div>
      <PageHeader title="Accounts" description="All customer accounts across BankFlow, with full account numbers." tone="violet" icon={<IconWallet />} />

      <input className="input mb-4 max-w-sm" placeholder="Search by account number or owner" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />

      {isLoading ? (
        <SkeletonRows rows={8} cols={5} />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-100 text-left text-xs uppercase text-ink-400">
              <tr>
                <th scope="col" className="px-4 py-3">Account Number</th>
                <th scope="col" className="px-4 py-3">Owner</th>
                <th scope="col" className="px-4 py-3">Type</th>
                <th scope="col" className="px-4 py-3 text-right">Balance</th>
                <th scope="col" className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {(data?.data as AdminAccountRow[] | undefined ?? []).map((a) => (
                <tr key={a.id} data-testid="admin-account-row">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="font-mono text-sm text-ink-800 hover:text-brand-600"
                      title="Click to copy"
                      onClick={() => copyAccountNumber(a.accountNumber)}
                      data-testid="admin-account-number"
                    >
                      {a.accountNumber}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-ink-800">{a.ownerName} <span className="text-ink-400">({a.ownerUsername})</span></td>
                  <td className="px-4 py-3 text-ink-600">{a.accountType}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(a.availableBalance, a.currency)}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
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
