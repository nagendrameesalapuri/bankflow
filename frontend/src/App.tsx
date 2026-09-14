import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import { Spinner } from './components/ui/Spinner';
import { useAuth } from './context/AuthContext';
import { homeRouteForRole } from './utils/roleHome';

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? homeRouteForRole(user.role) : '/login'} replace />;
}

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AccountsPage = lazy(() => import('./pages/AccountsPage'));
const AccountDetailPage = lazy(() => import('./pages/AccountDetailPage'));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'));
const TransferPage = lazy(() => import('./pages/TransferPage'));
const BeneficiariesPage = lazy(() => import('./pages/BeneficiariesPage'));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'));
const CardsPage = lazy(() => import('./pages/CardsPage'));
const StatementsPage = lazy(() => import('./pages/StatementsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SecurityPage = lazy(() => import('./pages/SecurityPage'));
const BankPolicyPage = lazy(() => import('./pages/BankPolicyPage'));
const OtpFramePage = lazy(() => import('./pages/embedded/OtpFramePage'));

const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminAccountsPage = lazy(() => import('./pages/admin/AdminAccountsPage'));
const AdminTransactionsPage = lazy(() => import('./pages/admin/AdminTransactionsPage'));
const AdminAuditLogsPage = lazy(() => import('./pages/admin/AdminAuditLogsPage'));

const CustomerSearchPage = lazy(() => import('./pages/support/CustomerSearchPage'));
const CustomerDetailPage = lazy(() => import('./pages/support/CustomerDetailPage'));

const ChaosPanelPage = lazy(() => import('./pages/dev/ChaosPanelPage'));
const ApiLabPage = lazy(() => import('./pages/dev/ApiLabPage'));
const ChallengeLabPage = lazy(() => import('./pages/dev/ChallengeLabPage'));

const NotAuthorizedPage = lazy(() => import('./pages/NotAuthorizedPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function PageFallback() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Spinner label="Loading page" size={28} />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/policy" element={<BankPolicyPage />} />
        <Route path="/embedded/otp-verify" element={<OtpFramePage />} />
        <Route path="/not-authorized" element={<NotAuthorizedPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<HomeRedirect />} />

            <Route element={<ProtectedRoute allowedRoles={['CUSTOMER']} />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/accounts/:id" element={<AccountDetailPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/transfer" element={<TransferPage />} />
              <Route path="/beneficiaries" element={<BeneficiariesPage />} />
              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/cards" element={<CardsPage />} />
              <Route path="/statements" element={<StatementsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
            </Route>

            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/security" element={<SecurityPage />} />

            <Route element={<ProtectedRoute allowedRoles={['SUPPORT_AGENT', 'ADMIN']} />}>
              <Route path="/support/customers" element={<CustomerSearchPage />} />
              <Route path="/support/customers/:id" element={<CustomerDetailPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/accounts" element={<AdminAccountsPage />} />
              <Route path="/admin/transactions" element={<AdminTransactionsPage />} />
              <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
              <Route path="/dev/chaos" element={<ChaosPanelPage />} />
              <Route path="/dev/api-lab" element={<ApiLabPage />} />
              <Route path="/dev/challenges" element={<ChallengeLabPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
