import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/resourceApis';
import { formatDateTime } from '../../utils/format';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { StatusBadge } from '../../components/ui/Badge';
import { PageHeader } from '../../components/ui/PageHeader';
import { IconShield } from '../../components/ui/icons';

interface AuditRow {
  id: string;
  actorUsername: string | null;
  action: string;
  target: string | null;
  ipAddress: string;
  result: 'SUCCESS' | 'FAILURE';
  createdAt: string;
}

export default function AdminAuditLogsPage() {
  const [result, setResult] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs', { result, page }],
    queryFn: () => adminApi.auditLogs({ result: result || undefined, page, limit: 20 }),
    placeholderData: (prev) => prev,
  });

  return (
    <div>
      <PageHeader title="Audit Logs" description="Security-relevant actions across BankFlow." tone="violet" icon={<IconShield />} />

      <select className="input mb-4 max-w-xs" value={result} onChange={(e) => { setResult(e.target.value); setPage(1); }}>
        <option value="">All results</option>
        <option value="SUCCESS">Success</option>
        <option value="FAILURE">Failure</option>
      </select>

      {isLoading ? (
        <SkeletonRows rows={8} cols={5} />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-100 text-left text-xs uppercase text-ink-400">
              <tr>
                <th scope="col" className="px-4 py-3">Timestamp</th>
                <th scope="col" className="px-4 py-3">User</th>
                <th scope="col" className="px-4 py-3">Action</th>
                <th scope="col" className="px-4 py-3">Target</th>
                <th scope="col" className="px-4 py-3">IP Address</th>
                <th scope="col" className="px-4 py-3">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {(data?.data as AuditRow[] | undefined ?? []).map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-ink-500">{formatDateTime(r.createdAt)}</td>
                  <td className="px-4 py-3 text-ink-800">{r.actorUsername ?? '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-600">{r.action}</td>
                  <td className="px-4 py-3 text-ink-600">{r.target ?? '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-500">{r.ipAddress}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.result} /></td>
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
