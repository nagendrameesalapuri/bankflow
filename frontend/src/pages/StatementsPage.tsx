import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { accountsApi, statementsApi } from '../services/resourceApis';
import { formatCurrency, formatDate } from '../utils/format';
import { getApiErrorMessage } from '../services/apiClient';
import { downloadAuthenticatedFile } from '../utils/download';
import { useToast } from '../context/ToastContext';
import { SkeletonRows } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { IconDoc } from '../components/ui/icons';

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function StatementsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const accountsQuery = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list });

  const [accountId, setAccountId] = useState('');
  const today = new Date();
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const [periodStart, setPeriodStart] = useState(isoDate(monthAgo));
  const [periodEnd, setPeriodEnd] = useState(isoDate(today));
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const statementsQuery = useQuery({
    queryKey: ['statements', accountId],
    queryFn: () => statementsApi.list(accountId),
    enabled: !!accountId,
  });

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsGenerating(true);
    try {
      await statementsApi.generate(accountId, periodStart, periodEnd);
      queryClient.invalidateQueries({ queryKey: ['statements', accountId] });
      showToast({ title: 'Statement generated', variant: 'success' });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div>
      <PageHeader title="Statements" description="Generate and download account statements as PDF or CSV." tone="teal" icon={<IconDoc />} />

      <div className="card mb-6">
        <form onSubmit={generate} className="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:items-end">
          <div>
            <label htmlFor="stmt-account" className="label">
              Account
            </label>
            <select id="stmt-account" required className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Select account</option>
              {(accountsQuery.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.accountType} - {a.maskedAccountNumber}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="periodStart" className="label">
              From
            </label>
            <input id="periodStart" type="date" required className="input" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          </div>
          <div>
            <label htmlFor="periodEnd" className="label">
              To
            </label>
            <input id="periodEnd" type="date" required className="input" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </div>
          <button type="submit" disabled={isGenerating || !accountId} className="btn-primary">
            {isGenerating ? 'Generating...' : 'Generate Statement'}
          </button>
        </form>
        {error && <p role="alert" className="field-error mt-2">{error}</p>}
      </div>

      {!accountId && <EmptyState title="Select an account" description="Choose an account above to view or generate statements." />}

      {accountId && statementsQuery.isLoading && <SkeletonRows rows={3} cols={3} />}

      {accountId && statementsQuery.data && statementsQuery.data.length === 0 && (
        <EmptyState title="No statements generated yet" description="Use the form above to generate your first statement." />
      )}

      {accountId && statementsQuery.data && statementsQuery.data.length > 0 && (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-100 text-left text-xs uppercase text-ink-400">
              <tr>
                <th scope="col" className="px-4 py-3">Period</th>
                <th scope="col" className="px-4 py-3">Opening</th>
                <th scope="col" className="px-4 py-3">Closing</th>
                <th scope="col" className="px-4 py-3">Generated</th>
                <th scope="col" className="px-4 py-3">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {statementsQuery.data.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">{formatDate(s.periodStart)} - {formatDate(s.periodEnd)}</td>
                  <td className="px-4 py-3">{formatCurrency(s.openingBalance)}</td>
                  <td className="px-4 py-3">{formatCurrency(s.closingBalance)}</td>
                  <td className="px-4 py-3 text-ink-500">{formatDate(s.generatedAt)}</td>
                  <td className="px-4 py-3">
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
