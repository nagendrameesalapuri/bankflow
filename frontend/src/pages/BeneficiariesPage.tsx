import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { beneficiariesApi, type AccountVerificationResult } from '../services/resourceApis';
import { getApiErrorMessage } from '../services/apiClient';
import { useToast } from '../context/ToastContext';
import { SkeletonRows } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/Badge';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import type { Beneficiary } from '../types/api';
import { PageHeader } from '../components/ui/PageHeader';
import { IconUsers } from '../components/ui/icons';

export default function BeneficiariesPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['beneficiaries'], queryFn: beneficiariesApi.list });

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Beneficiary | null>(null);

  const toggleStatus = useMutation({
    mutationFn: (b: Beneficiary) => (b.status === 'ACTIVE' ? beneficiariesApi.deactivate(b.id) : beneficiariesApi.activate(b.id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
      showToast({ title: 'Beneficiary updated', variant: 'success' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => beneficiariesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
      showToast({ title: 'Beneficiary deleted', variant: 'success' });
      setDeleteTarget(null);
    },
    onError: (err) => showToast({ title: 'Could not delete beneficiary', description: getApiErrorMessage(err), variant: 'error' }),
  });

  return (
    <div>
      <PageHeader
        title="Beneficiaries"
        description="Manage who you can send money to."
        tone="violet"
        icon={<IconUsers />}
        actions={
          <button type="button" className="btn-primary" onClick={() => setIsAddOpen(true)}>
            Add Beneficiary
          </button>
        }
      />

      {isLoading && <SkeletonRows rows={4} cols={3} />}
      {isError && <ErrorState message="Couldn't load beneficiaries." onRetry={() => refetch()} />}

      {data && data.length === 0 && (
        <EmptyState title="No beneficiaries yet" description="Add a beneficiary to start transferring money." action={<button className="btn-primary mt-2" onClick={() => setIsAddOpen(true)}>Add Beneficiary</button>} />
      )}

      {data && data.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((b) => (
            <div key={b.id} className="card" data-testid="beneficiary-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-ink-900">{b.nickname || b.name}</p>
                  {b.nickname && <p className="text-xs text-ink-400">{b.name}</p>}
                </div>
                <StatusBadge status={b.status} />
              </div>
              <p className="mt-2 text-sm text-ink-600">{b.bankName}</p>
              <p className="font-mono text-xs text-ink-400">{b.maskedAccountNumber}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <button type="button" className="btn-ghost" onClick={() => toggleStatus.mutate(b)}>
                  {b.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </button>
                <button type="button" className="btn-ghost text-red-600" onClick={() => setDeleteTarget(b)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddBeneficiaryModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete beneficiary"
        message={`Are you sure you want to remove "${deleteTarget?.nickname || deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && removeMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}

const BANK_OPTIONS = ['BankFlow', 'Northgrid Bank', 'MetroCity Bank', 'Union Trust Bank', 'Horizon Bank', 'Coastal Bank'];

function AddBeneficiaryModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [stage, setStage] = useState<'form' | 'otp'>('form');
  const [form, setForm] = useState({ name: '', nickname: '', accountNumber: '', bankName: '', ifsc: '' });
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [verification, setVerification] = useState<AccountVerificationResult | null>(null);
  const [verifyError, setVerifyError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  function reset() {
    setStage('form');
    setForm({ name: '', nickname: '', accountNumber: '', bankName: '', ifsc: '' });
    setOtp('');
    setError('');
    setVerification(null);
    setVerifyError('');
  }

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === 'accountNumber' || key === 'bankName') {
      setVerification(null);
      setVerifyError('');
    }
  }

  async function handleVerify() {
    if (!form.accountNumber || !form.bankName) return;
    setIsVerifying(true);
    setVerifyError('');
    try {
      const result = await beneficiariesApi.verifyAccount(form.accountNumber, form.bankName);
      setVerification(result);
      if (result.verified && result.accountHolderName && !form.name) {
        setForm((f) => ({ ...f, name: result.accountHolderName! }));
      }
    } catch (err) {
      setVerification(null);
      setVerifyError(getApiErrorMessage(err, 'Could not verify this account.'));
    } finally {
      setIsVerifying(false);
    }
  }

  const isBankFlow = form.bankName === 'BankFlow';
  const canSubmit = form.name && form.accountNumber && form.bankName && form.ifsc && (!isBankFlow || verification?.verified === true);

  async function handleInitiate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const result = await beneficiariesApi.initiate({ ...form, nickname: form.nickname.trim() || undefined });
      setDevOtp(result.devOtp);
      setStage('otp');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await beneficiariesApi.confirm(otp);
      queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
      showToast({ title: 'Beneficiary added', description: `${form.name} was added successfully.`, variant: 'success' });
      reset();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Invalid OTP.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      title={stage === 'form' ? 'Add Beneficiary' : 'Verify OTP'}
    >
      {stage === 'form' ? (
        <form onSubmit={handleInitiate} className="space-y-3">
          <div>
            <label htmlFor="ben-bank" className="label">
              Bank name
            </label>
            <select id="ben-bank" required className="input" value={form.bankName} onChange={(e) => updateField('bankName', e.target.value)}>
              <option value="">Select bank</option>
              {BANK_OPTIONS.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ben-account" className="label">
              Account number
            </label>
            <div className="flex gap-2">
              <input
                id="ben-account"
                required
                className="input"
                value={form.accountNumber}
                onChange={(e) => updateField('accountNumber', e.target.value)}
              />
              <button
                type="button"
                className="btn-secondary shrink-0"
                disabled={!form.accountNumber || !form.bankName || isVerifying}
                onClick={handleVerify}
              >
                {isVerifying ? 'Checking...' : 'Verify'}
              </button>
            </div>
            {isBankFlow && !verification && !verifyError && (
              <p className="mt-1 text-xs text-ink-400">BankFlow accounts must be verified before you can save this beneficiary.</p>
            )}
            {verifyError && (
              <p role="alert" className="field-error">
                {verifyError}
              </p>
            )}
            {verification?.verified && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-emerald-700" data-testid="account-verified">
                <span aria-hidden="true">✓</span>
                Verified: {verification.accountHolderName} ({verification.accountType?.replace('_', ' ')} account)
              </p>
            )}
            {verification && !verification.verified && (
              <p className="mt-1.5 text-xs font-medium text-amber-700" role="status">
                {verification.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="ben-name" className="label">
              Full name
            </label>
            <input
              id="ben-name"
              required
              className="input"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              readOnly={!!verification?.verified}
            />
          </div>
          <div>
            <label htmlFor="ben-nickname" className="label">
              Nickname (optional)
            </label>
            <input id="ben-nickname" className="input" value={form.nickname} onChange={(e) => updateField('nickname', e.target.value)} />
          </div>
          <div>
            <label htmlFor="ben-ifsc" className="label">
              IFSC code
            </label>
            <input
              id="ben-ifsc"
              required
              placeholder="HDFC0001234"
              className="input uppercase"
              value={form.ifsc}
              onChange={(e) => updateField('ifsc', e.target.value.toUpperCase())}
            />
          </div>
          {error && <p role="alert" className="field-error">{error}</p>}
          <button type="submit" disabled={isSubmitting || !canSubmit} className="btn-primary w-full">
            {isSubmitting ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleConfirm} className="space-y-3">
          <p className="text-sm text-ink-500">Enter the 6-digit code to confirm adding this beneficiary.</p>
          <input
            aria-label="One-time passcode"
            inputMode="numeric"
            maxLength={6}
            className="input text-center text-lg tracking-[0.4em]"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          />
          {devOtp && <p className="text-xs text-ink-400">Dev mode OTP: {devOtp}</p>}
          {error && <p role="alert" className="field-error">{error}</p>}
          <button type="submit" disabled={otp.length !== 6 || isSubmitting} className="btn-primary w-full">
            {isSubmitting ? 'Verifying...' : 'Confirm'}
          </button>
        </form>
      )}
    </Modal>
  );
}
