import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { accountsApi, paymentsApi } from '../services/resourceApis';
import { formatCurrency, formatDate } from '../utils/format';
import { getApiErrorMessage } from '../services/apiClient';
import { useToast } from '../context/ToastContext';
import { SkeletonRows } from '../components/ui/Skeleton';
import { StatusBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { IconReceipt } from '../components/ui/icons';

const CATEGORIES = ['ELECTRICITY', 'MOBILE', 'INTERNET', 'WATER', 'CREDIT_CARD', 'INSURANCE'];

type Step = 'category' | 'bill' | 'confirm' | 'otp' | 'receipt';

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const accountsQuery = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list });
  const historyQuery = useQuery({ queryKey: ['payments'], queryFn: () => paymentsApi.list(1, 10) });

  const [step, setStep] = useState<Step>('category');
  const [category, setCategory] = useState('');
  const [billers, setBillers] = useState<{ id: string; name: string }[]>([]);
  const [billerId, setBillerId] = useState('');
  const [consumerNumber, setConsumerNumber] = useState('');
  const [accountId, setAccountId] = useState('');
  const [bill, setBill] = useState<{ billerName: string; amountDue: number; dueDate: string } | null>(null);
  const [paymentId, setPaymentId] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<{ referenceNumber: string; amount: number } | null>(null);

  async function selectCategory(cat: string) {
    setCategory(cat);
    setError('');
    const result = await paymentsApi.billers(cat);
    setBillers(result[cat] ?? []);
    setStep('bill');
  }

  async function fetchBill(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const result = await paymentsApi.lookupBill({ category, billerId, consumerNumber });
      setBill(result);
      setStep('confirm');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmPayment() {
    if (!bill) return;
    setError('');
    setIsSubmitting(true);
    try {
      const biller = billers.find((b) => b.id === billerId);
      const result = await paymentsApi.initiate({
        accountId,
        category,
        billerName: biller?.name ?? bill.billerName,
        consumerNumber,
        amount: bill.amountDue,
      });
      setPaymentId(result.paymentId);
      setDevOtp(result.devOtp);
      setStep('otp');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const result = await paymentsApi.verifyOtp(paymentId, otp);
      setReceipt({ referenceNumber: result.transaction.referenceNumber, amount: result.transaction.amount });
      setStep('receipt');
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      showToast({ title: 'Payment successful', variant: 'success' });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Invalid OTP.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetFlow() {
    setStep('category');
    setCategory('');
    setBillerId('');
    setConsumerNumber('');
    setBill(null);
    setOtp('');
    setError('');
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <PageHeader title="Bill Payments" description="Pay your bills directly from your BankFlow account." tone="sunset" icon={<IconReceipt />} />

        <div className="card">
          {step === 'category' && (
            <div>
              <h2 className="mb-3 font-semibold text-ink-800">Select a category</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {CATEGORIES.map((cat) => (
                  <button key={cat} type="button" className="btn-secondary justify-center" onClick={() => selectCategory(cat)}>
                    {cat.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'bill' && (
            <form onSubmit={fetchBill} className="space-y-4">
              <h2 className="font-semibold text-ink-800">{category.replace('_', ' ')} bill</h2>
              <div>
                <label htmlFor="biller" className="label">
                  Biller
                </label>
                <select id="biller" required className="input" value={billerId} onChange={(e) => setBillerId(e.target.value)}>
                  <option value="">Select biller</option>
                  {billers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="consumerNumber" className="label">
                  Customer / account number
                </label>
                <input id="consumerNumber" required className="input" value={consumerNumber} onChange={(e) => setConsumerNumber(e.target.value)} />
              </div>
              <div>
                <label htmlFor="payAccount" className="label">
                  Pay from
                </label>
                <select id="payAccount" required className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                  <option value="">Select account</option>
                  {(accountsQuery.data ?? []).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountType} - {a.maskedAccountNumber}
                    </option>
                  ))}
                </select>
              </div>
              {error && <p role="alert" className="field-error">{error}</p>}
              <div className="flex gap-3">
                <button type="button" className="btn-secondary flex-1" onClick={() => setStep('category')}>
                  Back
                </button>
                <button type="submit" disabled={isSubmitting || !billerId || !accountId} className="btn-primary flex-1">
                  {isSubmitting ? 'Fetching bill...' : 'Fetch Bill'}
                </button>
              </div>
            </form>
          )}

          {step === 'confirm' && bill && (
            <div className="space-y-4">
              <h2 className="font-semibold text-ink-800">Confirm payment</h2>
              <dl className="space-y-2 text-sm">
                <Row label="Biller" value={bill.billerName} />
                <Row label="Customer number" value={consumerNumber} />
                <Row label="Amount due" value={formatCurrency(bill.amountDue)} />
                <Row label="Due date" value={formatDate(bill.dueDate)} />
              </dl>
              {error && <p role="alert" className="field-error">{error}</p>}
              <div className="flex gap-3">
                <button type="button" className="btn-secondary flex-1" onClick={() => setStep('bill')}>
                  Back
                </button>
                <button type="button" disabled={isSubmitting} className="btn-primary flex-1" onClick={confirmPayment}>
                  {isSubmitting ? 'Processing...' : 'Pay Now'}
                </button>
              </div>
            </div>
          )}

          {step === 'otp' && (
            <form onSubmit={verifyOtp} className="space-y-3">
              <h2 className="font-semibold text-ink-800">Verify OTP</h2>
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
                {isSubmitting ? 'Verifying...' : 'Verify & Pay'}
              </button>
            </form>
          )}

          {step === 'receipt' && receipt && (
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">✓</div>
              <h2 className="text-lg font-semibold text-ink-900">Payment successful</h2>
              <p className="mt-1 text-sm text-ink-500">
                {formatCurrency(receipt.amount)} - Ref: {receipt.referenceNumber}
              </p>
              <button type="button" className="btn-primary mt-4" onClick={resetFlow}>
                Make another payment
              </button>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-400">Recent Payments</h2>
        {historyQuery.isLoading ? (
          <SkeletonRows rows={4} cols={2} />
        ) : (historyQuery.data?.data.length ?? 0) === 0 ? (
          <EmptyState title="No payments yet" />
        ) : (
          <ul className="space-y-3">
            {historyQuery.data!.data.map((p) => (
              <li key={p.id} className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink-800">{p.billerName}</p>
                    <p className="text-xs text-ink-400">{formatDate(p.createdAt)}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <p className="mt-2 text-sm font-semibold text-ink-800">{formatCurrency(p.amount)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
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
