import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { devApi } from '../../services/resourceApis';
import { useToast } from '../../context/ToastContext';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { PageHeader } from '../../components/ui/PageHeader';
import { IconFlag } from '../../components/ui/icons';

const DIFFICULTY_STYLES: Record<string, string> = {
  BEGINNER: 'bg-emerald-100 text-emerald-800',
  INTERMEDIATE: 'bg-amber-100 text-amber-800',
  ADVANCED: 'bg-red-100 text-red-800',
};

export default function ChallengeLabPage() {
  const { showToast } = useToast();
  const { data, isLoading } = useQuery({ queryKey: ['dev', 'challenges'], queryFn: devApi.challenges });
  const [resettingId, setResettingId] = useState<number | null>(null);

  async function handleReset(id: number) {
    setResettingId(id);
    try {
      await devApi.resetChallenge(id);
      showToast({ title: `Environment reset for challenge #${id}`, variant: 'success' });
    } finally {
      setResettingId(null);
    }
  }

  return (
    <div>
      <PageHeader title="Playwright Challenge Lab" description="25 hands-on automation challenges against this application. No solutions provided." tone="sunset" icon={<IconFlag />} />

      {isLoading ? (
        <SkeletonRows rows={8} cols={3} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {(data ?? []).map((c) => (
            <div key={c.id} className="card" data-testid="challenge-card">
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold text-ink-400">Challenge #{c.id}</p>
                <span className={`badge ${DIFFICULTY_STYLES[c.difficulty]}`}>{c.difficulty}</span>
              </div>
              <h2 className="mt-1 font-semibold text-ink-900">{c.title}</h2>
              <p className="mt-1 text-sm text-ink-600">{c.description}</p>
              <p className="mt-2 text-xs text-ink-400">
                <strong>Expected:</strong> {c.expectedBehavior}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <Link to={c.startPage} className="text-sm font-medium text-brand-600 hover:underline">
                  Go to start page
                </Link>
                <button type="button" className="btn-ghost text-xs" disabled={resettingId === c.id} onClick={() => handleReset(c.id)}>
                  {resettingId === c.id ? 'Resetting...' : 'Reset'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
