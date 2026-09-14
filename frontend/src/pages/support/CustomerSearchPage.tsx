import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supportApi } from '../../services/resourceApis';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/Badge';
import type { User } from '../../types/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { IconSearch } from '../../components/ui/icons';

export default function CustomerSearchPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const { data, isLoading } = useQuery({
    queryKey: ['support', 'customers', debouncedSearch],
    queryFn: () => supportApi.searchCustomers({ search: debouncedSearch || undefined, page: 1, limit: 20 }),
  });

  return (
    <div>
      <PageHeader title="Customer Search" description="Look up customer accounts and transaction activity. Read-only access." tone="teal" icon={<IconSearch />} />

      <input
        className="input mb-4 max-w-md"
        placeholder="Search by name, username, or email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search customers"
      />

      {isLoading ? (
        <SkeletonRows rows={6} cols={3} />
      ) : (data?.data as User[] | undefined ?? []).length === 0 ? (
        <EmptyState title="No customers found" />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-100 text-left text-xs uppercase text-ink-400">
              <tr>
                <th scope="col" className="px-4 py-3">Name</th>
                <th scope="col" className="px-4 py-3">Username</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {(data?.data as User[] | undefined ?? []).map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium text-ink-800">{c.fullName}</td>
                  <td className="px-4 py-3 text-ink-600">{c.username}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3">
                    <Link to={`/support/customers/${c.id}`} className="font-medium text-brand-600 hover:underline">
                      View details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
