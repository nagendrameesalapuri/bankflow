import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, getApiErrorMessage } from '../../services/apiClient';
import { devApi } from '../../services/resourceApis';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { PageHeader } from '../../components/ui/PageHeader';
import { IconTerminal } from '../../components/ui/icons';

interface LabEndpoint {
  method: string;
  path: string;
  chaosRouteKey: string | null;
  description: string;
  requiresRole: string;
  samplePayload?: Record<string, unknown>;
}

interface CallResult {
  status: number | 'ERROR';
  durationMs: number;
  body: unknown;
}

export default function ApiLabPage() {
  const { data, isLoading } = useQuery({ queryKey: ['dev', 'api-lab'], queryFn: devApi.apiLabEndpoints });
  const [selected, setSelected] = useState<LabEndpoint | null>(null);
  const [payload, setPayload] = useState('{}');
  const [result, setResult] = useState<CallResult | null>(null);
  const [isSending, setIsSending] = useState(false);

  function select(endpoint: LabEndpoint) {
    setSelected(endpoint);
    setPayload(JSON.stringify(endpoint.samplePayload ?? {}, null, 2));
    setResult(null);
  }

  async function send() {
    if (!selected) return;
    setIsSending(true);
    const start = performance.now();
    try {
      let body: unknown = undefined;
      try {
        body = payload.trim() ? JSON.parse(payload) : undefined;
      } catch {
        setResult({ status: 'ERROR', durationMs: 0, body: { error: 'Invalid JSON payload' } });
        setIsSending(false);
        return;
      }
      const response = await apiClient.request({
        method: selected.method,
        url: selected.path.replace('/api', ''),
        data: ['GET', 'DELETE'].includes(selected.method) ? undefined : body,
        params: selected.method === 'GET' ? (body as Record<string, unknown>) : undefined,
      });
      setResult({ status: response.status, durationMs: Math.round(performance.now() - start), body: response.data });
    } catch (err) {
      const axiosErr = err as { response?: { status: number; data: unknown } };
      setResult({
        status: axiosErr.response?.status ?? 'ERROR',
        durationMs: Math.round(performance.now() - start),
        body: axiosErr.response?.data ?? { error: getApiErrorMessage(err) },
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div>
      <PageHeader title="API Testing Lab" description="Explore and trigger real BankFlow API calls. Requests run with your current session." tone="sunset" icon={<IconTerminal />} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          {isLoading ? (
            <SkeletonRows rows={6} cols={2} />
          ) : (
            <ul className="space-y-2">
              {((data as LabEndpoint[] | undefined) ?? []).map((ep) => (
                <li key={`${ep.method}-${ep.path}`}>
                  <button
                    type="button"
                    onClick={() => select(ep)}
                    className={`card block w-full text-left ${selected?.path === ep.path ? 'ring-2 ring-brand-500' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="badge bg-brand-100 text-brand-700">{ep.method}</span>
                      <span className="font-mono text-sm text-ink-800">{ep.path}</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-500">{ep.description}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          {selected ? (
            <div className="card">
              <h2 className="font-semibold text-ink-800">
                {selected.method} {selected.path}
              </h2>
              <label htmlFor="payload" className="label mt-3">
                Request payload / query params (JSON)
              </label>
              <textarea id="payload" rows={8} className="input font-mono text-xs" value={payload} onChange={(e) => setPayload(e.target.value)} />
              <button type="button" className="btn-primary mt-3" disabled={isSending} onClick={send}>
                {isSending ? 'Sending...' : 'Send Request'}
              </button>

              {result && (
                <div className="mt-4 rounded-lg bg-ink-950 p-3 text-xs text-ink-50">
                  <div className="mb-2 flex justify-between text-ink-300">
                    <span>
                      Status: <strong className={result.status === 'ERROR' || Number(result.status) >= 400 ? 'text-red-400' : 'text-emerald-400'}>{result.status}</strong>
                    </span>
                    <span>{result.durationMs}ms</span>
                  </div>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap">{JSON.stringify(result.body, null, 2)}</pre>
                </div>
              )}
            </div>
          ) : (
            <div className="card text-sm text-ink-500">Select an endpoint on the left to try it.</div>
          )}
        </div>
      </div>
    </div>
  );
}
