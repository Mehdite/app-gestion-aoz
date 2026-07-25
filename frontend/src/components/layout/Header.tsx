'use client';

import { Bell, Search, Menu } from 'lucide-react';
import { useUser } from '@/store/auth.store';

interface HeaderProps {
  title: string;
}

function toggleSidebar() {
  const aside = document.querySelector('aside.sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (!aside) return;
  const isOpen = aside.classList.contains('sidebar--open');
  aside.classList.toggle('sidebar--open', !isOpen);
  if (backdrop) backdrop.style.display = isOpen ? 'none' : 'block';
}

export function Header({ title }: HeaderProps) {
  const user = useUser();
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <header
      className="h-16 bg-white flex items-center justify-between px-6 sticky top-0 z-20"
      style={{ boxShadow: '0 1px 0 0 #E2EBF6, 0 2px 6px 0 rgba(14,62,118,0.04)' }}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-1.5 rounded-lg transition-colors hover:bg-[#F0F4F9]"
          style={{ color: '#7A98B8' }}
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold tracking-tight" style={{ color: '#1A2B4A' }}>
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Search */}
        <div
          className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg w-60"
          style={{ background: '#F0F4F9', border: '1px solid #E2EBF6' }}
        >
          <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#9EB5CC' }} />
          <input
            type="text"
            placeholder="Rechercher..."
            className="bg-transparent text-sm outline-none flex-1 min-w-0"
            style={{ color: '#1A2B4A' }}
          />
        </div>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg transition-colors hover:bg-[#F0F4F9]"
          style={{ color: '#7A98B8' }}
        >
          <Bell className="w-5 h-5" />
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ background: '#D42B2B' }}
          />
        </button>

        {/* User avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white cursor-pointer select-none"
          style={{ background: 'linear-gradient(135deg, #1A73E8 0%, #0F4880 100%)' }}
          title={`${user?.firstName} ${user?.lastName}`}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
