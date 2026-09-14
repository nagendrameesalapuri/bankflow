/**
 * The authoritative list of route keys the Chaos Control Panel may target.
 * Each string must exactly match what chaosMiddleware's routeKeyFor()
 * computes for that route (METHOD + baseUrl + route.path), since that is
 * the key looked up on every request.
 */
export const KNOWN_CHAOS_ROUTES: string[] = [
  'POST /api/auth/login',
  'POST /api/auth/verify-otp',
  'POST /api/auth/refresh',
  'GET /api/accounts/',
  'GET /api/accounts/:id',
  'GET /api/transactions/',
  'POST /api/transfers/quote',
  'POST /api/transfers/',
  'POST /api/transfers/:id/verify-otp',
  'GET /api/beneficiaries/',
  'POST /api/beneficiaries/verify-account',
  'POST /api/beneficiaries/',
  'POST /api/beneficiaries/confirm',
  'POST /api/payments/bills/lookup',
  'POST /api/payments/',
  'POST /api/payments/:id/verify-otp',
  'GET /api/cards/',
  'POST /api/cards/',
  'POST /api/statements/generate',
  'GET /api/statements/:id/download.pdf',
  'GET /api/statements/:id/download.csv',
  'GET /api/notifications/',
  'GET /api/profile/',
];
