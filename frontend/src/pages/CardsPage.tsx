import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accountsApi, cardsApi } from '../services/resourceApis';
import { formatCurrency } from '../utils/format';
import { getApiErrorMessage } from '../services/apiClient';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { SkeletonRows } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/Badge';
import { ConfirmDialog, Modal } from '../components/ui/Modal';
import type { Card } from '../types/api';
import { PageHeader } from '../components/ui/PageHeader';
import { IconCard } from '../components/ui/icons';

export default function CardsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['cards'], queryFn: cardsApi.list });

  const [confirmAction, setConfirmAction] = useState<{ card: Card; action: 'block' | 'unblock' | 'freeze' } | null>(null);
  const [limitCard, setLimitCard] = useState<Card | null>(null);
  const [pinCard, setPinCard] = useState<Card | null>(null);
  const [isRequestOpen, setIsRequestOpen] = useState(false);

  const actionMutation = useMutation({
    mutationFn: ({ card, action }: { card: Card; action: 'block' | 'unblock' | 'freeze' }) => {
      if (action === 'block') return cardsApi.block(card.id);
      if (action === 'unblock') return cardsApi.unblock(card.id);
      return cardsApi.freeze(card.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      showToast({ title: 'Card status updated', variant: 'success' });
      setConfirmAction(null);
    },
    onError: (err) => showToast({ title: 'Could not update card', description: getApiErrorMessage(err), variant: 'error' }),
  });

  const controlsMutation = useMutation({
    mutationFn: ({ id, controls }: { id: string; controls: Partial<{ onlineEnabled: boolean; internationalEnabled: boolean }> }) =>
      cardsApi.updateControls(id, controls),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cards'] }),
    onError: (err) => showToast({ title: 'Could not update card controls', description: getApiErrorMessage(err), variant: 'error' }),
  });

  return (
    <div>
      <PageHeader
        title="Cards"
        description="Manage your debit and credit cards."
        tone="violet"
        icon={<IconCard />}
        actions={
          <button type="button" className="btn-primary" onClick={() => setIsRequestOpen(true)}>
            Request New Card
          </button>
        }
      />

      {isLoading && <SkeletonRows rows={3} cols={3} />}
      {isError && <ErrorState message="Couldn't load your cards." onRetry={() => refetch()} />}
      {data && data.length === 0 && (
        <EmptyState
          title="No cards issued yet"
          description="Request your first debit or credit card to get started."
          action={
            <button type="button" className="btn-primary mt-2" onClick={() => setIsRequestOpen(true)}>
              Request New Card
            </button>
          }
        />
      )}

      {data && data.length > 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((card) => (
            <div key={card.id} className="overflow-hidden rounded-xl shadow-card" data-testid="card-tile">
              <div className={`p-5 text-white ${card.cardType === 'CREDIT' ? 'bg-gradient-to-br from-ink-800 to-ink-950' : 'bg-gradient-to-br from-brand-600 to-brand-800'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide opacity-80">{card.cardType} Card</span>
                  <StatusBadge status={card.status} />
                </div>
                <p className="mt-6 font-mono text-lg tracking-widest">{card.maskedCardNumber}</p>
                <div className="mt-4 flex items-center justify-between text-xs opacity-90">
                  <span>{card.cardHolderName}</span>
                  <span>
                    {String(card.expiryMonth).padStart(2, '0')}/{card.expiryYear}
                  </span>
                </div>
              </div>
              <div className="space-y-3 border border-t-0 border-ink-100 bg-white p-4">
                {card.cardType === 'CREDIT' && (
                  <p className="text-sm text-ink-600">Available limit: {formatCurrency(card.availableLimit ?? 0)} / {formatCurrency(card.creditLimit ?? 0)}</p>
                )}

                <div className="space-y-1.5 border-t border-ink-50 pt-2">
                  <ControlToggle
                    label="Online payments"
                    checked={card.onlineEnabled}
                    disabled={card.status !== 'ACTIVE' || controlsMutation.isPending}
                    onChange={(checked) => controlsMutation.mutate({ id: card.id, controls: { onlineEnabled: checked } })}
                  />
                  <ControlToggle
                    label="International usage"
                    checked={card.internationalEnabled}
                    disabled={card.status !== 'ACTIVE' || controlsMutation.isPending}
                    onChange={(checked) => controlsMutation.mutate({ id: card.id, controls: { internationalEnabled: checked } })}
                  />
                </div>

                <div className="flex flex-wrap gap-2 border-t border-ink-50 pt-2 text-sm">
                  {card.status !== 'BLOCKED' && (
                    <button type="button" className="btn-ghost text-red-600" onClick={() => setConfirmAction({ card, action: 'block' })}>
                      Block
                    </button>
                  )}
                  {card.status !== 'ACTIVE' && (
                    <button type="button" className="btn-ghost text-emerald-700" onClick={() => setConfirmAction({ card, action: 'unblock' })}>
                      Unblock
                    </button>
                  )}
                  {card.status === 'ACTIVE' && (
                    <button type="button" className="btn-ghost" onClick={() => setConfirmAction({ card, action: 'freeze' })}>
                      Freeze
                    </button>
                  )}
                  {card.cardType === 'CREDIT' && (
                    <button type="button" className="btn-ghost" onClick={() => setLimitCard(card)}>
                      Change limit
                    </button>
                  )}
                  <button type="button" className="btn-ghost" disabled={card.status !== 'ACTIVE'} onClick={() => setPinCard(card)}>
                    {card.hasPinSet ? 'Change PIN' : 'Set PIN'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmAction}
        title={`${confirmAction?.action === 'block' ? 'Block' : confirmAction?.action === 'unblock' ? 'Unblock' : 'Freeze'} card`}
        message={`This card ending in ${confirmAction?.card.maskedCardNumber.slice(-4)} will be ${confirmAction?.action === 'unblock' ? 'reactivated' : `${confirmAction?.action}ed`}. Continue?`}
        confirmLabel="Confirm"
        danger={confirmAction?.action === 'block'}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && actionMutation.mutate(confirmAction)}
      />

      {limitCard && <ChangeLimitModal card={limitCard} onClose={() => setLimitCard(null)} />}
      {pinCard && <SetPinModal card={pinCard} onClose={() => setPinCard(null)} />}
      <RequestCardModal isOpen={isRequestOpen} onClose={() => setIsRequestOpen(false)} />
    </div>
  );
}

function ControlToggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between text-sm text-ink-700">
      <span>{label}</span>
      <span className="relative inline-flex h-5 w-9 items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="absolute inset-0 rounded-full bg-ink-200 transition-colors peer-checked:bg-brand-600 peer-disabled:opacity-50" />
        <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

function ChangeLimitModal({ card, onClose }: { card: Card; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [limit, setLimit] = useState(String(card.creditLimit ?? ''));
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await cardsApi.changeLimit(card.id, Number(limit));
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      showToast({ title: 'Card limit updated', variant: 'success' });
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Change credit limit">
      <form onSubmit={onSubmit} className="space-y-3">
        <label htmlFor="limit" className="label">
          New credit limit (INR)
        </label>
        <input id="limit" type="number" min={1000} max={1000000} required className="input" value={limit} onChange={(e) => setLimit(e.target.value)} />
        {error && <p role="alert" className="field-error">{error}</p>}
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? 'Saving...' : 'Save'}
        </button>
      </form>
    </Modal>
  );
}

function SetPinModal({ card, onClose }: { card: Card; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (pin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      await cardsApi.setPin(card.id, pin, confirmPin);
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      showToast({ title: 'Card PIN updated', variant: 'success' });
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={`${card.hasPinSet ? 'Change' : 'Set'} PIN - ${card.maskedCardNumber}`}>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label htmlFor="new-pin" className="label">
            New 4-digit PIN
          </label>
          <input
            id="new-pin"
            inputMode="numeric"
            maxLength={4}
            required
            className="input text-center text-lg tracking-[0.5em]"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          />
        </div>
        <div>
          <label htmlFor="confirm-pin" className="label">
            Confirm PIN
          </label>
          <input
            id="confirm-pin"
            inputMode="numeric"
            maxLength={4}
            required
            className="input text-center text-lg tracking-[0.5em]"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
          />
        </div>
        {error && <p role="alert" className="field-error">{error}</p>}
        <button type="submit" disabled={isSubmitting || pin.length !== 4 || confirmPin.length !== 4} className="btn-primary w-full">
          {isSubmitting ? 'Saving...' : 'Save PIN'}
        </button>
      </form>
    </Modal>
  );
}

function RequestCardModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const accountsQuery = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list, enabled: isOpen });

  const [accountId, setAccountId] = useState('');
  const [cardType, setCardType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [cardHolderName, setCardHolderName] = useState(user?.fullName ?? '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await cardsApi.requestCard({ accountId, cardType, cardHolderName });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      showToast({ title: 'New card issued', description: `Your ${cardType.toLowerCase()} card is ready to use.`, variant: 'success' });
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request New Card">
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label htmlFor="card-account" className="label">
            Linked account
          </label>
          <select id="card-account" required className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Select account</option>
            {(accountsQuery.data ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.accountType} - {a.maskedAccountNumber}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="card-type" className="label">
            Card type
          </label>
          <select id="card-type" className="input" value={cardType} onChange={(e) => setCardType(e.target.value as 'DEBIT' | 'CREDIT')}>
            <option value="DEBIT">Debit Card</option>
            <option value="CREDIT">Credit Card</option>
          </select>
        </div>
        <div>
          <label htmlFor="card-holder" className="label">
            Cardholder name
          </label>
          <input id="card-holder" required className="input" value={cardHolderName} onChange={(e) => setCardHolderName(e.target.value)} />
        </div>
        {error && <p role="alert" className="field-error">{error}</p>}
        <button type="submit" disabled={isSubmitting || !accountId} className="btn-primary w-full">
          {isSubmitting ? 'Requesting...' : 'Request Card'}
        </button>
      </form>
    </Modal>
  );
}
