/**
 * Hand-authored OpenAPI 3.0 spec for the BankFlow API, kept in sync manually
 * with backend/src/routes + backend/src/validators (there's no runtime
 * introspection tying this to the Express routers, so a new/changed route
 * needs its doc entry updated here too). Served at /api/docs (Swagger UI)
 * and /api/docs.json (raw spec) - see app.ts.
 *
 * Response bodies for read endpoints are described loosely
 * (additionalProperties: true) since the exact DB-shaped fields are large
 * and change independently of the contract that matters for API testing:
 * status codes, the { data: ... } / { error: ... } envelope, and request
 * validation. Auth/OTP/transfer flows - the parts most exercised by the
 * Challenge Lab and API Testing Lab - are typed precisely.
 */

const errorSchema = {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'VALIDATION_ERROR' },
        message: { type: 'string', example: 'Request validation failed' },
        details: {
          type: 'array',
          nullable: true,
          items: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
      required: ['code', 'message'],
    },
  },
};

const dataEnvelope = (itemSchema: Record<string, unknown> = { type: 'object', additionalProperties: true }) => ({
  type: 'object',
  properties: { data: itemSchema },
});

const paginatedEnvelope = (itemSchema: Record<string, unknown> = { type: 'object', additionalProperties: true }) => ({
  type: 'object',
  properties: {
    data: { type: 'array', items: itemSchema },
    page: { type: 'integer', example: 1 },
    limit: { type: 'integer', example: 20 },
    total: { type: 'integer', example: 42 },
  },
});

const idParam = (name: string, description: string) => ({
  name,
  in: 'path' as const,
  required: true,
  description,
  schema: { type: 'string', format: 'uuid' },
});

const pageParam = { name: 'page', in: 'query' as const, schema: { type: 'integer', minimum: 1, default: 1 } };
const limitParam = {
  name: 'limit',
  in: 'query' as const,
  schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
};

const responses = {
  400: { description: 'Bad request', content: { 'application/json': { schema: errorSchema } } },
  401: { description: 'Missing/invalid/expired session', content: { 'application/json': { schema: errorSchema } } },
  403: { description: 'Authenticated but not permitted for this role', content: { 'application/json': { schema: errorSchema } } },
  404: { description: 'Not found', content: { 'application/json': { schema: errorSchema } } },
  422: { description: 'Validation failed', content: { 'application/json': { schema: errorSchema } } },
  429: { description: 'Rate limited / too many attempts', content: { 'application/json': { schema: errorSchema } } },
};

function op(opts: {
  summary: string;
  tags: string[];
  security?: boolean;
  params?: unknown[];
  requestBody?: Record<string, unknown>;
  responseSchema?: Record<string, unknown>;
  status?: number;
  extraResponses?: number[];
  noContent?: boolean;
}) {
  const status = opts.status ?? 200;
  const successResponse = opts.noContent
    ? { description: 'No content' }
    : {
        description: 'Success',
        content: { 'application/json': { schema: opts.responseSchema ?? { type: 'object', additionalProperties: true } } },
      };
  const extra = Object.fromEntries((opts.extraResponses ?? [400, 401, 422]).map((code) => [code, (responses as Record<number, unknown>)[code]]));
  return {
    summary: opts.summary,
    tags: opts.tags,
    security: opts.security === false ? [] : [{ bearerAuth: [] }],
    ...(opts.params ? { parameters: opts.params } : {}),
    ...(opts.requestBody
      ? { requestBody: { required: true, content: { 'application/json': { schema: opts.requestBody } } } }
      : {}),
    responses: { [status]: successResponse, ...extra },
  };
}

const otpResponseSchema = {
  type: 'object',
  properties: {
    otpId: { type: 'string' },
    expiresInSeconds: { type: 'integer', example: 120 },
    devOtp: {
      type: 'string',
      nullable: true,
      description:
        'The 6-digit code, echoed back because this demo has no real SMS/email provider. Present whenever EXPOSE_DEV_OTP=true (the default).',
      example: '482913',
    },
  },
};

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'BankFlow API',
    version: '1.0.0',
    description:
      'API for BankFlow, a fictional demo banking application built for advanced Playwright/browser-automation practice. ' +
      'No real funds, accounts, or OTP delivery are ever involved - OTP codes are always echoed back in the API response ' +
      'as `devOtp` (see EXPOSE_DEV_OTP). All amounts are in INR.',
    contact: { name: 'BankFlow (demo project)' },
  },
  servers: [
    { url: '/api', description: 'Relative to whichever origin is serving this spec' },
  ],
  tags: [
    { name: 'Auth', description: 'Login, OTP verification, token refresh, password management' },
    { name: 'Accounts', description: 'Customer bank accounts' },
    { name: 'Transactions', description: 'Unified transaction history/search' },
    { name: 'Transfers', description: 'Internal/external money transfers (quote -> initiate -> OTP verify)' },
    { name: 'Beneficiaries', description: 'Saved transfer recipients (add requires OTP confirmation)' },
    { name: 'Payments', description: 'Bill payments (billers, lookup, pay)' },
    { name: 'Cards', description: 'Debit/credit card management' },
    { name: 'Statements', description: 'Generate and download PDF/CSV account statements' },
    { name: 'Notifications', description: 'In-app notifications, also pushed live over Socket.IO' },
    { name: 'Profile', description: "The signed-in user's profile, photo, documents, preferences" },
    { name: 'Security', description: 'Sessions, login history, MFA settings' },
    { name: 'Admin', description: 'Admin-only: user/account/transaction management, audit logs' },
    { name: 'Support', description: 'Support-agent/admin read-only customer lookup' },
    { name: 'Dev Tools', description: 'Chaos Mode, environment reset, API Lab, Challenge Lab (disabled in production)' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token returned from /auth/login or /auth/verify-otp. The refresh token lives in an httpOnly cookie, never sent in a header.',
      },
    },
    schemas: { Error: errorSchema },
  },
  paths: {
    // ---------- AUTH ----------
    '/auth/login': {
      post: op({
        summary: 'Log in with username/email + password',
        tags: ['Auth'],
        security: false,
        requestBody: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', example: 'customer01' },
            password: { type: 'string', example: 'Test@123' },
            rememberMe: { type: 'boolean', default: false },
          },
        },
        responseSchema: {
          oneOf: [
            {
              type: 'object',
              description: 'MFA required (default) - proceed to /auth/verify-otp',
              properties: {
                requiresOtp: { type: 'boolean', example: true },
                loginToken: { type: 'string' },
                expiresInSeconds: { type: 'integer', example: 120 },
                devOtp: { type: 'string', nullable: true, example: '482913' },
              },
            },
            {
              type: 'object',
              description: 'MFA disabled for this account - logged in immediately',
              properties: {
                requiresOtp: { type: 'boolean', example: false },
                accessToken: { type: 'string' },
                user: { type: 'object', additionalProperties: true },
              },
            },
          ],
        },
        extraResponses: [401, 422, 429],
      }),
    },
    '/auth/verify-otp': {
      post: op({
        summary: 'Complete login by verifying the OTP sent after /auth/login',
        tags: ['Auth'],
        security: false,
        requestBody: {
          type: 'object',
          required: ['loginToken', 'otp'],
          properties: {
            loginToken: { type: 'string' },
            otp: { type: 'string', minLength: 6, maxLength: 6, example: '482913' },
          },
        },
        responseSchema: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            user: { type: 'object', additionalProperties: true },
          },
        },
        extraResponses: [400, 401, 422, 429],
      }),
    },
    '/auth/resend-otp': {
      post: op({
        summary: 'Resend the login OTP for an in-progress login',
        tags: ['Auth'],
        security: false,
        requestBody: { type: 'object', required: ['loginToken'], properties: { loginToken: { type: 'string' } } },
        responseSchema: otpResponseSchema,
      }),
    },
    '/auth/refresh': {
      post: op({
        summary: 'Exchange the httpOnly refresh-token cookie for a new access token',
        tags: ['Auth'],
        security: false,
        responseSchema: { type: 'object', properties: { accessToken: { type: 'string' } } },
        extraResponses: [401],
      }),
    },
    '/auth/logout': {
      post: op({ summary: 'Log out the current session and clear the refresh cookie', tags: ['Auth'], noContent: true, status: 204, extraResponses: [401] }),
    },
    '/auth/forgot-password': {
      post: op({
        summary: 'Request a password reset (dev token echoed back, no real email sent)',
        tags: ['Auth'],
        security: false,
        requestBody: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } },
        responseSchema: {
          type: 'object',
          properties: { message: { type: 'string' }, devResetToken: { type: 'string', nullable: true } },
        },
      }),
    },
    '/auth/reset-password': {
      post: op({
        summary: 'Reset password using a token from /auth/forgot-password',
        tags: ['Auth'],
        security: false,
        requestBody: {
          type: 'object',
          required: ['token', 'newPassword'],
          properties: { token: { type: 'string' }, newPassword: { type: 'string', format: 'password', example: 'NewPass@123' } },
        },
        responseSchema: { type: 'object', properties: { message: { type: 'string' } } },
      }),
    },
    '/auth/change-password': {
      post: op({
        summary: 'Change password for the signed-in user',
        tags: ['Auth'],
        requestBody: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: { currentPassword: { type: 'string', format: 'password' }, newPassword: { type: 'string', format: 'password' } },
        },
        responseSchema: { type: 'object', properties: { message: { type: 'string' } } },
      }),
    },

    // ---------- ACCOUNTS ----------
    '/accounts': {
      get: op({ summary: "List the signed-in customer's accounts", tags: ['Accounts'], responseSchema: dataEnvelope({ type: 'array', items: { type: 'object', additionalProperties: true } }) }),
    },
    '/accounts/{id}': {
      get: op({ summary: 'Get one account by id', tags: ['Accounts'], params: [idParam('id', 'Account id')], responseSchema: dataEnvelope(), extraResponses: [401, 403, 404] }),
    },

    // ---------- TRANSACTIONS ----------
    '/transactions': {
      get: op({
        summary: 'Search/paginate transactions (CUSTOMER sees own, SUPPORT_AGENT can look up any)',
        tags: ['Transactions'],
        params: [
          pageParam,
          limitParam,
          { name: 'accountId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['TRANSFER', 'PAYMENT', 'DEPOSIT', 'WITHDRAWAL', 'FEE', 'INTEREST'] } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['SUCCESS', 'PENDING', 'FAILED', 'REVERSED'] } },
          { name: 'direction', in: 'query', schema: { type: 'string', enum: ['DEBIT', 'CREDIT'] } },
          { name: 'dateFrom', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'dateTo', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'amountMin', in: 'query', schema: { type: 'number' } },
          { name: 'amountMax', in: 'query', schema: { type: 'number' } },
          { name: 'q', in: 'query', description: 'Free-text search (reference number, remarks, etc.)', schema: { type: 'string' } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['date_desc', 'date_asc', 'amount_desc', 'amount_asc'], default: 'date_desc' } },
        ],
        responseSchema: paginatedEnvelope(),
      }),
    },

    // ---------- TRANSFERS ----------
    '/transfers/quote': {
      post: op({
        summary: 'Get a fee/ETA quote for a transfer without executing it',
        tags: ['Transfers'],
        requestBody: {
          type: 'object',
          required: ['fromAccountId', 'beneficiaryId', 'amount'],
          properties: {
            fromAccountId: { type: 'string', format: 'uuid' },
            beneficiaryId: { type: 'string', format: 'uuid' },
            amount: { type: 'number', exclusiveMinimum: 0, example: 2500 },
            remarks: { type: 'string', maxLength: 200 },
          },
        },
        responseSchema: dataEnvelope(),
      }),
    },
    '/transfers': {
      post: op({
        summary: 'Initiate a transfer (returns requiresOtp - confirm via /transfers/{id}/verify-otp)',
        tags: ['Transfers'],
        status: 202,
        requestBody: {
          type: 'object',
          required: ['fromAccountId', 'beneficiaryId', 'amount'],
          properties: {
            fromAccountId: { type: 'string', format: 'uuid' },
            beneficiaryId: { type: 'string', format: 'uuid' },
            amount: { type: 'number', exclusiveMinimum: 0, example: 2500 },
            remarks: { type: 'string', maxLength: 200 },
          },
        },
        responseSchema: {
          type: 'object',
          properties: {
            requiresOtp: { type: 'boolean', example: true },
            transferId: { type: 'string' },
            expiresInSeconds: { type: 'integer' },
            devOtp: { type: 'string', nullable: true },
          },
        },
        extraResponses: [400, 401, 422],
      }),
    },
    '/transfers/{id}/verify-otp': {
      post: op({
        summary: 'Confirm a transfer with the OTP, executing the debit/credit',
        tags: ['Transfers'],
        params: [idParam('id', 'Transfer id returned from POST /transfers')],
        requestBody: { type: 'object', required: ['otp'], properties: { otp: { type: 'string', minLength: 6, maxLength: 6 } } },
        responseSchema: dataEnvelope(),
        extraResponses: [400, 401, 404, 422, 429],
      }),
    },

    // ---------- BENEFICIARIES ----------
    '/beneficiaries': {
      get: op({ summary: 'List saved beneficiaries', tags: ['Beneficiaries'], responseSchema: dataEnvelope({ type: 'array', items: { type: 'object', additionalProperties: true } }) }),
      post: op({
        summary: 'Start adding a beneficiary (returns requiresOtp - confirm via /beneficiaries/confirm)',
        tags: ['Beneficiaries'],
        requestBody: {
          type: 'object',
          required: ['name', 'accountNumber', 'bankName', 'ifsc'],
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100 },
            nickname: { type: 'string', maxLength: 50 },
            accountNumber: { type: 'string', minLength: 6, maxLength: 20 },
            bankName: { type: 'string', minLength: 2, maxLength: 100 },
            ifsc: { type: 'string', pattern: '^[A-Z]{4}0[A-Z0-9]{6}$', example: 'HDFC0001234' },
          },
        },
        responseSchema: otpResponseSchema,
      }),
    },
    '/beneficiaries/verify-account': {
      post: op({
        summary: 'Check whether an account number belongs to a real BankFlow account before saving it as a beneficiary',
        tags: ['Beneficiaries'],
        requestBody: {
          type: 'object',
          required: ['accountNumber', 'bankName'],
          properties: { accountNumber: { type: 'string' }, bankName: { type: 'string' } },
        },
        responseSchema: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                valid: { type: 'boolean' },
                accountHolderName: { type: 'string', nullable: true },
              },
            },
          },
        },
      }),
    },
    '/beneficiaries/confirm': {
      post: op({
        summary: 'Confirm adding a beneficiary with the OTP from POST /beneficiaries',
        tags: ['Beneficiaries'],
        requestBody: { type: 'object', required: ['otp'], properties: { otp: { type: 'string', minLength: 6, maxLength: 6 } } },
        responseSchema: dataEnvelope(),
      }),
    },
    '/beneficiaries/{id}': {
      patch: op({
        summary: 'Update a beneficiary',
        tags: ['Beneficiaries'],
        params: [idParam('id', 'Beneficiary id')],
        requestBody: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            nickname: { type: 'string' },
            bankName: { type: 'string' },
            ifsc: { type: 'string' },
          },
        },
        responseSchema: dataEnvelope(),
      }),
      delete: op({ summary: 'Delete a beneficiary', tags: ['Beneficiaries'], params: [idParam('id', 'Beneficiary id')], noContent: true, status: 204 }),
    },
    '/beneficiaries/{id}/activate': {
      post: op({ summary: 'Reactivate a deactivated beneficiary', tags: ['Beneficiaries'], params: [idParam('id', 'Beneficiary id')], responseSchema: dataEnvelope() }),
    },
    '/beneficiaries/{id}/deactivate': {
      post: op({ summary: 'Deactivate a beneficiary without deleting it', tags: ['Beneficiaries'], params: [idParam('id', 'Beneficiary id')], responseSchema: dataEnvelope() }),
    },

    // ---------- PAYMENTS ----------
    '/payments/billers': {
      get: op({ summary: 'List billers, optionally filtered by category', tags: ['Payments'], params: [{ name: 'category', in: 'query', schema: { type: 'string', enum: ['ELECTRICITY', 'MOBILE', 'INTERNET', 'WATER', 'CREDIT_CARD', 'INSURANCE'] } }], responseSchema: dataEnvelope({ type: 'array', items: { type: 'object', additionalProperties: true } }) }),
    },
    '/payments/bills/lookup': {
      post: op({
        summary: 'Look up a bill amount due for a consumer number',
        tags: ['Payments'],
        requestBody: {
          type: 'object',
          required: ['category', 'billerId', 'consumerNumber'],
          properties: {
            category: { type: 'string', enum: ['ELECTRICITY', 'MOBILE', 'INTERNET', 'WATER', 'CREDIT_CARD', 'INSURANCE'] },
            billerId: { type: 'string' },
            consumerNumber: { type: 'string', minLength: 4, maxLength: 20 },
          },
        },
        responseSchema: dataEnvelope(),
      }),
    },
    '/payments': {
      get: op({ summary: 'List past bill payments', tags: ['Payments'], params: [pageParam, limitParam], responseSchema: paginatedEnvelope() }),
      post: op({
        summary: 'Initiate a bill payment (returns requiresOtp - confirm via /payments/{id}/verify-otp)',
        tags: ['Payments'],
        requestBody: {
          type: 'object',
          required: ['accountId', 'category', 'billerName', 'consumerNumber', 'amount'],
          properties: {
            accountId: { type: 'string', format: 'uuid' },
            category: { type: 'string', enum: ['ELECTRICITY', 'MOBILE', 'INTERNET', 'WATER', 'CREDIT_CARD', 'INSURANCE'] },
            billerName: { type: 'string' },
            consumerNumber: { type: 'string' },
            amount: { type: 'number', exclusiveMinimum: 0 },
          },
        },
        responseSchema: otpResponseSchema,
      }),
    },
    '/payments/{id}/verify-otp': {
      post: op({
        summary: 'Confirm a bill payment with the OTP',
        tags: ['Payments'],
        params: [idParam('id', 'Payment id')],
        requestBody: { type: 'object', required: ['otp'], properties: { otp: { type: 'string', minLength: 6, maxLength: 6 } } },
        responseSchema: dataEnvelope(),
      }),
    },

    // ---------- CARDS ----------
    '/cards': {
      get: op({ summary: "List the signed-in customer's cards", tags: ['Cards'], responseSchema: dataEnvelope({ type: 'array', items: { type: 'object', additionalProperties: true } }) }),
      post: op({
        summary: 'Request a new debit/credit card',
        tags: ['Cards'],
        requestBody: {
          type: 'object',
          required: ['accountId', 'cardType', 'cardHolderName'],
          properties: {
            accountId: { type: 'string', format: 'uuid' },
            cardType: { type: 'string', enum: ['DEBIT', 'CREDIT'] },
            cardHolderName: { type: 'string', minLength: 2, maxLength: 60 },
          },
        },
        responseSchema: dataEnvelope(),
      }),
    },
    '/cards/{id}/transactions': {
      get: op({ summary: 'List transactions made on a card', tags: ['Cards'], params: [idParam('id', 'Card id'), pageParam, limitParam], responseSchema: paginatedEnvelope() }),
    },
    '/cards/{id}/block': { post: op({ summary: 'Block a card', tags: ['Cards'], params: [idParam('id', 'Card id')], responseSchema: dataEnvelope() }) },
    '/cards/{id}/unblock': { post: op({ summary: 'Unblock a card', tags: ['Cards'], params: [idParam('id', 'Card id')], responseSchema: dataEnvelope() }) },
    '/cards/{id}/freeze': { post: op({ summary: 'Temporarily freeze a card', tags: ['Cards'], params: [idParam('id', 'Card id')], responseSchema: dataEnvelope() }) },
    '/cards/{id}/limit': {
      patch: op({
        summary: 'Change the credit limit on a credit card',
        tags: ['Cards'],
        params: [idParam('id', 'Card id')],
        requestBody: { type: 'object', required: ['creditLimit'], properties: { creditLimit: { type: 'number', exclusiveMinimum: 0 } } },
        responseSchema: dataEnvelope(),
      }),
    },
    '/cards/{id}/controls': {
      patch: op({
        summary: 'Toggle online/international usage controls on a card',
        tags: ['Cards'],
        params: [idParam('id', 'Card id')],
        requestBody: { type: 'object', properties: { onlineEnabled: { type: 'boolean' }, internationalEnabled: { type: 'boolean' } } },
        responseSchema: dataEnvelope(),
      }),
    },
    '/cards/{id}/pin': {
      post: op({
        summary: 'Set/change a card PIN',
        tags: ['Cards'],
        params: [idParam('id', 'Card id')],
        requestBody: {
          type: 'object',
          required: ['pin', 'confirmPin'],
          properties: { pin: { type: 'string', pattern: '^\\d{4}$' }, confirmPin: { type: 'string', pattern: '^\\d{4}$' } },
        },
        responseSchema: dataEnvelope(),
      }),
    },

    // ---------- STATEMENTS ----------
    '/statements': {
      get: op({
        summary: 'List generated statements for an account',
        tags: ['Statements'],
        params: [{ name: 'accountId', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } }],
        responseSchema: dataEnvelope({ type: 'array', items: { type: 'object', additionalProperties: true } }),
      }),
    },
    '/statements/generate': {
      post: op({
        summary: 'Generate a new statement for a date range',
        tags: ['Statements'],
        requestBody: {
          type: 'object',
          required: ['accountId', 'periodStart', 'periodEnd'],
          properties: {
            accountId: { type: 'string', format: 'uuid' },
            periodStart: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', example: '2026-08-01' },
            periodEnd: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', example: '2026-08-31' },
          },
        },
        responseSchema: dataEnvelope(),
      }),
    },
    '/statements/{id}/download.pdf': {
      get: op({
        summary: 'Download a statement as a styled PDF',
        tags: ['Statements'],
        params: [idParam('id', 'Statement id')],
        responseSchema: { type: 'string', format: 'binary' },
      }),
    },
    '/statements/{id}/download.csv': {
      get: op({
        summary: 'Download a statement as CSV',
        tags: ['Statements'],
        params: [idParam('id', 'Statement id')],
        responseSchema: { type: 'string', format: 'binary' },
      }),
    },

    // ---------- NOTIFICATIONS ----------
    '/notifications': {
      get: op({ summary: 'List notifications for the signed-in user', tags: ['Notifications'], responseSchema: dataEnvelope({ type: 'array', items: { type: 'object', additionalProperties: true } }) }),
    },
    '/notifications/read-all': {
      patch: op({ summary: 'Mark all notifications as read', tags: ['Notifications'], responseSchema: dataEnvelope() }),
    },
    '/notifications/{id}/read': {
      patch: op({ summary: 'Mark one notification as read', tags: ['Notifications'], params: [idParam('id', 'Notification id')], responseSchema: dataEnvelope() }),
    },
    '/notifications/{id}': {
      delete: op({ summary: 'Delete a notification', tags: ['Notifications'], params: [idParam('id', 'Notification id')], noContent: true, status: 204 }),
    },

    // ---------- PROFILE ----------
    '/profile': {
      get: op({ summary: 'Get the signed-in user\'s profile', tags: ['Profile'], responseSchema: dataEnvelope() }),
      patch: op({
        summary: 'Update non-sensitive profile fields',
        tags: ['Profile'],
        requestBody: { type: 'object', properties: { fullName: { type: 'string', minLength: 2, maxLength: 100 }, address: { type: 'string', maxLength: 200 } } },
        responseSchema: dataEnvelope(),
      }),
    },
    '/profile/sensitive-update/initiate': {
      post: op({
        summary: 'Start an email/phone change (returns requiresOtp - confirm via /profile/sensitive-update/confirm)',
        tags: ['Profile'],
        requestBody: {
          type: 'object',
          properties: { email: { type: 'string', format: 'email' }, phone: { type: 'string', pattern: '^\\+?[0-9]{10,15}$' } },
        },
        responseSchema: otpResponseSchema,
      }),
    },
    '/profile/sensitive-update/confirm': {
      post: op({
        summary: 'Confirm the email/phone change with the OTP',
        tags: ['Profile'],
        requestBody: { type: 'object', required: ['otp'], properties: { otp: { type: 'string', minLength: 6, maxLength: 6 } } },
        responseSchema: dataEnvelope(),
      }),
    },
    '/profile/photo': {
      post: {
        summary: 'Upload a profile photo',
        tags: ['Profile'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'multipart/form-data': { schema: { type: 'object', properties: { photo: { type: 'string', format: 'binary' } } } } },
        },
        responses: { 200: { description: 'Success', content: { 'application/json': { schema: dataEnvelope() } } }, 400: responses[400], 401: responses[401] },
      },
    },
    '/profile/preferences': {
      patch: op({
        summary: 'Update user preferences (e.g. dashboard widget order)',
        tags: ['Profile'],
        requestBody: { type: 'object', properties: { widgetOrder: { type: 'array', items: { type: 'string' } } }, additionalProperties: true },
        responseSchema: dataEnvelope(),
      }),
    },
    '/profile/documents': {
      get: op({ summary: "List the user's uploaded documents", tags: ['Profile'], responseSchema: dataEnvelope({ type: 'array', items: { type: 'object', additionalProperties: true } }) }),
      post: {
        summary: 'Upload a document (e.g. KYC proof)',
        tags: ['Profile'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'multipart/form-data': { schema: { type: 'object', properties: { document: { type: 'string', format: 'binary' } } } } },
        },
        responses: { 200: { description: 'Success', content: { 'application/json': { schema: dataEnvelope() } } }, 400: responses[400], 401: responses[401] },
      },
    },
    '/profile/documents/{id}/download': {
      get: op({ summary: 'Download a previously uploaded document', tags: ['Profile'], params: [idParam('id', 'Document id')], responseSchema: { type: 'string', format: 'binary' } }),
    },

    // ---------- SECURITY ----------
    '/security/sessions': {
      get: op({ summary: 'List active sessions for the signed-in user', tags: ['Security'], responseSchema: dataEnvelope({ type: 'array', items: { type: 'object', additionalProperties: true } }) }),
    },
    '/security/sessions/{id}': {
      delete: op({ summary: 'Revoke a specific session', tags: ['Security'], params: [idParam('id', 'Session id')], noContent: true, status: 204 }),
    },
    '/security/logout-all': {
      post: op({ summary: 'Revoke all sessions (log out everywhere)', tags: ['Security'], noContent: true, status: 204 }),
    },
    '/security/login-history': {
      get: op({ summary: 'List recent login attempts', tags: ['Security'], responseSchema: dataEnvelope({ type: 'array', items: { type: 'object', additionalProperties: true } }) }),
    },
    '/security/mfa': {
      patch: op({
        summary: 'Enable/disable OTP-based MFA for login',
        tags: ['Security'],
        requestBody: { type: 'object', required: ['enabled'], properties: { enabled: { type: 'boolean' } } },
        responseSchema: dataEnvelope(),
      }),
    },

    // ---------- ADMIN ----------
    '/admin/stats': { get: op({ summary: 'Bank-wide summary stats for the admin dashboard', tags: ['Admin'], responseSchema: dataEnvelope() }) },
    '/admin/system-health': { get: op({ summary: 'DB/service health snapshot', tags: ['Admin'], responseSchema: dataEnvelope() }) },
    '/admin/users': {
      get: op({
        summary: 'Search/paginate all users',
        tags: ['Admin'],
        params: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'role', in: 'query', schema: { type: 'string', enum: ['CUSTOMER', 'SUPPORT_AGENT', 'ADMIN'] } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'LOCKED', 'DISABLED'] } },
          pageParam,
          limitParam,
        ],
        responseSchema: paginatedEnvelope(),
      }),
      post: op({
        summary: 'Create a new user (account number is generated and returned)',
        tags: ['Admin'],
        requestBody: {
          type: 'object',
          required: ['username', 'email', 'password', 'fullName'],
          properties: {
            username: { type: 'string', pattern: '^[a-zA-Z0-9_.]+$', minLength: 3, maxLength: 30 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', format: 'password', example: 'Passw0rd!' },
            fullName: { type: 'string', minLength: 2, maxLength: 100 },
            phone: { type: 'string', pattern: '^\\+?[0-9]{10,15}$' },
            address: { type: 'string', maxLength: 200 },
            role: { type: 'string', enum: ['CUSTOMER', 'SUPPORT_AGENT', 'ADMIN'], default: 'CUSTOMER' },
          },
        },
        status: 201,
        responseSchema: dataEnvelope(),
      }),
    },
    '/admin/users/{id}': {
      patch: op({
        summary: 'Update a user',
        tags: ['Admin'],
        params: [idParam('id', 'User id')],
        requestBody: {
          type: 'object',
          properties: {
            fullName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            address: { type: 'string' },
            role: { type: 'string', enum: ['CUSTOMER', 'SUPPORT_AGENT', 'ADMIN'] },
          },
        },
        responseSchema: dataEnvelope(),
      }),
    },
    '/admin/users/{id}/activate': { post: op({ summary: 'Activate a user account', tags: ['Admin'], params: [idParam('id', 'User id')], responseSchema: dataEnvelope() }) },
    '/admin/users/{id}/deactivate': { post: op({ summary: 'Deactivate a user account', tags: ['Admin'], params: [idParam('id', 'User id')], responseSchema: dataEnvelope() }) },
    '/admin/users/{id}/lock': { post: op({ summary: 'Lock a user account', tags: ['Admin'], params: [idParam('id', 'User id')], responseSchema: dataEnvelope() }) },
    '/admin/users/{id}/unlock': { post: op({ summary: 'Unlock a user account', tags: ['Admin'], params: [idParam('id', 'User id')], responseSchema: dataEnvelope() }) },
    '/admin/accounts': {
      get: op({
        summary: 'Search/paginate all accounts across every customer',
        tags: ['Admin'],
        params: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'DORMANT', 'CLOSED'] } },
          pageParam,
          limitParam,
        ],
        responseSchema: paginatedEnvelope(),
      }),
    },
    '/admin/transactions': {
      get: op({
        summary: 'Search/paginate all transactions bank-wide',
        tags: ['Admin'],
        params: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['SUCCESS', 'PENDING', 'FAILED', 'REVERSED'] } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['TRANSFER', 'PAYMENT', 'DEPOSIT', 'WITHDRAWAL', 'FEE', 'INTEREST'] } },
          pageParam,
          limitParam,
        ],
        responseSchema: paginatedEnvelope(),
      }),
    },
    '/admin/audit-logs': {
      get: op({
        summary: 'Search/paginate the audit log',
        tags: ['Admin'],
        params: [
          { name: 'action', in: 'query', schema: { type: 'string' } },
          { name: 'result', in: 'query', schema: { type: 'string', enum: ['SUCCESS', 'FAILURE'] } },
          pageParam,
          limitParam,
        ],
        responseSchema: paginatedEnvelope(),
      }),
    },

    // ---------- SUPPORT ----------
    '/support/customers': {
      get: op({
        summary: 'Search customers (read-only)',
        tags: ['Support'],
        params: [{ name: 'search', in: 'query', schema: { type: 'string' } }, pageParam, limitParam],
        responseSchema: paginatedEnvelope(),
      }),
    },
    '/support/customers/{id}': {
      get: op({ summary: 'Get one customer (read-only)', tags: ['Support'], params: [idParam('id', 'User id')], responseSchema: dataEnvelope() }),
    },
    '/support/customers/{id}/transactions': {
      get: op({ summary: "Get a customer's transactions (read-only)", tags: ['Support'], params: [idParam('id', 'User id')], responseSchema: dataEnvelope({ type: 'array', items: { type: 'object', additionalProperties: true } }) }),
    },

    // ---------- DEV TOOLS ----------
    '/dev/chaos-config': {
      get: op({ summary: 'List configured Chaos Mode rules per route', tags: ['Dev Tools'], responseSchema: dataEnvelope({ type: 'array', items: { type: 'object', additionalProperties: true } }) }),
      put: op({
        summary: 'Create/update a Chaos Mode rule for a route',
        tags: ['Dev Tools'],
        requestBody: {
          type: 'object',
          required: ['routeKey'],
          properties: {
            routeKey: { type: 'string', example: 'GET /api/transactions' },
            enabled: { type: 'boolean' },
            delayMs: { type: 'integer', minimum: 0, maximum: 30000 },
            failTimes: { type: 'integer', minimum: 0, maximum: 20 },
            failStatusCode: { type: 'integer', minimum: 400, maximum: 599 },
            simulateTimeout: { type: 'boolean' },
          },
        },
        responseSchema: dataEnvelope(),
      }),
    },
    '/dev/chaos-config/reset': { post: op({ summary: 'Reset all Chaos Mode rules to disabled', tags: ['Dev Tools'], noContent: true, status: 204 }) },
    '/dev/reset': { post: op({ summary: 'Re-seed the entire demo environment from scratch', tags: ['Dev Tools'], responseSchema: { type: 'object', properties: { message: { type: 'string' } } } }) },
    '/dev/api-lab/endpoints': { get: op({ summary: 'List endpoints available in the API Testing Lab', tags: ['Dev Tools'], responseSchema: dataEnvelope({ type: 'array', items: { type: 'object', additionalProperties: true } }) }) },
    '/dev/challenges': { get: op({ summary: 'List all 25 Playwright Challenge Lab entries', tags: ['Dev Tools'], responseSchema: dataEnvelope({ type: 'array', items: { type: 'object', additionalProperties: true } }) }) },
    '/dev/challenges/{id}/reset': {
      post: op({
        summary: 'Reset the state needed for one specific challenge',
        tags: ['Dev Tools'],
        params: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1, maximum: 25 } }],
        responseSchema: { type: 'object', properties: { message: { type: 'string' } } },
      }),
    },
  },
};
