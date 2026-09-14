import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { devApi } from '../../services/resourceApis';
import { useToast } from '../../context/ToastContext';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { PageHeader } from '../../components/ui/PageHeader';
import { IconBolt } from '../../components/ui/icons';
import type { ChaosRule } from '../../types/api';

export default function ChaosPanelPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data, isLoading } = useQuery({ queryKey: ['dev', 'chaos'], queryFn: devApi.chaosRoutes });
  const [drafts, setDrafts] = useState<Record<string, Partial<ChaosRule>>>({});

  function getValue(rule: ChaosRule): ChaosRule {
    return { ...rule, ...drafts[rule.routeKey] };
  }

  function updateDraft(routeKey: string, patch: Partial<ChaosRule>) {
    setDrafts((prev) => ({ ...prev, [routeKey]: { ...prev[routeKey], ...patch } }));
  }

  async function save(rule: ChaosRule) {
    await devApi.upsertChaosRule(rule);
    queryClient.invalidateQueries({ queryKey: ['dev', 'chaos'] });
    showToast({ title: `Chaos rule saved for ${rule.routeKey}`, variant: rule.enabled ? 'warning' : 'success' });
  }

  return (
    <div>
      <PageHeader
        title="Chaos Control Panel"
        description="Inject configurable failures, delays, and timeouts into specific API routes. Admin + non-production only."
        tone="sunset"
        icon={<IconBolt />}
        actions={
          <button
            type="button"
            className="btn-danger"
            onClick={async () => {
              await devApi.resetChaos();
              queryClient.invalidateQueries({ queryKey: ['dev', 'chaos'] });
              setDrafts({});
              showToast({ title: 'Chaos Mode reset to normal for all routes', variant: 'success' });
            }}
          >
            Reset All to Normal
          </button>
        }
      />

      {isLoading ? (
        <SkeletonRows rows={6} cols={5} />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-100 text-left text-xs uppercase text-ink-400">
              <tr>
                <th scope="col" className="px-4 py-3">Route</th>
                <th scope="col" className="px-4 py-3">Enabled</th>
                <th scope="col" className="px-4 py-3">Delay (ms)</th>
                <th scope="col" className="px-4 py-3">Fail N times</th>
                <th scope="col" className="px-4 py-3">Fail status</th>
                <th scope="col" className="px-4 py-3">Timeout</th>
                <th scope="col" className="px-4 py-3">Hits</th>
                <th scope="col" className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {(data ?? []).map((rule) => {
                const current = getValue(rule);
                return (
                  <tr key={rule.routeKey} data-testid="chaos-row">
                    <td className="px-4 py-3 font-mono text-xs text-ink-600">{rule.routeKey}</td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Enable chaos for ${rule.routeKey}`}
                        checked={current.enabled}
                        onChange={(e) => updateDraft(rule.routeKey, { enabled: e.target.checked })}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        className="input w-24"
                        aria-label="Delay in milliseconds"
                        value={current.delayMs}
                        onChange={(e) => updateDraft(rule.routeKey, { delayMs: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        max={20}
                        className="input w-20"
                        aria-label="Fail this many times"
                        value={current.failTimes}
                        onChange={(e) => updateDraft(rule.routeKey, { failTimes: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="input w-24"
                        aria-label="Failure status code"
                        value={current.failStatusCode}
                        onChange={(e) => updateDraft(rule.routeKey, { failStatusCode: Number(e.target.value) })}
                      >
                        {[400, 401, 403, 404, 409, 422, 429, 500, 502, 503].map((code) => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label="Simulate timeout (never respond)"
                        checked={current.simulateTimeout}
                        onChange={(e) => updateDraft(rule.routeKey, { simulateTimeout: e.target.checked })}
                      />
                    </td>
                    <td className="px-4 py-3 text-ink-500">{rule.hitCount}</td>
                    <td className="px-4 py-3">
                      <button type="button" className="btn-secondary text-xs" onClick={() => save(current)}>
                        Save
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
