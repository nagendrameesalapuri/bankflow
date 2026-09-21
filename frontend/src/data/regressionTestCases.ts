export type Priority = 'High' | 'Medium' | 'Low';

export interface RegressionTestCase {
  id: string;
  module: string;
  title: string;
  priority: Priority;
  preconditions: string;
  steps: string[];
  testData?: string;
  expectedResult: string;
}

export const REGRESSION_TEST_CASES: RegressionTestCase[] = [
  // ---------- Authentication ----------
  {
    id: 'TC-001',
    module: 'Authentication',
    title: 'Successful login with valid credentials triggers OTP step',
    priority: 'High',
    preconditions: 'User is logged out. Seeded user customer01 exists.',
    steps: [
      'Navigate to /login',
      'Enter username "customer01" and password "Test@123"',
      'Click "Sign in"',
    ],
    testData: 'username=customer01, password=Test@123',
    expectedResult: 'The "Verify your identity" OTP screen is shown with a 6-digit input, an expiry countdown, and (in this demo) the dev OTP visible on the page.',
  },
  {
    id: 'TC-002',
    module: 'Authentication',
    title: 'Login fails with incorrect password',
    priority: 'High',
    preconditions: 'User is logged out.',
    steps: [
      'Navigate to /login',
      'Enter username "customer01" and an incorrect password',
      'Click "Sign in"',
    ],
    testData: 'username=customer01, password=WrongPass1!',
    expectedResult: 'An inline error message is shown on the form (e.g. "Invalid username or password"), the page does not navigate away, and no OTP screen appears.',
  },
  {
    id: 'TC-003',
    module: 'Authentication',
    title: 'Account locks out after repeated failed login attempts',
    priority: 'High',
    preconditions: 'User is logged out. LOGIN_MAX_ATTEMPTS is 5.',
    steps: [
      'Submit the login form with the correct username and a wrong password 5 times in a row',
      'Submit a 6th attempt with the correct password',
    ],
    expectedResult: 'After the 5th failed attempt the account is locked; the 6th attempt (even with the correct password) is rejected with a lockout message referencing the retry window.',
  },
  {
    id: 'TC-004',
    module: 'Authentication',
    title: 'Completing OTP verification logs the user in',
    priority: 'High',
    preconditions: 'User has submitted valid credentials and is on the OTP screen.',
    steps: [
      'Read the OTP value shown on the dev-mode OTP screen (or from the API response)',
      'Enter the 6-digit code into the OTP field',
      'Click "Verify"',
    ],
    expectedResult: 'User is redirected to /dashboard, an access token is stored, and the dashboard renders account summary cards.',
  },
  {
    id: 'TC-005',
    module: 'Authentication',
    title: 'Incorrect OTP is rejected without invalidating the login attempt',
    priority: 'Medium',
    preconditions: 'User is on the OTP verification screen.',
    steps: [
      'Enter an incorrect 6-digit code',
      'Click "Verify"',
    ],
    testData: 'otp=000000 (assuming this does not match)',
    expectedResult: 'An inline "Incorrect OTP" error is shown; the OTP screen remains visible and a correct code can still be submitted afterward.',
  },
  {
    id: 'TC-006',
    module: 'Authentication',
    title: 'Expired OTP is rejected and can be resent',
    priority: 'Medium',
    preconditions: 'User is on the OTP screen and the configured OTP expiry window has elapsed.',
    steps: [
      'Wait for the on-screen countdown to reach 0 / "Code expired"',
      'Attempt to submit the old code',
      'Click "Resend OTP"',
      'Submit the newly issued code',
    ],
    expectedResult: 'Submitting the expired code shows an "OTP has expired" error. After resending, a fresh code is issued and successfully logs the user in.',
  },
  {
    id: 'TC-007',
    module: 'Authentication',
    title: 'Forgot password flow issues a reset token',
    priority: 'Medium',
    preconditions: 'User is logged out and knows their registered email.',
    steps: [
      'Navigate to /forgot-password',
      'Enter the registered email address',
      'Submit the form',
    ],
    expectedResult: 'A generic confirmation message is shown ("If that account exists, instructions have been sent"), regardless of whether the email exists (no user enumeration).',
  },
  {
    id: 'TC-008',
    module: 'Authentication',
    title: 'Reset password with a valid token sets a new password',
    priority: 'Medium',
    preconditions: 'A valid reset token has been issued via the forgot-password flow.',
    steps: [
      'Navigate to /reset-password with the token',
      'Enter a new password meeting complexity rules',
      'Submit',
      'Log in with the new password',
    ],
    testData: 'newPassword=NewPass@123',
    expectedResult: 'The password is updated and the old password no longer authenticates; the new password logs in successfully.',
  },
  {
    id: 'TC-009',
    module: 'Authentication',
    title: 'Change password requires the correct current password',
    priority: 'Medium',
    preconditions: 'User is logged in and on /security or /profile.',
    steps: [
      'Open the change-password form',
      'Enter an incorrect current password and a valid new password',
      'Submit',
    ],
    expectedResult: 'A validation error is shown indicating the current password is incorrect; the password is not changed.',
  },
  {
    id: 'TC-010',
    module: 'Authentication',
    title: 'Logout clears the session and redirects to login',
    priority: 'High',
    preconditions: 'User is logged in.',
    steps: [
      'Click "Logout" from the account menu',
      'Attempt to navigate directly to /dashboard via the URL bar',
    ],
    expectedResult: 'User is redirected to /login; the refresh-token cookie is cleared and the dashboard is no longer reachable without logging in again.',
  },
  {
    id: 'TC-011',
    module: 'Authentication',
    title: 'Expired access token triggers a silent refresh or redirect',
    priority: 'High',
    preconditions: 'User is logged in with an access token close to/past expiry.',
    steps: [
      'Wait for (or force) the access token to expire',
      'Perform an action that calls a protected API (e.g. open /transactions)',
    ],
    expectedResult: 'Either the app silently refreshes the token via /api/auth/refresh and the request succeeds, or the user is redirected to /login with a "session expired" message - the app never shows a raw 401 error on screen.',
  },

  // ---------- Accounts ----------
  {
    id: 'TC-012',
    module: 'Accounts',
    title: 'Accounts list shows all of the customer\'s own accounts',
    priority: 'High',
    preconditions: 'User is logged in as a customer with 2+ accounts.',
    steps: ['Navigate to /accounts'],
    expectedResult: 'Every account belonging to the logged-in user is listed with account number (masked), type, and current balance.',
  },
  {
    id: 'TC-013',
    module: 'Accounts',
    title: 'Account detail page shows correct balance and metadata',
    priority: 'Medium',
    preconditions: 'User is logged in with at least one account.',
    steps: [
      'Navigate to /accounts',
      'Click into one account row',
    ],
    expectedResult: 'The account detail page (/accounts/:id) shows the same balance as the list, plus IFSC/branch details and recent transactions for that account only.',
  },
  {
    id: 'TC-014',
    module: 'Accounts',
    title: 'Customer cannot view another customer\'s account by guessing the ID',
    priority: 'High',
    preconditions: 'Two customer accounts exist with known IDs (e.g. via API Lab).',
    steps: [
      'Log in as customer A',
      'Navigate directly to /accounts/<customer-B-account-id>',
    ],
    expectedResult: 'A 403/404-driven error is shown - customer A never sees customer B\'s balance or details.',
  },

  // ---------- Transactions ----------
  {
    id: 'TC-015',
    module: 'Transactions',
    title: 'Transaction list loads with server-side pagination',
    priority: 'High',
    preconditions: 'Logged in user has 20+ transactions.',
    steps: [
      'Navigate to /transactions',
      'Click "Next page"',
    ],
    expectedResult: 'A new API request is fired with an incremented page parameter and a different set of rows is displayed; the page indicator updates.',
  },
  {
    id: 'TC-016',
    module: 'Transactions',
    title: 'Filtering by status and date range narrows results correctly',
    priority: 'High',
    preconditions: 'Transactions exist with mixed statuses (SUCCESS/PENDING/FAILED) and dates.',
    steps: [
      'Navigate to /transactions',
      'Set status filter to "SUCCESS"',
      'Set a date range covering only some transactions',
      'Apply filters',
    ],
    expectedResult: 'Only transactions matching both the status and date range are shown; the result count updates to match.',
  },
  {
    id: 'TC-017',
    module: 'Transactions',
    title: 'Sorting by amount toggles ascending/descending order',
    priority: 'Medium',
    preconditions: 'Logged in user has transactions with varying amounts.',
    steps: [
      'Navigate to /transactions',
      'Select "Sort by amount" ascending, note the first row',
      'Switch to descending',
    ],
    expectedResult: 'Row order reverses between the two sort directions and the first row after ascending sort has the smallest amount.',
  },
  {
    id: 'TC-018',
    module: 'Transactions',
    title: 'Free-text search finds a transaction by reference number',
    priority: 'Medium',
    preconditions: 'A transaction with a known reference number exists.',
    steps: [
      'Navigate to /transactions',
      'Enter the reference number into the search box',
    ],
    expectedResult: 'Exactly the matching transaction row is returned, located without relying on row index/position.',
  },
  {
    id: 'TC-019',
    module: 'Transactions',
    title: 'Amount range filter excludes out-of-range transactions',
    priority: 'Low',
    preconditions: 'Transactions exist with a spread of amounts.',
    steps: [
      'Navigate to /transactions',
      'Set amountMin and amountMax to a narrow range',
      'Apply',
    ],
    expectedResult: 'All displayed rows fall within [amountMin, amountMax]; nothing outside the range appears.',
  },

  // ---------- Transfers ----------
  {
    id: 'TC-020',
    module: 'Transfers',
    title: 'End-to-end transfer to a saved beneficiary succeeds and updates both balances',
    priority: 'High',
    preconditions: 'Sender has sufficient balance; an active beneficiary with a real internal BankFlow account exists.',
    steps: [
      'Navigate to /transfer',
      'Select source account, beneficiary, and an amount',
      'Submit and confirm the quote',
      'Enter the OTP to confirm',
    ],
    testData: 'amount=2500',
    expectedResult: 'A success screen appears, a new DEBIT transaction appears in the sender\'s history for the exact amount, and the recipient\'s account balance increases by the same amount with a matching CREDIT transaction and a "money received" notification.',
  },
  {
    id: 'TC-021',
    module: 'Transfers',
    title: 'Transfer is blocked when amount exceeds available balance',
    priority: 'High',
    preconditions: 'Sender account balance is known (e.g. ₹10,000).',
    steps: [
      'Navigate to /transfer',
      'Enter an amount greater than the available balance',
      'Submit',
    ],
    testData: 'amount = balance + 1',
    expectedResult: 'A 422 validation error is shown inline before any OTP is requested; no debit occurs.',
  },
  {
    id: 'TC-022',
    module: 'Transfers',
    title: 'Transfer quote reflects the correct fee/amount before execution',
    priority: 'Medium',
    preconditions: 'User is on the transfer form with a valid amount entered.',
    steps: [
      'Fill in the transfer form',
      'Trigger the quote step (before final submit)',
    ],
    expectedResult: 'The quote response/UI shows the exact amount and any applicable fee, matching what is actually debited after confirmation.',
  },
  {
    id: 'TC-023',
    module: 'Transfers',
    title: 'Incorrect transfer OTP is rejected and the transfer is not executed',
    priority: 'High',
    preconditions: 'A transfer has been initiated and is awaiting OTP confirmation.',
    steps: [
      'On the OTP step, enter an incorrect 6-digit code',
      'Submit',
      'Check the sender\'s balance afterward',
    ],
    expectedResult: 'An "incorrect OTP" error is shown and the sender\'s balance is unchanged (no debit until a correct OTP is confirmed).',
  },
  {
    id: 'TC-024',
    module: 'Transfers',
    title: 'Transfer OTP step is rendered inside an iframe',
    priority: 'Medium',
    preconditions: 'A transfer has been initiated and is awaiting OTP.',
    steps: [
      'Locate the OTP input on the confirmation step',
      'Inspect the DOM around it',
    ],
    expectedResult: 'The OTP input is rendered inside an <iframe> (the embedded verification frame) - automated tests must switch into the frame context to interact with it.',
  },

  // ---------- Beneficiaries ----------
  {
    id: 'TC-025',
    module: 'Beneficiaries',
    title: 'Adding a beneficiary with a real account number verifies the holder name',
    priority: 'High',
    preconditions: 'A real BankFlow account number is known.',
    steps: [
      'Navigate to /beneficiaries',
      'Click "Add beneficiary" and enter the account number and bank name',
      'Trigger account verification',
    ],
    expectedResult: 'The account is confirmed as valid and the linked account holder name is shown before the beneficiary is saved.',
  },
  {
    id: 'TC-026',
    module: 'Beneficiaries',
    title: 'Adding a beneficiary with a non-existent account number is rejected or flagged',
    priority: 'High',
    preconditions: "None.",
    steps: [
      'Navigate to /beneficiaries',
      'Click "Add beneficiary" and enter a made-up account number',
      'Trigger account verification',
    ],
    testData: 'accountNumber=0000000000',
    expectedResult: 'Verification reports the account as not found/invalid rather than silently accepting it or showing a blank name.',
  },
  {
    id: 'TC-027',
    module: 'Beneficiaries',
    title: 'New beneficiary requires OTP confirmation before appearing in the list',
    priority: 'Medium',
    preconditions: 'User has filled in a valid new-beneficiary form.',
    steps: [
      'Submit the new-beneficiary form',
      'Enter the OTP shown/sent',
      'Confirm',
    ],
    expectedResult: 'The beneficiary only appears in the /beneficiaries list after OTP confirmation, not immediately after the initial submit.',
  },
  {
    id: 'TC-028',
    module: 'Beneficiaries',
    title: 'Beneficiary nickname is optional and displays correctly when blank',
    priority: 'Low',
    preconditions: 'User is adding or editing a beneficiary.',
    steps: [
      'Add or edit a beneficiary leaving the nickname field empty',
      'Save',
      'View the beneficiary in the list',
    ],
    expectedResult: 'The beneficiary displays using its full name (never a blank or literal "undefined"/"null" string) when no nickname is set.',
  },
  {
    id: 'TC-029',
    module: 'Beneficiaries',
    title: 'Deleting a beneficiary requires confirmation and removes it from the list',
    priority: 'Medium',
    preconditions: 'At least one beneficiary exists.',
    steps: [
      'Click "Delete" on a beneficiary row',
      'Confirm in the dialog',
    ],
    expectedResult: 'A confirmation modal appears before deletion; after confirming, the beneficiary is removed from the list and is no longer selectable in the transfer form.',
  },
  {
    id: 'TC-030',
    module: 'Beneficiaries',
    title: 'Deactivating a beneficiary hides it from the transfer form without deleting it',
    priority: 'Low',
    preconditions: 'An active beneficiary exists.',
    steps: [
      'Deactivate the beneficiary from /beneficiaries',
      'Navigate to /transfer and open the beneficiary dropdown',
    ],
    expectedResult: 'The deactivated beneficiary is not selectable in the transfer form but still appears (marked inactive) on the beneficiaries page and can be reactivated.',
  },

  // ---------- Payments ----------
  {
    id: 'TC-031',
    module: 'Payments',
    title: 'Bill lookup returns a due amount for a valid consumer number',
    priority: 'Medium',
    preconditions: 'A biller and consumer number combination exist.',
    steps: [
      'Navigate to /payments',
      'Select a biller category and biller',
      'Enter a consumer number and trigger lookup',
    ],
    expectedResult: 'A due amount (or bill details) is returned and displayed before the user commits to paying.',
  },
  {
    id: 'TC-032',
    module: 'Payments',
    title: 'Paying a bill debits the account only after OTP confirmation',
    priority: 'High',
    preconditions: 'Sufficient account balance exists.',
    steps: [
      'Complete a bill lookup',
      'Submit the payment',
      'Enter the OTP to confirm',
    ],
    expectedResult: 'The account is not debited until the OTP is confirmed; after confirmation, the payment appears in transaction history and /payments history.',
  },

  // ---------- Cards ----------
  {
    id: 'TC-033',
    module: 'Cards',
    title: 'Blocking a card immediately reflects a "Blocked" status',
    priority: 'High',
    preconditions: 'An active card exists.',
    steps: [
      'Navigate to /cards',
      'Click "Block" on a card and confirm',
    ],
    expectedResult: 'The card status updates to "Blocked" without a page refresh, and the block/unblock action set updates accordingly.',
  },
  {
    id: 'TC-034',
    module: 'Cards',
    title: 'Setting a card PIN validates that both entries match',
    priority: 'Medium',
    preconditions: 'A card exists that supports PIN setup.',
    steps: [
      'Open the "Set PIN" dialog for a card',
      'Enter two different 4-digit values in PIN and Confirm PIN',
      'Submit',
    ],
    testData: 'pin=1234, confirmPin=5678',
    expectedResult: 'A validation error is shown ("PINs do not match") and the PIN is not saved.',
  },
  {
    id: 'TC-035',
    module: 'Cards',
    title: 'Changing the credit limit on a credit card persists the new value',
    priority: 'Medium',
    preconditions: 'A CREDIT-type card exists.',
    steps: [
      'Open card controls for a credit card',
      'Change the credit limit to a new positive value',
      'Save',
    ],
    expectedResult: 'The new limit is reflected on the card details immediately and after a page reload.',
  },

  // ---------- Statements ----------
  {
    id: 'TC-036',
    module: 'Statements',
    title: 'Generating and downloading a PDF statement produces a real file',
    priority: 'High',
    preconditions: 'An account with transaction history exists.',
    steps: [
      'Navigate to /statements',
      'Select an account and a date range, click "Generate"',
      'Click "Download PDF"',
    ],
    expectedResult: 'A real PDF file download is triggered by the browser, containing a transaction table for the selected period.',
  },
  {
    id: 'TC-037',
    module: 'Statements',
    title: 'Downloading the same statement as CSV succeeds',
    priority: 'Medium',
    preconditions: 'A statement has already been generated.',
    steps: [
      'From /statements, click "Download CSV" on an existing statement',
    ],
    expectedResult: 'A real CSV file download is triggered, and its rows match the transactions shown in the PDF for the same period.',
  },
  {
    id: 'TC-038',
    module: 'Statements',
    title: 'Statement generation rejects an invalid date range',
    priority: 'Low',
    preconditions: 'None.',
    steps: [
      'Navigate to /statements',
      'Set periodEnd to a date before periodStart',
      'Submit',
    ],
    expectedResult: 'A validation error is shown and no statement is generated.',
  },

  // ---------- Notifications ----------
  {
    id: 'TC-039',
    module: 'Notifications',
    title: 'A triggering action produces a live notification without page refresh',
    priority: 'High',
    preconditions: 'User is logged in with the app open on /notifications or /dashboard.',
    steps: [
      'In a second session/tab, perform an action that generates a notification for this user (e.g. receive a transfer)',
      'Observe the first session without refreshing',
    ],
    expectedResult: 'A toast and/or unread badge appears via the Socket.IO push in real time, not via a page reload or polling delay.',
  },
  {
    id: 'TC-040',
    module: 'Notifications',
    title: 'Marking all notifications as read clears the unread badge',
    priority: 'Medium',
    preconditions: 'Multiple unread notifications exist.',
    steps: [
      'Navigate to /notifications',
      'Click "Mark all as read"',
    ],
    expectedResult: 'All notifications switch to a read state and the unread count badge in the nav goes to zero.',
  },

  // ---------- Profile & Security ----------
  {
    id: 'TC-041',
    module: 'Profile',
    title: 'Updating email/phone requires OTP confirmation',
    priority: 'High',
    preconditions: 'User is logged in on /profile.',
    steps: [
      'Change the email or phone field',
      'Submit and note that an OTP step appears',
      'Enter the OTP to confirm',
    ],
    expectedResult: 'The sensitive field is not updated until the OTP is confirmed; after confirmation, the new value is reflected on the profile page.',
  },
  {
    id: 'TC-042',
    module: 'Profile',
    title: 'Uploading a profile photo updates the avatar',
    priority: 'Medium',
    preconditions: 'User is logged in on /profile.',
    steps: [
      'Click the avatar/upload control',
      'Select an image file',
      'Confirm upload',
    ],
    expectedResult: 'The avatar image updates on the page after a successful multipart upload, without requiring a manual refresh.',
  },
  {
    id: 'TC-043',
    module: 'Security',
    title: '"Logout everywhere" revokes all active sessions',
    priority: 'High',
    preconditions: 'User is logged in from two different browsers/sessions.',
    steps: [
      'From session A, navigate to /security',
      'Click "Logout of all sessions"',
      'From session B, attempt any authenticated action',
    ],
    expectedResult: 'Session B is immediately invalidated and redirected to /login on its next request.',
  },

  // ---------- Admin & RBAC ----------
  {
    id: 'TC-044',
    module: 'Admin',
    title: 'Admin can create a new user and the generated account number is shown',
    priority: 'High',
    preconditions: 'Logged in as an ADMIN user (e.g. admin01).',
    steps: [
      'Navigate to /admin/users',
      'Click "Create user" and fill in valid details',
      'Submit',
    ],
    expectedResult: 'The user is created, a unique account number is generated and displayed to the admin, and the new user appears in the users list.',
  },
  {
    id: 'TC-045',
    module: 'Admin',
    title: 'Creating a user with a weak password is rejected with a specific error',
    priority: 'Medium',
    preconditions: 'Logged in as ADMIN.',
    steps: [
      'Open "Create user"',
      'Enter a password missing an uppercase letter/number/special character',
      'Submit',
    ],
    testData: 'password=weakpass',
    expectedResult: 'The exact validation message (e.g. "Password must contain an uppercase letter") is shown, not a generic "request failed" message.',
  },
  {
    id: 'TC-046',
    module: 'Admin',
    title: 'Locking a user account prevents that user from logging in',
    priority: 'High',
    preconditions: 'A target user account exists and is currently active.',
    steps: [
      'As ADMIN, navigate to /admin/users and click "Lock" on the target user',
      'Attempt to log in as that user',
    ],
    expectedResult: 'The login attempt is rejected with a lockout-specific message, even with the correct password.',
  },
  {
    id: 'TC-047',
    module: 'Admin',
    title: 'Non-admin users cannot access the admin portal',
    priority: 'High',
    preconditions: 'Logged in as a CUSTOMER or SUPPORT_AGENT.',
    steps: [
      'Navigate directly to /admin via the URL bar',
    ],
    expectedResult: 'The user is redirected to /not-authorized (driven by a 403) rather than seeing any admin data.',
  },
  {
    id: 'TC-048',
    module: 'Admin',
    title: 'Audit log records an admin action with correct actor and result',
    priority: 'Medium',
    preconditions: 'Logged in as ADMIN.',
    steps: [
      'Perform an admin action (e.g. lock a user)',
      'Navigate to /admin/audit-logs',
    ],
    expectedResult: 'A new audit log entry appears showing the acting admin, the action type, and a SUCCESS result, in reverse-chronological order.',
  },
  {
    id: 'TC-049',
    module: 'Support',
    title: 'Support agent can search and view a customer read-only',
    priority: 'Medium',
    preconditions: 'Logged in as support01 (SUPPORT_AGENT).',
    steps: [
      'Navigate to /support/customers',
      'Search for a known customer by name/username',
      'Open the customer detail view',
    ],
    expectedResult: 'Customer details and transactions are visible, but no edit/action controls (block, transfer, delete) are present anywhere on the page.',
  },
  {
    id: 'TC-050',
    module: 'Chaos Mode',
    title: 'A configured API delay shows a loading state on the transactions page',
    priority: 'Low',
    preconditions: 'Logged in as ADMIN with access to /dev/chaos.',
    steps: [
      'Enable a delay rule (e.g. 3000ms) on GET /api/transactions',
      'As a customer, open /transactions',
    ],
    expectedResult: 'A loading skeleton is shown for approximately the configured delay before the transaction rows render.',
  },
];
