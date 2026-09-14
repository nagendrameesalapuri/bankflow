import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/resourceApis';
import { getApiErrorMessage } from '../../services/apiClient';
import { useToast } from '../../context/ToastContext';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { StatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import type { User } from '../../types/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { IconUsers } from '../../components/ui/icons';

const ROLES: Array<User['role']> = ['CUSTOMER', 'SUPPORT_AGENT', 'ADMIN'];

interface UserAccountSummary {
  id: string;
  accountNumber: string;
  accountType: string;
}

type AdminUserRow = User & { accounts: UserAccountSummary[] };

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', { search: debouncedSearch, role, status, page }],
    queryFn: () => adminApi.users({ search: debouncedSearch || undefined, role: role || undefined, status: status || undefined, page, limit: 10 }),
    placeholderData: (prev) => prev,
  });

  function invalidateUsers() {
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
  }

  const mutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'activate' | 'deactivate' | 'lock' | 'unlock' }) => {
      if (action === 'activate') return adminApi.activateUser(id);
      if (action === 'deactivate') return adminApi.deactivateUser(id);
      if (action === 'lock') return adminApi.lockUser(id);
      return adminApi.unlockUser(id);
    },
    onSuccess: invalidateUsers,
  });

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage BankFlow user accounts."
        tone="violet"
        icon={<IconUsers />}
        actions={
          <button type="button" className="btn-primary" onClick={() => setIsCreateOpen(true)}>
            Create User
          </button>
        }
      />

      <div className="card mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input className="input" placeholder="Search by name, username, email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select className="input" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">All roles</option>
          <option value="CUSTOMER">Customer</option>
          <option value="SUPPORT_AGENT">Support Agent</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="LOCKED">Locked</option>
          <option value="DISABLED">Disabled</option>
        </select>
      </div>

      {isLoading ? (
        <SkeletonRows rows={8} cols={5} />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-100 text-left text-xs uppercase text-ink-400">
              <tr>
                <th scope="col" className="px-4 py-3">Name</th>
                <th scope="col" className="px-4 py-3">Username</th>
                <th scope="col" className="px-4 py-3">Role</th>
                <th scope="col" className="px-4 py-3">Account Number(s)</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {(data?.data as AdminUserRow[] | undefined ?? []).map((u) => (
                <tr key={u.id} data-testid="admin-user-row">
                  <td className="px-4 py-3 font-medium text-ink-800">{u.fullName}</td>
                  <td className="px-4 py-3 text-ink-600">{u.username}</td>
                  <td className="px-4 py-3 text-ink-600">{u.role}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-600" data-testid="admin-user-accounts">
                    {u.accounts.length === 0 ? (
                      <span className="text-ink-300">-</span>
                    ) : (
                      <div className="space-y-0.5">
                        {u.accounts.map((a) => (
                          <div key={a.id}>
                            {a.accountNumber} <span className="text-ink-400">({a.accountType})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-ghost text-xs" onClick={() => setEditTarget(u)}>
                        Edit
                      </button>
                      {u.status !== 'ACTIVE' && (
                        <button className="btn-ghost text-xs" onClick={() => mutation.mutate({ id: u.id, action: u.status === 'LOCKED' ? 'unlock' : 'activate' })}>
                          Activate
                        </button>
                      )}
                      {u.status === 'ACTIVE' && (
                        <>
                          <button className="btn-ghost text-xs" onClick={() => mutation.mutate({ id: u.id, action: 'lock' })}>
                            Lock
                          </button>
                          <button className="btn-ghost text-xs text-red-600" onClick={() => mutation.mutate({ id: u.id, action: 'deactivate' })}>
                            Deactivate
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-ink-100 px-4 py-3 text-sm text-ink-500">
            <span>Page {data?.pagination.page ?? 1} of {Math.max(1, data?.pagination.totalPages ?? 1)}</span>
            <div className="flex gap-2">
              <button className="btn-secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button className="btn-secondary" disabled={(data?.pagination.totalPages ?? 1) <= page} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        </div>
      )}

      <CreateUserModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={invalidateUsers}
      />

      {editTarget && (
        <EditUserModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onUpdated={() => {
            invalidateUsers();
            showToast({ title: 'User updated', variant: 'success' });
          }}
        />
      )}
    </div>
  );
}

interface CreatedUserResult {
  user: User;
  account: { id: string; accountNumber: string; accountType: string } | null;
}

function CreateUserModal({ isOpen, onClose, onCreated }: { isOpen: boolean; onClose: () => void; onCreated: () => void }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    phone: '',
    address: '',
    role: 'CUSTOMER' as User['role'],
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedUserResult | null>(null);

  function reset() {
    setForm({ username: '', email: '', password: '', fullName: '', phone: '', address: '', role: 'CUSTOMER' });
    setError('');
    setCreated(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const result = await adminApi.createUser({ ...form, phone: form.phone || undefined, address: form.address || undefined });
      onCreated();
      setCreated(result as CreatedUserResult);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyAccountNumber(accountNumber: string) {
    try {
      await navigator.clipboard.writeText(accountNumber);
      showToast({ title: 'Account number copied', variant: 'success' });
    } catch {
      showToast({ title: 'Could not copy to clipboard', variant: 'error' });
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      title={created ? 'User Created' : 'Create User'}
    >
      {created ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-emerald-50 p-3 text-emerald-800">
            <span aria-hidden="true">✓</span>
            <p className="text-sm">
              <strong>{created.user.fullName}</strong> (@{created.user.username}) was created as a {created.user.role.toLowerCase().replace('_', ' ')}.
            </p>
          </div>

          {created.account ? (
            <div>
              <p className="label">New account number</p>
              <div className="flex items-center gap-2">
                <span
                  className="flex-1 rounded-lg border border-ink-200 bg-ink-50 px-3 py-2.5 font-mono text-sm tracking-wide text-ink-900"
                  data-testid="new-account-number"
                >
                  {created.account.accountNumber}
                </span>
                <button type="button" className="btn-secondary shrink-0" onClick={() => copyAccountNumber(created.account!.accountNumber)}>
                  Copy
                </button>
              </div>
              <p className="mt-1 text-xs text-ink-400">{created.account.accountType.replace('_', ' ')} account, opened with a ₹0 balance.</p>
            </div>
          ) : (
            <p className="text-sm text-ink-500">No account was created for this role.</p>
          )}

          <button
            type="button"
            className="btn-primary w-full"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label htmlFor="new-username" className="label">Username</label>
            <input id="new-username" required className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div>
            <label htmlFor="new-email" className="label">Email</label>
            <input id="new-email" type="email" required className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label htmlFor="new-fullName" className="label">Full name</label>
            <input id="new-fullName" required className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div>
            <label htmlFor="new-password" className="label">Temporary password</label>
            <input id="new-password" type="password" required className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <p className="mt-1 text-xs text-ink-400">Min 8 characters, 1 uppercase letter, 1 number, 1 special character.</p>
          </div>
          <div>
            <label htmlFor="new-phone" className="label">Phone (optional)</label>
            <input id="new-phone" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label htmlFor="new-role" className="label">Role</label>
            <select id="new-role" className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as User['role'] })}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {form.role === 'CUSTOMER' && <p className="mt-1 text-xs text-ink-400">A default savings account will be created automatically.</p>}
          </div>
          {error && <p role="alert" className="field-error">{error}</p>}
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? 'Creating...' : 'Create User'}
          </button>
        </form>
      )}
    </Modal>
  );
}

function EditUserModal({ user, onClose, onUpdated }: { user: User; onClose: () => void; onUpdated: () => void }) {
  const [form, setForm] = useState({
    fullName: user.fullName,
    email: user.email,
    phone: user.phone ?? '',
    address: user.address ?? '',
    role: user.role,
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await adminApi.updateUser(user.id, { ...form, phone: form.phone || undefined, address: form.address || undefined });
      onUpdated();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={`Edit ${user.username}`}>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label htmlFor="edit-fullName" className="label">Full name</label>
          <input id="edit-fullName" required className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        </div>
        <div>
          <label htmlFor="edit-email" className="label">Email</label>
          <input id="edit-email" type="email" required className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label htmlFor="edit-phone" className="label">Phone</label>
          <input id="edit-phone" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <label htmlFor="edit-address" className="label">Address</label>
          <input id="edit-address" className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div>
          <label htmlFor="edit-role" className="label">Role</label>
          <select id="edit-role" className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as User['role'] })}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        {error && <p role="alert" className="field-error">{error}</p>}
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? 'Saving...' : 'Save changes'}
        </button>
      </form>
    </Modal>
  );
}
