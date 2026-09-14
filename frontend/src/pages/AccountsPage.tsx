import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { accountsApi } from '../services/resourceApis';
import { formatCurrency, formatDate } from '../utils/format';
import { SkeletonRows } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/Badge';
import { Tooltip } from '../components/ui/Tooltip';

const TYPE_LABEL: Record<string, string> = {
  SAVINGS: 'Savings Account',
  CURRENT: 'Current Account',
  FIXED_DEPOSIT: 'Fixed Deposit',
};

const TYPE_STYLE: Record<string, { bar: string; chip: string; icon: JSX.Element }> = {
  SAVINGS: { bar: 'from-teal-500 to-teal-700', chip: 'bg-teal-50 text-teal-700', icon: <IconPiggy /> },
  CURRENT: { bar: 'from-brand-500 to-brand-800', chip: 'bg-brand-50 text-brand-700', icon: <IconWallet /> },
  FIXED_DEPOSIT: { bar: 'from-violet-500 to-violet-800', chip: 'bg-violet-50 text-violet-700', icon: <IconLock /> },
};

export default function AccountsPage() {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-ink-900">Accounts</h1>
      <p className="mb-6 text-sm text-ink-500">All accounts held under your BankFlow profile.</p>

      {isLoading && <SkeletonRows rows={3} cols={4} />}
      {isError && <ErrorState message="Couldn't load your accounts." onRetry={() => refetch()} />}

      {data && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((account) => {
            const style = TYPE_STYLE[account.accountType] ?? TYPE_STYLE.CURRENT;
            return (
              <Link
                key={account.id}
                to={`/accounts/${account.id}`}
                className="card block overflow-hidden p-0 transition-all hover:-translate-y-0.5 hover:shadow-card-lg"
                data-testid="account-card"
              >
                <div className={`h-1.5 bg-gradient-to-r ${style.bar}`} aria-hidden="true" />
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${style.chip}`}>{style.icon}</span>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{TYPE_LABEL[account.accountType]}</p>
                        <Tooltip label={`Full number ends in ${account.maskedAccountNumber.slice(-4)}`}>
                          <p className="mt-0.5 font-mono text-sm text-ink-700">{account.maskedAccountNumber}</p>
                        </Tooltip>
                      </div>
                    </div>
                    <StatusBadge status={account.status} />
                  </div>
                  <p className="mt-4 text-2xl font-bold text-ink-900">{formatCurrency(account.availableBalance, account.currency)}</p>
                  <p className="text-xs text-ink-400">Available balance</p>
                  <div className="mt-3 flex justify-between text-xs text-ink-500">
                    <span>Opened {formatDate(account.openedAt)}</span>
                    {account.interestRate > 0 && <span>{account.interestRate}% p.a.</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

const typeIconProps = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none' as const, 'aria-hidden': true as const };
function IconPiggy() {
  return (
    <svg {...typeIconProps}>
      <path d="M4 12a6 6 0 016-6h4a6 6 0 016 6v1h1.5L20 15v3h-2v2h-3v-2H9v2H6v-3l-2-1v-2h1a5 5 0 00-1-2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="15" cy="11" r="1" fill="currentColor" />
    </svg>
  );
}
function IconWallet() {
  return (
    <svg {...typeIconProps}>
      <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16" cy="14" r="1.4" fill="currentColor" />
    </svg>
  );
}
function IconLock() {
  return (
    <svg {...typeIconProps}>
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 11V8a4 4 0 118 0v3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
