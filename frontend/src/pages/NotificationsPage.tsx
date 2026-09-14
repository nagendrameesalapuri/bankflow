import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../services/resourceApis';
import { formatDateTime } from '../utils/format';
import { SkeletonRows } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { IconBell } from '../components/ui/icons';

const TYPE_STYLES: Record<string, string> = {
  SUCCESS: 'border-emerald-200 bg-emerald-50',
  WARNING: 'border-amber-200 bg-amber-50',
  SECURITY: 'border-red-200 bg-red-50',
  INFO: 'border-ink-100 bg-white',
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ['notifications', page], queryFn: () => notificationsApi.list(page, 15) });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={`${data?.unreadCount ?? 0} unread`}
        tone="brand"
        icon={<IconBell />}
        actions={
          <button
            type="button"
            className="btn-secondary"
            onClick={async () => {
              await notificationsApi.markAllRead();
              invalidate();
            }}
          >
            Mark all as read
          </button>
        }
      />

      {isLoading && <SkeletonRows rows={6} cols={2} />}

      {data && data.data.length === 0 && <EmptyState title="No notifications" />}

      {data && data.data.length > 0 && (
        <div className="space-y-3">
          {data.data.map((n) => (
            <div key={n.id} className={`card flex items-start justify-between gap-4 border ${TYPE_STYLES[n.type]}`}>
              <div>
                <p className="font-medium text-ink-900">
                  {n.title} {!n.isRead && <span className="ml-1 inline-block h-2 w-2 rounded-full bg-brand-500" aria-label="unread" />}
                </p>
                <p className="text-sm text-ink-600">{n.message}</p>
                <p className="mt-1 text-xs text-ink-400">{formatDateTime(n.createdAt)}</p>
              </div>
              <div className="flex shrink-0 gap-2 text-sm">
                {!n.isRead && (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={async () => {
                      await notificationsApi.markRead(n.id);
                      invalidate();
                    }}
                  >
                    Mark read
                  </button>
                )}
                <button
                  type="button"
                  className="btn-ghost text-red-600"
                  onClick={async () => {
                    await notificationsApi.remove(n.id);
                    invalidate();
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && data.pagination.totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button type="button" className="btn-secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <button type="button" className="btn-secondary" disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
