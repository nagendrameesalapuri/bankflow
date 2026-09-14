import { apiClient } from './apiClient';
import type {
  Account,
  Beneficiary,
  Card,
  Challenge,
  ChaosRule,
  Notification,
  Paginated,
  Payment,
  Transaction,
} from '../types/api';

// ---- Accounts ----
export const accountsApi = {
  list: () => apiClient.get<{ data: Account[] }>('/accounts').then((r) => r.data.data),
  get: (id: string) =>
    apiClient.get<{ data: Account & { interest: { rate: number; accruedThisYear: number } } }>(`/accounts/${id}`).then((r) => r.data.data),
};

// ---- Transactions ----
export interface TransactionFilters {
  page?: number;
  limit?: number;
  accountId?: string;
  type?: string;
  status?: string;
  direction?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  q?: string;
  sort?: string;
}

export const transactionsApi = {
  search: (filters: TransactionFilters) =>
    apiClient.get<Paginated<Transaction>>('/transactions', { params: filters }).then((r) => r.data),
};

// ---- Transfers ----
export const transfersApi = {
  quote: (input: { fromAccountId: string; beneficiaryId: string; amount: number }) =>
    apiClient.post('/transfers/quote', input).then((r) => r.data.data),
  initiate: (input: { fromAccountId: string; beneficiaryId: string; amount: number; remarks?: string }) =>
    apiClient.post('/transfers', input).then((r) => r.data as { transferId: string; devOtp?: string; expiresInSeconds: number }),
  verifyOtp: (transferId: string, otp: string) =>
    apiClient.post(`/transfers/${transferId}/verify-otp`, { otp }).then((r) => r.data.data),
};

// ---- Beneficiaries ----
export interface AccountVerificationResult {
  verifiable: boolean;
  verified: boolean;
  message?: string;
  accountHolderName?: string;
  accountType?: string;
  bankName?: string;
}

export const beneficiariesApi = {
  list: () => apiClient.get<{ data: Beneficiary[] }>('/beneficiaries').then((r) => r.data.data),
  verifyAccount: (accountNumber: string, bankName: string) =>
    apiClient.post<{ data: AccountVerificationResult }>('/beneficiaries/verify-account', { accountNumber, bankName }).then((r) => r.data.data),
  initiate: (input: { name: string; nickname?: string; accountNumber: string; bankName: string; ifsc: string }) =>
    apiClient.post('/beneficiaries', input).then((r) => r.data as { otpId: string; devOtp?: string; expiresInSeconds: number }),
  confirm: (otp: string) => apiClient.post('/beneficiaries/confirm', { otp }).then((r) => r.data.data as Beneficiary),
  update: (id: string, fields: Partial<{ name: string; nickname: string; bankName: string; ifsc: string }>) =>
    apiClient.patch(`/beneficiaries/${id}`, fields).then((r) => r.data.data as Beneficiary),
  activate: (id: string) => apiClient.post(`/beneficiaries/${id}/activate`),
  deactivate: (id: string) => apiClient.post(`/beneficiaries/${id}/deactivate`),
  remove: (id: string) => apiClient.delete(`/beneficiaries/${id}`),
};

// ---- Payments ----
export const paymentsApi = {
  billers: (category?: string) =>
    apiClient.get('/payments/billers', { params: category ? { category } : undefined }).then((r) => r.data.data as Record<string, { id: string; name: string }[]>),
  lookupBill: (input: { category: string; billerId: string; consumerNumber: string }) =>
    apiClient.post('/payments/bills/lookup', input).then((r) => r.data.data),
  initiate: (input: { accountId: string; category: string; billerName: string; consumerNumber: string; amount: number }) =>
    apiClient.post('/payments', input).then((r) => r.data as { paymentId: string; devOtp?: string; expiresInSeconds: number }),
  verifyOtp: (paymentId: string, otp: string) => apiClient.post(`/payments/${paymentId}/verify-otp`, { otp }).then((r) => r.data.data),
  list: (page = 1, limit = 20) => apiClient.get<Paginated<Payment>>('/payments', { params: { page, limit } }).then((r) => r.data),
};

// ---- Cards ----
export const cardsApi = {
  list: () => apiClient.get<{ data: Card[] }>('/cards').then((r) => r.data.data),
  block: (id: string) => apiClient.post(`/cards/${id}/block`).then((r) => r.data.data as Card),
  unblock: (id: string) => apiClient.post(`/cards/${id}/unblock`).then((r) => r.data.data as Card),
  freeze: (id: string) => apiClient.post(`/cards/${id}/freeze`).then((r) => r.data.data as Card),
  changeLimit: (id: string, creditLimit: number) => apiClient.patch(`/cards/${id}/limit`, { creditLimit }).then((r) => r.data.data as Card),
  transactions: (id: string, page = 1, limit = 20) =>
    apiClient.get<Paginated<Transaction>>(`/cards/${id}/transactions`, { params: { page, limit } }).then((r) => r.data),
  requestCard: (input: { accountId: string; cardType: 'DEBIT' | 'CREDIT'; cardHolderName: string }) =>
    apiClient.post('/cards', input).then((r) => r.data.data as Card),
  updateControls: (id: string, controls: Partial<{ onlineEnabled: boolean; internationalEnabled: boolean }>) =>
    apiClient.patch(`/cards/${id}/controls`, controls).then((r) => r.data.data as Card),
  setPin: (id: string, pin: string, confirmPin: string) =>
    apiClient.post(`/cards/${id}/pin`, { pin, confirmPin }).then((r) => r.data as { message: string }),
};

// ---- Statements ----
export interface Statement {
  id: string;
  accountId: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  generatedAt: string;
}

export const statementsApi = {
  list: (accountId: string) => apiClient.get<{ data: Statement[] }>('/statements', { params: { accountId } }).then((r) => r.data.data),
  generate: (accountId: string, periodStart: string, periodEnd: string) =>
    apiClient.post<{ data: Statement }>('/statements/generate', { accountId, periodStart, periodEnd }).then((r) => r.data.data),
  downloadPath: (id: string, format: 'pdf' | 'csv') => `/statements/${id}/download.${format}`,
};

// ---- Notifications ----
export const notificationsApi = {
  list: (page = 1, limit = 20) =>
    apiClient
      .get<{ data: Notification[]; unreadCount: number; pagination: Paginated<Notification>['pagination'] }>('/notifications', {
        params: { page, limit },
      })
      .then((r) => r.data),
  markRead: (id: string) => apiClient.patch(`/notifications/${id}/read`),
  markAllRead: () => apiClient.patch('/notifications/read-all'),
  remove: (id: string) => apiClient.delete(`/notifications/${id}`),
};

// ---- Profile ----
export const profileApi = {
  get: () => apiClient.get('/profile').then((r) => r.data.data),
  update: (fields: { fullName?: string; address?: string }) => apiClient.patch('/profile', fields).then((r) => r.data.data),
  initiateSensitiveUpdate: (fields: { email?: string; phone?: string }) =>
    apiClient.post('/profile/sensitive-update/initiate', fields).then((r) => r.data as { otpId: string; devOtp?: string }),
  confirmSensitiveUpdate: (otp: string) => apiClient.post('/profile/sensitive-update/confirm', { otp }).then((r) => r.data.data),
  uploadPhoto: (file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return apiClient.post('/profile/photo', form).then((r) => r.data.data);
  },
  updatePreferences: (preferences: Record<string, unknown>) => apiClient.patch('/profile/preferences', preferences).then((r) => r.data.data),
  listDocuments: () => apiClient.get('/profile/documents').then((r) => r.data.data),
  uploadDocument: (file: File, docType: string) => {
    const form = new FormData();
    form.append('document', file);
    form.append('docType', docType);
    return apiClient.post('/profile/documents', form).then((r) => r.data.data);
  },
};

// ---- Security ----
export const securityApi = {
  sessions: () => apiClient.get('/security/sessions').then((r) => r.data.data),
  revokeSession: (id: string) => apiClient.delete(`/security/sessions/${id}`),
  logoutAll: () => apiClient.post('/security/logout-all'),
  loginHistory: () => apiClient.get('/security/login-history').then((r) => r.data.data),
  setMfa: (enabled: boolean) => apiClient.patch('/security/mfa', { enabled }),
};

// ---- Admin ----
export const adminApi = {
  stats: () => apiClient.get('/admin/stats').then((r) => r.data.data),
  systemHealth: () => apiClient.get('/admin/system-health').then((r) => r.data.data),
  users: (params: Record<string, unknown>) => apiClient.get('/admin/users', { params }).then((r) => r.data),
  createUser: (input: {
    username: string;
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    address?: string;
    role: 'CUSTOMER' | 'SUPPORT_AGENT' | 'ADMIN';
  }) => apiClient.post('/admin/users', input).then((r) => r.data.data),
  updateUser: (
    id: string,
    input: Partial<{ fullName: string; email: string; phone: string; address: string; role: 'CUSTOMER' | 'SUPPORT_AGENT' | 'ADMIN' }>,
  ) => apiClient.patch(`/admin/users/${id}`, input).then((r) => r.data.data),
  activateUser: (id: string) => apiClient.post(`/admin/users/${id}/activate`),
  deactivateUser: (id: string) => apiClient.post(`/admin/users/${id}/deactivate`),
  lockUser: (id: string) => apiClient.post(`/admin/users/${id}/lock`),
  unlockUser: (id: string) => apiClient.post(`/admin/users/${id}/unlock`),
  accounts: (params: Record<string, unknown>) => apiClient.get('/admin/accounts', { params }).then((r) => r.data),
  transactions: (params: Record<string, unknown>) => apiClient.get('/admin/transactions', { params }).then((r) => r.data),
  auditLogs: (params: Record<string, unknown>) => apiClient.get('/admin/audit-logs', { params }).then((r) => r.data),
};

// ---- Support ----
export const supportApi = {
  searchCustomers: (params: Record<string, unknown>) => apiClient.get('/support/customers', { params }).then((r) => r.data),
  getCustomer: (id: string) => apiClient.get(`/support/customers/${id}`).then((r) => r.data.data),
  getCustomerTransactions: (id: string, page = 1, limit = 20) =>
    apiClient.get(`/support/customers/${id}/transactions`, { params: { page, limit } }).then((r) => r.data),
};

// ---- Dev tools ----
export const devApi = {
  chaosRoutes: () => apiClient.get<{ data: ChaosRule[] }>('/dev/chaos-config').then((r) => r.data.data),
  upsertChaosRule: (rule: Partial<ChaosRule> & { routeKey: string }) => apiClient.put('/dev/chaos-config', rule).then((r) => r.data.data as ChaosRule),
  resetChaos: () => apiClient.post('/dev/chaos-config/reset'),
  resetEnvironment: () => apiClient.post('/dev/reset'),
  apiLabEndpoints: () => apiClient.get('/dev/api-lab/endpoints').then((r) => r.data.data),
  challenges: () => apiClient.get<{ data: Challenge[] }>('/dev/challenges').then((r) => r.data.data),
  resetChallenge: (id: number) => apiClient.post(`/dev/challenges/${id}/reset`),
};
