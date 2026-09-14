import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { profileApi } from '../services/resourceApis';
import { getApiErrorMessage } from '../services/apiClient';
import { useToast } from '../context/ToastContext';
import { Tabs } from '../components/ui/Tabs';
import { EmptyState } from '../components/ui/EmptyState';
import { formatDate } from '../utils/format';
import { PageHeader } from '../components/ui/PageHeader';
import { IconUser } from '../components/ui/icons';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [sensitiveStage, setSensitiveStage] = useState<'idle' | 'otp'>('idle');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [sensitiveOtp, setSensitiveOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | undefined>();
  const [sensitiveError, setSensitiveError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const docsQuery = useQuery({ queryKey: ['documents'], queryFn: profileApi.listDocuments });
  const docInputRef = useRef<HTMLInputElement>(null);
  const [docUploading, setDocUploading] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError('');
    setSavingProfile(true);
    try {
      const updated = await profileApi.update({ fullName, address });
      setUser(updated);
      showToast({ title: 'Profile updated', variant: 'success' });
    } catch (err) {
      setProfileError(getApiErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  }

  async function initiateSensitive(e: React.FormEvent) {
    e.preventDefault();
    setSensitiveError('');
    try {
      const result = await profileApi.initiateSensitiveUpdate({ email, phone: phone ?? undefined });
      setDevOtp(result.devOtp);
      setSensitiveStage('otp');
    } catch (err) {
      setSensitiveError(getApiErrorMessage(err));
    }
  }

  async function confirmSensitive(e: React.FormEvent) {
    e.preventDefault();
    setSensitiveError('');
    try {
      const updated = await profileApi.confirmSensitiveUpdate(sensitiveOtp);
      setUser(updated);
      setSensitiveStage('idle');
      setSensitiveOtp('');
      showToast({ title: 'Contact details updated', variant: 'success' });
    } catch (err) {
      setSensitiveError(getApiErrorMessage(err, 'Invalid OTP.'));
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const updated = await profileApi.uploadPhoto(file);
      setUser(updated);
      showToast({ title: 'Profile photo updated', variant: 'success' });
    } catch (err) {
      showToast({ title: 'Upload failed', description: getApiErrorMessage(err), variant: 'error' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDocumentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocUploading(true);
    try {
      await profileApi.uploadDocument(file, 'ADDRESS_PROOF');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      showToast({ title: 'Document submitted', description: 'Your document was uploaded for review.', variant: 'success' });
    } catch (err) {
      showToast({ title: 'Upload failed', description: getApiErrorMessage(err), variant: 'error' });
    } finally {
      setDocUploading(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Profile" description="Manage your personal information and preferences." tone="brand" icon={<IconUser />} />

      <div className="card mb-6 flex items-center gap-4">
        <div className="relative">
          {user?.profilePhotoUrl ? (
            <img
              src={`${import.meta.env.VITE_SOCKET_URL}${user.profilePhotoUrl}`}
              alt={`${user.fullName}'s profile photo`}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-xl font-semibold text-brand-700">
              {user?.fullName?.slice(0, 1)}
            </div>
          )}
        </div>
        <div>
          <p className="font-semibold text-ink-900">{user?.fullName}</p>
          <p className="text-sm text-ink-500">{user?.username}</p>
          <label htmlFor="photo-upload" className="btn-secondary mt-2 cursor-pointer text-xs">
            {uploading ? 'Uploading...' : 'Change photo'}
          </label>
          <input
            id="photo-upload"
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={handlePhotoChange}
          />
        </div>
      </div>

      <div className="card">
        <Tabs
          tabs={[
            {
              id: 'personal',
              label: 'Personal Information',
              content: (
                <form onSubmit={saveProfile} className="max-w-md space-y-3">
                  <div>
                    <label htmlFor="fullName" className="label">
                      Full name
                    </label>
                    <input id="fullName" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="address" className="label">
                      Address
                    </label>
                    <input id="address" className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
                  </div>
                  {profileError && <p role="alert" className="field-error">{profileError}</p>}
                  <button type="submit" disabled={savingProfile} className="btn-primary">
                    {savingProfile ? 'Saving...' : 'Save changes'}
                  </button>
                </form>
              ),
            },
            {
              id: 'contact',
              label: 'Contact Details',
              content: (
                <div className="max-w-md">
                  <p className="mb-3 text-xs text-ink-500">Changing your email or phone requires OTP verification.</p>
                  {sensitiveStage === 'idle' ? (
                    <form onSubmit={initiateSensitive} className="space-y-3">
                      <div>
                        <label htmlFor="email" className="label">
                          Email
                        </label>
                        <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
                      </div>
                      <div>
                        <label htmlFor="phone" className="label">
                          Phone
                        </label>
                        <input id="phone" className="input" value={phone ?? ''} onChange={(e) => setPhone(e.target.value)} />
                      </div>
                      {sensitiveError && <p role="alert" className="field-error">{sensitiveError}</p>}
                      <button type="submit" className="btn-primary">
                        Send OTP to confirm
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={confirmSensitive} className="space-y-3">
                      <input
                        aria-label="One-time passcode"
                        inputMode="numeric"
                        maxLength={6}
                        className="input text-center text-lg tracking-[0.4em]"
                        value={sensitiveOtp}
                        onChange={(e) => setSensitiveOtp(e.target.value.replace(/\D/g, ''))}
                      />
                      {devOtp && <p className="text-xs text-ink-400">Dev mode OTP: {devOtp}</p>}
                      {sensitiveError && <p role="alert" className="field-error">{sensitiveError}</p>}
                      <button type="submit" disabled={sensitiveOtp.length !== 6} className="btn-primary w-full">
                        Confirm
                      </button>
                    </form>
                  )}
                </div>
              ),
            },
            {
              id: 'documents',
              label: 'Documents',
              content: (
                <div>
                  <label htmlFor="doc-upload" className="btn-secondary cursor-pointer">
                    {docUploading ? 'Uploading...' : 'Upload a document'}
                  </label>
                  <input id="doc-upload" ref={docInputRef} type="file" accept="application/pdf,image/png,image/jpeg" className="sr-only" onChange={handleDocumentUpload} />
                  <p className="mt-1 text-xs text-ink-400">Used for fictional address/ID verification requests. PDF, PNG, or JPG, up to 10MB.</p>
                  <div className="mt-4">
                    {(docsQuery.data ?? []).length === 0 ? (
                      <EmptyState title="No documents submitted" />
                    ) : (
                      <ul className="space-y-2">
                        {docsQuery.data!.map((d: { id: string; originalFilename: string; docType: string; status: string; createdAt: string }) => (
                          <li key={d.id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-sm">
                            <span>{d.originalFilename}</span>
                            <span className="text-xs text-ink-400">{d.status} &middot; {formatDate(d.createdAt)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
