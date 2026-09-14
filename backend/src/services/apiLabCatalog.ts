export interface ApiLabEndpoint {
  method: string;
  path: string;
  chaosRouteKey: string | null;
  description: string;
  requiresRole: string;
  samplePayload?: Record<string, unknown>;
}

export const API_LAB_ENDPOINTS: ApiLabEndpoint[] = [
  { method: 'POST', path: '/api/auth/login', chaosRouteKey: 'POST /api/auth/login', description: 'Authenticate with username/password; returns an OTP challenge.', requiresRole: 'PUBLIC', samplePayload: { username: 'customer01', password: 'Test@123', rememberMe: false } },
  { method: 'GET', path: '/api/accounts', chaosRouteKey: 'GET /api/accounts/', description: 'List the authenticated customer\'s accounts.', requiresRole: 'CUSTOMER' },
  { method: 'GET', path: '/api/transactions', chaosRouteKey: 'GET /api/transactions/', description: 'Paginated, filterable transaction search.', requiresRole: 'CUSTOMER' },
  { method: 'POST', path: '/api/transfers/quote', chaosRouteKey: 'POST /api/transfers/quote', description: 'Validate a transfer and return a fee/total quote without moving money.', requiresRole: 'CUSTOMER', samplePayload: { fromAccountId: '<accountId>', beneficiaryId: '<beneficiaryId>', amount: 1000 } },
  { method: 'POST', path: '/api/transfers', chaosRouteKey: 'POST /api/transfers/', description: 'Create a pending transfer and trigger an OTP challenge.', requiresRole: 'CUSTOMER' },
  { method: 'GET', path: '/api/beneficiaries', chaosRouteKey: 'GET /api/beneficiaries/', description: 'List saved beneficiaries.', requiresRole: 'CUSTOMER' },
  { method: 'POST', path: '/api/beneficiaries', chaosRouteKey: 'POST /api/beneficiaries/', description: 'Start adding a beneficiary (requires OTP confirmation).', requiresRole: 'CUSTOMER', samplePayload: { name: 'Test Payee', accountNumber: '123456789012', bankName: 'Horizon Bank', ifsc: 'HDFC0001234' } },
  { method: 'GET', path: '/api/statements', chaosRouteKey: null, description: 'List previously generated statements for an account.', requiresRole: 'CUSTOMER' },
  { method: 'POST', path: '/api/payments', chaosRouteKey: 'POST /api/payments/', description: 'Initiate a bill payment (requires OTP confirmation).', requiresRole: 'CUSTOMER' },
  { method: 'GET', path: '/api/notifications', chaosRouteKey: 'GET /api/notifications/', description: 'List notifications and the unread count.', requiresRole: 'CUSTOMER' },
  { method: 'GET', path: '/api/admin/stats', chaosRouteKey: null, description: 'Aggregate admin dashboard statistics.', requiresRole: 'ADMIN' },
];
