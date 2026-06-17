'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import {
  LayoutDashboard, Users, UserSearch, FileCheck,
  AlertTriangle, TrendingUp, FileWarning,
  BarChart3, Settings, LogOut, Shield, Users2,
} from 'lucide-react';

const navItems = [
  { label: 'Tableau de bord',      href: '/dashboard',   icon: LayoutDashboard, key: 'dashboard' },
  { label: 'Clients',              href: '/clients',      icon: Users,           key: 'clients' },
  { label: 'Prospects',            href: '/prospects',    icon: UserSearch,      key: 'prospects' },
  { label: 'Production',           href: '/contrats',     icon: FileCheck,       key: 'contrats' },
  { label: 'Quittances Impayées',  href: '/quittances',  icon: FileWarning,     key: 'quittances' },
  { label: 'Sinistres',            href: '/sinistres',    icon: AlertTriangle,   key: 'sinistres' },
  { label: 'Commissions',          href: '/commissions',  icon: TrendingUp,      key: 'commissions' },
  { label: 'Rapports',             href: '/rapports',     icon: BarChart3,       key: 'rapports' },
];

const adminItems = [
  { label: 'Utilisateurs', href: '/utilisateurs', icon: Users2 },
  { label: 'Paramètres', href: '/parametres', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-gray-200">
        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900 leading-tight">Assurances</p>
          <p className="text-xs text-gray-500">Oued Zem</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
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
              <Link key={href} href={href} className={cn(active ? 'sidebar-link-active' : 'sidebar-link')}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}

        {user?.role === 'ADMIN' && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Administration</p>
            </div>
            {adminItems.map(({ label, href, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link key={href} href={href} className={cn(active ? 'sidebar-link-active' : 'sidebar-link')}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-gray-200 p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-brand-600 text-xs font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-gray-400 truncate">{user?.role}</p>
          </div>
          <button onClick={logout} className="text-gray-400 hover:text-red-500 transition-colors" title="Déconnexion">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
