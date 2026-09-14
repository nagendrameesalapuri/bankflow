const STATUS_STYLES: Record<string, string> = {
  SUCCESS: 'bg-emerald-100 text-emerald-800',
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  PENDING: 'bg-amber-100 text-amber-800',
  PROCESSING: 'bg-amber-100 text-amber-800',
  FAILED: 'bg-red-100 text-red-800',
  BLOCKED: 'bg-red-100 text-red-800',
  DISABLED: 'bg-red-100 text-red-800',
  LOCKED: 'bg-red-100 text-red-800',
  REVERSED: 'bg-ink-200 text-ink-800',
  INACTIVE: 'bg-ink-200 text-ink-700',
  FROZEN: 'bg-sky-100 text-sky-800',
  DORMANT: 'bg-ink-200 text-ink-700',
  CLOSED: 'bg-ink-200 text-ink-700',
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${STATUS_STYLES[status] ?? 'bg-ink-100 text-ink-700'}`}>{status}</span>;
}
