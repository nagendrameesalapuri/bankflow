import { useMemo, useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { IconDoc } from '../components/ui/icons';
import { REGRESSION_TEST_CASES, type Priority } from '../data/regressionTestCases';

const PRIORITY_STYLES: Record<Priority, string> = {
  High: 'bg-rose-100 text-rose-800',
  Medium: 'bg-amber-100 text-amber-800',
  Low: 'bg-emerald-100 text-emerald-800',
};

export default function RegressionPage() {
  const [search, setSearch] = useState('');
  const [module, setModule] = useState('ALL');
  const [priority, setPriority] = useState('ALL');

  const modules = useMemo(() => ['ALL', ...Array.from(new Set(REGRESSION_TEST_CASES.map((t) => t.module)))], []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return REGRESSION_TEST_CASES.filter((t) => {
      if (module !== 'ALL' && t.module !== module) return false;
      if (priority !== 'ALL' && t.priority !== priority) return false;
      if (q && !`${t.id} ${t.title} ${t.module}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search, module, priority]);

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-8">
      <PageHeader
        title="Regression Test Cases"
        description={`${REGRESSION_TEST_CASES.length} manual regression test cases covering every BankFlow module - use these as the basis for Playwright automation scripts.`}
        tone="violet"
        icon={<IconDoc />}
      />

      <div className="card mb-6 flex flex-wrap items-center gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search by ID, title, or module..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="regression-search"
        />
        <select className="input max-w-[200px]" value={module} onChange={(e) => setModule(e.target.value)} data-testid="regression-module-filter">
          {modules.map((m) => (
            <option key={m} value={m}>
              {m === 'ALL' ? 'All modules' : m}
            </option>
          ))}
        </select>
        <select className="input max-w-[160px]" value={priority} onChange={(e) => setPriority(e.target.value)} data-testid="regression-priority-filter">
          <option value="ALL">All priorities</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <span className="ml-auto text-sm text-ink-500">
          Showing {filtered.length} of {REGRESSION_TEST_CASES.length}
        </span>
      </div>

      <div className="space-y-4">
        {filtered.map((tc) => (
          <div key={tc.id} className="card" data-testid="regression-case">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-ink-400">{tc.id}</span>
                <span className="badge bg-violet-50 text-violet-700">{tc.module}</span>
                <span className={`badge ${PRIORITY_STYLES[tc.priority]}`}>{tc.priority}</span>
              </div>
            </div>
            <h2 className="mt-2 font-semibold text-ink-900">{tc.title}</h2>

            <p className="mt-2 text-sm text-ink-600">
              <strong className="text-ink-800">Preconditions: </strong>
              {tc.preconditions}
            </p>

            <div className="mt-2 text-sm text-ink-600">
              <strong className="text-ink-800">Steps:</strong>
              <ol className="ml-5 mt-1 list-decimal space-y-0.5">
                {tc.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>

            {tc.testData && (
              <p className="mt-2 text-sm text-ink-600">
                <strong className="text-ink-800">Test data: </strong>
                <code className="rounded bg-ink-50 px-1.5 py-0.5 text-xs">{tc.testData}</code>
              </p>
            )}

            <p className="mt-2 text-sm text-ink-600">
              <strong className="text-ink-800">Expected result: </strong>
              {tc.expectedResult}
            </p>
          </div>
        ))}

        {filtered.length === 0 && <p className="py-12 text-center text-sm text-ink-400">No test cases match your filters.</p>}
      </div>
    </div>
  );
}
