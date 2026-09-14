import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { notificationsApi } from '../../services/resourceApis';
import { formatDateTime } from '../../utils/format';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications', 1],
    queryFn: () => notificationsApi.list(1, 5),
    refetchInterval: 30000,
  });

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 text-ink-500 hover:bg-ink-100"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span
            data-testid="notification-count"
            className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white"
          >
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-ink-100 bg-white p-2 shadow-xl">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-sm font-semibold text-ink-800">Notifications</p>
            <button
              type="button"
              className="text-xs font-medium text-brand-600 hover:underline"
              onClick={async () => {
                await notificationsApi.markAllRead();
                queryClient.invalidateQueries({ queryKey: ['notifications'] });
              }}
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {(data?.data ?? []).length === 0 && <p className="px-2 py-4 text-sm text-ink-500">You're all caught up.</p>}
            {(data?.data ?? []).map((n) => (
              <div key={n.id} className={`rounded-lg px-2 py-2 text-sm ${n.isRead ? '' : 'bg-brand-50'}`}>
                <p className="font-medium text-ink-800">{n.title}</p>
                <p className="text-ink-500">{n.message}</p>
                <p className="mt-0.5 text-xs text-ink-400">{formatDateTime(n.createdAt)}</p>
              </div>
            ))}
          </div>
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="mt-1 block rounded-lg px-2 py-2 text-center text-sm font-medium text-brand-600 hover:bg-ink-50"
          >
            View all
          </Link>
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3a6 6 0 00-6 6v3.5c0 .5-.2 1-.5 1.4L4 16h16l-1.5-2.1c-.3-.4-.5-.9-.5-1.4V9a6 6 0 00-6-6z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M9.5 19a2.5 2.5 0 005 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
