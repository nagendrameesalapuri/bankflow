export function Spinner({ label = 'Loading', size = 20 }: { label?: string; size?: number }) {
  return (
    <span role="status" aria-label={label} className="inline-flex items-center gap-2 text-ink-500">
      <svg
        className="animate-spin"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    </span>
  );
}
