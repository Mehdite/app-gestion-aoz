'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import {
  LayoutDashboard, Users, UserSearch, FileCheck,
  AlertTriangle, BarChart3, Settings, LogOut, Users2, X, RefreshCw,
  Receipt, Landmark, Wallet, Hourglass,
} from 'lucide-react';

const navItems = [
  { label: 'Tableau de bord',        href: '/dashboard',             icon: LayoutDashboard, key: 'dashboard' },
  { label: 'Clients',                href: '/clients',               icon: Users,           key: 'clients' },
  { label: 'Prospects',              href: '/prospects',             icon: UserSearch,      key: 'prospects' },
  { label: 'Production AXA',         href: '/contrats',              icon: FileCheck,       key: 'contrats' },
  { label: 'Production CAT',         href: '/production-cat',        icon: FileCheck,       key: 'production-cat' },
  { label: 'Production Cover EDGE',  href: '/production-cover-edge', icon: FileCheck,       key: 'production-cover-edge' },
  { label: 'Renouvellements',        href: '/renouvellements',       icon: RefreshCw,       key: 'renouvellements' },
  { label: 'Provisoires',            href: '/provisoires',           icon: Hourglass,       key: 'provisoires' },
  { label: 'Ristournes',             href: '/ristournes',            icon: Receipt,         key: 'ristournes' },
  { label: 'Versements',             href: '/versements',            icon: Landmark,        key: 'versements' },
  { label: 'Charges',                href: '/charges',               icon: Wallet,          key: 'charges' },
  { label: 'Sinistres',              href: '/sinistres',             icon: AlertTriangle,   key: 'sinistres' },
  { label: 'Rapports',               href: '/rapports',              icon: BarChart3,       key: 'rapports' },
];

const adminItems = [
  { label: 'Utilisateurs', href: '/utilisateurs', icon: Users2 },
  { label: 'Paramètres',   href: '/parametres',   icon: Settings },
];

function closeSidebar() {
  const aside = document.querySelector('aside.sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (aside) aside.classList.remove('sidebar--open');
  if (backdrop) backdrop.style.display = 'none';
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <aside
      className="sidebar fixed left-0 top-0 h-screen w-64 flex flex-col z-30"
      style={{ background: '#091F3D', boxShadow: '2px 0 24px 0 rgba(4, 13, 26, 0.25)' }}
    >
      {/* ── Logo ─────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 h-16 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <img
          src="/logo-mark.png"
          alt="AO"
          width={36}
          height={36}
          className="flex-shrink-0 object-contain"
          style={{ filter: 'brightness(0) invert(1)' }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-tight tracking-tight">Assurances</p>
          <p className="text-xs font-medium" style={{ color: 'rgba(148, 180, 216, 0.75)' }}>
            Oued Zem
          </p>
        </div>
        <button
          onClick={closeSidebar}
          className="lg:hidden p-1.5 rounded-lg transition-colors"
          style={{ color: 'rgba(148,180,216,0.6)' }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Navigation ───────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {navItems
          .filter(({ key }) => {
            if (!user) return false;
            if (user.role === 'ADMIN') return true;
            if (key === 'dashboard') return true;
            const perms: string[] = user.permissions ?? [];
            return perms.length === 0 || perms.includes(key);
          })
          .map(({ label, href, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={active ? 'sidebar-link-active' : 'sidebar-link'} onClick={closeSidebar}>
                <Icon
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: active ? '#1A73E8' : undefined }}
                />
                <span>{label}</span>
              </Link>
            );
          })}

        {user?.role === 'ADMIN' && (
          <>
            <div className="pt-5 pb-1.5 px-3">
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(107, 163, 204, 0.50)' }}
              >
                Administration
              </p>
            </div>
            {adminItems.map(({ label, href, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link key={href} href={href} className={active ? 'sidebar-link-active' : 'sidebar-link'} onClick={closeSidebar}>
                  <Icon
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: active ? '#1A73E8' : undefined }}
                  />
                  <span>{label}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* ── User footer ──────────────────────────────── */}
      <div
        className="flex-shrink-0 p-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #1A73E8 0%, #0F4880 100%)' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate leading-tight">
              {user?.firstName} {user?.lastName}
            </p>
            <p
              className="text-xs truncate mt-0.5 font-medium"
              style={{ color: 'rgba(107, 163, 204, 0.70)' }}
            >
              {user?.role === 'ADMIN' ? 'Administrateur' : 'Agent'}
            </p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'rgba(148, 180, 216, 0.55)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#F87171')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(148, 180, 216, 0.55)')}
            title="Déconnexion"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
