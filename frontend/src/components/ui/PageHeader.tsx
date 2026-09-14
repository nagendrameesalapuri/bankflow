import type { ReactNode } from 'react';

const TONE_STYLES: Record<string, string> = {
  brand: 'bg-brand-50 text-brand-600',
  teal: 'bg-teal-50 text-teal-600',
  violet: 'bg-violet-50 text-violet-600',
  sunset: 'bg-sunset-50 text-sunset-600',
  rose: 'bg-rose-50 text-rose-600',
};

export function PageHeader({
  title,
  description,
  icon,
  tone = 'brand',
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  tone?: keyof typeof TONE_STYLES;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {icon && <span className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TONE_STYLES[tone]}`}>{icon}</span>}
        <div>
          <h1 className="text-2xl font-bold text-ink-900">{title}</h1>
          {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
}
