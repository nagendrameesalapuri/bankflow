import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from '../components/layout/NotificationBell';

type Accent = 'brand' | 'teal' | 'violet' | 'sunset';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const ACCENT_STYLES: Record<Accent, { label: string; active: string; icon: string; bar: string }> = {
  brand: { label: 'text-brand-300', active: 'bg-white/10 text-white', icon: 'text-brand-300', bar: 'bg-brand-400' },
  teal: { label: 'text-teal-300', active: 'bg-white/10 text-white', icon: 'text-teal-300', bar: 'bg-teal-400' },
  violet: { label: 'text-violet-300', active: 'bg-white/10 text-white', icon: 'text-violet-300', bar: 'bg-violet-400' },
  sunset: { label: 'text-sunset-300', active: 'bg-white/10 text-white', icon: 'text-sunset-300', bar: 'bg-sunset-400' },
};

const CUSTOMER_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <IconGrid /> },
  { to: '/accounts', label: 'Accounts', icon: <IconWallet /> },
  { to: '/transactions', label: 'Transactions', icon: <IconList /> },
  { to: '/transfer', label: 'Transfer Money', icon: <IconTransfer /> },
  { to: '/beneficiaries', label: 'Beneficiaries', icon: <IconUsers /> },
  { to: '/payments', label: 'Bill Payments', icon: <IconReceipt /> },
  { to: '/cards', label: 'Cards', icon: <IconCard /> },
  { to: '/statements', label: 'Statements', icon: <IconDoc /> },
  { to: '/notifications', label: 'Notifications', icon: <IconBell /> },
];

const SUPPORT_NAV: NavItem[] = [{ to: '/support/customers', label: 'Customer Search', icon: <IconSearch /> }];

const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Admin Dashboard', icon: <IconGrid /> },
  { to: '/admin/users', label: 'Users', icon: <IconUsers /> },
  { to: '/admin/accounts', label: 'Accounts', icon: <IconWallet /> },
  { to: '/admin/transactions', label: 'Transactions', icon: <IconList /> },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: <IconShield /> },
];

const DEV_NAV: NavItem[] = [
  { to: '/dev/chaos', label: 'Chaos Control Panel', icon: <IconBolt /> },
  { to: '/dev/api-lab', label: 'API Testing Lab', icon: <IconTerminal /> },
  { to: '/dev/challenges', label: 'Challenge Lab', icon: <IconFlag /> },
];

const COMMON_NAV: NavItem[] = [
  { to: '/profile', label: 'Profile', icon: <IconUser /> },
  { to: '/security', label: 'Security', icon: <IconLock /> },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navSections: { title: string; items: NavItem[]; accent: Accent }[] = [];
  if (user?.role === 'CUSTOMER') navSections.push({ title: 'Banking', items: CUSTOMER_NAV, accent: 'brand' });
  if (user?.role === 'SUPPORT_AGENT' || user?.role === 'ADMIN')
    navSections.push({ title: 'Support', items: SUPPORT_NAV, accent: 'teal' });
  if (user?.role === 'ADMIN') {
    navSections.push({ title: 'Administration', items: ADMIN_NAV, accent: 'violet' });
    navSections.push({ title: 'Developer Tools', items: DEV_NAV, accent: 'sunset' });
  }
  navSections.push({ title: 'Account', items: COMMON_NAV, accent: 'brand' });

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-ink-50">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2 focus:shadow">
        Skip to main content
      </a>

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 transform overflow-hidden bg-sidebar-gradient transition-transform lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-mesh-glow opacity-60" aria-hidden="true" />
        <div className="relative flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
          <BrandMark />
          <span className="text-lg font-bold tracking-tight text-white">BankFlow</span>
        </div>
        <nav aria-label="Primary" className="relative space-y-6 overflow-y-auto px-3 py-5" style={{ height: 'calc(100vh - 4rem)' }}>
          {navSections.map((section) => {
            const styles = ACCENT_STYLES[section.accent];
            return (
              <div key={section.title}>
                <p className={`px-2 pb-1.5 text-xs font-bold uppercase tracking-wider ${styles.label}`}>{section.title}</p>
                <ul className="space-y-0.5">
                  {section.items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.to === '/admin'}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            isActive ? styles.active : 'text-white/60 hover:bg-white/5 hover:text-white'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && <span className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full ${styles.bar}`} aria-hidden="true" />}
                            <span className={isActive ? styles.icon : 'text-white/40 group-hover:text-white/70'}>{item.icon}</span>
                            {item.label}
                          </>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>

      {mobileOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-ink-950/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex min-h-screen flex-1 flex-col lg:pl-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-ink-100 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            aria-label="Open navigation menu"
            className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <MenuIcon />
          </button>
          <div className="hidden items-center gap-1.5 text-sm text-ink-500 lg:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" aria-hidden="true" />
            Fictional demo bank - no real funds are involved.
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/policy"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden text-sm font-medium text-ink-500 hover:text-brand-600 sm:block"
            >
              Bank Policy ↗
            </a>
            <NotificationBell />
            <div className="relative">
              <UserMenu userName={user?.fullName ?? ''} role={user?.role ?? ''} onLogout={handleLogout} />
            </div>
          </div>
        </header>
        <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function UserMenu({ userName, role, onLogout }: { userName: string; role: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-ink-100"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-sm font-semibold text-white shadow-sm">
          {userName.slice(0, 1).toUpperCase() || '?'}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium text-ink-800">{userName}</span>
          <span className="block text-xs text-ink-400">{role}</span>
        </span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-40 rounded-lg border border-ink-100 bg-white p-1 shadow-lg">
          <button
            role="menuitem"
            type="button"
            onClick={onLogout}
            className="block w-full rounded-md px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

function BrandMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="brandmark" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5b90ff" />
          <stop offset="1" stopColor="#8a55ef" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#brandmark)" />
      <path d="M9 21V13.5L16 9l7 4.5V21" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none" />
      <path d="M13 21v-5h6v5" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const iconProps = { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none' as const, 'aria-hidden': true as const };
function IconGrid() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function IconWallet() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16" cy="14" r="1.4" fill="currentColor" />
    </svg>
  );
}
function IconList() {
  return (
    <svg {...iconProps}>
      <path d="M8 6h13M8 12h13M8 18h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="3.5" cy="6" r="1.3" fill="currentColor" />
      <circle cx="3.5" cy="12" r="1.3" fill="currentColor" />
      <circle cx="3.5" cy="18" r="1.3" fill="currentColor" />
    </svg>
  );
}
function IconTransfer() {
  return (
    <svg {...iconProps}>
      <path d="M4 8h13l-3-3M20 16H7l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg {...iconProps}>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 5.5a3 3 0 010 5.8M20 20c0-2.6-1.8-4.8-4.2-5.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconReceipt() {
  return (
    <svg {...iconProps}>
      <path d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-18z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 8h6M9 12h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function IconCard() {
  return (
    <svg {...iconProps}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M2.5 10h19" stroke="currentColor" strokeWidth="1.8" />
      <rect x="5.5" y="14" width="4" height="2" rx="0.5" fill="currentColor" />
    </svg>
  );
}
function IconDoc() {
  return (
    <svg {...iconProps}>
      <path d="M7 3h7l4 4v14H7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M14 3v4h4M9.5 13h5M9.5 16.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function IconBell() {
  return (
    <svg {...iconProps}>
      <path d="M12 3a6 6 0 00-6 6v3.5c0 .5-.2 1-.5 1.4L4 16h16l-1.5-2.1c-.3-.4-.5-.9-.5-1.4V9a6 6 0 00-6-6z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9.5 19a2.5 2.5 0 005 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg {...iconProps}>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 20l-4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg {...iconProps}>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconBolt() {
  return (
    <svg {...iconProps}>
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function IconTerminal() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M7 9l3 3-3 3M13 15h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconFlag() {
  return (
    <svg {...iconProps}>
      <path d="M5 3v18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 4h13l-2.5 3.5L18 11H5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4.5 20c0-4.1 3.4-7 7.5-7s7.5 2.9 7.5 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconLock() {
  return (
    <svg {...iconProps}>
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 11V8a4 4 0 118 0v3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
