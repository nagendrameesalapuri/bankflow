import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { accountsApi, beneficiariesApi, transfersApi } from '../services/resourceApis';
import { formatCurrency } from '../utils/format';
import { getAccessToken, getApiErrorMessage } from '../services/apiClient';
import { useToast } from '../context/ToastContext';
import { SkeletonRows } from '../components/ui/Skeleton';
import { PageHeader } from '../components/ui/PageHeader';
import { IconTransfer } from '../components/ui/icons';

type Step = 'form' | 'review' | 'otp' | 'success';

export default function TransferPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const accountsQuery = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list });
  const beneficiariesQuery = useQuery({ queryKey: ['beneficiaries'], queryFn: beneficiariesApi.list });

  const [step, setStep] = useState<Step>('form');
  const [fromAccountId, setFromAccountId] = useState('');
  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [quote, setQuote] = useState<{ fromAccount: { availableBalance: number }; beneficiary: { name: string; bankName: string }; total: number } | null>(null);
  const [transferId, setTransferId] = useState('');
  const [devOtp, setDevOtp] = useState<string | undefined>();
  const [expiresIn, setExpiresIn] = useState(120);
  const [successTx, setSuccessTx] = useState<{ referenceNumber: string; amount: number } | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.source !== 'bankflow-otp-frame') return;
      if (event.data.status === 'success') {
        const tx = event.data.payload?.transaction;
        setSuccessTx(tx ? { referenceNumber: tx.referenceNumber, amount: tx.amount } : null);
        setStep('success');
        showToast({ title: 'Transfer successful', description: `${formatCurrency(tx?.amount ?? 0)} sent successfully.`, variant: 'success' });
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [queryClient, showToast]);

  async function handleReview(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const q = await transfersApi.quote({ fromAccountId, beneficiaryId, amount: Number(amount) });
      setQuote(q);
      setStep('review');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to process this transfer.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirm() {
    setError('');
    setIsSubmitting(true);
    try {
      const result = await transfersApi.initiate({ fromAccountId, beneficiaryId, amount: Number(amount), remarks: remarks || undefined });
      setTransferId(result.transferId);
      setDevOtp(result.devOtp);
      setExpiresIn(result.expiresInSeconds);
      setStep('otp');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to process this transfer.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (accountsQuery.isLoading || beneficiariesQuery.isLoading) return <SkeletonRows rows={4} cols={2} />;

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Transfer Money" description="Send money to a saved beneficiary." tone="brand" icon={<IconTransfer />} />

      <ol className="mb-6 flex gap-2 text-xs font-medium text-ink-400" aria-label="Progress">
        {['Details', 'Review', 'Verify', 'Done'].map((label, idx) => {
          const stepIndex = ['form', 'review', 'otp', 'success'].indexOf(step);
          return (
            <li key={label} className={`flex-1 rounded-full border-b-2 pb-2 text-center ${idx <= stepIndex ? 'border-brand-600 text-brand-700' : 'border-ink-200'}`}>
              {label}
            </li>
          );
        })}
      </ol>

      {step === 'form' && (
        <form onSubmit={handleReview} className="card space-y-4">
          <div>
            <label htmlFor="fromAccount" className="label">
              From account
            </label>
            <select id="fromAccount" required className="input" value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)}>
              <option value="">Select an account</option>
              {(accountsQuery.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.accountType} - {a.maskedAccountNumber} ({formatCurrency(a.availableBalance)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="beneficiary" className="label">
              Beneficiary
            </label>
            <select id="beneficiary" required className="input" value={beneficiaryId} onChange={(e) => setBeneficiaryId(e.target.value)}>
              <option value="">Select a beneficiary</option>
              {(beneficiariesQuery.data ?? []).map((b) => (
                <option key={b.id} value={b.id} disabled={b.status !== 'ACTIVE'}>
                  {b.nickname || b.name} - {b.bankName} {b.status !== 'ACTIVE' ? '(inactive)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="amount" className="label">
              Amount (INR)
            </label>
            <input id="amount" type="number" min="1" step="0.01" required className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label htmlFor="remarks" className="label">
              Remarks (optional)
            </label>
            <input id="remarks" className="input" maxLength={200} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
          {error && <p role="alert" className="field-error">{error}</p>}
          <button type="submit" disabled={isSubmitting || !fromAccountId || !beneficiaryId || !amount} className="btn-primary w-full">
            {isSubmitting ? 'Checking...' : 'Review Transfer'}
          </button>
        </form>
      )}

      {step === 'review' && quote && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-ink-800">Review your transfer</h2>
          <dl className="space-y-2 text-sm">
            <Row label="To" value={`${quote.beneficiary.name} (${quote.beneficiary.bankName})`} />
            <Row label="Amount" value={formatCurrency(Number(amount))} />
            <Row label="Fee" value={formatCurrency(0)} />
            <Row label="Total debit" value={formatCurrency(quote.total)} />
            <Row label="Available balance" value={formatCurrency(quote.fromAccount.availableBalance)} />
          </dl>
          {error && <p role="alert" className="field-error">{error}</p>}
          <div className="flex gap-3">
            <button type="button" className="btn-secondary flex-1" onClick={() => setStep('form')}>
              Back
            </button>
            <button type="button" className="btn-primary flex-1" disabled={isSubmitting} onClick={handleConfirm}>
              {isSubmitting ? 'Processing...' : 'Confirm & Send OTP'}
            </button>
          </div>
        </div>
      )}

      {step === 'otp' && (
        <div className="card">
          <h2 className="mb-1 font-semibold text-ink-800">Verify to complete your transfer</h2>
          <p className="mb-4 text-sm text-ink-500">
            Complete verification below (code expires in {expiresIn}s). This step runs inside a secure embedded frame.
          </p>
          <iframe
            title="Secure OTP Verification"
            data-testid="otp-iframe"
            src={`/embedded/otp-verify?kind=transfer&refId=${transferId}&token=${encodeURIComponent(getAccessToken() ?? '')}${
              devOtp ? `&devOtp=${devOtp}` : ''
            }`}
            className="h-80 w-full rounded-lg border border-ink-100"
          />
        </div>
      )}

      {step === 'success' && (
        <div className="card text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">✓</div>
          <h2 className="text-lg font-semibold text-ink-900">Transfer successful</h2>
          <p className="mt-1 text-sm text-ink-500">
            {successTx ? `${formatCurrency(successTx.amount)} - Ref: ${successTx.referenceNumber}` : 'Your transfer has been completed.'}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button type="button" className="btn-secondary" onClick={() => navigate('/transactions')}>
              View Transactions
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setStep('form');
                setAmount('');
                setRemarks('');
                setQuote(null);
              }}
            >
              New Transfer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-ink-50 pb-2">
      <dt className="text-ink-500">{label}</dt>
      <dd className="font-medium text-ink-800">{value}</dd>
    </div>
  );
}
