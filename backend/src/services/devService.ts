import * as chaosService from './chaosService';

// database/seeds/seed.ts lives outside backend/src's rootDir, so it's loaded
// via plain require() (typed manually) rather than a static import - that
// keeps it out of tsc's rootDir graph while tsx/node resolve it fine at
// runtime relative to this compiled file's directory.
type SeedModule = { seed: () => Promise<void> };

export async function resetDemoEnvironment(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { seed } = require('../../../database/seeds/seed') as SeedModule;
  await seed();
  await chaosService.resetAllChaosRules();
}

export const CHALLENGE_LAB: Array<{
  id: number;
  title: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  description: string;
  startPage: string;
  expectedBehavior: string;
}> = [
  { id: 1, title: 'Login successfully', difficulty: 'BEGINNER', description: 'Log in with the seeded customer01 credentials and reach the dashboard.', startPage: '/login', expectedBehavior: 'Dashboard loads with account summary cards visible.' },
  { id: 2, title: 'Handle invalid login', difficulty: 'BEGINNER', description: 'Submit an incorrect password and assert the inline error message.', startPage: '/login', expectedBehavior: 'A 401 error renders as a visible form error without navigating away.' },
  { id: 3, title: 'Handle OTP', difficulty: 'BEGINNER', description: 'Complete the 6-digit OTP step after a valid login.', startPage: '/login', expectedBehavior: 'Entering the dev-exposed OTP completes login and redirects to the dashboard.' },
  { id: 4, title: 'Find a transaction dynamically', difficulty: 'INTERMEDIATE', description: 'Locate a transaction row by its dynamically generated reference number.', startPage: '/transactions', expectedBehavior: 'A row matching the reference number is located without relying on row index.' },
  { id: 5, title: 'Filter transactions', difficulty: 'INTERMEDIATE', description: 'Apply a status + date range filter and verify only matching rows remain.', startPage: '/transactions', expectedBehavior: 'The table re-renders with only matching results and an updated result count.' },
  { id: 6, title: 'Sort transactions', difficulty: 'BEGINNER', description: 'Sort transactions by amount and verify ascending/descending order.', startPage: '/transactions', expectedBehavior: 'Row order changes to match the selected sort.' },
  { id: 7, title: 'Navigate pagination', difficulty: 'BEGINNER', description: 'Move to page 2 of the transaction list via server-side pagination.', startPage: '/transactions', expectedBehavior: 'A new API request fires and different rows are displayed.' },
  { id: 8, title: 'Transfer money', difficulty: 'ADVANCED', description: 'Complete the full transfer wizard including OTP confirmation.', startPage: '/transfer', expectedBehavior: 'A success screen appears and a new transaction is visible in history.' },
  { id: 9, title: 'Handle insufficient balance', difficulty: 'INTERMEDIATE', description: 'Attempt to transfer more than the available balance.', startPage: '/transfer', expectedBehavior: 'A 422 error is shown inline before OTP is ever requested.' },
  { id: 10, title: 'Add beneficiary', difficulty: 'INTERMEDIATE', description: 'Add a new beneficiary, completing the OTP confirmation step.', startPage: '/beneficiaries', expectedBehavior: 'The new beneficiary appears in the list after OTP confirmation.' },
  { id: 11, title: 'Delete beneficiary', difficulty: 'BEGINNER', description: 'Delete a beneficiary and confirm via the modal dialog.', startPage: '/beneficiaries', expectedBehavior: 'The beneficiary is removed from the list after confirming the dialog.' },
  { id: 12, title: 'Download PDF statement', difficulty: 'INTERMEDIATE', description: 'Generate and download a statement as a PDF file.', startPage: '/statements', expectedBehavior: 'A real PDF file download is triggered by the browser.' },
  { id: 13, title: 'Download CSV', difficulty: 'BEGINNER', description: 'Download the same statement period as a CSV file.', startPage: '/statements', expectedBehavior: 'A real CSV file download is triggered by the browser.' },
  { id: 14, title: 'Upload profile picture', difficulty: 'INTERMEDIATE', description: 'Upload a new profile photo via the file picker.', startPage: '/profile', expectedBehavior: 'The avatar updates after a successful multipart upload.' },
  { id: 15, title: 'Handle iframe', difficulty: 'ADVANCED', description: 'Interact with the OTP verification step rendered inside an iframe.', startPage: '/transfer', expectedBehavior: 'Locators must switch into the iframe context to enter the OTP.' },
  { id: 16, title: 'Handle Shadow DOM', difficulty: 'ADVANCED', description: 'Read the balance value rendered inside the <bf-balance-card> shadow root on the dashboard.', startPage: '/dashboard', expectedBehavior: 'Locators must pierce the shadow root to read the displayed balance.' },
  { id: 17, title: 'Handle multiple tabs', difficulty: 'INTERMEDIATE', description: 'Open the bank policy page, which opens in a new tab/window.', startPage: '/dashboard', expectedBehavior: 'A second browser context/page is opened and can be asserted on independently.' },
  { id: 18, title: 'Handle delayed API', difficulty: 'INTERMEDIATE', description: 'Enable a Chaos Mode delay on GET /api/transactions and observe the loading skeleton.', startPage: '/dev/chaos', expectedBehavior: 'The transactions page shows a loading state for the configured delay before rendering.' },
  { id: 19, title: 'Handle API retry', difficulty: 'ADVANCED', description: 'Configure "fail once then succeed" on the transfer endpoint and verify the retry flow.', startPage: '/dev/chaos', expectedBehavior: 'The UI surfaces a retry affordance and succeeds on the second attempt.' },
  { id: 20, title: 'Validate WebSocket notification', difficulty: 'ADVANCED', description: 'Trigger an action that creates a notification and assert it appears live without a page refresh.', startPage: '/notifications', expectedBehavior: 'A toast/badge appears via Socket.IO push, not a polling refresh.' },
  { id: 21, title: 'Handle session expiration', difficulty: 'ADVANCED', description: 'Force an access token to expire and confirm silent refresh or redirect to login.', startPage: '/dashboard', expectedBehavior: 'Either a silent token refresh occurs, or the user is redirected to /login with a message.' },
  { id: 22, title: 'Test role-based access', difficulty: 'INTERMEDIATE', description: 'Log in as support01 and confirm admin-only routes are inaccessible.', startPage: '/login', expectedBehavior: 'Navigating to /admin returns a 403-driven "not authorized" view.' },
  { id: 23, title: 'Handle dynamic toast', difficulty: 'BEGINNER', description: 'Trigger any action that shows a toast notification and assert its text.', startPage: '/beneficiaries', expectedBehavior: 'A toast appears and disappears automatically after a few seconds.' },
  { id: 24, title: 'Validate accessibility', difficulty: 'INTERMEDIATE', description: 'Check that the transfer form is fully keyboard-navigable with proper labels.', startPage: '/transfer', expectedBehavior: 'All fields are reachable via Tab and have accessible names.' },
  { id: 25, title: 'Perform UI + API hybrid workflow', difficulty: 'ADVANCED', description: 'Create a beneficiary via API Testing Lab, then use it in a UI transfer.', startPage: '/dev/api-lab', expectedBehavior: 'A beneficiary created via direct API call becomes selectable in the UI transfer form.' },
];
