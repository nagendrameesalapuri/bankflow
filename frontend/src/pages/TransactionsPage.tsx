import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { accountsApi, transactionsApi, type TransactionFilters } from '../services/resourceApis';
import { formatCurrency, formatDateTime } from '../utils/format';
import { SkeletonRows } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/Badge';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { PageHeader } from '../components/ui/PageHeader';
import { IconList } from '../components/ui/icons';

const TYPES = ['TRANSFER', 'PAYMENT', 'DEPOSIT', 'WITHDRAWAL', 'FEE', 'INTEREST'];
const STATUSES = ['SUCCESS', 'PENDING', 'FAILED', 'REVERSED'];

export default function TransactionsPage() {
  const accountsQuery = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list });

  const [filters, setFilters] = useState<TransactionFilters>({ page: 1, limit: 15, sort: 'date_desc' });
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, page: 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const effectiveFilters = useMemo<TransactionFilters>(
    () => ({ ...filters, q: debouncedSearch || undefined }),
    [filters, debouncedSearch],
  );

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['transactions', effectiveFilters],
    queryFn: () => transactionsApi.search(effectiveFilters),
    placeholderData: (prev) => prev,
  });

  function updateFilter<K extends keyof TransactionFilters>(key: K, value: TransactionFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  return (
    <div>
      <PageHeader title="Transactions" description="Search and filter across all your accounts." tone="brand" icon={<IconList />} />

      <div className="card mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="search" className="label">
              Search
            </label>
            <input
              id="search"
              className="input"
              placeholder="Description, reference number..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="account" className="label">
              Account
            </label>
            <select id="account" className="input" value={filters.accountId ?? ''} onChange={(e) => updateFilter('accountId', e.target.value || undefined)}>
              <option value="">All accounts</option>
              {(accountsQuery.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.accountType} - {a.maskedAccountNumber}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="type" className="label">
              Type
            </label>
            <select id="type" className="input" value={filters.type ?? ''} onChange={(e) => updateFilter('type', e.target.value || undefined)}>
              <option value="">All types</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="status" className="label">
              Status
            </label>
            <select id="status" className="input" value={filters.status ?? ''} onChange={(e) => updateFilter('status', e.target.value || undefined)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="direction" className="label">
              Debit / Credit
            </label>
            <select id="direction" className="input" value={filters.direction ?? ''} onChange={(e) => updateFilter('direction', e.target.value || undefined)}>
              <option value="">Both</option>
              <option value="DEBIT">Debit</option>
              <option value="CREDIT">Credit</option>
            </select>
          </div>
          <div>
            <label htmlFor="dateFrom" className="label">
              From date
            </label>
            <input id="dateFrom" type="date" className="input" value={filters.dateFrom ?? ''} onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)} />
          </div>
          <div>
            <label htmlFor="dateTo" className="label">
              To date
            </label>
            <input id="dateTo" type="date" className="input" value={filters.dateTo ?? ''} onChange={(e) => updateFilter('dateTo', e.target.value || undefined)} />
          </div>
          <div>
            <label htmlFor="sort" className="label">
              Sort by
            </label>
            <select id="sort" className="input" value={filters.sort} onChange={(e) => updateFilter('sort', e.target.value)}>
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
              <option value="amount_desc">Amount: high to low</option>
              <option value="amount_asc">Amount: low to high</option>
            </select>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:w-1/2">
          <div>
            <label htmlFor="amountMin" className="label">
              Min amount
            </label>
            <input
              id="amountMin"
              type="number"
              className="input"
              value={filters.amountMin ?? ''}
              onChange={(e) => updateFilter('amountMin', e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
          <div>
            <label htmlFor="amountMax" className="label">
              Max amount
            </label>
            <input
              id="amountMax"
              type="number"
              className="input"
              value={filters.amountMax ?? ''}
              onChange={(e) => updateFilter('amountMax', e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
        </div>
      </div>

      {isLoading && <SkeletonRows rows={8} cols={5} />}
      {isError && <ErrorState message="Couldn't load transactions." onRetry={() => refetch()} />}

      {data && (
        <div className={`card overflow-x-auto p-0 ${isFetching ? 'opacity-60' : ''}`}>
          {data.data.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No matching transactions" description="Try adjusting your filters." />
            </div>
          ) : (
            <table className="w-full text-sm" data-testid="transactions-table">
              <caption className="sr-only">Transaction history</caption>
              <thead className="border-b border-ink-100 text-left text-xs uppercase text-ink-400">
                <tr>
                  <th scope="col" className="px-4 py-3">Date</th>
                  <th scope="col" className="px-4 py-3">Description</th>
                  <th scope="col" className="px-4 py-3">Reference</th>
                  <th scope="col" className="px-4 py-3">Type</th>
                  <th scope="col" className="px-4 py-3 text-right">Amount</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {data.data.map((t) => (
                  <tr key={t.id} data-testid="transaction-row" data-reference={t.referenceNumber}>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-500">{formatDateTime(t.createdAt)}</td>
                    <td className="px-4 py-3 font-medium text-ink-800">
                      {t.description}
                      {t.counterpartyName && <span className="block text-xs text-ink-400">{t.counterpartyName}</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-500">{t.referenceNumber}</td>
                    <td className="px-4 py-3 text-ink-600">{t.type}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${t.direction === 'CREDIT' ? 'text-emerald-600' : 'text-ink-800'}`}>
                      {t.direction === 'CREDIT' ? '+' : '-'}
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="flex items-center justify-between border-t border-ink-100 px-4 py-3 text-sm text-ink-500">
            <span>
              Page {data.pagination.page} of {Math.max(1, data.pagination.totalPages)} &middot; {data.pagination.total} results
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary"
                disabled={filters.page === 1}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={(filters.page ?? 1) >= data.pagination.totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
